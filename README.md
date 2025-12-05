# CSCI_472_Group_Project

## Run & Deploy
- Prereqs: Java 17, Ant, Node 18, GlassFish 7.0.25.
- The relative path to your glassfish folder must be set correctly. The current project expects that you will ascend two directories, then find a Glassfish 7.0.25 folder within that directory. The line in the build script is: <property name="glassfish.home" value="../../glassfish-7.0.25/glassfish7"/>
- The relative path to your jdk17 must also be set correctly in a similar fashion. The line in the build script is:     <property name="java17.home" value="../../Program Files/Java/jdk-17"/>
- Build backend + frontend bundle: from project root `ant` (use `ant -Drefresh.db=true` or `ant "-Drefresh.db=true"` once to rebuild the SQLite DB schema/seed at `%USERPROFILE%\.rbos\restaurant.db`).
- Deploy to GlassFish: ant deploy.
- Alternatively, use `asadmin start-domain <DOMAIN>` then `asadmin deploy --force dist/RBOS.war`.
- To run all tests, use `ant test`. Coverage reports are generated via `ant coverage`.
- App URL: `http://localhost:8080/RBOS/` (admin console at `/RBOS/admin`).

## Configuration of Environment
- GlassFish ports: in `glassfish-7.0.25\glassfish7\glassfish\domains\<DOMAIN>\config\domain.xml` ensure  
  `<system-property name="ASADMIN_LISTENER_PORT" value="4848"/>` and `<system-property name="HTTP_LISTENER_PORT" value="8080"/>`.
- DB location: `%USERPROFILE%\.rbos\restaurant.db` (auto-created/verified at startup).
- SPA routing: `web.xml` includes SPA redirect; ensure deployment context is `/RBOS`.
- For clean seed data after schema changes: delete `%USERPROFILE%\.rbos\restaurant.db` and rerun `ant -Drefresh.db=true`.
