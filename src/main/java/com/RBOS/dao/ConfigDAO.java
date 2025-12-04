package com.RBOS.dao;

import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class ConfigDAO {
    private ServletContext context;

    public ConfigDAO(ServletContext context) {
        this.context = context;
    }

    public String getConfigValue(String key) throws SQLException {
        String sql = "SELECT config_value FROM restaurant_config WHERE config_key = ?";
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, key);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                return rs.getString("config_value");
            }
        }
        return null;
    }

    public boolean setConfigValue(String key, String value) throws SQLException {
        String sql = "INSERT INTO restaurant_config (config_key, config_value) VALUES (?, ?) " +
                "ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value";
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, key);
            pstmt.setString(2, value);
            return pstmt.executeUpdate() > 0;
        }
    }
}
