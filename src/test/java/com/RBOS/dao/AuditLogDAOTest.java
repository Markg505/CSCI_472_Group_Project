package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.AuditLog;
import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class AuditLogDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDb() throws Exception {
        Path db = tempDir.newFile("audit.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        // Seed base schema then ensure table exists
        try (Connection conn = DatabaseConnection.getConnection(null)) {
            conn.close();
        }
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + db);
                Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS audit_log (log_id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, entity_type TEXT, entity_id TEXT, action TEXT, old_values TEXT, new_values TEXT, created_utc TEXT DEFAULT 'now')");
        }
    }

    @Test
    public void logActionPersistsAndFetchesByEntityType() throws Exception {
        AuditLogDAO dao = new AuditLogDAO(null);
        dao.logAction("1", "Admin Admin", "menu_item", "123", "create",
                java.util.Map.of("old", "before"), java.util.Map.of("new", "after"));

        List<AuditLog> all = dao.getAllLogs();
        assertEquals(1, all.size());
        assertNotNull(all.get(0).logId);

        List<AuditLog> filtered = dao.getLogsByEntityType("menu_item");
        assertEquals(1, filtered.size());

        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + System.getProperty("RBOS_DB"));
                Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery("SELECT user_id, entity_type, entity_id, action FROM audit_log")) {
            assertTrue(rs.next());
            assertEquals("1", rs.getString("user_id"));
            assertEquals("menu_item", rs.getString("entity_type"));
            assertEquals("123", rs.getString("entity_id"));
            assertEquals("create", rs.getString("action"));
        }
    }
}
