package com.RBOS.dao;

import com.RBOS.models.*;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class InventoryDAO {
    private ServletContext context;

    public InventoryDAO(ServletContext context) {
        this.context = context;
    }

    public List<Inventory> getAllInventory() throws SQLException {
        List<Inventory> inventoryList = new ArrayList<>();
        String sql = "SELECT i.*, m.name as menu_item_name, m.price as menu_item_price " +
                "FROM inventory i " +
                "LEFT JOIN menu_items m ON i.item_id = m.item_id " +
                "ORDER BY i.inventory_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                Inventory inventory = mapResultSetToInventory(rs);
                inventoryList.add(inventory);
            }
        }
        return inventoryList;
    }

    private Inventory mapResultSetToInventory(ResultSet rs) throws SQLException {
        Inventory inventory = new Inventory();
        inventory.setInventoryId(rs.getString("inventory_id"));
        inventory.setItemId(rs.getString("item_id"));
        inventory.setName(rs.getString("name"));
        inventory.setSku(rs.getString("sku"));
        inventory.setCategory(rs.getString("category"));

        // Handle Unit enum conversion safely
        try {
            inventory.setUnit(Unit.valueOf(rs.getString("unit")));
        } catch (IllegalArgumentException e) {
            inventory.setUnit(Unit.each); // Default value
        }

        boolean active = rs.getInt("active") == 1;

        inventory.setPackSize(rs.getInt("pack_size"));
        inventory.setQtyOnHand(rs.getInt("qty_on_hand"));
        inventory.setParLevel(rs.getInt("par_level"));
        inventory.setReorderPoint(rs.getInt("reorder_point"));
        inventory.setCost(rs.getDouble("cost"));
        inventory.setLocation(rs.getString("location"));
        inventory.setActive(active);
        inventory.setVendor(rs.getString("vendor"));
        inventory.setLeadTimeDays(rs.getInt("lead_time_days"));
        inventory.setPreferredOrderQty(rs.getInt("preferred_order_qty"));
        inventory.setWasteQty(rs.getInt("waste_qty"));
        inventory.setLastCountedAt(rs.getString("last_counted_at"));

        // Handle CountFreq enum conversion safely
        try {
            inventory.setCountFreq(CountFreq.valueOf(rs.getString("count_freq")));
        } catch (IllegalArgumentException e) {
            inventory.setCountFreq(CountFreq.weekly); // Default value
        }

        inventory.setLot(rs.getString("lot"));
        inventory.setExpiryDate(rs.getString("expiry_date"));

        // Handle Allergen enum conversion safely
        try {
            inventory.setAllergen(Allergen.valueOf(rs.getString("allergen")));
        } catch (IllegalArgumentException e) {
            inventory.setAllergen(Allergen.none); // Default value
        }

        inventory.setConversion(rs.getString("conversion"));
        inventory.setCreatedUtc(rs.getString("created_utc"));

        // Set related menu item if available
        if (rs.getString("menu_item_name") != null) {
            MenuItem menuItem = new MenuItem();
            menuItem.setItemId(rs.getString("item_id"));
            menuItem.setName(rs.getString("menu_item_name"));
            menuItem.setPrice(rs.getDouble("menu_item_price"));
            inventory.setMenuItem(menuItem);
        }

        return inventory;
    }

    public Inventory getInventoryByItemId(String itemId) throws SQLException {
        String sql = "SELECT i.*, m.name as menu_item_name, m.price as menu_item_price " +
                "FROM inventory i " +
                "LEFT JOIN menu_items m ON i.item_id = m.item_id " +
                "WHERE i.item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, itemId);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                return mapResultSetToInventory(rs);
            }
        }
        return null;
    }

    public boolean updateInventoryQuantity(String itemId, int newQuantity) throws SQLException {
        String sql = "UPDATE inventory SET qty_on_hand = ?, last_counted_at = datetime('now') WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, newQuantity);
            pstmt.setString(2, itemId);

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean decrementInventory(String itemId, int quantity) throws SQLException {
        String sql = "UPDATE inventory SET qty_on_hand = qty_on_hand - ?, last_counted_at = datetime('now') " +
                "WHERE item_id = ? AND qty_on_hand >= ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, quantity);
            pstmt.setString(2, itemId);
            pstmt.setInt(3, quantity);

            return pstmt.executeUpdate() > 0;
        }
    }

    public List<Inventory> getLowStockItems() throws SQLException {
        List<Inventory> lowStockList = new ArrayList<>();
        String sql = "SELECT i.*, m.name as menu_item_name, m.price as menu_item_price " +
                "FROM inventory i " +
                "LEFT JOIN menu_items m ON i.item_id = m.item_id " +
                "WHERE i.qty_on_hand <= i.reorder_point AND i.active = 1 " +
                "ORDER BY i.qty_on_hand ASC";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                Inventory inventory = mapResultSetToInventory(rs);
                lowStockList.add(inventory);
            }
        }
        return lowStockList;
    }

    public Integer createInventory(Inventory inventory) throws SQLException {
        String sql = "INSERT INTO inventory (item_id, name, sku, category, unit, pack_size, " +
                "qty_on_hand, par_level, reorder_point, cost, location, active, vendor, " +
                "lead_time_days, preferred_order_qty, waste_qty, last_counted_at, count_freq, " +
                "lot, expiry_date, allergen, conversion) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            setInventoryPreparedStatement(pstmt, inventory);

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

    private void setInventoryPreparedStatement(PreparedStatement pstmt, Inventory inventory) throws SQLException {
        pstmt.setString(1, inventory.getItemId());
        pstmt.setString(2, inventory.getName());
        pstmt.setString(3, inventory.getSku());
        pstmt.setString(4, inventory.getCategory());
        pstmt.setString(5, inventory.getUnit() != null ? inventory.getUnit().name() : Unit.each.name());
        pstmt.setInt(6, inventory.getPackSize() != null ? inventory.getPackSize() : 1);
        pstmt.setInt(7, inventory.getQtyOnHand() != null ? inventory.getQtyOnHand() : 0);
        pstmt.setInt(8, inventory.getParLevel() != null ? inventory.getParLevel() : 0);
        pstmt.setInt(9, inventory.getReorderPoint() != null ? inventory.getReorderPoint() : 0);
        pstmt.setDouble(10, inventory.getCost() != null ? inventory.getCost() : 0.0);
        pstmt.setString(11, inventory.getLocation());
        pstmt.setBoolean(12, inventory.getActive() != null ? inventory.getActive() : true);
        pstmt.setString(13, inventory.getVendor());
        pstmt.setInt(14, inventory.getLeadTimeDays() != null ? inventory.getLeadTimeDays() : 0);
        pstmt.setInt(15, inventory.getPreferredOrderQty() != null ? inventory.getPreferredOrderQty() : 0);
        pstmt.setInt(16, inventory.getWasteQty() != null ? inventory.getWasteQty() : 0);
        pstmt.setString(17, inventory.getLastCountedAt());
        pstmt.setString(18, inventory.getCountFreq() != null ? inventory.getCountFreq().name() : CountFreq.weekly.name());
        pstmt.setString(19, inventory.getLot());
        pstmt.setString(20, inventory.getExpiryDate());
        pstmt.setString(21, inventory.getAllergen() != null ? inventory.getAllergen().name() : Allergen.none.name());
        pstmt.setString(22, inventory.getConversion());
    }

    // Additional utility methods for inventory management
    public boolean updateInventory(Inventory inventory) throws SQLException {
        String sql = "UPDATE inventory SET name = ?, sku = ?, category = ?, unit = ?, pack_size = ?, " +
                "qty_on_hand = ?, par_level = ?, reorder_point = ?, cost = ?, location = ?, active = ?, " +
                "vendor = ?, lead_time_days = ?, preferred_order_qty = ?, waste_qty = ?, last_counted_at = ?, " +
                "count_freq = ?, lot = ?, expiry_date = ?, allergen = ?, conversion = ? " +
                "WHERE inventory_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            setInventoryPreparedStatement(pstmt, inventory);
            pstmt.setString(23, inventory.getInventoryId());

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteInventory(String inventoryId) throws SQLException {
        String sql = "DELETE FROM inventory WHERE inventory_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, inventoryId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public List<Inventory> getInventoryByCategory(String category) throws SQLException {
        List<Inventory> inventoryList = new ArrayList<>();
        String sql = "SELECT i.*, m.name as menu_item_name, m.price as menu_item_price " +
                "FROM inventory i " +
                "LEFT JOIN menu_items m ON i.item_id = m.item_id " +
                "WHERE i.category = ? AND i.active = 1 " +
                "ORDER BY i.name";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, category);
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                Inventory inventory = mapResultSetToInventory(rs);
                inventoryList.add(inventory);
            }
        }
        return inventoryList;
    }
}