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
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash FROM users ORDER BY user_id";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql);
                ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                User u = new User(
                        rs.getInt("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"));
                u.setPasswordHash(rs.getString("password_hash"));
                users.add(u);
            }
        }
        return users;
    }

    public User getUserById(int userId) throws SQLException {
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash FROM users WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                User u = new User(
                        rs.getInt("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"));
                u.setPasswordHash(rs.getString("password_hash"));
                return u;
            }
        }
        return null;
    }

    public User getUserByEmail(String email) throws SQLException {
        String sql = "SELECT user_id, role, full_name, email, phone, password_hash FROM users WHERE email = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, email);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                User u = new User(
                        rs.getInt("user_id"),
                        rs.getString("role"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"));
                u.setPasswordHash(rs.getString("password_hash"));
                return u;
            }
        }
        return null;
    }

    public Integer createUser(User user) throws SQLException {
        String sql = "INSERT INTO users (role, full_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)";

        String hash = user.getPasswordHash();
        if ((hash == null || hash.isBlank()) && user.getPassword() != null && !user.getPassword().isBlank()) {
            hash = hashPassword(user.getPassword());
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, user.getRole() != null ? user.getRole() : "customer");
            pstmt.setString(2, user.getFullName());
            pstmt.setString(3, user.getEmail());
            pstmt.setString(4, user.getPhone());
            if (hash == null || hash.isBlank()) {
                pstmt.setNull(5, Types.VARCHAR);
            } else {
                pstmt.setString(5, hash);
            }

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        return generatedKeys.getInt(1);
                    }
                }
            }
        }
        return null;
    }

    public boolean updateUser(User user) throws SQLException {
        String sql = "UPDATE users SET role = ?, full_name = ?, email = ?, phone = ? WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, user.getRole());
            pstmt.setString(2, user.getFullName());
            pstmt.setString(3, user.getEmail());
            pstmt.setString(4, user.getPhone());
            pstmt.setInt(5, user.getUserId());

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteUser(int userId) throws SQLException {
        String sql = "DELETE FROM users WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setInt(1, userId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean setPassword(int userId, String rawPassword) throws SQLException {
        String hash = (rawPassword == null || rawPassword.isBlank()) ? null : hashPassword(rawPassword);
        String sql = "UPDATE users SET password_hash = ? WHERE user_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            if (hash == null) {
                pstmt.setNull(1, Types.VARCHAR);
            } else {
                pstmt.setString(1, hash);
            }
            pstmt.setInt(2, userId);
            return pstmt.executeUpdate() > 0;
        }
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
}
