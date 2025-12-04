import java.nio.file.*;
import java.sql.*;

public class CreateDatabase {
    public static void main(String[] args) throws Exception {
        // Paths
        String schemaFile = "src/main/resources/backend/schema.sql";
        String dbFile = "src/main/resources/backend/restaurant.db";
        
        // Delete old database if exists
        Files.deleteIfExists(Paths.get(dbFile));
        
        // Read SQL file
        String sql = new String(Files.readAllBytes(Paths.get(schemaFile)));
        
        // Create database and execute SQL
        Class.forName("org.sqlite.JDBC");
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbFile);
             Statement stmt = conn.createStatement()) {
            
            // Execute the entire schema
            stmt.executeUpdate(sql);
            
            System.out.println("Database created successfully at: " + dbFile);
        }
    }
}
