# Rebuild database from schema.sql
$schemaPath = "src\main\resources\backend\schema.sql"
$seedDbPath = "src\main\resources\backend\restaurant.db"
$sqliteJar = "src\main\webapp\WEB-INF\lib\sqlite-jdbc-3.50.3.0.jar"

# Read schema SQL
$sql = Get-Content $schemaPath -Raw

# Use SQLite JDBC to execute
Add-Type -Path $sqliteJar
$conn = [System.Data.SQLite.SQLiteConnection]::new("Data Source=$seedDbPath;Version=3;")
$conn.Open()

try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.ExecuteNonQuery()
    Write-Host "Database recreated successfully at $seedDbPath"
} finally {
    $conn.Close()
}
