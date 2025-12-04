package com.RBOS.models;

public class DiningTable {
    private String tableId;
    private String name;
    private Integer capacity;
    private Double basePrice;
    private Double posX;
    private Double posY;

    public DiningTable() {}

    public DiningTable(String tableId, String name, Integer capacity) {
        this.tableId = tableId;
        this.name = name;
        this.capacity = capacity;
    }

    public DiningTable(String tableId, String name, Integer capacity, Double basePrice, Double posX, Double posY) {
        this.tableId = tableId;
        this.name = name;
        this.capacity = capacity;
        this.basePrice = basePrice;
        this.posX = posX;
        this.posY = posY;
    }

    // Getters and setters
    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Double getBasePrice() { return basePrice; }
    public void setBasePrice(Double basePrice) { this.basePrice = basePrice; }

    public Double getPosX() { return posX; }
    public void setPosX(Double posX) { this.posX = posX; }

    public Double getPosY() { return posY; }
    public void setPosY(Double posY) { this.posY = posY; }
}