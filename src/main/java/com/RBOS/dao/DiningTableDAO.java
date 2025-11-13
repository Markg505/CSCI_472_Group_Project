package com.RBOS.dao;

import com.RBOS.models.DiningTable;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DiningTableDAO {
    private ServletContext context;
    
    public DiningTableDAO(ServletContext context) {
        this.context = context;
    }
    
    public List<DiningTable> getAllTables() throws SQLException {
        List<DiningTable> tables = new ArrayList<>();
        String sql = "SELECT * FROM dining_tables ORDER BY table_id";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                tables.add(new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                ));
            }
        }
        return tables;
    }
    
    public DiningTable getTableById(String tableId) throws SQLException {
        String sql = "SELECT * FROM dining_tables WHERE table_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, tableId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                );
            }
        }
        return null;
    }
    
    public List<DiningTable> getAvailableTables(String startUtc, String endUtc, int partySize) throws SQLException {
        List<DiningTable> tables = new ArrayList<>();
        
        // Find tables that are available for the given time slot and have sufficient capacity
        String sql = "SELECT dt.* FROM dining_tables dt " +
                    "WHERE dt.capacity >= ? " +
                    "AND dt.table_id NOT IN (" +
                    "    SELECT r.table_id FROM reservations r " +
                    "    WHERE r.status IN ('pending', 'confirmed') " +
                    "    AND ((r.start_utc < ? AND r.end_utc > ?) " +
                    "         OR (r.start_utc < ? AND r.end_utc > ?) " +
                    "         OR (r.start_utc >= ? AND r.end_utc <= ?))" +
                    ") " +
                    "ORDER BY dt.capacity";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, partySize);
            // Set the same parameters multiple times for the overlapping conditions
            pstmt.setString(2, endUtc);   // r.end_utc > startUtc (first condition)
            pstmt.setString(3, startUtc);  // r.start_utc < endUtc (first condition)
            pstmt.setString(4, endUtc);    // r.start_utc < endUtc (second condition)  
            pstmt.setString(5, startUtc);  // r.end_utc > startUtc (second condition)
            pstmt.setString(6, startUtc);  // r.start_utc >= startUtc (third condition)
            pstmt.setString(7, endUtc);    // r.end_utc <= endUtc (third condition)
            
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                tables.add(new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                ));
            }
        }
        return tables;
    }
    
    public String createTable(DiningTable table) throws SQLException {
        String sql = "INSERT INTO dining_tables (name, capacity) VALUES (?, ?)";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            pstmt.setString(1, table.getName());
            pstmt.setInt(2, table.getCapacity());
            
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        return generatedKeys.getString(1);
                    }
                }
            }
        }
        return null;
    }
    
    public boolean updateTable(DiningTable table) throws SQLException {
        String sql = "UPDATE dining_tables SET name = ?, capacity = ? WHERE table_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, table.getName());
            pstmt.setInt(2, table.getCapacity());
            pstmt.setString(3, table.getTableId());
            
            return pstmt.executeUpdate() > 0;
        }
    }
}