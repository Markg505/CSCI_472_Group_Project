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
                    rs.getInt("capacity"),
                    rs.getInt("pos_x"),
                    rs.getInt("pos_y"),
                    rs.getDouble("base_price")
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
                    rs.getInt("capacity"),
                    rs.getInt("pos_x"),
                    rs.getInt("pos_y"),
                    rs.getDouble("base_price")
                );
            }
        }
        return null;
    }
    
    public List<DiningTable> getAvailableTables(String startUtc, String endUtc, int partySize) throws SQLException {
        List<DiningTable> tables = new ArrayList<>();

        // Find tables that are available for the given time slot and have sufficient
        // capacity
        String sql = "SELECT dt.* FROM dining_tables dt " +
                "WHERE dt.capacity >= ? " +
                "AND dt.table_id NOT IN (" +
                "    SELECT r.table_id FROM reservations r " +
                "    WHERE r.status IN ('pending', 'confirmed') " +
                "    AND NOT (r.end_utc <= ? OR r.start_utc >= ?)" +
                ") " +
                "ORDER BY dt.capacity";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, partySize);
            pstmt.setString(2, startUtc);
            pstmt.setString(3, endUtc);

            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                tables.add(new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity"),
                    rs.getInt("pos_x"),
                    rs.getInt("pos_y"),
                    rs.getDouble("base_price")
                ));
            }
        }
        return tables;
    }
    
    public String createTable(DiningTable table) throws SQLException {
        String tableId = table.getTableId() != null ? table.getTableId() : java.util.UUID.randomUUID().toString();
        String sql = "INSERT INTO dining_tables (table_id, name, capacity, pos_x, pos_y, base_price) VALUES (?, ?, ?, ?, ?, ?)";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            pstmt.setString(1, tableId);
            pstmt.setString(2, table.getName());
            pstmt.setInt(3, table.getCapacity());
            pstmt.setInt(4, table.getPosX());
            pstmt.setInt(5, table.getPosY());
            pstmt.setDouble(6, table.getBasePrice() != null ? table.getBasePrice() : 0.0);

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                return tableId;
            }
        }
        return null;
    }

    public boolean updateTable(DiningTable table) throws SQLException {
        String sql = "UPDATE dining_tables SET name = ?, capacity = ?, pos_x = ?, pos_y = ?, base_price = ? WHERE table_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, table.getName());
            pstmt.setInt(2, table.getCapacity());
            pstmt.setInt(3, table.getPosX());
            pstmt.setInt(4, table.getPosY());
            pstmt.setDouble(5, table.getBasePrice() != null ? table.getBasePrice() : 0.0);
            pstmt.setString(6, table.getTableId());
            
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateTablePosition(String tableId, int x, int y) throws SQLException {
        String sql = "UPDATE dining_tables SET pos_x = ?, pos_y = ? WHERE table_id = ?";
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, x);
            pstmt.setInt(2, y);
            pstmt.setString(3, tableId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteTable(String tableId) throws SQLException {
        String sql = "DELETE FROM dining_tables WHERE table_id = ?";
        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, tableId);
            return pstmt.executeUpdate() > 0;
        }
    }
}
