package com.RBOS.services;

import static org.junit.Assert.*;

import org.junit.Test;

public class EmailTemplatesTest {

    @Test
    public void reservationConfirmationInterpolatesFields() {
        String html = EmailTemplates.getReservationConfirmationTemplate(
                "Alex", "2025-01-02", "18:30", 4, "Booth 1", "res-1");
        assertTrue(html.contains("Alex"));
        assertTrue(html.contains("2025-01-02"));
        assertTrue(html.contains("18:30"));
        assertTrue(html.contains("Booth 1"));
        assertTrue(html.contains("res-1"));
    }

    @Test
    public void orderTemplatesIncludeTotalsAndStatus() {
        String confirm = EmailTemplates.getOrderConfirmationTemplate("Pat", "ord-1", 25.5, "30 mins");
        assertTrue(confirm.contains("ord-1"));
        assertTrue(confirm.contains("$25.50"));

        String delivery = EmailTemplates.getDeliveryOrderConfirmationTemplate(
                "Sam", "ord-2", 40.0, "45 mins",
                "123 Main", "Apt 2", "Denver", "CO", "80014", "Leave at door");
        assertTrue(delivery.contains("123 Main"));
        assertTrue(delivery.contains("Apt 2"));
        assertTrue(delivery.contains("Denver"));
        assertTrue(delivery.contains("80014"));
        assertTrue(delivery.contains("Leave at door"));

        String status = EmailTemplates.getOrderStatusUpdateTemplate("Riley", "ord-3", "ready", "Come pick up");
        assertTrue(status.contains("ord-3"));
        assertTrue(status.contains("ready"));
        assertTrue(status.contains("Come pick up"));
    }

    @Test
    public void adminNotificationIncludesSubjectAndMessage() {
        String html = EmailTemplates.getAdminNotificationTemplate("Alert", "Something happened");
        assertTrue(html.contains("Alert"));
        assertTrue(html.contains("Something happened"));
    }
}
