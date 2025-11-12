package com.RBOS.models;

public class MenuItem {
    private Integer itemId;
    private String name;
    private Double price;
    private Boolean active;

    public MenuItem() {}

    public MenuItem(Integer itemId, String name, Double price, Boolean active) {
        this.itemId = itemId;
        this.name = name;
        this.price = price;
        this.active = active;
    }

    // Getters and setters
    public Integer getItemId() { return itemId; }
    public void setItemId(Integer itemId) { this.itemId = itemId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}