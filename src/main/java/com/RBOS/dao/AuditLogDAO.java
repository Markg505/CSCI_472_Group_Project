package com.RBOS.dao;

import com.RBOS.models.AuditLog;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class AuditLogDAO {
    private final ServletContext context;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuditLogDAO(ServletContext context) {
        this.context = context;
    }

    // Legacy helper to support existing callers using raw JSON strings
    public void log(String entityType, String entityId, String action, String userId,
                    String userName, String oldValue, String newValue) throws SQLException {
        Map<String, Object> oldMap = oldValue != null ? Map.of("raw", oldValue) : null;
        Map<String, Object> newMap = newValue != null ? Map.of("raw", newValue) : null;
        logAction(userId, userName, entityType, entityId, action, oldMap, newMap);
    }

    public void logAction(String userId, String userName, String entityType, String entityId,
                          String action, Map<String, Object> oldValues, Map<String, Object> newValues) throws SQLException {
        String sql = "INSERT INTO audit_log (log_id, user_id, user_name, entity_type, entity_id, action, old_values, new_values) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            String logId = java.util.UUID.randomUUID().toString();
            String oldValuesJson = oldValues != null ? objectMapper.writeValueAsString(oldValues) : null;
            String newValuesJson = newValues != null ? objectMapper.writeValueAsString(newValues) : null;

            pstmt.setString(1, logId);
            pstmt.setString(2, userId);
            pstmt.setString(3, userName);
            pstmt.setString(4, entityType);
            pstmt.setString(5, entityId);
            pstmt.setString(6, action);
            pstmt.setString(7, oldValuesJson);
            pstmt.setString(8, newValuesJson);

            pstmt.executeUpdate();
        } catch (Exception e) {
            throw new SQLException("Error logging audit action", e);
        }
    }

    public List<AuditLog> getLogsByEntityType(String entityType) throws SQLException {
        List<AuditLog> logs = new ArrayList<>();
        String sql = "SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, entityType);
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                AuditLog log = new AuditLog(
                        rs.getString("log_id"),
                        rs.getString("user_id"),
                        rs.getString("user_name"),
                        rs.getString("entity_type"),
                        rs.getString("entity_id"),
                        rs.getString("action"),
                        rs.getString("old_values"),
                        rs.getString("new_values"),
                        rs.getString("created_utc")
                );
                logs.add(log);
            }
        }
        return logs;
    }

    public List<AuditLog> getAllLogs() throws SQLException {
        List<AuditLog> logs = new ArrayList<>();
        String sql = "SELECT * FROM audit_log ORDER BY created_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                AuditLog log = new AuditLog(
                        rs.getString("log_id"),
                        rs.getString("user_id"),
                        rs.getString("user_name"),
                        rs.getString("entity_type"),
                        rs.getString("entity_id"),
                        rs.getString("action"),
                        rs.getString("old_values"),
                        rs.getString("new_values"),
                        rs.getString("created_utc")
                );
                logs.add(log);
            }
        }
        return logs;
    }
}


    