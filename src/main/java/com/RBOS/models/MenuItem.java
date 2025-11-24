package com.RBOS.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MenuItem {
    private String itemId;
    private String name;
    private String description;
    private String category;
    private Double price;
    private Boolean active;
    private String imageUrl;
    private String dietaryTags;

    public MenuItem() {}

    public MenuItem(String itemId, String name, String description, String category,
                    Double price, Boolean active, String imageUrl, String dietaryTags) {
        this.itemId = itemId;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.active = active;
        this.imageUrl = imageUrl;
        this.dietaryTags = dietaryTags;
    }

    // Getters and setters
    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getDietaryTags() { return dietaryTags; }
    public void setDietaryTags(String dietaryTags) { this.dietaryTags = dietaryTags; }
}
