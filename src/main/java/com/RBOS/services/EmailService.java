package com.RBOS.services;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import jakarta.servlet.ServletContext;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EmailService {
    private static final ExecutorService emailExecutor = Executors.newFixedThreadPool(5);
    private final EmailConfig config;
    
    public EmailService() {
        this.config = new EmailConfig();
    }
    
    public EmailService(EmailConfig config) {
        this.config = config;
    }
    
    public void sendEmailAsync(String to, String subject, String htmlContent) {
        emailExecutor.submit(() -> {
            try {
                sendEmail(to, subject, htmlContent);
                System.out.println("Email sent successfully to: " + to);
            } catch (Exception e) {
                System.err.println("Failed to send email to " + to + ": " + e.getMessage());
                e.printStackTrace();
            }
        });
    }
    
    private void sendEmail(String to, String subject, String htmlContent) throws MessagingException {
        if (config.getUsername() == null || config.getPassword() == null) {
            System.err.println("Email credentials not configured. Skipping email to: " + to);
            return;
        }
        
        Session session = Session.getInstance(config.getProperties(), new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(config.getUsername(), config.getPassword());
            }
        });
        
        Message message = new MimeMessage(session);

        try {
            message.setFrom(new InternetAddress(config.getUsername(), "Restaurant GEM"));
        } catch (Exception e) {
            // Fallback: use the constructor without personal name
            message.setFrom(new InternetAddress(config.getUsername()));
        }

        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        message.setSubject(subject);
        
        // Create HTML email
        MimeBodyPart mimeBodyPart = new MimeBodyPart();
        mimeBodyPart.setContent(htmlContent, "text/html; charset=utf-8");
        
        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(mimeBodyPart);
        message.setContent(multipart);
        
        Transport.send(message);
    }
    
    // Template methods for different email types
    public void sendReservationConfirmation(String customerEmail, String customerName, 
                                          String reservationDate, String reservationTime, 
                                          int partySize, String tableName, String reservationId) {
        String subject = "Reservation Confirmation - Restaurant GEM";
        String htmlContent = EmailTemplates.getReservationConfirmationTemplate(
            customerName, reservationDate, reservationTime, partySize, tableName, reservationId
        );
        sendEmailAsync(customerEmail, subject, htmlContent);
    }
    
    public void sendReservationUpdate(String customerEmail, String customerName,
                                    String reservationDate, String reservationTime,
                                    String status, String reservationId) {
        String subject = "Reservation Update - Restaurant GEM";
        String htmlContent = EmailTemplates.getReservationUpdateTemplate(
            customerName, reservationDate, reservationTime, status, reservationId
        );
        sendEmailAsync(customerEmail, subject, htmlContent);
    }
    
    public void sendOrderConfirmation(String customerEmail, String customerName,
                                    String orderId, double total, String estimatedTime) {
        String subject = "Order Confirmation - Restaurant GEM";
        String htmlContent = EmailTemplates.getOrderConfirmationTemplate(
            customerName, orderId, total, estimatedTime
        );
        sendEmailAsync(customerEmail, subject, htmlContent);
    }
    
    public void sendOrderStatusUpdate(String customerEmail, String customerName,
                                    String orderId, String status, String updateMessage) {
        String subject = "Order Status Update - Restaurant GEM";
        String htmlContent = EmailTemplates.getOrderStatusUpdateTemplate(
            customerName, orderId, status, updateMessage
        );
        sendEmailAsync(customerEmail, subject, htmlContent);
    }
    
    public void sendAdminNotification(String subject, String message) {
        String adminEmail = System.getenv("ADMIN_EMAIL");
        if (adminEmail != null) {
            String htmlContent = EmailTemplates.getAdminNotificationTemplate(subject, message);
            sendEmailAsync(adminEmail, subject, htmlContent);
        }
    }
}