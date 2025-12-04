package com.RBOS.models;

public class Inventory {
    private String inventoryId;
    private String itemId;
    private String name;
    private String sku;
    private String category;
    private Unit unit;
    private Integer packSize;
    private Integer qtyOnHand;
    private Integer parLevel;
    private Integer reorderPoint;
    private Double cost;
    private String location;
    private Boolean active;
    private String vendor;
    private Integer leadTimeDays;
    private Integer preferredOrderQty;
    private Integer wasteQty;
    private String lastCountedAt;
    private CountFreq countFreq;
    private String lot;
    private String expiryDate;
    private Allergen allergen;
    private String conversion;
    private String createdUtc;

    // Related objects
    private MenuItem menuItem;

    // Constructors
    public Inventory() {}

    public Inventory(String inventoryId, String itemId, String name, String sku,
                     String category, Unit unit, Integer packSize, Integer qtyOnHand,
                     Integer parLevel, Integer reorderPoint, Double cost, String location,
                     Boolean active, String vendor, Integer leadTimeDays, Integer preferredOrderQty,
                     Integer wasteQty, String lastCountedAt, CountFreq countFreq, String lot,
                     String expiryDate, Allergen allergen, String conversion, String createdUtc) {
        this.inventoryId = inventoryId;
        this.itemId = itemId;
        this.name = name;
        this.sku = sku;
        this.category = category;
        this.unit = unit;
        this.packSize = packSize;
        this.qtyOnHand = qtyOnHand;
        this.parLevel = parLevel;
        this.reorderPoint = reorderPoint;
        this.cost = cost;
        this.location = location;
        this.active = active;
        this.vendor = vendor;
        this.leadTimeDays = leadTimeDays;
        this.preferredOrderQty = preferredOrderQty;
        this.wasteQty = wasteQty;
        this.lastCountedAt = lastCountedAt;
        this.countFreq = countFreq;
        this.lot = lot;
        this.expiryDate = expiryDate;
        this.allergen = allergen;
        this.conversion = conversion;
        this.createdUtc = createdUtc;
    }

    public String getInventoryId() {
        return inventoryId;
    }

    public void setInventoryId(String inventoryId) {
        this.inventoryId = inventoryId;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Unit getUnit() {
        return unit;
    }

    public void setUnit(Unit unit) {
        this.unit = unit;
    }

    public Integer getPackSize() {
        return packSize;
    }

    public void setPackSize(Integer packSize) {
        this.packSize = packSize;
    }

    public Integer getQtyOnHand() {
        return qtyOnHand;
    }

    public void setQtyOnHand(Integer qtyOnHand) {
        this.qtyOnHand = qtyOnHand;
    }

    public Integer getParLevel() {
        return parLevel;
    }

    public void setParLevel(Integer parLevel) {
        this.parLevel = parLevel;
    }

    public Integer getReorderPoint() {
        return reorderPoint;
    }

    public void setReorderPoint(Integer reorderPoint) {
        this.reorderPoint = reorderPoint;
    }

    public Double getCost() {
        return cost;
    }

    public void setCost(Double cost) {
        this.cost = cost;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getVendor() {
        return vendor;
    }

    public void setVendor(String vendor) {
        this.vendor = vendor;
    }

    public Integer getLeadTimeDays() {
        return leadTimeDays;
    }

    public void setLeadTimeDays(Integer leadTimeDays) {
        this.leadTimeDays = leadTimeDays;
    }

    public Integer getPreferredOrderQty() {
        return preferredOrderQty;
    }

    public void setPreferredOrderQty(Integer preferredOrderQty) {
        this.preferredOrderQty = preferredOrderQty;
    }

    public Integer getWasteQty() {
        return wasteQty;
    }

    public void setWasteQty(Integer wasteQty) {
        this.wasteQty = wasteQty;
    }

    public String getLastCountedAt() {
        return lastCountedAt;
    }

    public void setLastCountedAt(String lastCountedAt) {
        this.lastCountedAt = lastCountedAt;
    }

    public CountFreq getCountFreq() {
        return countFreq;
    }

    public void setCountFreq(CountFreq countFreq) {
        this.countFreq = countFreq;
    }

    public String getLot() {
        return lot;
    }

    public void setLot(String lot) {
        this.lot = lot;
    }

    public String getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(String expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Allergen getAllergen() {
        return allergen;
    }

    public void setAllergen(Allergen allergen) {
        this.allergen = allergen;
    }

    public String getConversion() {
        return conversion;
    }

    public void setConversion(String conversion) {
        this.conversion = conversion;
    }

    public String getCreatedUtc() {
        return createdUtc;
    }

    public void setCreatedUtc(String createdUtc) {
        this.createdUtc = createdUtc;
    }

    public MenuItem getMenuItem() {
        return menuItem;
    }

    public void setMenuItem(MenuItem menuItem) {
        this.menuItem = menuItem;
    }
}