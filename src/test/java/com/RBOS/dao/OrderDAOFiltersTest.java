package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.Order;
import com.RBOS.models.OrderItem;
import com.RBOS.models.PagedResult;
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

public class OrderDAOFiltersTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private OrderDAO orderDAO;

    @Before
    public void setupDatabase() throws Exception {
        Path db = tempDir.newFile("orders.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        try (Connection conn = DatabaseConnection.getConnection(null)) {
            createTables(conn);
            seedUsers(conn);
            seedMenuItems(conn);
            seedOrders(conn);
            seedOrderItems(conn);
        }

        orderDAO = new OrderDAO(null);
    }

    @Test
    public void filtersByStatusDateAndUserAndIncludesOrderItems() throws Exception {
        PagedResult<Order> result = orderDAO.getOrdersWithFilters(
                "placed",
                "2024-01-01T00:00:00Z",
                "2024-01-02T23:59:59Z",
                "user-1",
                1,
                5);

        assertEquals(1, result.getTotal());
        assertEquals(1, result.getItems().size());

        Order order = result.getItems().get(0);
        assertEquals("order-1", order.getOrderId());
        assertEquals("delivery", order.getFulfillmentType());
        assertEquals("Customer One", order.getCustomerName());
        assertEquals("Portales", order.getDeliveryCity());
        List<OrderItem> items = order.getOrderItems();
        assertNotNull("Order items should be loaded from join", items);
        assertEquals(1, items.size());
        assertEquals("menu-1", items.get(0).getItemId());
        assertEquals("Menu One", items.get(0).getMenuItem().getName());
    }

    @Test
    public void statusAllWithPaginationOrdersByCreatedUtc() throws Exception {
        PagedResult<Order> pageOne = orderDAO.getOrdersWithFilters(
                "all", null, null, null, 1, 2);

        assertEquals(3, pageOne.getTotal());
        assertEquals(2, pageOne.getItems().size());
        assertEquals("order-3", pageOne.getItems().get(0).getOrderId());
        assertEquals("order-2", pageOne.getItems().get(1).getOrderId());

        PagedResult<Order> pageTwo = orderDAO.getOrdersWithFilters(
                "all", null, null, null, 2, 2);

        assertEquals(3, pageTwo.getTotal());
        assertEquals(1, pageTwo.getItems().size());
        assertEquals("order-1", pageTwo.getItems().get(0).getOrderId());
    }

    private void createTables(Connection conn) throws Exception {
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("DROP TABLE IF EXISTS order_items");
            stmt.execute("DROP TABLE IF EXISTS orders");
            stmt.execute("DROP TABLE IF EXISTS menu_items");
            stmt.execute("DROP TABLE IF EXISTS users");
            stmt.execute("CREATE TABLE users (user_id TEXT PRIMARY KEY, role TEXT, full_name TEXT, email TEXT, phone TEXT, password_hash TEXT)");
            stmt.execute("CREATE TABLE menu_items (item_id TEXT PRIMARY KEY, name TEXT, price REAL)");
            stmt.execute("CREATE TABLE orders (" +
                    "order_id TEXT PRIMARY KEY, " +
                    "user_id TEXT, " +
                    "cart_token TEXT, " +
                    "source TEXT, " +
                    "status TEXT, " +
                    "fulfillment_type TEXT, " +
                    "subtotal REAL, " +
                    "tax REAL, " +
                    "total REAL, " +
                    "customer_name TEXT, " +
                    "customer_phone TEXT, " +
                    "customer_email TEXT, " +
                    "delivery_address TEXT, " +
                    "delivery_address2 TEXT, " +
                    "delivery_city TEXT, " +
                    "delivery_state TEXT, " +
                    "delivery_postal_code TEXT, " +
                    "delivery_instructions TEXT, " +
                    "created_utc TEXT, " +
                    "FOREIGN KEY (user_id) REFERENCES users(user_id))");
            stmt.execute("CREATE TABLE order_items (order_item_id TEXT PRIMARY KEY, order_id TEXT, item_id TEXT, qty INTEGER, unit_price REAL, line_total REAL, notes TEXT, FOREIGN KEY (order_id) REFERENCES orders(order_id), FOREIGN KEY (item_id) REFERENCES menu_items(item_id))");
        }
    }

    private void seedUsers(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO users (user_id, role, full_name, email, phone, password_hash) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, "user-1");
            ps.setString(2, "customer");
            ps.setString(3, "Customer One");
            ps.setString(4, "one@example.com");
            ps.setString(5, "555-1000");
            ps.setString(6, "hash");
            ps.executeUpdate();

            ps.setString(1, "user-2");
            ps.setString(2, "customer");
            ps.setString(3, "Customer Two");
            ps.setString(4, "two@example.com");
            ps.setString(5, "555-2000");
            ps.setString(6, "hash");
            ps.executeUpdate();
        }
    }

    private void seedMenuItems(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO menu_items (item_id, name, price) VALUES (?,?,?)")) {
            ps.setString(1, "menu-1");
            ps.setString(2, "Menu One");
            ps.setDouble(3, 10.0);
            ps.executeUpdate();

            ps.setString(1, "menu-2");
            ps.setString(2, "Menu Two");
            ps.setDouble(3, 12.5);
            ps.executeUpdate();
        }
    }

    private void seedOrders(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO orders (" +
                        "order_id, user_id, cart_token, source, status, fulfillment_type, subtotal, tax, total, " +
                        "customer_name, customer_phone, customer_email, delivery_address, delivery_address2, " +
                        "delivery_city, delivery_state, delivery_postal_code, delivery_instructions, created_utc" +
                        ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            ps.setString(1, "order-1");
            ps.setString(2, "user-1");
            ps.setString(3, "cart-1");
            ps.setString(4, "web");
            ps.setString(5, "placed");
            ps.setString(6, "delivery");
            ps.setDouble(7, 20.0);
            ps.setDouble(8, 1.6);
            ps.setDouble(9, 21.6);
            ps.setString(10, "Customer One");
            ps.setString(11, "555-1000");
            ps.setString(12, "one@example.com");
            ps.setString(13, "123 Main St");
            ps.setString(14, "Apt 1");
            ps.setString(15, "Portales");
            ps.setString(16, "NM");
            ps.setString(17, "88130");
            ps.setString(18, "Leave at door");
            ps.setString(19, "2024-01-01T10:00:00Z");
            ps.executeUpdate();

            ps.setString(1, "order-2");
            ps.setString(2, "user-1");
            ps.setString(3, "cart-2");
            ps.setString(4, "web");
            ps.setString(5, "paid");
            ps.setString(6, "carryout");
            ps.setDouble(7, 30.0);
            ps.setDouble(8, 2.4);
            ps.setDouble(9, 32.4);
            ps.setString(10, "Customer One");
            ps.setString(11, "555-1000");
            ps.setString(12, "one@example.com");
            ps.setString(13, "123 Main St");
            ps.setString(14, "Apt 1");
            ps.setString(15, "Portales");
            ps.setString(16, "NM");
            ps.setString(17, "88130");
            ps.setString(18, "Pickup at counter");
            ps.setString(19, "2024-01-02T10:00:00Z");
            ps.executeUpdate();

            ps.setString(1, "order-3");
            ps.setString(2, "user-2");
            ps.setString(3, "cart-3");
            ps.setString(4, "phone");
            ps.setString(5, "cancelled");
            ps.setString(6, "delivery");
            ps.setDouble(7, 15.0);
            ps.setDouble(8, 1.2);
            ps.setDouble(9, 16.2);
            ps.setString(10, "Customer Two");
            ps.setString(11, "555-2000");
            ps.setString(12, "two@example.com");
            ps.setString(13, "456 Market St");
            ps.setString(14, null);
            ps.setString(15, "Denver");
            ps.setString(16, "CO");
            ps.setString(17, "80202");
            ps.setString(18, "Ring bell");
            ps.setString(19, "2024-01-03T10:00:00Z");
            ps.executeUpdate();
        }
    }

    private void seedOrderItems(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO order_items (order_item_id, order_id, item_id, qty, unit_price, line_total, notes) VALUES (?,?,?,?,?,?,?)")) {
            ps.setString(1, "oi-1");
            ps.setString(2, "order-1");
            ps.setString(3, "menu-1");
            ps.setInt(4, 1);
            ps.setDouble(5, 10.0);
            ps.setDouble(6, 10.0);
            ps.setString(7, "no notes");
            ps.executeUpdate();

            ps.setString(1, "oi-2");
            ps.setString(2, "order-2");
            ps.setString(3, "menu-2");
            ps.setInt(4, 2);
            ps.setDouble(5, 12.5);
            ps.setDouble(6, 25.0);
            ps.setString(7, "extra cheese");
            ps.executeUpdate();
        }
    }
}
