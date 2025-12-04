# CSCI_472_Group_Project

## Run & Deploy
- Prereqs: Java 17+, Ant, Node 18+, GlassFish 7.0.25.
- Install frontend dependencies: `cd frontend && npm install`.
- Build backend + frontend bundle: from project root `ant` (use `ant -Drefresh.db=true` once to rebuild the SQLite DB schema/seed at `%USERPROFILE%\.rbos\restaurant.db`).
- Deploy to GlassFish: `asadmin start-domain <DOMAIN>` then `asadmin deploy --force dist/RBOS.war`.
- App URL: `http://localhost:8080/RBOS/` (admin console at `/RBOS/admin`).

## Configuration of Environment
- GlassFish ports: in `glassfish-7.0.25\glassfish7\glassfish\domains\<DOMAIN>\config\domain.xml` ensure  
  `<system-property name="ASADMIN_LISTENER_PORT" value="4848"/>` and `<system-property name="HTTP_LISTENER_PORT" value="8080"/>`.
- DB location: `%USERPROFILE%\.rbos\restaurant.db` (auto-created/verified at startup).
- SPA routing: `web.xml` includes SPA redirect; ensure deployment context is `/RBOS`.
- For clean seed data after schema changes: delete `%USERPROFILE%\.rbos\restaurant.db` and rerun `ant -Drefresh.db=true`.
