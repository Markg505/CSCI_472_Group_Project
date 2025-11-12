package com.RBOS.dao;

import com.RBOS.models.Reservation;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ReservationDAO {
    private ServletContext context;
    
    public ReservationDAO(ServletContext context) {
        this.context = context;
    }
    
    public List<Reservation> getAllReservations() throws SQLException {
        List<Reservation> reservations = new ArrayList<>();
        String sql = "SELECT r.*, u.full_name, u.email, u.phone, dt.name as table_name " +
                    "FROM reservations r " +
                    "LEFT JOIN users u ON r.user_id = u.user_id " +
                    "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                    "ORDER BY r.start_utc DESC";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                Reservation reservation = new Reservation(
                    rs.getInt("reservation_id"),
                    rs.getInt("user_id"),
                    rs.getInt("table_id"),
                    rs.getString("start_utc"),
                    rs.getString("end_utc"),
                    rs.getInt("party_size"),
                    rs.getString("status"),
                    rs.getString("notes"),
                    rs.getString("created_utc")
                );
                
                // You could create User and DiningTable objects here if needed
                reservations.add(reservation);
            }
        }
        return reservations;
    }
    
    public Reservation getReservationById(int reservationId) throws SQLException {
        String sql = "SELECT r.*, u.full_name, u.email, u.phone, dt.name as table_name, dt.capacity " +
                    "FROM reservations r " +
                    "LEFT JOIN users u ON r.user_id = u.user_id " +
                    "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                    "WHERE r.reservation_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, reservationId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return new Reservation(
                    rs.getInt("reservation_id"),
                    rs.getInt("user_id"),
                    rs.getInt("table_id"),
                    rs.getString("start_utc"),
                    rs.getString("end_utc"),
                    rs.getInt("party_size"),
                    rs.getString("status"),
                    rs.getString("notes"),
                    rs.getString("created_utc")
                );
            }
        }
        return null;
    }
    
    public List<Reservation> getReservationsByUser(int userId) throws SQLException {
        List<Reservation> reservations = new ArrayList<>();
        String sql = "SELECT r.*, dt.name as table_name " +
                    "FROM reservations r " +
                    "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                    "WHERE r.user_id = ? " +
                    "ORDER BY r.start_utc DESC";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                reservations.add(new Reservation(
                    rs.getInt("reservation_id"),
                    rs.getInt("user_id"),
                    rs.getInt("table_id"),
                    rs.getString("start_utc"),
                    rs.getString("end_utc"),
                    rs.getInt("party_size"),
                    rs.getString("status"),
                    rs.getString("notes"),
                    rs.getString("created_utc")
                ));
            }
        }
        return reservations;
    }
    
    public Integer createReservation(Reservation reservation) throws SQLException {
        String sql = "INSERT INTO reservations (user_id, table_id, start_utc, end_utc, party_size, status, notes) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            pstmt.setObject(1, reservation.getUserId(), Types.INTEGER);
            pstmt.setInt(2, reservation.getTableId());
            pstmt.setString(3, reservation.getStartUtc());
            pstmt.setString(4, reservation.getEndUtc());
            pstmt.setInt(5, reservation.getPartySize());
            pstmt.setString(6, reservation.getStatus() != null ? reservation.getStatus() : "pending");
            pstmt.setString(7, reservation.getNotes());
            
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
    
    public boolean updateReservation(Reservation reservation) throws SQLException {
        String sql = "UPDATE reservations SET user_id = ?, table_id = ?, start_utc = ?, end_utc = ?, " +
                    "party_size = ?, status = ?, notes = ? WHERE reservation_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setObject(1, reservation.getUserId(), Types.INTEGER);
            pstmt.setInt(2, reservation.getTableId());
            pstmt.setString(3, reservation.getStartUtc());
            pstmt.setString(4, reservation.getEndUtc());
            pstmt.setInt(5, reservation.getPartySize());
            pstmt.setString(6, reservation.getStatus());
            pstmt.setString(7, reservation.getNotes());
            pstmt.setInt(8, reservation.getReservationId());
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean updateReservationStatus(int reservationId, String status) throws SQLException {
        String sql = "UPDATE reservations SET status = ? WHERE reservation_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, status);
            pstmt.setInt(2, reservationId);
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteReservation(int reservationId) throws SQLException {
        String sql = "DELETE FROM reservations WHERE reservation_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, reservationId);
            return pstmt.executeUpdate() > 0;
        }
    }
}