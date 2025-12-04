package com.RBOS.dao;

import com.RBOS.models.User;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class UserDAO {
    private ServletContext context;

    public UserDAO(ServletContext context) {
        this.context = context;
    }

    public List<User> getAllUsers() throws SQLException {
        List<User> users = new ArrayList<>();
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash, profile_image_url, address, address2, city, state, postal_code FROM users ORDER BY user_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql);
                ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                User u = new User(
                        rs.getString("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("profile_image_url"),
                        rs.getString("address"),
                        rs.getString("address2"),
                        rs.getString("city"),
                        rs.getString("state"),
                        rs.getString("postal_code"));
                u.setPasswordHash(rs.getString("password_hash"));
                users.add(u);
            }
        }
        return users;
    }

    public User getUserById(String userId) throws SQLException {
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash, profile_image_url, address, address2, city, state, postal_code FROM users WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                User u = new User(
                        rs.getString("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("profile_image_url"),
                        rs.getString("address"),
                        rs.getString("address2"),
                        rs.getString("city"),
                        rs.getString("state"),
                        rs.getString("postal_code"));
                u.setPasswordHash(rs.getString("password_hash"));
                return u;
            }
        }
        return null;
    }

    public User getUserByEmail(String email) throws SQLException {
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash, profile_image_url, address, address2, city, state, postal_code FROM users WHERE email = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, email);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                User u = new User(
                        rs.getString("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("profile_image_url"),
                        rs.getString("address"),
                        rs.getString("address2"),
                        rs.getString("city"),
                        rs.getString("state"),
                        rs.getString("postal_code"));
                u.setPasswordHash(rs.getString("password_hash"));
                return u;
            }
        }
        return null;
    }

    public String createUser(User user) throws SQLException {
        String userId = java.util.UUID.randomUUID().toString();
        String sql = "INSERT INTO users (user_id, role, full_name, email, phone, password_hash, profile_image_url, address, address2, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        String hash = user.getPasswordHash();
        if ((hash == null || hash.isBlank()) && user.getPassword() != null && !user.getPassword().isBlank()) {
            hash = hashPassword(user.getPassword());
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            pstmt.setString(2, user.getRole() != null ? user.getRole() : "customer");
            pstmt.setString(3, user.getFullName());
            pstmt.setString(4, user.getEmail());
            pstmt.setString(5, user.getPhone());
            pstmt.setString(6, user.getAddress());
            pstmt.setString(7, user.getAddress2());
            pstmt.setString(8, user.getCity());
            pstmt.setString(9, user.getState());
            pstmt.setString(10, user.getPostalCode());
            if (hash == null || hash.isBlank()) {
                pstmt.setNull(11, Types.VARCHAR);
            } else {
                pstmt.setString(11, hash);
            }
            pstmt.setString(7, user.getProfileImageUrl());
            pstmt.setString(8, user.getAddress());
            pstmt.setString(9, user.getAddress2());
            pstmt.setString(10, user.getCity());
            pstmt.setString(11, user.getState());
            pstmt.setString(12, user.getPostalCode());

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                return userId;
            }
        }
        return null;
    }

    public boolean updateUser(User user) throws SQLException {
        String sql = "UPDATE users SET role = ?, full_name = ?, email = ?, phone = ?, profile_image_url = ?, address = ?, address2 = ?, city = ?, state = ?, postal_code = ? WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, user.getRole());
            pstmt.setString(2, user.getFullName());
            pstmt.setString(3, user.getEmail());
            pstmt.setString(4, user.getPhone());
            pstmt.setString(5, user.getProfileImageUrl());
            pstmt.setString(6, user.getAddress());
            pstmt.setString(7, user.getAddress2());
            pstmt.setString(8, user.getCity());
            pstmt.setString(9, user.getState());
            pstmt.setString(10, user.getPostalCode());
            pstmt.setString(11, user.getUserId());

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateProfile(String userId, String fullName, String email, String phone, String profileImageUrl,
                               String address, String address2, String city, String state, String postalCode) throws SQLException {
        String sql = "UPDATE users SET full_name = ?, email = ?, phone = ?, profile_image_url = ?, address = ?, address2 = ?, city = ?, state = ?, postal_code = ? WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, fullName);
            pstmt.setString(2, email);
            pstmt.setString(3, phone);
            pstmt.setString(4, profileImageUrl);
            pstmt.setString(5, address);
            pstmt.setString(6, address2);
            pstmt.setString(7, city);
            pstmt.setString(8, state);
            pstmt.setString(9, postalCode);
            pstmt.setString(10, userId);

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteUser(String userId) throws SQLException {
        String sql = "DELETE FROM users WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean setPassword(String userId, String rawPassword) throws SQLException {
        String hash = (rawPassword == null || rawPassword.isBlank()) ? null : hashPassword(rawPassword);
        String sql = "UPDATE users SET password_hash = ? WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            if (hash == null) {
                pstmt.setNull(1, Types.VARCHAR);
            } else {
                pstmt.setString(1, hash);
            }
            pstmt.setString(2, userId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updatePasswordWithValidation(String userId, String currentPassword, String newPassword)
            throws SQLException {
        User user = getUserById(userId);
        if (user == null)
            return false;

        String stored = user.getPasswordHash();
        if (stored != null && !stored.isBlank()) {
            if (!passwordMatches(currentPassword, stored))
                return false;
        }

        return setPassword(userId, newPassword);
    }

    private String hashPassword(String raw) {
        if (raw == null)
            return null;
        try {
            Class<?> bc = Class.forName("org.mindrot.jbcrypt.BCrypt");
            var gensalt = bc.getMethod("gensalt", int.class);
            var hashpw = bc.getMethod("hashpw", String.class, String.class);
            String salt = (String) gensalt.invoke(null, 10);
            return (String) hashpw.invoke(null, raw, salt);
        } catch (Throwable t) {
            return raw;
        }
    }

    public static boolean passwordMatches(String raw, String stored) {
        if (stored == null)
            return false;
        try {
            Class<?> bc = Class.forName("org.mindrot.jbcrypt.BCrypt");
            var checkpw = bc.getMethod("checkpw", String.class, String.class);
            Object ok = checkpw.invoke(null, raw, stored);
            if (ok instanceof Boolean && (Boolean) ok)
                return true;
        } catch (Throwable ignored) {
        }
        return stored.equals(raw);
    }
}
