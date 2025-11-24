package com.RBOS.models;

import java.util.List;

public class Order {
    private String orderId;
    private String userId;
    private String source; // 'web', 'phone', 'walkin'
    private String status; // 'cart', 'placed', 'paid', 'cancelled'
    private Double subtotal;
    private Double tax;
    private Double total;
    private String createdUtc;
    private String cartToken;
    
    // Optional: Include related objects
    private User user;
    private List<OrderItem> orderItems;

    public Order() {}

    public Order(String orderId, String userId, String source, String status,
                Double subtotal, Double tax, Double total, String createdUtc) {
        this.orderId = orderId;
        this.userId = userId;
        this.source = source;
        this.status = status;
        this.subtotal = subtotal;
        this.tax = tax;
        this.total = total;
        this.createdUtc = createdUtc;
    }

    public Order(String orderId, String userId, String cartToken, String source, String status,
                 Double subtotal, Double tax, Double total, String createdUtc) {
        this(orderId, userId, source, status, subtotal, tax, total, createdUtc);
        this.cartToken = cartToken;
    }

    // Getters and setters
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getSubtotal() { return subtotal; }
    public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }

    public Double getTax() { return tax; }
    public void setTax(Double tax) { this.tax = tax; }

    public Double getTotal() { return total; }
    public void setTotal(Double total) { this.total = total; }

    public String getCreatedUtc() { return createdUtc; }
    public void setCreatedUtc(String createdUtc) { this.createdUtc = createdUtc; }

    public String getCartToken() { return cartToken; }
    public void setCartToken(String cartToken) { this.cartToken = cartToken; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public List<OrderItem> getOrderItems() { return orderItems; }
    public void setOrderItems(List<OrderItem> orderItems) { this.orderItems = orderItems; }
}