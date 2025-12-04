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
                DiningTable table = new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                );
                table.setBasePrice(rs.getObject("base_price") != null ? rs.getDouble("base_price") : null);
                table.setPosX(rs.getObject("pos_x") != null ? rs.getDouble("pos_x") : null);
                table.setPosY(rs.getObject("pos_y") != null ? rs.getDouble("pos_y") : null);
                tables.add(table);
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
                DiningTable table = new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                );
                table.setBasePrice(rs.getObject("base_price") != null ? rs.getDouble("base_price") : null);
                table.setPosX(rs.getObject("pos_x") != null ? rs.getDouble("pos_x") : null);
                table.setPosY(rs.getObject("pos_y") != null ? rs.getDouble("pos_y") : null);
                return table;
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
                DiningTable table = new DiningTable(
                    rs.getString("table_id"),
                    rs.getString("name"),
                    rs.getInt("capacity")
                );
                table.setBasePrice(rs.getObject("base_price") != null ? rs.getDouble("base_price") : null);
                table.setPosX(rs.getObject("pos_x") != null ? rs.getDouble("pos_x") : null);
                table.setPosY(rs.getObject("pos_y") != null ? rs.getDouble("pos_y") : null);
                tables.add(table);
            }
        }
        return tables;
    }

    public String createTable(DiningTable table) throws SQLException {
        String tableId = table.getTableId() != null ? table.getTableId() : java.util.UUID.randomUUID().toString();
        String sql = "INSERT INTO dining_tables (table_id, name, capacity, base_price, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, tableId);
            pstmt.setString(2, table.getName());
            pstmt.setInt(3, table.getCapacity());
            if (table.getBasePrice() != null) {
                pstmt.setDouble(4, table.getBasePrice());
            } else {
                pstmt.setNull(4, Types.REAL);
            }
            if (table.getPosX() != null) {
                pstmt.setDouble(5, table.getPosX());
            } else {
                pstmt.setNull(5, Types.REAL);
            }
            if (table.getPosY() != null) {
                pstmt.setDouble(6, table.getPosY());
            } else {
                pstmt.setNull(6, Types.REAL);
            }

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                return tableId;
            }
        }
        return null;
    }
    
    public boolean updateTable(DiningTable table) throws SQLException {
        String sql = "UPDATE dining_tables SET name = ?, capacity = ?, base_price = ?, pos_x = ?, pos_y = ? WHERE table_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, table.getName());
            pstmt.setInt(2, table.getCapacity());
            if (table.getBasePrice() != null) {
                pstmt.setDouble(3, table.getBasePrice());
            } else {
                pstmt.setNull(3, Types.REAL);
            }
            if (table.getPosX() != null) {
                pstmt.setDouble(4, table.getPosX());
            } else {
                pstmt.setNull(4, Types.REAL);
            }
            if (table.getPosY() != null) {
                pstmt.setDouble(5, table.getPosY());
            } else {
                pstmt.setNull(5, Types.REAL);
            }
            pstmt.setString(6, table.getTableId());

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
