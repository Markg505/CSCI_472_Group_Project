package com.RBOS.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import jakarta.servlet.ServletContext;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class DatabaseConnection {

    private static String resolveDatabasePath(ServletContext context) {
        String path = System.getProperty("RBOS_DB");
        if (isBlank(path))
            path = System.getenv("RBOS_DB");
        if (isBlank(path) && context != null)
            path = context.getInitParameter("RBOS_DB");
        if (isBlank(path)) {
            path = Paths.get(System.getProperty("user.home"), ".rbos", "restaurant.db").toString();
        }
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

    private static void seedIfMissing(String absolutePath) {
        Path target = Paths.get(absolutePath);
        if (Files.exists(target))
            return;

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
        return external;
    }

    public static Connection getConnection(ServletContext context) throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
            String dbPath = getDatabasePath(context);
            String dbUrl = "jdbc:sqlite:" + dbPath;

            Connection conn = DriverManager.getConnection(dbUrl);
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
}
