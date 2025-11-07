package com.RBOS.dao;

import com.RBOS.models.MenuItem;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MenuItemDAO {
    private ServletContext context;
    
    public MenuItemDAO(ServletContext context) {
        this.context = context;
    }
    
    public List<MenuItem> getAllMenuItems() throws SQLException {
        List<MenuItem> menuItems = new ArrayList<>();
        String sql = "SELECT * FROM menu_items ORDER BY item_id";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                menuItems.add(new MenuItem(
                    rs.getInt("item_id"),
                    rs.getString("name"),
                    rs.getDouble("price"),
                    rs.getBoolean("active")
                ));
            }
        }
        return menuItems;
    }
    
    public List<MenuItem> getActiveMenuItems() throws SQLException {
        List<MenuItem> menuItems = new ArrayList<>();
        String sql = "SELECT * FROM menu_items WHERE active = 1 ORDER BY item_id";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                menuItems.add(new MenuItem(
                    rs.getInt("item_id"),
                    rs.getString("name"),
                    rs.getDouble("price"),
                    rs.getBoolean("active")
                ));
            }
        }
        return menuItems;
    }
    
    public MenuItem getMenuItemById(int itemId) throws SQLException {
        String sql = "SELECT * FROM menu_items WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, itemId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return new MenuItem(
                    rs.getInt("item_id"),
                    rs.getString("name"),
                    rs.getDouble("price"),
                    rs.getBoolean("active")
                );
            }
        }
        return null;
    }
    
    public Integer createMenuItem(MenuItem menuItem) throws SQLException {
        String sql = "INSERT INTO menu_items (name, price, active) VALUES (?, ?, ?)";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            pstmt.setString(1, menuItem.getName());
            pstmt.setDouble(2, menuItem.getPrice());
            pstmt.setBoolean(3, menuItem.getActive() != null ? menuItem.getActive() : true);
            
            int affectedRows = pstmt.executeUpdate();
            
            if (affectedRows > 0) {
                try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        return generatedKeys.getInt(1);
                    }
                }
            }
        }
        return null;
    }
    
    public boolean updateMenuItem(MenuItem menuItem) throws SQLException {
        String sql = "UPDATE menu_items SET name = ?, price = ?, active = ? WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, menuItem.getName());
            pstmt.setDouble(2, menuItem.getPrice());
            pstmt.setBoolean(3, menuItem.getActive());
            pstmt.setInt(4, menuItem.getItemId());
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean toggleMenuItemStatus(int itemId, boolean active) throws SQLException {
        String sql = "UPDATE menu_items SET active = ? WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setBoolean(1, active);
            pstmt.setInt(2, itemId);
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteMenuItem(int itemId) throws SQLException {
        String sql = "DELETE FROM menu_items WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, itemId);
            return pstmt.executeUpdate() > 0;
        }
    }
}