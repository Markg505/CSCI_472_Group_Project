package com.RBOS.models;

public class DiningTable {
    private String tableId;
    private String name;
    private Integer capacity;

    public DiningTable() {}

    public DiningTable(String tableId, String name, Integer capacity) {
        this.tableId = tableId;
        this.name = name;
        this.capacity = capacity;
    }

    // Getters and setters
    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
}