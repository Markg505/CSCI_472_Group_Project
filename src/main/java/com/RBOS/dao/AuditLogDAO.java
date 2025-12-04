package com.RBOS.dao;

import com.RBOS.models.AuditLog;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AuditLogDAO {

    private final ServletContext context;

    public AuditLogDAO(ServletContext context) {
        this.context = context;
    }

    /**
     * Create the audit_log table if it doesn't exist
     */
    public void ensureTableExists() throws SQLException {
        String createTableSQL = """
            CREATE TABLE IF NOT EXISTS audit_log (
                log_id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                action TEXT NOT NULL,
                user_id TEXT,
                user_name TEXT,
                old_values TEXT,
                new_values TEXT,
                created_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
        """;

        try (Connection conn = DatabaseConnection.getConnection(context);
             Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);
        }
    }

    /**
     * Log an audit entry
     */
    public void log(String entityType, String entityId, String action, String userId,
                   String userName, String oldValue, String newValue) throws SQLException {
        ensureTableExists();

        String sql = """
            INSERT INTO audit_log (log_id, entity_type, entity_id, action, user_id, user_name, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """;

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, UUID.randomUUID().toString());
            pstmt.setString(2, entityType);
            pstmt.setString(3, entityId);
            pstmt.setString(4, action);
            pstmt.setString(5, userId);
            pstmt.setString(6, userName);
            pstmt.setString(7, oldValue);
            pstmt.setString(8, newValue);
            pstmt.executeUpdate();
        }
    }

    /**
     * Get all audit logs for a specific entity type
     */
    public List<AuditLog> getByEntityType(String entityType) throws SQLException {
        ensureTableExists();

        String sql = """
            SELECT log_id, entity_type, entity_id, action, user_id, user_name, old_values, new_values, created_utc
            FROM audit_log
            WHERE entity_type = ?
            ORDER BY created_utc DESC
        """;

        List<AuditLog> logs = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, entityType);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    AuditLog log = new AuditLog(
                        rs.getString("log_id"),
                        rs.getString("entity_type"),
                        rs.getString("entity_id"),
                        rs.getString("action"),
                        rs.getString("user_id"),
                        rs.getString("user_name"),
                        rs.getString("old_values"),
                        rs.getString("new_values"),
                        rs.getString("created_utc")
                    );
                    logs.add(log);
                }
            }
        }
        return logs;
    }

    /**
     * Get all audit logs
     */
    public List<AuditLog> getAll() throws SQLException {
        ensureTableExists();

        String sql = """
            SELECT log_id, entity_type, entity_id, action, user_id, user_name, old_values, new_values, created_utc
            FROM audit_log
            ORDER BY created_utc DESC
        """;

        List<AuditLog> logs = new ArrayList<>();
        try (Connection conn = DatabaseConnection.getConnection(context);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                AuditLog log = new AuditLog(
                    rs.getString("log_id"),
                    rs.getString("entity_type"),
                    rs.getString("entity_id"),
                    rs.getString("action"),
                    rs.getString("user_id"),
                    rs.getString("user_name"),
                    rs.getString("old_value"),
                    rs.getString("new_value"),
                    rs.getString("created_utc")
                );
                logs.add(log);
            }
        }
        return logs;
    }
}
