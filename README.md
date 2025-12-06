# CSCI_472_Group_Project

## Run & Deploy
### Prerequisites
- **Java**: JDK 17 thru 21. JDK 17 is recommened for the best experience with Glassfish 
- **Apache Ant**: Latest version
- **Node.js**: 18+ with npm   https://nodejs.org/en/download
- **GlassFish**: Eclipse GlassFish 7.0.25, Jakarta EE Platform 10 
  - Download from: https://glassfish.org/download
    
### Environment Setup
1. Set `JAVA_HOME` environment variable to your JDK 17 installation directory
2. Set `GLASSFISH_HOME` environment variable to your GlassFish installation directory (e.g., `C:\glassfish7`)
Example for setting your enviroment variables are below. You will need to set the file path that corresponds to the actual location in your system.
 **Windows using Powershell or CMD:**
# Set environment variables (replace paths with your actual installation directories)
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
setx GLASSFISH_HOME "C:\glassfish7" 
**Linux or OSx using Bash:**
# Add to ~/.bashrc or ~/.bash_profile (replace paths with your actual installation directories)
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export GLASSFISH_HOME="/opt/glassfish7"
4. Restart your terminal/PowerShell after setting environment variables

### Start and Deploy
**Windows:**
1. Start GlassFish: `%GLASSFISH_HOME%\bin\asadmin.bat start-domain`
2. Build and deploy: `ant run`
   - Use `ant "-Drefresh.db=true" run` once to rebuild the SQLite DB schema/seed at `%USERPROFILE%\.rbos\restaurant.db`
3. Access the application at: `http://localhost:8080/RBOS/`
   - Admin console: `http://localhost:8080/RBOS/admin`

**Linux or OSx:**
1. Start GlassFish: `$GLASSFISH_HOME/bin/asadmin start-domain`
2. Build and deploy: `ant run`
   - Use `ant -Drefresh.db=true run` once to rebuild the SQLite DB schema/seed at `~/.rbos/restaurant.db`
3. Access the application at: `http://localhost:8080/RBOS/`
   - Admin console: `http://localhost:8080/RBOS/admin`

You can alternatively use these commands to deploy the app `asadmin start-domain <DOMAIN>` then `asadmin deploy --force dist/RBOS.war`

### Testing
- To run all tests, use `ant test`. Coverage reports are generated via `ant coverage`.
- 
### Alternative Build Option
- Build WAR frontend and backend `ant package-war`
- Deploy to GlassFish:
  - Windows: `%GLASSFISH_HOME%\bin\asadmin.bat deploy --force=true dist/RBOS.war`
  - Linux and OSx: `$GLASSFISH_HOME/bin/asadmin deploy --force=true dist/RBOS.war`

## Configuration of Environment
- GlassFish ports: in `glassfish-7.0.25\glassfish7\glassfish\domains\<DOMAIN>\config\domain.xml` ensure  
  `<system-property name="ASADMIN_LISTENER_PORT" value="4848"/>` and `<system-property name="HTTP_LISTENER_PORT" value="8080"/>`.
- DB location: `%USERPROFILE%\.rbos\restaurant.db` (auto-created/verified at startup).
- SPA routing: `web.xml` includes SPA redirect; ensure deployment context is `/RBOS`.
- For clean seed data after schema changes: delete `%USERPROFILE%\.rbos\restaurant.db` and rerun `ant -Drefresh.db=true`.
