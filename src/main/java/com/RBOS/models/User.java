package com.RBOS.models;

public class User {
    private Integer userId;
    private String role; // 'customer', 'staff', 'admin'
    private String fullName;
    private String email;
    private String phone;

    public User() {}

    public User(Integer userId, String role, String fullName, String email, String phone) {
        this.userId = userId;
        this.role = role;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    // Getters and setters
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}