import java.nio.file.*;
import java.sql.*;

public class RebuildDB {
    public static void main(String[] args) {
        String schemaFile = "src/main/resources/backend/schema.sql";
        String dbFile = "src/main/resources/backend/restaurant.db";
        
        try {
            // Read SQL file
            String sql = new String(Files.readAllBytes(Paths.get(schemaFile)));
            
            // Connect and execute
            Class.forName("org.sqlite.JDBC");
            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbFile);
                 Statement stmt = conn.createStatement()) {
                
                // Execute the entire SQL file
                stmt.executeUpdate(sql);
                System.out.println("Database created successfully at: " + dbFile);
                
                // Verify users table
                try (ResultSet rs = stmt.executeQuery("SELECT user_id, email, password_hash FROM users")) {
                    System.out.println("\nVerifying users:");
                    while (rs.next()) {
                        System.out.println("  " + rs.getString("email") + " -> " + rs.getString("password_hash"));
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
