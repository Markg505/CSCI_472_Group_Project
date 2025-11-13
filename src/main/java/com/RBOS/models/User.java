package com.RBOS.models;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class User {
    private String userId;
    private String role; // customer, staff, admin
    private String fullName;
    private String email;
    private String phone;

    @JsonIgnore
    private String passwordHash; // BCrypt hashed password

    private transient String password; // plaintext for create/update only

    public User() {
    }

    public User(String userId, String role, String fullName, String email, String phone) {
        this.userId = userId;
        this.role = role;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    public User(String userId, String role, String fullName, String email, String phone, String passwordHash) {
        this.userId = userId;
        this.role = role;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}