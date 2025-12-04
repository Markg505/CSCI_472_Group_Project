package com.RBOS.dao;

import com.RBOS.services.EmailService;
import com.RBOS.services.EmailTemplates;
import com.RBOS.models.Reservation;
import com.RBOS.models.PagedResult;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class ReservationDAO {
    private ServletContext context;

    public ReservationDAO(ServletContext context) {
        this.context = context;
    }

    public List<Reservation> getAllReservations() throws SQLException {
        List<Reservation> reservations = new ArrayList<>();
        String sql = "SELECT r.*, u.full_name AS user_full_name, u.email, u.phone, dt.name as table_name " +
                "FROM reservations r " +
                "LEFT JOIN users u ON r.user_id = u.user_id " +
                "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                "ORDER BY r.start_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql);
                ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                Reservation reservation = new Reservation(
                        rs.getString("reservation_id"),
                        rs.getString("user_id"),
                        rs.getString("table_id"),
                        rs.getString("start_utc"),
                        rs.getString("end_utc"),
                        rs.getInt("party_size"),
                        rs.getString("status"),
                        rs.getString("notes"),
                        rs.getString("created_utc"));
                reservation.setGuestName(rs.getString("guest_name") != null ? rs.getString("guest_name")
                        : rs.getString("user_full_name"));

                // You could create User and DiningTable objects here if needed
                reservations.add(reservation);
            }
        }
        return reservations;
    }

    public Reservation getReservationById(String reservationId) throws SQLException {
        String sql = "SELECT r.*, u.full_name AS user_full_name, u.email, u.phone, dt.name as table_name, dt.capacity "
                +
                "FROM reservations r " +
                "LEFT JOIN users u ON r.user_id = u.user_id " +
                "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                "WHERE r.reservation_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, reservationId);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                Reservation r = new Reservation(
                        rs.getString("reservation_id"),
                        rs.getString("user_id"),
                        rs.getString("table_id"),
                        rs.getString("start_utc"),
                        rs.getString("end_utc"),
                        rs.getInt("party_size"),
                        rs.getString("status"),
                        rs.getString("notes"),
                        rs.getString("created_utc"));
                r.setGuestName(rs.getString("guest_name") != null ? rs.getString("guest_name")
                        : rs.getString("user_full_name"));
                return r;
            }
        }
        return null;
    }

    public List<Reservation> getReservationsByUser(String userId) throws SQLException {
        List<Reservation> reservations = new ArrayList<>();
        String sql = "SELECT r.*, dt.name as table_name, u.full_name AS user_full_name " +
                "FROM reservations r " +
                "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                "LEFT JOIN users u ON r.user_id = u.user_id " +
                "WHERE r.user_id = ? " +
                "ORDER BY r.start_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                Reservation r = new Reservation(
                        rs.getString("reservation_id"),
                        rs.getString("user_id"),
                        rs.getString("table_id"),
                        rs.getString("start_utc"),
                        rs.getString("end_utc"),
                        rs.getInt("party_size"),
                        rs.getString("status"),
                        rs.getString("notes"),
                        rs.getString("created_utc"));
                r.setGuestName(rs.getString("guest_name") != null ? rs.getString("guest_name")
                        : rs.getString("user_full_name"));
                reservations.add(r);
            }
        }
        return reservations;
    }

    public PagedResult<Reservation> getReservationsWithFilters(String status, String startUtc, String endUtc,
            String userId, int page, int pageSize) throws SQLException {
        List<Reservation> reservations = new ArrayList<>();
        List<String> params = new ArrayList<>();
        int total = 0;

        StringBuilder where = new StringBuilder(" WHERE 1=1");
        if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND r.status = ?");
            params.add(status);
        }
        if (startUtc != null && !startUtc.isEmpty()) {
            where.append(" AND r.start_utc >= ?");
            params.add(startUtc);
        }
        if (endUtc != null && !endUtc.isEmpty()) {
            where.append(" AND r.start_utc <= ?");
            params.add(endUtc);
        }
        if (userId != null && !userId.isEmpty()) {
            where.append(" AND r.user_id = ?");
            params.add(userId);
        }

        String countSql = "SELECT COUNT(*) FROM reservations r" + where;
        String dataSql = "SELECT r.*, dt.name as table_name, u.full_name AS user_full_name " +
                "FROM reservations r " +
                "JOIN dining_tables dt ON r.table_id = dt.table_id " +
                "LEFT JOIN users u ON r.user_id = u.user_id " +
                where +
                " ORDER BY r.start_utc DESC LIMIT ? OFFSET ?";

        try (Connection conn = DatabaseConnection.getConnection(context)) {
            try (PreparedStatement countStmt = conn.prepareStatement(countSql)) {
                for (int i = 0; i < params.size(); i++) {
                    countStmt.setString(i + 1, params.get(i));
                }
                try (ResultSet rs = countStmt.executeQuery()) {
                    if (rs.next()) {
                        total = rs.getInt(1);
                    }
                }
            }
            try (PreparedStatement dataStmt = conn.prepareStatement(dataSql)) {
                for (int i = 0; i < params.size(); i++) {
                    dataStmt.setString(i + 1, params.get(i));
                }
                dataStmt.setInt(params.size() + 1, pageSize);
                dataStmt.setInt(params.size() + 2, (page - 1) * pageSize);

                try (ResultSet dataRs = dataStmt.executeQuery()) {
                    while (dataRs.next()) {
                        Reservation r = new Reservation(
                                dataRs.getString("reservation_id"),
                                dataRs.getString("user_id"),
                                dataRs.getString("table_id"),
                                dataRs.getString("start_utc"),
                                dataRs.getString("end_utc"),
                                dataRs.getInt("party_size"),
                                dataRs.getString("status"),
                                dataRs.getString("notes"),
                                dataRs.getString("created_utc"));
                        r.setGuestName(dataRs.getString("guest_name") != null ? dataRs.getString("guest_name")
                                : dataRs.getString("user_full_name"));
                        reservations.add(r);
                    }
                }
            }
        }
        return new PagedResult<>(reservations, total);
    }

    private String generateNumericId() {
        long n = java.util.concurrent.ThreadLocalRandom.current().nextLong(1_000_000_000L, 10_000_000_000L);
        return Long.toString(n);
    }

    public boolean isTableAvailable(String tableId, String startUtc, String endUtc, String excludeReservationId)
            throws SQLException {
        String sql = "SELECT COUNT(*) FROM reservations " +
                "WHERE table_id = ? " +
                "AND status IN ('pending','confirmed') " +
                "AND NOT (end_utc <= ? OR start_utc >= ?)";

        if (excludeReservationId != null) {
            sql += " AND reservation_id <> ?";
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, tableId);
            pstmt.setString(2, startUtc);
            pstmt.setString(3, endUtc);
            if (excludeReservationId != null) {
                pstmt.setString(4, excludeReservationId);
            }

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) == 0;
                }
            }
        }
        return false;
    }

    public String createReservation(Reservation reservation) throws SQLException {
        String reservationId = reservation.getReservationId() != null
                ? reservation.getReservationId()
                : generateNumericId();
        String sql = "INSERT INTO reservations (reservation_id, user_id, guest_name, contact_email, contact_phone, table_id, start_utc, end_utc, party_size, status, notes) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        if (!isTableAvailable(reservation.getTableId(), reservation.getStartUtc(), reservation.getEndUtc(), null)) {
            return null;
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            pstmt.setString(1, reservationId);
            pstmt.setString(2, reservation.getUserId());
            pstmt.setString(3, reservation.getGuestName());
            pstmt.setString(4, reservation.getContactEmail());
            pstmt.setString(5, reservation.getContactPhone());
            pstmt.setString(6, reservation.getTableId());
            pstmt.setString(7, reservation.getStartUtc());
            pstmt.setString(8, reservation.getEndUtc());
            pstmt.setInt(9, reservation.getPartySize());
            pstmt.setString(10, reservation.getStatus() != null ? reservation.getStatus() : "pending");
            pstmt.setString(11, reservation.getNotes());

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                // send reservation confirmation email asynchronously
                try {
                    Reservation fullReservation = getReservationById(reservationId);
                    if (fullReservation != null) {
                        EmailService emailService = new EmailService();

                        // Get email from user (you're logged in)
                        String userEmail = getUserEmailById(reservation.getUserId());
                        String targetEmail = (userEmail != null && !userEmail.isEmpty())
                                ? userEmail
                                : (reservation.getContactEmail() != null && !reservation.getContactEmail().isBlank()
                                        ? reservation.getContactEmail()
                                        : null);
                        if (targetEmail != null && !targetEmail.isEmpty()) {
                            String emailBody = EmailTemplates.getReservationConfirmationTemplate(
                                    reservation.getGuestName() != null ? reservation.getGuestName() : "Valued Guest",
                                    formatLocalDate(reservation.getStartUtc()),
                                    formatLocalTime(reservation.getStartUtc()),
                                    reservation.getPartySize(),
                                    "Table " + reservation.getTableId(),
                                    reservationId);

                            emailService.sendEmailAsync(
                                    targetEmail,
                                    "Reservation Confirmed - " + reservationId,
                                    emailBody);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to send reservation confirmation email: " + e.getMessage());
                    // Don't fail the reservation if email fails
                }

                return reservationId;
            }
        }
        return null;
    }

    public boolean updateReservation(Reservation reservation) throws SQLException {
        String sql = "UPDATE reservations SET user_id = ?, guest_name = ?, table_id = ?, start_utc = ?, end_utc = ?, " +
                "party_size = ?, status = ?, notes = ? WHERE reservation_id = ?";

        if (!isTableAvailable(reservation.getTableId(), reservation.getStartUtc(), reservation.getEndUtc(),
                reservation.getReservationId())) {
            return false;
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, reservation.getUserId());
            pstmt.setString(2, reservation.getGuestName());
            pstmt.setString(3, reservation.getTableId());
            pstmt.setString(4, reservation.getStartUtc());
            pstmt.setString(5, reservation.getEndUtc());
            pstmt.setInt(6, reservation.getPartySize());
            pstmt.setString(7, reservation.getStatus());
            pstmt.setString(8, reservation.getNotes());
            pstmt.setString(9, reservation.getReservationId());

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateReservationStatus(String reservationId, String status) throws SQLException {
        String sql = "UPDATE reservations SET status = ? WHERE reservation_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, status);
            pstmt.setString(2, reservationId);

            boolean updated = pstmt.executeUpdate() > 0;

            // NEW: send status update email
            if (updated) {
                try {
                    Reservation reservation = getReservationById(reservationId);
                    if (reservation != null) {
                        String userEmail = getUserEmailById(reservation.getUserId());
                        if (userEmail != null && !userEmail.isEmpty()) {
                            EmailService emailService = new EmailService();
                            String emailBody = EmailTemplates.getReservationUpdateTemplate(
                                    reservation.getGuestName(),
                                    formatLocalDate(reservation.getStartUtc()),
                                    formatLocalTime(reservation.getStartUtc()),
                                    status,
                                    reservationId);
                            emailService.sendEmailAsync(
                                    userEmail,
                                    "Reservation Status Update - " + reservationId,
                                    emailBody);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to send status update email: " + e.getMessage());
                }
            }

            return updated;
        }
    }

    private String getUserEmailById(String userId) throws SQLException {
        String sql = "SELECT email FROM users WHERE user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("email");
                }
            }
        }
        return null;
    }

    public boolean deleteReservation(String reservationId) throws SQLException {
        String sql = "DELETE FROM reservations WHERE reservation_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, reservationId);
            return pstmt.executeUpdate() > 0;
        }
    }

    private String formatLocalDate(String isoInstant) {
        try {
            ZonedDateTime zdt = Instant.parse(isoInstant).atZone(ZoneId.systemDefault());
            return zdt.format(DateTimeFormatter.ofPattern("MMMM dd, yyyy"));
        } catch (Exception e) {
            return isoInstant;
        }
    }

    private String formatLocalTime(String isoInstant) {
        try {
            ZonedDateTime zdt = Instant.parse(isoInstant).atZone(ZoneId.systemDefault());
            return zdt.format(DateTimeFormatter.ofPattern("h:mm a z"));
        } catch (Exception e) {
            return isoInstant;
        }
    }
}
