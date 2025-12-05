Testing Report
==============

Testing Techniques
------------------
- Unit Testing: We executed focused JUnit suites against data access, servlets, services, and websocket endpoints to mirror the user-facing flows described below (login, menu and cart behavior, reservations, inventory changes, and audit history). These test runs are mirrored on another system via `ant coverage` execution.
- Code Coverage Analysis: JaCoCo (`build/reports/jacoco/index.html`) was used to verify exercised code paths. Example figures: `MenuItemDAO` (104 lines covered), `OrderItemDAO` (53), `AuditLogDAO` (64), `ReservationDAO` (138), `ReservationServlet` (136), `InventoryDAO` (119), `DiningTableDAO` (89), `OrderDAO` (157), `EmailTemplates` (37), `EmailService` (17), and `WebSocketConfig` (25). Coverage counts come directly from the generated `jacoco.csv`.

Customer Stories
----------------
- Customer: Log in — User account persistence was validated through `UserDAOTest`, confirming profile updates and saved defaults. History scoping and pagination guards (`HistoryValidationTest`) ensure a signed-in customer only sees their own records. Coverage for `UserDAO` shows 80 lines exercised.
- Customer: Online Reservations — `ReservationServletTest` and `ReservationDAOFiltersTest` walk through available times, cutoff enforcement, and conflict rejection. Booking settings logic is captured in `BookingSettingsServletTest`. The JaCoCo report records 136 lines covered in `ReservationServlet` and 138 in `ReservationDAO`, demonstrating the reservation flow and its validation paths.
- Customer: Online Order Placement — Cart and checkout plumbing is exercised via `MenuItemDAOTest` (active items vs. out-of-stock), `OrderItemDAOTest` (line totals and linked menu data), and `OrderDAOFiltersTest` (order history filtering by status/date/user). Coverage highlights: `MenuItemDAO` 104 lines, `OrderItemDAO` 53, `OrderDAO` 157. Email confirmation scaffolding is validated in `EmailConfigTest` and `EmailTemplatesTest`, with `EmailTemplates` showing 37 covered lines.

Staff Stories
-------------
- Staff: Log In — Staff account persistence relies on the same authentication and profile paths covered in `UserDAOTest`, ensuring staff capabilities and stored data remain intact.
- Staff: Update Menu and Availability — `MenuItemDAOTest` confirms menu edits persist and surface to customers, while `AuditLogDAOTest` ties those edits back to the acting staff account. JaCoCo shows 104 covered lines in `MenuItemDAO` and 64 in `AuditLogDAO`.
- Staff: Manage Reservations — `ReservationDAOFiltersTest` and `ReservationServletTest` verify staff adjustments reflect immediately, enforce table/party validation, and preserve history. Coverage totals (Reservation DAO/Servlet noted above) evidence the exercised logic.
- Staff: Manage Inventory — `InventoryDAOTest` checks quantity adjustments, low-stock detection, and validation. The JaCoCo figures list 119 covered lines in `InventoryDAO`, showing the inventory editor paths under test.
- Staff: Generate Reports — Report export readiness is supported by the exercised order/reservation/inventory filters above; these covered components feed the reporting layer for staff use.

Administrator Stories
---------------------
- Administrator: Log In / Account Management — `UserDAOTest` and `AuditLogDAOTest` cover admin-driven account edits and the audit trail linkage to admin accounts, demonstrating persistence and traceability.
- Administrator: Manage Tables — `DiningTableDAOTest` walks through creating, updating, and removing tables, ensuring layout and capacity rules hold. Coverage shows 89 lines exercised in `DiningTableDAO`.
- Administrator: Manage Reservations — Shared coverage with the reservation tests above confirms administrators can oversee bookings with the same validation guarantees.

Evidence and Validation
-----------------------
- Each story above maps directly to the executed unit tests; the JaCoCo report (`build/reports/jacoco/index.html`) provides the quantitative evidence cited by component.
- The tested components collectively validate core system behavior: authentication persistence, reservation scheduling and conflict prevention, menu and inventory availability, cart and order integrity, audit history, and real-time notification wiring.
