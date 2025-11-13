package com.RBOS.dao;

import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
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
        String sql = "SELECT item_id, name, description, category, price, active, image_url, dietary_tags FROM menu_items ORDER BY item_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                boolean active = rs.getInt("active") == 1;
                menuItems.add(new MenuItem(
                        rs.getString("item_id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getString("category"),
                        rs.getDouble("price"),
                        active,
                        rs.getString("image_url"),
                        rs.getString("dietary_tags")
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
                boolean active = rs.getInt("active") == 1;
                menuItems.add(new MenuItem(
                        rs.getString("item_id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getString("category"),
                        rs.getDouble("price"),
                        active,
                        rs.getString("image_url"),
                        rs.getString("dietary_tags")
                ));
            }
        }
        return menuItems;
    }
    
    public MenuItem getMenuItemById(String itemId) throws SQLException {
        String sql = "SELECT * FROM menu_items WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, itemId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                boolean active = rs.getInt("active") == 1;
                return new MenuItem(
                    rs.getString("item_id"),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getString("category"),
                    rs.getDouble("price"),
                    active,
                    rs.getString("image_url"),
                    rs.getString("dietary_tags")
                );
            }
        }
        return null;
    }

    public List<MenuItemWithInventory> getActiveMenuItemsWithInventory() throws SQLException {
        List<MenuItemWithInventory> menuItems = new ArrayList<>();
        String sql = "SELECT m.*, i.qty_on_hand, i.par_level, i.reorder_point, " +
                    "CASE WHEN i.qty_on_hand > 0 THEN 1 ELSE 0 END as available " +
                    "FROM menu_items m " +
                    "LEFT JOIN inventory i ON m.item_id = i.item_id " +
                    "WHERE m.active = 1 " +
                    "ORDER BY m.item_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
            PreparedStatement pstmt = conn.prepareStatement(sql);
            ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                boolean active = rs.getInt("active") == 1;
                MenuItemWithInventory item = new MenuItemWithInventory(
                    rs.getString("item_id"),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getString("category"),
                    rs.getDouble("price"),
                    active,
                    rs.getString("image_url"),
                    rs.getString("dietary_tags")
                );

                boolean available = rs.getInt("available") == 1;

                // Set inventory info
                item.setQtyOnHand(rs.getInt("qty_on_hand"));
                item.setParLevel(rs.getInt("par_level"));
                item.setReorderPoint(rs.getInt("reorder_point"));
                item.setAvailable(available);
                menuItems.add(item);
            }
        }
        return menuItems;
    }

    public String createMenuItem(MenuItem menuItem) throws SQLException {
        String sql = "INSERT INTO menu_items (name, description, category, price, active, image_url, dietary_tags) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, menuItem.getName());
            pstmt.setString(2, menuItem.getDescription());
            pstmt.setString(3, menuItem.getCategory());
            pstmt.setDouble(4, menuItem.getPrice());
            pstmt.setBoolean(5, menuItem.getActive());
            pstmt.setString(6, menuItem.getImageUrl());
            pstmt.setString(7, menuItem.getDietaryTags());

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

    public boolean updateMenuItem(MenuItem menuItem) throws SQLException {
        String sql = "UPDATE menu_items SET name = ?, description = ?, category = ?, " +
                "price = ?, active = ?, image_url = ?, dietary_tags = ? WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, menuItem.getName());
            pstmt.setString(2, menuItem.getDescription());
            pstmt.setString(3, menuItem.getCategory());
            pstmt.setDouble(4, menuItem.getPrice());
            pstmt.setBoolean(5, menuItem.getActive());
            pstmt.setString(6, menuItem.getImageUrl());
            pstmt.setString(7, menuItem.getDietaryTags());
            pstmt.setString(8, menuItem.getItemId());

            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean toggleMenuItemStatus(String itemId, Boolean active) throws SQLException {
        String sql = "UPDATE menu_items SET active = ? WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setBoolean(1, active);
            pstmt.setString(2, itemId);
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteMenuItem(String itemId) throws SQLException {
        String sql = "DELETE FROM menu_items WHERE item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, itemId);
            return pstmt.executeUpdate() > 0;
        }
    }
}