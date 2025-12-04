package com.RBOS.services;

public class EmailTemplates {

    public static String getBaseTemplate(String title, String content) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #d4af37, #b8941f); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                        .button { display: inline-block; padding: 12px 24px; background: #d4af37; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Restaurant GEM</h1>
                            <p>Where culinary excellence meets exceptional service</p>
                        </div>
                        <div class="content">
                            <h2>%s</h2>
                            %s
                        </div>
                        <div class="footer">
                            <p>&copy; 2024 Restaurant GEM. All rights reserved.</p>
                            <p>123 Culinary Street, Food City, FC 12345</p>
                            <p>Phone: (555) 123-4567 | Email: info@restaurantgem.com</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                .formatted(title, content);
    }

    public static String getReservationConfirmationTemplate(String customerName, String date,
            String time, int partySize,
            String tableName, String reservationId) {
        String content = """
                <p>Dear %s,</p>
                <p>Your reservation has been confirmed! We're looking forward to welcoming you.</p>

                <div class="details">
                    <h3>Reservation Details</h3>
                    <p><strong>Reservation ID:</strong> %s</p>
                    <p><strong>Date:</strong> %s</p>
                    <p><strong>Time:</strong> %s</p>
                    <p><strong>Party Size:</strong> %d guests</p>
                    <p><strong>Table:</strong> %s</p>
                </div>

                <p>Please arrive 5-10 minutes before your reservation time. If you need to make any changes,
                please contact us at least 2 hours in advance.</p>

                <p>We look forward to serving you!</p>
                <p><strong>The GEM Team</strong></p>
                """.formatted(customerName, reservationId, date, time, partySize, tableName);

        return getBaseTemplate("Reservation Confirmed", content);
    }

    public static String getReservationUpdateTemplate(String customerName, String date,
            String time, String status, String reservationId) {
        String statusMessage = switch (status.toLowerCase()) {
            case "confirmed" -> "has been confirmed";
            case "cancelled" -> "has been cancelled";
            case "no_show" -> "was marked as no-show";
            default -> "status has been updated to: " + status;
        };

        String content = """
                <p>Dear %s,</p>
                <p>Your reservation %s.</p>

                <div class="details">
                    <h3>Reservation Update</h3>
                    <p><strong>Reservation ID:</strong> %s</p>
                    <p><strong>Date:</strong> %s</p>
                    <p><strong>Time:</strong> %s</p>
                    <p><strong>Status:</strong> %s</p>
                </div>
                """.formatted(customerName, statusMessage, reservationId, date, time, status);

        if ("cancelled".equalsIgnoreCase(status)) {
            content += """
                    <p>We're sorry to see you cancel. We hope to welcome you another time!</p>
                    """;
        }

        content += "<p><strong>The GEM Team</strong></p>";

        return getBaseTemplate("Reservation Update", content);
    }

    public static String getOrderConfirmationTemplate(String customerName, String orderId,
            double total, String estimatedTime) {
        String content = """
                <p>Dear %s,</p>
                <p>Thank you for your order! We're preparing your food with care.</p>

                <div class="details">
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> %s</p>
                    <p><strong>Total Amount:</strong> $%.2f</p>
                    <p><strong>Estimated Ready Time:</strong> %s</p>
                </div>

                <p>You'll receive another notification when your order is ready for pickup.</p>
                <p><strong>The GEM Team</strong></p>
                """.formatted(customerName, orderId, total, estimatedTime);

        return getBaseTemplate("Order Confirmed", content);
    }

    public static String getDeliveryOrderConfirmationTemplate(String customerName, String orderId,
            double total, String estimatedTime, String deliveryAddress, String deliveryAddress2,
            String deliveryCity, String deliveryState, String deliveryPostalCode, String deliveryInstructions) {

        // Build full address string
        StringBuilder addressBuilder = new StringBuilder();
        if (deliveryAddress != null && !deliveryAddress.isBlank()) {
            addressBuilder.append(deliveryAddress);
        }
        if (deliveryAddress2 != null && !deliveryAddress2.isBlank()) {
            addressBuilder.append("<br/>").append(deliveryAddress2);
        }
        if (deliveryCity != null && !deliveryCity.isBlank() || deliveryState != null && !deliveryState.isBlank() || deliveryPostalCode != null && !deliveryPostalCode.isBlank()) {
            addressBuilder.append("<br/>");
            if (deliveryCity != null && !deliveryCity.isBlank()) {
                addressBuilder.append(deliveryCity);
            }
            if (deliveryState != null && !deliveryState.isBlank()) {
                addressBuilder.append(", ").append(deliveryState);
            }
            if (deliveryPostalCode != null && !deliveryPostalCode.isBlank()) {
                addressBuilder.append(" ").append(deliveryPostalCode);
            }
        }

        String fullAddress = addressBuilder.toString();
        String instructions = (deliveryInstructions != null && !deliveryInstructions.isBlank())
            ? "<p><strong>Delivery Instructions:</strong> " + deliveryInstructions + "</p>"
            : "";

        String content = """
                <p>Dear %s,</p>
                <p>Thank you for your delivery order! We're preparing your food with care and will deliver it to you soon.</p>

                <div class="details">
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> %s</p>
                    <p><strong>Total Amount:</strong> $%.2f</p>
                    <p><strong>Estimated Delivery Time:</strong> %s</p>
                    <p><strong>Delivery Address:</strong><br/>%s</p>
                    %s
                </div>

                <p>Our driver will contact you when they're nearby. Please ensure someone is available to receive the order.</p>
                <p><strong>The GEM Team</strong></p>
                """.formatted(customerName, orderId, total, estimatedTime, fullAddress, instructions);

        return getBaseTemplate("Delivery Order Confirmed", content);
    }

    public static String getOrderStatusUpdateTemplate(String customerName, String orderId,
            String status, String updateMessage) {
        String content = """
                <p>Dear %s,</p>
                <p>Your order status has been updated.</p>

                <div class="details">
                    <h3>Order Update</h3>
                    <p><strong>Order ID:</strong> %s</p>
                    <p><strong>Status:</strong> %s</p>
                    <p><strong>Message:</strong> %s</p>
                </div>
                """.formatted(customerName, orderId, status, updateMessage);

        if ("ready".equalsIgnoreCase(status)) {
            content += """
                    <p>Your order is ready for pickup! Please come to the counter.</p>
                    """;
        }

        content += "<p><strong>The GEM Team</strong></p>";

        return getBaseTemplate("Order Status Update", content);
    }

    public static String getWelcomeTemplate(String customerName) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<body style='font-family: Arial, sans-serif; color: #333;'>" +
                "<h2>Welcome to RBOS!</h2>" +
                "<p>Hi " + customerName + ",</p>" +
                "<p>Thank you for creating an account with us!</p>" +
                "<p>You can now:</p>" +
                "<ul>" +
                "<li>Place orders online</li>" +
                "<li>Make reservations</li>" +
                "<li>View your order history</li>" +
                "<li>Manage your profile</li>" +
                "</ul>" +
                "<p>If you have any questions, please don't hesitate to contact us.</p>" +
                "<p>Best regards,<br/>RBOS Team</p>" +
                "</body>" +
                "</html>";
    }

    public static String getAdminNotificationTemplate(String subject, String message) {
        String content = """
                <p><strong>Admin Notification</strong></p>
                <div class="details">
                    <p><strong>Subject:</strong> %s</p>
                    <p><strong>Message:</strong> %s</p>
                    <p><strong>Time:</strong> %s</p>
                </div>
                <p>This is an automated notification from the Restaurant GEM system.</p>
                """.formatted(subject, message, new java.util.Date().toString());

        return getBaseTemplate("Admin Notification", content);
    }
}