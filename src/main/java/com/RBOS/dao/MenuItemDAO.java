package com.RBOS.dao;

<<<<<<<HEAD

import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;=======
import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;>>>>>>>53100d e(fixed all the stuff i broke trying to fix a merge)
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

<<<<<<<HEAD

public class MenuItemDAO {
    private ServletContext context;
    private AuditLogDAO auditLogDAO;
    private final ObjectMapper objectMapper = new ObjectMapper();=======

    public class MenuItemDAO {
        private ServletContext context;
        private AuditLogDAO auditLogDAO;
        private final ObjectMapper objectMapper = new ObjectMapper();>>>>>>>53100de (fixed all the stuff i broke trying to fix a merge)

        public MenuItemDAO(ServletContext context) {
            this.context = context;
            this.auditLogDAO = new AuditLogDAO(context);
        }

        public List<MenuItem> getAllMenuItems() throws SQLException {
            List<MenuItem> menuItems = new ArrayList<>();
            String sql = "SELECT item_id, name, description, category, price, active, image_url, dietary_tags, out_of_stock FROM menu_items ORDER BY item_id";

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
                            rs.getString("dietary_tags"));
                    item.setOutOfStock(outOfStock);
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
                            rs.getString("dietary_tags"));
                    item.setOutOfStock(outOfStock);
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
                            rs.getString("dietary_tags"));
                    item.setOutOfStock(outOfStock);
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
                            rs.getString("dietary_tags"));

                    boolean available = rs.getInt("available") == 1;

                    // Set inventory info
                    item.setQtyOnHand(rs.getInt("qty_on_hand"));
                    item.setParLevel(rs.getInt("par_level"));
                    item.setReorderPoint(rs.getInt("reorder_point"));
                    item.setAvailable(available && !outOfStock); // Not available if marked out of stock
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

        String sql = "INSERT INTO menu_items (name, description, category, price, active, image_url, dietary_tags, item_id) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

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

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
<<<<<<< HEAD
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
                            objectToJson(newValues));
                }
                return itemId;
            }
        }
=======
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
    }>>>>>>>53100de (fixed all the stuff i broke trying to fix a merge)
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
                "price = ?, active = ?, image_url = ?, dietary_tags = ?, out_of_stock = ? WHERE item_id = ?";

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
            pstmt.setString(9, menuItem.getItemId());

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

<<<<<<< HEAD
                auditLogDAO.log(
                        "menu_item",
                        menuItem.getItemId(),
                        "update",
                        userId,
                        userName,
                        objectToJson(oldValues),
                        objectToJson(newValues));
            }

            return success;
=======
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
>>>>>>> 53100de (fixed all the stuff i broke trying to fix a merge)
        }

    }

    // Backward compatible version without audit logging
    public boolean toggleMenuItemStatus(String itemId, Boolean active) throws SQLException {
        return toggleMenuItemStatus(itemId, active, null, null);
    }

    public boolean toggleMenuItemStatus(String itemId, Boolean active, String userId, String userName)
            throws SQLException {
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
                        objectToJson(newValues));
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
                        null);
            }

            return success;
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
