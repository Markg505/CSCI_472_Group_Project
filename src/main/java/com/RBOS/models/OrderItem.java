package com.RBOS.models;

public class OrderItem {
    private Integer orderItemId;
    private Integer orderId;
    private Integer itemId;
    private Integer qty;
    private Double unitPrice;
    private Double lineTotal;
    private String notes;
    
    // Optional: Include related objects
    private MenuItem menuItem;

    public OrderItem() {}

    public OrderItem(Integer orderItemId, Integer orderId, Integer itemId, 
                    Integer qty, Double unitPrice, Double lineTotal, String notes) {
        this.orderItemId = orderItemId;
        this.orderId = orderId;
        this.itemId = itemId;
        this.qty = qty;
        this.unitPrice = unitPrice;
        this.lineTotal = lineTotal;
        this.notes = notes;
    }

    // Getters and setters
    public Integer getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Integer orderItemId) { this.orderItemId = orderItemId; }

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }

    public Integer getItemId() { return itemId; }
    public void setItemId(Integer itemId) { this.itemId = itemId; }

    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

    public Double getLineTotal() { return lineTotal; }
    public void setLineTotal(Double lineTotal) { this.lineTotal = lineTotal; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public MenuItem getMenuItem() { return menuItem; }
    public void setMenuItem(MenuItem menuItem) { this.menuItem = menuItem; }
}