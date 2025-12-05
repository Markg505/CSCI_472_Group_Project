package com.RBOS.models;

import static org.junit.Assert.*;

import org.junit.Test;

public class ModelPojoTest {

    @Test
    public void reportMetricsTracksValues() {
        ReportMetrics metrics = new ReportMetrics(1, 2, 3.5, 4, 5, 6, 7);
        assertEquals(1, metrics.getTodayReservations());
        assertEquals(2, metrics.getPendingReservations());
        assertEquals(3.5, metrics.getTodayRevenue(), 0.001);
        assertEquals(4, metrics.getTodayOrders());
        assertEquals(5, metrics.getTotalCustomers());
        assertEquals(6, metrics.getTotalReservations());
        assertEquals(7, metrics.getTotalOrders());

        metrics.setTodayReservations(8);
        metrics.setPendingReservations(9);
        metrics.setTodayRevenue(10.5);
        metrics.setTodayOrders(11);
        metrics.setTotalCustomers(12);
        metrics.setTotalReservations(13);
        metrics.setTotalOrders(14);

        assertEquals(8, metrics.getTodayReservations());
        assertEquals(9, metrics.getPendingReservations());
        assertEquals(10.5, metrics.getTodayRevenue(), 0.001);
        assertEquals(11, metrics.getTodayOrders());
        assertEquals(12, metrics.getTotalCustomers());
        assertEquals(13, metrics.getTotalReservations());
        assertEquals(14, metrics.getTotalOrders());
    }

    @Test
    public void profileUpdatePayloadStoresFields() {
        ProfileUpdatePayload payload = new ProfileUpdatePayload();
        payload.setFullName("New Name");
        payload.setEmail("new@example.com");
        payload.setPhone("555-1010");
        payload.setProfileImageUrl("http://img.example.com/pic.png");
        payload.setAddress("123 Main");
        payload.setAddress2("Unit B");
        payload.setCity("Springfield");
        payload.setState("IL");
        payload.setPostalCode("62704");

        assertEquals("New Name", payload.getFullName());
        assertEquals("new@example.com", payload.getEmail());
        assertEquals("555-1010", payload.getPhone());
        assertEquals("http://img.example.com/pic.png", payload.getProfileImageUrl());
        assertEquals("123 Main", payload.getAddress());
        assertEquals("Unit B", payload.getAddress2());
        assertEquals("Springfield", payload.getCity());
        assertEquals("IL", payload.getState());
        assertEquals("62704", payload.getPostalCode());
    }

    @Test
    public void menuItemWithInventoryExtendsMenuItem() {
        MenuItemWithInventory item = new MenuItemWithInventory(
                "1", "Pizza", "Cheese", "Food", 9.99, true, "/img.png", "[\"veg\"]");
        item.setQtyOnHand(5);
        item.setParLevel(3);
        item.setReorderPoint(2);
        item.setAvailable(true);

        assertEquals("Pizza", item.getName());
        assertEquals(Integer.valueOf(5), item.getQtyOnHand());
        assertEquals(Integer.valueOf(3), item.getParLevel());
        assertEquals(Integer.valueOf(2), item.getReorderPoint());
        assertEquals(Boolean.TRUE, item.getAvailable());
    }

    @Test
    public void auditLogConstructorAssignsFields() {
        AuditLog log = new AuditLog("1", "order", "123", "create", "u1", "Admin", "old", "new", "now");
        assertEquals("1", log.logId);
        assertEquals("order", log.entityType);
        assertEquals("123", log.entityId);
        assertEquals("create", log.action);
        assertEquals("u1", log.userId);
        assertEquals("Admin", log.userName);
        assertEquals("old", log.oldValue);
        assertEquals("new", log.newValue);
        assertEquals("now", log.createdUtc);
    }
}
