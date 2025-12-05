package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.OrderItem;
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

public class OrderItemDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDb() throws Exception {
        Path db = tempDir.newFile("orderitems.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        try (Connection conn = DatabaseConnection.getConnection(null)) {
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("DELETE FROM order_items");
                stmt.execute("DELETE FROM orders");
                stmt.execute("DELETE FROM menu_items");
                stmt.execute("INSERT INTO orders (order_id) VALUES ('o1')");
                stmt.execute("INSERT INTO menu_items (item_id, name, description, category, price, active, image_url, dietary_tags, out_of_stock) VALUES ('m1','Burger','desc','Main',9.5,1,'/img','[]',0)");
            }
        }
    }

    @Test
    public void createAndFetchOrderItems() throws Exception {
        OrderItemDAO dao = new OrderItemDAO(null);
        OrderItem item = new OrderItem(null, "o1", "m1", 2, 9.5, 19.0, "no pickles");

        String id = dao.createOrderItem(item);
        assertNotNull(id);

        List<OrderItem> items = dao.getOrderItemsByOrderId("o1");
        assertEquals(1, items.size());
        OrderItem loaded = items.get(0);
        assertEquals("m1", loaded.getItemId());
        assertEquals("Burger", loaded.getMenuItem().getName());
        assertEquals(2, loaded.getQty().intValue());
    }
}
