package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class MenuItemDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDb() throws Exception {
        Path db = tempDir.newFile("menu.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        // Seed schema (via ensureSchema) then clear rows for clean assertions
        try (Connection conn = DatabaseConnection.getConnection(null);
                Statement stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM order_items");
            stmt.execute("DELETE FROM inventory");
            stmt.execute("DELETE FROM menu_items");
        }
    }

    @Test
    public void createAndFetchMenuItem() throws Exception {
        MenuItemDAO dao = new MenuItemDAO(null);
        MenuItem item = new MenuItem(null, "Margherita", "Classic", "Pizza", 12.5, true, "/img", "[\"veg\"]");

        String itemId = dao.createMenuItem(item);
        assertNotNull(itemId);

        MenuItem fetched = dao.getMenuItemById(itemId);
        assertEquals("Margherita", fetched.getName());
        assertTrue(fetched.getActive());
        assertEquals(Boolean.FALSE, fetched.getOutOfStock());
    }

    @Test
    public void getActiveMenuItemsWithInventoryCalculatesAvailability() throws Exception {
        MenuItemDAO dao = new MenuItemDAO(null);
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + System.getProperty("RBOS_DB"));
                Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO menu_items (item_id, name, description, category, price, active, image_url, dietary_tags, out_of_stock) VALUES ('1','Cheese','desc','Pizza',10.0,1,'/img','[\"veg\"]',0)");
            stmt.execute("INSERT INTO inventory (inventory_id, item_id, name, sku, category, unit, qty_on_hand, par_level, reorder_point, cost) VALUES ('inv1','1','Cheese','SKU-1','Pizza','each',5,2,1,1.25)");
        }

        List<MenuItemWithInventory> items = dao.getActiveMenuItemsWithInventory();
        assertEquals(1, items.size());
        MenuItemWithInventory inv = items.get(0);
        assertEquals(Integer.valueOf(5), inv.getQtyOnHand());
        assertTrue(inv.getAvailable());
    }
}
