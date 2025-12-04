package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.DiningTable;
import com.RBOS.models.Reservation;
import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Instant;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class DiningTableDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDb() throws Exception {
        Path db = tempDir.newFile("tables.db").toPath();
        System.setProperty("RBOS_DB", db.toString());
        try (Connection conn = DatabaseConnection.getConnection(null)) {
            // triggers schema creation from schema.sql and seeded data
            try (var stmt = conn.createStatement()) {
                stmt.execute("DELETE FROM reservations");
                stmt.execute("DELETE FROM dining_tables");
            }
        }
    }

    @Test
    public void createUpdateAndDeleteTable() throws Exception {
        DiningTableDAO dao = new DiningTableDAO(null);

        DiningTable t1 = new DiningTable(null, "Main Floor 1", 4);
        String id = dao.createTable(t1);
        assertNotNull(id);

        DiningTable fetched = dao.getTableById(id);
        assertNotNull(fetched);
        assertEquals("Main Floor 1", fetched.getName());
        assertEquals(Integer.valueOf(4), Integer.valueOf(fetched.getCapacity()));

        fetched.setCapacity(6);
        boolean updated = dao.updateTable(fetched);
        assertTrue(updated);

        DiningTable updatedTable = dao.getTableById(id);
        assertNotNull(updatedTable);
        assertEquals(Integer.valueOf(6), Integer.valueOf(updatedTable.getCapacity()));

        boolean deleted = dao.deleteTable(id);
        assertTrue(deleted);
        assertNull(dao.getTableById(id));
    }

    @Test
    public void availabilityExcludesOverlappingReservations() throws Exception {
        DiningTableDAO tableDAO = new DiningTableDAO(null);
        ReservationDAO reservationDAO = new ReservationDAO(null);

        String tSmall = tableDAO.createTable(new DiningTable(null, "Two Top", 2));
        String tLarge = tableDAO.createTable(new DiningTable(null, "Six Top", 6));
        assertNotNull(tSmall);
        assertNotNull(tLarge);

        Reservation res = new Reservation();
        res.setTableId(tLarge);
        res.setStartUtc("2025-01-01T10:00:00Z");
        res.setEndUtc("2025-01-01T11:00:00Z");
        res.setPartySize(5);
        res.setStatus("confirmed");
        res.setNotes("Big party");
        String resId = reservationDAO.createReservation(res);
        assertNotNull(resId);

        // For party size 5, the only table large enough is booked during the window
        var sizeFive = tableDAO.getAvailableTables("2025-01-01T10:15:00Z", "2025-01-01T10:45:00Z", 5);
        assertTrue("Conflicting large table should not be returned", sizeFive.stream().noneMatch(t -> tLarge.equals(t.getTableId())));

        // For party size 2, the small table should be available (large table is still booked)
        var sizeTwo = tableDAO.getAvailableTables("2025-01-01T10:15:00Z", "2025-01-01T10:45:00Z", 2);
        assertEquals(1, sizeTwo.size());
        assertEquals(tSmall, sizeTwo.get(0).getTableId());
    }
}
