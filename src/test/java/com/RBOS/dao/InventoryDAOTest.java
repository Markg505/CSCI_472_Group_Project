package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.Inventory;
import com.RBOS.models.MenuItem;
import com.RBOS.models.Unit;
import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class InventoryDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private InventoryDAO dao;

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("inventory.db").toPath();
        System.setProperty("RBOS_DB", db.toString());
        try (Connection conn = DatabaseConnection.getConnection(null); Statement stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM order_items");
            stmt.execute("DELETE FROM orders");
            stmt.execute("DELETE FROM inventory");
            stmt.execute("DELETE FROM menu_items");
            // seed a menu item for FK
            stmt.execute("INSERT INTO menu_items (item_id, name, description, category, price, active, image_url, dietary_tags) VALUES ('m1','Menu','desc','Main',5.0,1,null,'[]')");
        }
        dao = new InventoryDAO(null);
    }

    @Test
    public void getLowStockItemsReturnsOnlyBelowReorderPoint() throws Exception {
        Inventory low = new Inventory();
        low.setInventoryId("inv-low");
        low.setItemId("m1");
        low.setName("Low");
        low.setSku("LOW");
        low.setCategory("Dry");
        low.setUnit(Unit.each);
        low.setPackSize(1);
        low.setQtyOnHand(1);
        low.setParLevel(5);
        low.setReorderPoint(2);
        low.setCost(1.0);
        low.setActive(true);
        dao.createInventory(low);

        Inventory ok = new Inventory();
        ok.setInventoryId("inv-ok");
        ok.setItemId("m1");
        ok.setName("OK");
        ok.setSku("OK");
        ok.setCategory("Dry");
        ok.setUnit(Unit.each);
        ok.setPackSize(1);
        ok.setQtyOnHand(10);
        ok.setParLevel(5);
        ok.setReorderPoint(2);
        ok.setCost(1.0);
        ok.setActive(true);
        dao.createInventory(ok);

        List<Inventory> lowStock = dao.getLowStockItems();
        assertEquals(1, lowStock.size());
        assertEquals("m1", lowStock.get(0).getItemId());
    }

    @Test
    public void decrementInventoryRespectsQtyOnHand() throws Exception {
        Inventory inv = new Inventory();
        inv.setInventoryId("inv-dec");
        inv.setItemId("m1");
        inv.setName("Dec");
        inv.setSku("DEC");
        inv.setCategory("Dry");
        inv.setUnit(Unit.each);
        inv.setPackSize(1);
        inv.setQtyOnHand(3);
        inv.setParLevel(0);
        inv.setReorderPoint(0);
        inv.setCost(1.0);
        inv.setActive(true);
        dao.createInventory(inv);

        // insufficient stock
        assertFalse(dao.decrementInventory("m1", 5));
        // valid decrement
        assertTrue(dao.decrementInventory("m1", 2));
        Inventory updated = dao.getInventoryByItemId("m1");
        assertEquals(Integer.valueOf(1), updated.getQtyOnHand());
    }
}
