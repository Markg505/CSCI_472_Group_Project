package com.RBOS.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import jakarta.servlet.ServletContext;
import java.io.File;

public class DatabaseConnection {
    
    public static String getDatabasePath(ServletContext context) {
        // Use WEB-INF directory within the WAR
        String webInfPath = context.getRealPath("/WEB-INF");
        if (webInfPath != null) {
            File dbDir = new File(webInfPath, "database");
            dbDir.mkdirs(); // Ensure directory exists
            return new File(dbDir, "restaurant.db").getAbsolutePath();
        }
        
        // Fallback
        return "restaurant.db";
    }
    
    public static Connection getConnection(ServletContext context) throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
            String dbPath = getDatabasePath(context);
            String dbUrl = "jdbc:sqlite:" + dbPath;
            
            Connection conn = DriverManager.getConnection(dbUrl);
            
            // Enable foreign keys for SQLite
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("PRAGMA foreign_keys = ON");
            }
            
            // Log database location for debugging
            System.out.println("Database path: " + dbPath);
            
            return conn;
        } catch (ClassNotFoundException e) {
            throw new SQLException("SQLite JDBC driver not found", e);
        }
    }
    
    // Initialize database with your schema
    public static void initializeDatabase(ServletContext context) throws SQLException {
        String[] schemaStatements = {
            // Users table
            "CREATE TABLE IF NOT EXISTS users (" +
            "  user_id    INTEGER PRIMARY KEY," +
            "  role       TEXT NOT NULL CHECK (role IN ('customer','staff','admin')) DEFAULT 'customer'," +
            "  full_name  TEXT NOT NULL," +
            "  email      TEXT UNIQUE," +
            "  phone      TEXT" +
            ")",
            
            // Dining tables table
            "CREATE TABLE IF NOT EXISTS dining_tables (" +
            "  table_id   INTEGER PRIMARY KEY," +
            "  name       TEXT NOT NULL UNIQUE," +
            "  capacity   INTEGER NOT NULL CHECK (capacity > 0)" +
            ")",
            
            // Reservations table
            "CREATE TABLE IF NOT EXISTS reservations (" +
            "  reservation_id INTEGER PRIMARY KEY," +
            "  user_id        INTEGER," +
            "  table_id       INTEGER NOT NULL," +
            "  start_utc      TEXT NOT NULL," +
            "  end_utc        TEXT NOT NULL," +
            "  party_size     INTEGER NOT NULL CHECK (party_size > 0)," +
            "  status         TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','no_show')) DEFAULT 'pending'," +
            "  notes          TEXT," +
            "  created_utc    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))," +
            "  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL," +
            "  FOREIGN KEY (table_id) REFERENCES dining_tables(table_id) ON DELETE CASCADE" +
            ")",
            
            // Menu items table
            "CREATE TABLE IF NOT EXISTS menu_items (" +
            "  item_id    INTEGER PRIMARY KEY," +
            "  name       TEXT NOT NULL," +
            "  price      REAL NOT NULL CHECK (price >= 0)," +
            "  active     INTEGER NOT NULL DEFAULT 1" +
            ")",
            
            // Orders table
            "CREATE TABLE IF NOT EXISTS orders (" +
            "  order_id   INTEGER PRIMARY KEY," +
            "  user_id    INTEGER," +
            "  source     TEXT NOT NULL CHECK (source IN ('web','phone','walkin')) DEFAULT 'web'," +
            "  status     TEXT NOT NULL CHECK (status IN ('cart','placed','paid','cancelled')) DEFAULT 'cart'," +
            "  subtotal   REAL NOT NULL DEFAULT 0.0," +
            "  tax        REAL NOT NULL DEFAULT 0.0," +
            "  total      REAL NOT NULL DEFAULT 0.0," +
            "  created_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))," +
            "  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL" +
            ")",
            
            // Order items table
            "CREATE TABLE IF NOT EXISTS order_items (" +
            "  order_item_id INTEGER PRIMARY KEY," +
            "  order_id      INTEGER NOT NULL," +
            "  item_id       INTEGER NOT NULL," +
            "  qty           INTEGER NOT NULL CHECK (qty > 0)," +
            "  unit_price    REAL NOT NULL CHECK (unit_price >= 0)," +
            "  line_total    REAL NOT NULL CHECK (line_total >= 0)," +
            "  notes         TEXT," +
            "  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE," +
            "  FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE RESTRICT" +
            ")",
            
            // Create indexes
            "CREATE INDEX IF NOT EXISTS idx_res_by_table_time ON reservations(table_id, start_utc, end_utc)",
            "CREATE INDEX IF NOT EXISTS idx_res_by_user ON reservations(user_id, start_utc)",
            "CREATE INDEX IF NOT EXISTS idx_orders_by_user ON orders(user_id, created_utc)",
            "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)"
        };
        
        // Sample data - ADAPT THESE AS NEEDED
        String[] sampleData = {
            // Insert sample dining tables
            "INSERT OR IGNORE INTO dining_tables (table_id, name, capacity) VALUES (1, 'Table 1', 4)",
            "INSERT OR IGNORE INTO dining_tables (table_id, name, capacity) VALUES (2, 'Table 2', 4)",
            "INSERT OR IGNORE INTO dining_tables (table_id, name, capacity) VALUES (3, 'Table 3', 6)",
            "INSERT OR IGNORE INTO dining_tables (table_id, name, capacity) VALUES (4, 'Table 4', 2)",
            "INSERT OR IGNORE INTO dining_tables (table_id, name, capacity) VALUES (5, 'Booth 1', 4)",
            
            // Insert sample menu items
            "INSERT OR IGNORE INTO menu_items (item_id, name, price, active) VALUES (1, 'Margherita Pizza', 12.99, 1)",
            "INSERT OR IGNORE INTO menu_items (item_id, name, price, active) VALUES (2, 'Caesar Salad', 8.99, 1)",
            "INSERT OR IGNORE INTO menu_items (item_id, name, price, active) VALUES (3, 'Spaghetti Carbonara', 14.99, 1)",
            "INSERT OR IGNORE INTO menu_items (item_id, name, price, active) VALUES (4, 'Grilled Salmon', 18.99, 1)",
            "INSERT OR IGNORE INTO menu_items (item_id, name, price, active) VALUES (5, 'Chocolate Cake', 6.99, 1)"
        };
        
        try (Connection conn = getConnection(context);
             Statement stmt = conn.createStatement()) {
            
            // Create tables
            for (String sql : schemaStatements) {
                stmt.execute(sql);
            }
            
            // Insert sample data
            for (String sql : sampleData) {
                stmt.execute(sql);
            }
            
            System.out.println("Database initialized successfully with schema");
        }
    }
}