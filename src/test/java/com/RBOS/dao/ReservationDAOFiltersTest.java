package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.PagedResult;
import com.RBOS.models.Reservation;
import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ReservationDAOFiltersTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private ReservationDAO reservationDAO;

    @Before
    public void setupDatabase() throws Exception {
        Path db = tempDir.newFile("reservations.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        try (Connection conn = DatabaseConnection.getConnection(null)) {
            createTables(conn);
            seedUsers(conn);
            seedDiningTables(conn);
            seedReservations(conn);
        }

        reservationDAO = new ReservationDAO(null);
    }

    @Test
    public void filtersByStatusDateAndUser() throws Exception {
        PagedResult<Reservation> result = reservationDAO.getReservationsWithFilters(
                "confirmed",
                "2024-04-15T00:00:00Z",
                "2024-05-31T23:59:59Z",
                "user-1",
                1,
                10);

        assertEquals(1, result.getTotal());
        assertEquals(1, result.getItems().size());
        Reservation reservation = result.getItems().get(0);
        assertEquals("res-2", reservation.getReservationId());
        assertEquals("table-1", reservation.getTableId());
    }

    @Test
    public void statusAllWithPaginationAndOrdering() throws Exception {
        PagedResult<Reservation> pageOne = reservationDAO.getReservationsWithFilters(
                "all", null, null, null, 1, 2);

        assertEquals(3, pageOne.getTotal());
        assertEquals(2, pageOne.getItems().size());
        assertEquals("res-3", pageOne.getItems().get(0).getReservationId());
        assertEquals("res-2", pageOne.getItems().get(1).getReservationId());

        PagedResult<Reservation> pageTwo = reservationDAO.getReservationsWithFilters(
                "all", null, null, null, 2, 2);

        assertEquals(3, pageTwo.getTotal());
        assertEquals(1, pageTwo.getItems().size());
        assertEquals("res-1", pageTwo.getItems().get(0).getReservationId());
    }

    private void createTables(Connection conn) throws Exception {
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("DROP TABLE IF EXISTS reservations");
            stmt.execute("DROP TABLE IF EXISTS dining_tables");
            stmt.execute("DROP TABLE IF EXISTS users");
            stmt.execute("CREATE TABLE users (user_id TEXT PRIMARY KEY, role TEXT, full_name TEXT, email TEXT, phone TEXT, password_hash TEXT)");
            stmt.execute("CREATE TABLE dining_tables (table_id TEXT PRIMARY KEY, name TEXT, capacity INTEGER)");
            stmt.execute("CREATE TABLE reservations (reservation_id TEXT PRIMARY KEY, user_id TEXT, guest_name TEXT, table_id TEXT, start_utc TEXT, end_utc TEXT, party_size INTEGER, status TEXT, notes TEXT, created_utc TEXT, FOREIGN KEY (user_id) REFERENCES users(user_id), FOREIGN KEY (table_id) REFERENCES dining_tables(table_id))");
        }
    }

    private void seedUsers(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO users (user_id, role, full_name, email, phone, password_hash) VALUES (?,?,?,?,?,?)")) {
            ps.setString(1, "user-1");
            ps.setString(2, "customer");
            ps.setString(3, "Reservation User");
            ps.setString(4, "res@example.com");
            ps.setString(5, "555-3000");
            ps.setString(6, "hash");
            ps.executeUpdate();

            ps.setString(1, "user-2");
            ps.setString(2, "customer");
            ps.setString(3, "Admin User");
            ps.setString(4, "admin@example.com");
            ps.setString(5, "555-4000");
            ps.setString(6, "hash");
            ps.executeUpdate();
        }
    }

    private void seedDiningTables(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO dining_tables (table_id, name, capacity) VALUES (?,?,?)")) {
            ps.setString(1, "table-1");
            ps.setString(2, "Window");
            ps.setInt(3, 4);
            ps.executeUpdate();

            ps.setString(1, "table-2");
            ps.setString(2, "Patio");
            ps.setInt(3, 6);
            ps.executeUpdate();
        }
    }

    private void seedReservations(Connection conn) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO reservations (reservation_id, user_id, guest_name, table_id, start_utc, end_utc, party_size, status, notes, created_utc) VALUES (?,?,?,?,?,?,?,?,?,?)")) {
            ps.setString(1, "res-1");
            ps.setString(2, "user-1");
            ps.setString(3, "Guest One");
            ps.setString(4, "table-1");
            ps.setString(5, "2024-04-01T18:00:00Z");
            ps.setString(6, "2024-04-01T20:00:00Z");
            ps.setInt(7, 2);
            ps.setString(8, "cancelled");
            ps.setString(9, "notes");
            ps.setString(10, "2024-03-01T09:00:00Z");
            ps.executeUpdate();

            ps.setString(1, "res-2");
            ps.setString(2, "user-1");
            ps.setString(3, "Guest Two");
            ps.setString(4, "table-1");
            ps.setString(5, "2024-05-01T18:00:00Z");
            ps.setString(6, "2024-05-01T20:00:00Z");
            ps.setInt(7, 4);
            ps.setString(8, "confirmed");
            ps.setString(9, "anniversary");
            ps.setString(10, "2024-04-01T09:00:00Z");
            ps.executeUpdate();

            ps.setString(1, "res-3");
            ps.setString(2, "user-2");
            ps.setString(3, "VIP");
            ps.setString(4, "table-2");
            ps.setString(5, "2024-06-10T19:00:00Z");
            ps.setString(6, "2024-06-10T21:00:00Z");
            ps.setInt(7, 5);
            ps.setString(8, "confirmed");
            ps.setString(9, "vip");
            ps.setString(10, "2024-05-10T09:00:00Z");
            ps.executeUpdate();
        }
    }

    @Test
    public void guestNameIsPersistedWhenProvided() throws Exception {
        ReservationDAO dao = new ReservationDAO(null);
        Reservation res = new Reservation();
        res.setTableId("table-2");
        res.setStartUtc("2024-07-01T18:00:00Z");
        res.setEndUtc("2024-07-01T19:30:00Z");
        res.setPartySize(3);
        res.setStatus("pending");
        res.setGuestName("Walk-in Tester");

        String id = dao.createReservation(res);
        assertNotNull(id);
        Reservation fetched = dao.getReservationById(id);
        assertNotNull(fetched);
        assertEquals("Walk-in Tester", fetched.getGuestName());
    }
}
