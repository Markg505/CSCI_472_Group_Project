package com.RBOS.models;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DiningTable {
    private String tableId;
    private String name;
    private Integer capacity;
    @JsonAlias({"pos_x"})
    private int posX;
    @JsonAlias({"pos_y"})
    private int posY;
    private Double basePrice;

    public DiningTable() {}

    public DiningTable(String tableId, String name, Integer capacity, int posX, int posY) {
        this.tableId = tableId;
        this.name = name;
        this.capacity = capacity;
        this.posX = posX;
        this.posY = posY;
    }

    public DiningTable(String tableId, String name, Integer capacity, int posX, int posY, Double basePrice) {
        this.tableId = tableId;
        this.name = name;
        this.capacity = capacity;
        this.posX = posX;
        this.posY = posY;
        this.basePrice = basePrice;
    }

    // Getters and setters
    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public int getPosX() { return posX; }
    public void setPosX(int posX) { this.posX = posX; }

    public int getPosY() { return posY; }
    public void setPosY(int posY) { this.posY = posY; }

    public Double getBasePrice() { return basePrice; }
    public void setBasePrice(Double basePrice) { this.basePrice = basePrice; }
}
