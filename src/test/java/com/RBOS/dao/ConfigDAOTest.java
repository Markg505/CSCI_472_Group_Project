package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.utils.DatabaseConnection;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ConfigDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDatabase() throws Exception {
        Path db = tempDir.newFile("config.db").toPath();
        System.setProperty("RBOS_DB", db.toString());

        // Trigger normal schema creation so ensureSchema doesn't wipe our custom table
        try (Connection conn = DatabaseConnection.getConnection(null)) {
            conn.close();
        }

        Class.forName("org.sqlite.JDBC");
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + db);
                Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE restaurant_config (config_key TEXT PRIMARY KEY, config_value TEXT)");
        }
    }

    @Test
    public void setConfigValueInsertsAndUpdates() throws Exception {
        ConfigDAO dao = new ConfigDAO(null);

        assertTrue(dao.setConfigValue("homepage", "enabled"));
        assertEquals("enabled", dao.getConfigValue("homepage"));

        assertTrue("Upsert should update existing value", dao.setConfigValue("homepage", "disabled"));
        assertEquals("disabled", dao.getConfigValue("homepage"));
    }

    @Test
    public void getConfigValueReturnsNullWhenMissing() throws Exception {
        ConfigDAO dao = new ConfigDAO(null);
        assertNull(dao.getConfigValue("does-not-exist"));
    }
}
