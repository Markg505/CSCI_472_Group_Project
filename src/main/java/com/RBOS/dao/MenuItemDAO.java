package com.RBOS.dao;

import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MenuItemDAO {
    private ServletContext context;
    private AuditLogDAO auditLogDAO;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MenuItemDAO(ServletContext context) {
        this.context = context;
        this.auditLogDAO = new AuditLogDAO(context);
    }

    public List<MenuItem> getAllMenuItems() throws SQLException {
        List<MenuItem> menuItems = new ArrayList<>();
        String sql = "SELECT item_id, name, description, category, price, active, image_url, dietary_tags, out_of_stock, available_qty FROM menu_items ORDER BY item_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                boolean active = rs.getInt("active") == 1;
                boolean outOfStock = rs.getInt("out_of_stock") == 1;
                MenuItem item = new MenuItem(
                        rs.getString("item_id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getString("category"),
                        rs.getDouble("price"),
                        active,
                        rs.getString("image_url"),
                        rs.getString("dietary_tags")
                );
                item.setOutOfStock(outOfStock);
                item.setAvailableQty((Integer) rs.getObject("available_qty"));
                menuItems.add(item);
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
                boolean outOfStock = rs.getInt("out_of_stock") == 1;
                MenuItem item = new MenuItem(
                        rs.getString("item_id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getString("category"),
                        rs.getDouble("price"),
                        active,
                        rs.getString("image_url"),
                        rs.getString("dietary_tags")
                );
                item.setOutOfStock(outOfStock);
                item.setAvailableQty((Integer) rs.getObject("available_qty"));
                menuItems.add(item);
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
                boolean outOfStock = rs.getInt("out_of_stock") == 1;
                MenuItem item = new MenuItem(
                    rs.getString("item_id"),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getString("category"),
                    rs.getDouble("price"),
                    active,
                    rs.getString("image_url"),
                    rs.getString("dietary_tags")
                );
                item.setOutOfStock(outOfStock);
                item.setAvailableQty((Integer) rs.getObject("available_qty"));
                return item;
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
                boolean outOfStock = rs.getInt("out_of_stock") == 1;
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
                item.setAvailable(available && !outOfStock);  // Not available if marked out of stock
                item.setOutOfStock(outOfStock);
                menuItems.add(item);
            }
        }
        return menuItems;
    }

    // Backward compatible version without audit logging
    public String createMenuItem(MenuItem menuItem) throws SQLException {
        return createMenuItem(menuItem, null, null);
    }

    public String createMenuItem(MenuItem menuItem, String userId, String userName) throws SQLException {
        String itemId = menuItem.getItemId();
        if (itemId == null || itemId.isBlank()) {
            itemId = java.util.UUID.randomUUID().toString();
            menuItem.setItemId(itemId);
        }

        String sql = "INSERT INTO menu_items (name, description, category, price, active, image_url, dietary_tags, item_id, available_qty) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, menuItem.getName());
            pstmt.setString(2, menuItem.getDescription());
            pstmt.setString(3, menuItem.getCategory());
            pstmt.setDouble(4, menuItem.getPrice());
            pstmt.setBoolean(5, menuItem.getActive());
            pstmt.setString(6, menuItem.getImageUrl());
            pstmt.setString(7, menuItem.getDietaryTags());
            pstmt.setString(8, itemId);
            if (menuItem.getAvailableQty() != null) {
                pstmt.setInt(9, menuItem.getAvailableQty());
            } else {
                pstmt.setNull(9, java.sql.Types.INTEGER);
            }

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                // Log the creation
                if (userId != null && userName != null) {
                    Map<String, Object> newValues = new HashMap<>();
                    newValues.put("name", menuItem.getName());
                    newValues.put("price", menuItem.getPrice());
                    newValues.put("category", menuItem.getCategory());
                    newValues.put("active", menuItem.getActive());
                    auditLogDAO.log(
                            "menu_item",
                            itemId,
                            "create",
                            userId,
                            userName,
                            null,
                            objectToJson(newValues)
                    );
                }
                return itemId;
            }
        }
        return null;
    }

    // Backward compatible version without audit logging
    public boolean updateMenuItem(MenuItem menuItem) throws SQLException {
        return updateMenuItem(menuItem, null, null);
    }

    public boolean updateMenuItem(MenuItem menuItem, String userId, String userName) throws SQLException {
        // Get old values first for audit log
        MenuItem oldItem = getMenuItemById(menuItem.getItemId());

        String sql = "UPDATE menu_items SET name = ?, description = ?, category = ?, " +
                "price = ?, active = ?, image_url = ?, dietary_tags = ?, out_of_stock = ?, available_qty = ? WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, menuItem.getName());
            pstmt.setString(2, menuItem.getDescription());
            pstmt.setString(3, menuItem.getCategory());
            pstmt.setDouble(4, menuItem.getPrice());
            pstmt.setBoolean(5, menuItem.getActive());
            pstmt.setString(6, menuItem.getImageUrl());
            pstmt.setString(7, menuItem.getDietaryTags());
            pstmt.setBoolean(8, menuItem.getOutOfStock() != null ? menuItem.getOutOfStock() : false);
            if (menuItem.getAvailableQty() != null) {
                pstmt.setInt(9, menuItem.getAvailableQty());
            } else {
                pstmt.setNull(9, java.sql.Types.INTEGER);
            }
            pstmt.setString(10, menuItem.getItemId());

            boolean success = pstmt.executeUpdate() > 0;

            // Log the update
            if (success && userId != null && userName != null && oldItem != null) {
                Map<String, Object> oldValues = new HashMap<>();
                oldValues.put("name", oldItem.getName());
                oldValues.put("price", oldItem.getPrice());
                oldValues.put("category", oldItem.getCategory());
                oldValues.put("active", oldItem.getActive());
                oldValues.put("outOfStock", oldItem.getOutOfStock());

                Map<String, Object> newValues = new HashMap<>();
                newValues.put("name", menuItem.getName());
                newValues.put("price", menuItem.getPrice());
                newValues.put("category", menuItem.getCategory());
                newValues.put("active", menuItem.getActive());
                newValues.put("outOfStock", menuItem.getOutOfStock());

                auditLogDAO.log(
                        "menu_item",
                        menuItem.getItemId(),
                        "update",
                        userId,
                        userName,
                        objectToJson(oldValues),
                        objectToJson(newValues)
                );
            }

            return success;
        }
    }
    
    // Backward compatible version without audit logging
    public boolean toggleMenuItemStatus(String itemId, Boolean active) throws SQLException {
        return toggleMenuItemStatus(itemId, active, null, null);
    }

    public boolean toggleMenuItemStatus(String itemId, Boolean active, String userId, String userName) throws SQLException {
        // Get old value first for audit log
        MenuItem oldItem = getMenuItemById(itemId);

        String sql = "UPDATE menu_items SET active = ? WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setBoolean(1, active);
            pstmt.setString(2, itemId);

            boolean success = pstmt.executeUpdate() > 0;

            // Log the toggle
            if (success && userId != null && userName != null && oldItem != null) {
                Map<String, Object> oldValues = new HashMap<>();
                oldValues.put("active", oldItem.getActive());

                Map<String, Object> newValues = new HashMap<>();
                newValues.put("active", active);

                auditLogDAO.log(
                        "menu_item",
                        itemId,
                        "toggle_active",
                        userId,
                        userName,
                        objectToJson(oldValues),
                        objectToJson(newValues)
                );
            }

            return success;
        }
    }

    // Backward compatible version without audit logging
    public boolean deleteMenuItem(String itemId) throws SQLException {
        return deleteMenuItem(itemId, null, null);
    }

    public boolean deleteMenuItem(String itemId, String userId, String userName) throws SQLException {
        // Get old values first for audit log
        MenuItem oldItem = getMenuItemById(itemId);

        String sql = "DELETE FROM menu_items WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, itemId);
            boolean success = pstmt.executeUpdate() > 0;

            // Log the deletion
            if (success && userId != null && userName != null && oldItem != null) {
                Map<String, Object> oldValues = new HashMap<>();
                oldValues.put("name", oldItem.getName());
                oldValues.put("price", oldItem.getPrice());
                oldValues.put("category", oldItem.getCategory());

                auditLogDAO.log(
                        "menu_item",
                        itemId,
                        "delete",
                        userId,
                        userName,
                        objectToJson(oldValues),
                        null
                );
            }

            return success;
        }
    }

    /**
     * Decrements the available quantity for a menu item by the specified amount.
     * If the quantity reaches 0, the item is automatically marked as out of stock.
     * @param itemId The menu item ID
     * @param quantity The amount to decrement
     * @param conn The database connection (to support transactions)
     * @return true if the operation was successful
     */
    public boolean decrementAvailableQty(String itemId, int quantity, Connection conn) throws SQLException {
        // First, check if the item has available_qty tracking enabled
        String checkSql = "SELECT available_qty FROM menu_items WHERE item_id = ?";
        Integer currentQty = null;

        try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
            checkStmt.setString(1, itemId);
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next()) {
                    currentQty = (Integer) rs.getObject("available_qty");
                }
            }
        }

        // If available_qty is null, skip (unlimited inventory)
        if (currentQty == null) {
            return true;
        }

        // Calculate new quantity
        int newQty = Math.max(0, currentQty - quantity);

        // Update the quantity and set out_of_stock if it reaches 0
        String updateSql = "UPDATE menu_items SET available_qty = ?, out_of_stock = ? WHERE item_id = ?";
        try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
            updateStmt.setInt(1, newQty);
            updateStmt.setBoolean(2, newQty == 0);  // Auto set out_of_stock when qty reaches 0
            updateStmt.setString(3, itemId);

            return updateStmt.executeUpdate() > 0;
        }
    }

    private String objectToJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }
}
