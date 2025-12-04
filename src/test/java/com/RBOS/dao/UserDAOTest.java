package com.RBOS.dao;

import static org.junit.Assert.*;

import com.RBOS.models.User;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.stream.Collectors;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class UserDAOTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void setupDbPath() throws Exception {
        // Define path for test DB and set system property
        Path dbPath = tempDir.newFile("test.db").toPath();
        System.setProperty("RBOS_DB", dbPath.toString());

        // Load schema.sql from classpath
        String schema;
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("backend/schema.sql")) {
            if (in == null) {
                throw new RuntimeException("Could not find schema.sql on the classpath. " +
                        "Ensure it's in src/main/resources/backend.");
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                schema = reader.lines().collect(Collectors.joining("\n"));
            }
        }

        // URL for the new database, SQLite JDBC will create the file.
        String dbUrl = "jdbc:sqlite:" + dbPath.toString();
        Class.forName("org.sqlite.JDBC");

        // Create a connection and execute the schema script
        try (Connection conn = DriverManager.getConnection(dbUrl);
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(schema);
        }
    }

    @Test
    public void updateProfilePersistsNewValues() throws Exception {
        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Original User");
        user.setEmail("original@example.com");
        user.setPhone("555-0000");
        user.setPassword("oldPass123");

        String userId = dao.createUser(user);
        assertNotNull("User should be created with generated id", userId);

        boolean updated = dao.updateProfile(userId, "Updated User", "updated@example.com", "555-1111");
        assertTrue("Profile update should succeed", updated);

        User reloaded = dao.getUserById(userId);
        assertNotNull(reloaded);
        assertEquals("Updated User", reloaded.getFullName());
        assertEquals("updated@example.com", reloaded.getEmail());
        assertEquals("555-1111", reloaded.getPhone());
    }

    @Test
    public void updatePasswordWithValidationChecksCurrentHash() throws Exception {
        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Password User");
        user.setEmail("pw@example.com");
        user.setPhone("555-2222");
        user.setPassword("StartPass9");

        String userId = dao.createUser(user);
        assertNotNull(userId);

        boolean rejected = dao.updatePasswordWithValidation(userId, "bad", "NewPass99");
        assertFalse("Invalid current password should not update hash", rejected);

        boolean accepted = dao.updatePasswordWithValidation(userId, "StartPass9", "NewPass99");
        assertTrue("Valid current password should update hash", accepted);

        User reloaded = dao.getUserById(userId);
        assertTrue(UserDAO.passwordMatches("NewPass99", reloaded.getPasswordHash()));
    }
}
