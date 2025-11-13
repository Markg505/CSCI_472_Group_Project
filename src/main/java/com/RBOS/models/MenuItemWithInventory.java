package com.RBOS.models;

public class MenuItemWithInventory extends MenuItem {
    private Integer qtyOnHand;
    private Integer parLevel;
    private Integer reorderPoint;
    private Boolean available;

    public MenuItemWithInventory() {}

    public MenuItemWithInventory(String itemId, String name, String description, String category,
                               Double price, Boolean active, String imageUrl, String dietaryTags) {
        super(itemId, name, description, category, price, active, imageUrl, dietaryTags);
    }

    // Getters and setters
    public Integer getQtyOnHand() { return qtyOnHand; }
    public void setQtyOnHand(Integer qtyOnHand) { this.qtyOnHand = qtyOnHand; }

    public Integer getParLevel() { return parLevel; }
    public void setParLevel(Integer parLevel) { this.parLevel = parLevel; }

    public Integer getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(Integer reorderPoint) { this.reorderPoint = reorderPoint; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }
}