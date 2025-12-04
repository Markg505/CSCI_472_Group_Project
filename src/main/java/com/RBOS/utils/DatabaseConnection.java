package com.RBOS.utils;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.DatabaseMetaData;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import jakarta.servlet.ServletContext;

public class DatabaseConnection {

    private static String resolveDatabasePath(ServletContext context) {
        String path = System.getProperty("RBOS_DB");
        if (isBlank(path))
            path = System.getenv("RBOS_DB");
        if (isBlank(path) && context != null) {
            String ctxPath = context.getInitParameter("RBOS_DB");
            if (!isBlank(ctxPath) && !ctxPath.contains("@DB_PATH@")) {
                path = ctxPath;
            }
        }
        // Default to user-local DB in ~/.rbos/restaurant.db
        if (isBlank(path))
            path = Paths.get(System.getProperty("user.home"), ".rbos", "restaurant.db").toString();

        Path p = Paths.get(path).toAbsolutePath().normalize();
        try {
            Path parent = p.getParent();
            if (parent != null)
                Files.createDirectories(parent);
        } catch (Exception ignored) {
        }
        return p.toString();
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static List<String> parseStatements(InputStream schemaStream) throws Exception {
        List<String> statements = new ArrayList<>();
        StringBuilder cleaned = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(schemaStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("--")) {
                    continue;
                }

                int inlineComment = line.indexOf("--");
                if (inlineComment >= 0) {
                    line = line.substring(0, inlineComment);
                }

                cleaned.append(line).append('\n');
            }
        }

        for (String raw : cleaned.toString().split(";")) {
            String stmt = raw.trim();
            if (!stmt.isEmpty()) {
                statements.add(stmt);
            }
        }

        return statements;
    }

    private static boolean seedFromSchema(Path target) {
        try (InputStream schemaStream = DatabaseConnection.class
                .getClassLoader()
                .getResourceAsStream("backend/schema.sql")) {
            if (schemaStream == null) {
                return false;
            }

            Class.forName("org.sqlite.JDBC");
            List<String> statements = parseStatements(schemaStream);

            if (statements.isEmpty()) {
                System.out.println("[DB] Failed to seed from schema.sql: no statements parsed");
                return false;
            }

            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + target.toString());
                    Statement stmt = conn.createStatement()) {
                for (String sql : statements) {
                    stmt.execute(sql);
                }
            }

            System.out.println("[DB] Seeded from schema.sql at: " + target);
            return true;
        } catch (Exception e) {
            System.out.println("[DB] Failed to seed from schema.sql: " + e.getMessage());
            return false;
        }
    }

    private static void seedIfMissing(String absolutePath) {
        Path target = Paths.get(absolutePath);
        if (Files.exists(target)) {
            System.out.println("[DB] Existing database found at: " + target + ". Skipping seeding.");
            return;
        }
        System.out.println("[DB] Database file not found at: " + target + ". Attempting to seed...");

        if (seedFromSchema(target)) {
            System.out.println("[DB] Successfully seeded from schema.sql.");
            return;
        } else {
            System.out.println("[DB] Seeding from schema.sql failed or returned false. Attempting to copy pre-seeded DB.");
        }

        try (InputStream in = DatabaseConnection.class
                .getClassLoader()
                .getResourceAsStream("backend/restaurant.db")) {
            if (in != null) {
                Files.copy(in, target);
                System.out.println("[DB] Seed copied to: " + target);
            } else {
                System.out.println("[DB] No seed DB found on classpath; creating empty at: " + target);
                Files.createFile(target);
            }
        } catch (Exception e) {
            System.out.println("[DB] Failed to copy seed: " + e.getMessage());
        }
    }

    public static String getDatabasePath(ServletContext context) {
        String external = resolveDatabasePath(context);
        seedIfMissing(external);
        ensureSchema(external);
        return external;
    }

    public static Connection getConnection(ServletContext context) throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
            String dbPath = getDatabasePath(context);
            String dbUrl = "jdbc:sqlite:" + dbPath;

            Connection conn = DriverManager.getConnection(dbUrl);

            try (java.sql.Statement stmt = conn.createStatement();
                 java.sql.ResultSet rs = stmt.executeQuery("PRAGMA table_info(users);")) {
                System.out.println("--- USERS TABLE SCHEMA ---");
                while (rs.next()) {
                    System.out.println("Column: " + rs.getString("name"));
                }
                System.out.println("--------------------------");
            } catch (Exception e) {
                System.out.println("--- FAILED TO READ SCHEMA: " + e.getMessage());
            }
            
            System.out.println("[DB] Enabling PRAGMA foreign_keys = ON and other pragmas.");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("PRAGMA foreign_keys = ON");
                stmt.execute("PRAGMA journal_mode = WAL");
                stmt.execute("PRAGMA synchronous = NORMAL");
                stmt.execute("PRAGMA busy_timeout = 5000");
            }
            System.out.println("Database path: " + dbPath);
            return conn;
        } catch (ClassNotFoundException e) {
            throw new SQLException("SQLite JDBC driver not found", e);
        }
    }

    private static void ensureSchema(String dbPath) {
        Path target = Paths.get(dbPath);
        System.out.println("[DB] Starting schema verification for: " + target);
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            System.out.println("[DB] SQLite driver unavailable; skipping schema verification: " + e.getMessage());
            return;
        }

        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + target.toString())) {
            boolean migrated = false;

            if (!columnExists(conn, "orders", "cart_token")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE orders ADD COLUMN cart_token TEXT UNIQUE");
                    stmt.execute("CREATE INDEX IF NOT EXISTS idx_orders_by_cart_token ON orders(cart_token)");
                    migrated = true;
                    System.out.println("[DB] Added missing orders.cart_token column");
                }
            }

            if (!columnExists(conn, "orders", "created_utc")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute(
                            "ALTER TABLE orders ADD COLUMN created_utc TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))");
                    migrated = true;
                    System.out.println("[DB] Added missing orders.created_utc column");
                }
            }

            if (!columnExists(conn, "menu_items", "image_url")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE menu_items ADD COLUMN image_url TEXT");
                    stmt.execute("ALTER TABLE menu_items ADD COLUMN dietary_tags TEXT");
                    stmt.execute("ALTER TABLE menu_items ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
                    migrated = true;
                    System.out.println("[DB] Added missing menu_items presentation columns");
                }
            }

            if (!columnExists(conn, "reservations", "guest_name")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE reservations ADD COLUMN guest_name TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing reservations.guest_name column");
                }
            }

            if (!columnExists(conn, "dining_tables", "base_price")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE dining_tables ADD COLUMN base_price REAL NOT NULL DEFAULT 0.0");
                    migrated = true;
                    System.out.println("[DB] Added missing dining_tables.base_price column");
                }
            }

            if (!columnExists(conn, "reservations", "reservation_fee")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE reservations ADD COLUMN reservation_fee REAL NOT NULL DEFAULT 0.0");
                    migrated = true;
                    System.out.println("[DB] Added missing reservations.reservation_fee column");
                }
            }

            if (!columnExists(conn, "reservations", "contact_email")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE reservations ADD COLUMN contact_email TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing reservations.contact_email column");
                }
            }

            if (!columnExists(conn, "reservations", "contact_phone")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE reservations ADD COLUMN contact_phone TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing reservations.contact_phone column");
                }
            }

            // Ensure users table has contact/address columns used by auth servlet
            if (!columnExists(conn, "users", "phone")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN phone TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.phone column");
                }
            }
            if (!columnExists(conn, "users", "address")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN address TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.address column");
                }
            }
            if (!columnExists(conn, "users", "address2")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN address2 TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.address2 column");
                }
            }
            if (!columnExists(conn, "users", "city")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN city TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.city column");
                }
            }
            if (!columnExists(conn, "users", "state")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN state TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.state column");
                }
            }
            if (!columnExists(conn, "users", "postal_code")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE users ADD COLUMN postal_code TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing users.postal_code column");
                }
            }

            if (!columnExists(conn, "orders", "customer_email")) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE orders ADD COLUMN customer_email TEXT");
                    migrated = true;
                    System.out.println("[DB] Added missing orders.customer_email column");
                }
            }

            if (!migrated) {
                System.out.println("[DB] Schema verification completed. No migrations applied.");
                return;
            }
            System.out.println("[DB] Schema verification completed. Migrations applied.");
        } catch (Exception e) {
            System.out.println("[DB] Schema verification failed (" + e.getMessage() + "). Triggering backup and rebuild from schema.sql.");
            backupAndRebuild(target);
        }
    }

    private static boolean columnExists(Connection conn, String table, String column) {
        try {
            DatabaseMetaData meta = conn.getMetaData();
            try (var rs = meta.getColumns(null, null, table, column)) {
                return rs.next();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private static void backupAndRebuild(Path target) {
        try {
            if (Files.exists(target)) {
                Path backup = target
                        .resolveSibling(target.getFileName().toString() + ".bak-" + System.currentTimeMillis());
                Files.copy(target, backup);
                Files.delete(target);
                System.out.println("[DB] Existing DB backed up to: " + backup);
            }
        } catch (Exception ex) {
            System.out.println("[DB] Failed to backup existing DB: " + ex.getMessage());
        }

        if (!seedFromSchema(target)) {
            System.out.println("[DB] Rebuild failed; the database will be created empty.");
            try {
                Files.createFile(target);
            } catch (Exception ignored) {
            }
        }
    }
}
