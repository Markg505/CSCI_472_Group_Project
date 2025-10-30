package com.rbos.db;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;

public class Db {
    private static String dbFile() {
        String p = System.getProperty("RBOS_DB"); // set via -DRBOS_DB=...
        if (p == null || p.isBlank()) {
            throw new IllegalStateException("Set -DRBOS_DB to repo db path");
        }
        if (!Files.exists(Path.of(p))) {
            throw new IllegalStateException("DB missing: " + p);
        }
        // Windows-safe for JDBC URL
        return p.replace('\\', '/');
    }

    public static Connection get() throws Exception {
        // With modern sqlite-jdbc this isn't strictly needed, but it's fine:
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException ignored) {
        }
        return DriverManager.getConnection("jdbc:sqlite:" + dbFile());
    }
}
