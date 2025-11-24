package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.DiningTableDAO;
import com.RBOS.dao.ReservationDAO;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.DiningTable;
import com.RBOS.models.HistoryResponse;
import com.RBOS.models.DiningTable;
import com.RBOS.models.Reservation;
import com.RBOS.models.User;
import com.RBOS.utils.HistoryValidation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class ReservationServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private ReservationDAO reservationDAO;
    private UserDAO userDAO;
    private DiningTableDAO diningTableDAO;
    private ReservationServlet servlet;
    private String customerId;
    private String otherUserId;
    private String adminId;
    private String tableId;
    private final ObjectMapper mapper = new ObjectMapper();

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("reservations.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());

        userDAO = new UserDAO(null);
        reservationDAO = new ReservationDAO(null);
        diningTableDAO = new DiningTableDAO(null);

        tableId = createTable("Booth", 4);

        customerId = createUser("Customer", "customer@example.com", "customer123", "customer");
        otherUserId = createUser("Other", "other@example.com", "other123", "customer");
        adminId = createUser("Admin", "admin@example.com", "admin123", "admin");

        Instant now = Instant.now();
        createReservation(customerId, "pending", now.minus(1, ChronoUnit.DAYS));
        createReservation(customerId, "confirmed", now.minus(2, ChronoUnit.DAYS));
        createReservation(otherUserId, "confirmed", now.minus(1, ChronoUnit.DAYS));

        servlet = new ReservationServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void historyAppliesPaginationDefaultsAndRetentionMetadata() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("page", "0", "pageSize", "0"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Reservation> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Reservation>>() {});
        assertEquals(1, history.getPage());
        assertEquals(HistoryValidation.DEFAULT_PAGE_SIZE, history.getPageSize());
        assertEquals(2, history.getTotal());
        assertEquals(2, history.getItems().size());
        assertTrue(history.getItems().stream().allMatch(r -> customerId.equals(r.getUserId())));
        assertEquals(13, history.getRetentionMonths());
        assertEquals(LocalDate.now().minusMonths(13).toString(), history.getRetentionHorizon());
    }

    @Test
    public void historyFiltersValidStatusForCustomer() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("status", "pending"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Reservation> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Reservation>>() {});
        assertEquals(1, history.getItems().size());
        assertEquals("pending", history.getItems().get(0).getStatus());
        assertEquals(customerId, history.getItems().get(0).getUserId());
    }

    @Test
    public void historyRejectsInvalidStatus() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("status", "invalid-status"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.errorMessage().contains("Invalid status"));
    }

    @Test
    public void historyRejectsInvertedRange() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        Instant now = Instant.now();
        Map<String, String> params = Map.of(
                "start_utc", now.plus(1, ChronoUnit.DAYS).toString(),
                "end_utc", now.minus(1, ChronoUnit.DAYS).toString()
        );
        HttpServletRequest request = buildRequest("/history", params, session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.errorMessage().contains("start_utc must be before or equal to end_utc"));
    }

    @Test
    public void historyRejectsRangesOutsideRetention() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        Instant now = Instant.now();
        Map<String, String> params = Map.of(
                "start_utc", now.plus(730, ChronoUnit.DAYS).toString(),
                "end_utc", now.plus(1095, ChronoUnit.DAYS).toString()
        );
        HttpServletRequest request = buildRequest("/history", params, session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.errorMessage().contains("Requested range is outside the retention window"));
    }

    @Test
    public void historyClampsOldRangesToRetentionHorizon() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        Instant now = Instant.now();
        Map<String, String> params = Map.of(
                "start_utc", now.minus(1095, ChronoUnit.DAYS).toString(),
                "end_utc", now.plus(1, ChronoUnit.DAYS).toString()
        );
        HttpServletRequest request = buildRequest("/history", params, session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Reservation> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Reservation>>() {});
        assertEquals(2, history.getItems().size());
        assertEquals(13, history.getRetentionMonths());
        assertEquals(LocalDate.now().minusMonths(13).toString(), history.getRetentionHorizon());
    }

    @Test
    public void historyRequiresAuthentication() throws Exception {
        HttpServletRequest request = buildRequest("/history", Collections.emptyMap(), null);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.status());
        assertTrue(response.errorMessage().contains("Authentication required"));
    }

    @Test
    public void customerCannotViewOtherUsersHistory() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("userId", otherUserId), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.status());
        assertTrue(response.errorMessage().contains("Cross-account history access denied"));
    }

    @Test
    public void adminCanViewAnyUsersHistory() throws Exception {
        HttpSession session = buildSession(adminId, "admin");
        HttpServletRequest request = buildRequest("/history", Map.of("userId", otherUserId), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Reservation> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Reservation>>() {});
        assertEquals(1, history.getItems().size());
        assertEquals(otherUserId, history.getItems().get(0).getUserId());
    }

    @Test
    public void availableTablesReturnsOnlyNonConflicting() throws Exception {
        HttpServletRequest request = buildRequest("/available-tables",
                Map.of("startUtc", Instant.now().plus(1, ChronoUnit.HOURS).toString(),
                       "endUtc", Instant.now().plus(2, ChronoUnit.HOURS).toString(),
                       "partySize", "2"),
                null);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        List<DiningTable> tables = mapper.readValue(response.body().toString(), new TypeReference<List<DiningTable>>() {});
        assertFalse("Should return at least one available table", tables.isEmpty());
    }

    @Test
    public void createReservationAutoAssignsTableWhenMissing() throws Exception {
        Reservation res = new Reservation();
        res.setUserId(customerId);
        res.setStartUtc(Instant.now().plus(1, ChronoUnit.DAYS).toString());
        res.setEndUtc(Instant.now().plus(1, ChronoUnit.DAYS).plus(90, ChronoUnit.MINUTES).toString());
        res.setPartySize(2);
        res.setStatus("pending");

        String json = mapper.writeValueAsString(res);
        HttpServletRequest req = buildPostRequest("/", json, null);
        ResponseCapture resp = buildResponse();

        servlet.doPost(req, resp.response());

        assertEquals(HttpServletResponse.SC_CREATED, resp.status());
        Reservation created = mapper.readValue(resp.body().toString(), Reservation.class);
        assertNotNull("Table should be auto-assigned", created.getTableId());
        assertEquals(customerId, created.getUserId());
    }

    private String createUser(String name, String email, String password, String role) throws Exception {
        User user = new User();
        user.setFullName(name);
        user.setEmail(email);
        user.setPhone("555-0000");
        user.setPassword(password);
        user.setRole(role);
        return userDAO.createUser(user);
    }

    private String createTable(String name, int capacity) throws Exception {
        DiningTable table = new DiningTable();
        table.setName(name);
        table.setCapacity(capacity);
        return diningTableDAO.createTable(table);
    }

    private String createReservation(String userId, String status, Instant start) throws Exception {
        Reservation reservation = new Reservation();
        reservation.setUserId(userId);
        reservation.setTableId(tableId);
        reservation.setStartUtc(start.toString());
        reservation.setEndUtc(start.plus(2, ChronoUnit.HOURS).toString());
        reservation.setPartySize(2);
        reservation.setStatus(status);
        reservation.setNotes("test");
        return reservationDAO.createReservation(reservation);
    }

    private HttpSession buildSession(String userId, String role) {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("userId", userId);
        attributes.put("role", role);

        return (HttpSession) Proxy.newProxyInstance(
                HttpSession.class.getClassLoader(),
                new Class[] {HttpSession.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getAttribute":
                            return attributes.get(args[0]);
                        case "setAttribute":
                            attributes.put((String) args[0], args[1]);
                            return null;
                        case "removeAttribute":
                            attributes.remove(args[0]);
                            return null;
                        case "getId":
                            return "session-" + userId;
                        case "invalidate":
                            attributes.clear();
                            return null;
                        default:
                            return defaultValue(method.getReturnType());
                    }
                });
    }

    private HttpServletRequest buildRequest(String pathInfo, Map<String, String> params, HttpSession session) {
        Map<String, String> query = params != null ? params : Collections.emptyMap();

        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getPathInfo":
                            return pathInfo;
                        case "getParameter":
                            return query.get(args[0]);
                        case "getParameterMap":
                            return query;
                        case "getParameterNames":
                            return Collections.enumeration(query.keySet());
                        case "getMethod":
                            return "GET";
                        case "getReader":
                            return new BufferedReader(new StringReader(""));
                        case "getSession":
                            if (args == null || args.length == 0) {
                                return session;
                            }
                            boolean create = (Boolean) args[0];
                            if (session != null || !create) {
                                return session;
                            }
                            return buildSession(null, null);
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/reservations" + (pathInfo != null ? pathInfo : "");
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/reservations";
                        default:
                            return defaultValue(method.getReturnType());
                    }
                });
    }

    private HttpServletRequest buildPostRequest(String pathInfo, String body, HttpSession session) {
        String payload = body == null ? "" : body;
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getPathInfo": return pathInfo;
                        case "getMethod": return "POST";
                        case "getReader": return new BufferedReader(new StringReader(payload));
                        case "getSession": return session;
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/reservations" + (pathInfo != null ? pathInfo : "");
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/reservations";
                        case "getParameterNames": return Collections.emptyEnumeration();
                        default: return defaultValue(method.getReturnType());
                    }
                });
    }

    private ResponseCapture buildResponse() {
        ResponseState state = new ResponseState();

        HttpServletResponse response = (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "setContentType":
                            state.contentType = (String) args[0];
                            return null;
                        case "setCharacterEncoding":
                            state.characterEncoding = (String) args[0];
                            return null;
                        case "getWriter":
                            return state.writer;
                        case "sendError":
                            state.status = (Integer) args[0];
                            if (args.length > 1) {
                                state.errorMessage = (String) args[1];
                            }
                            return null;
                        case "setStatus":
                            state.status = (Integer) args[0];
                            return null;
                        case "getStatus":
                            return state.status;
                        case "isCommitted":
                            return false;
                        default:
                            return defaultValue(method.getReturnType());
                    }
                });

        return new ResponseCapture(response, state.body, state);
    }

    private ServletConfig buildServletConfig() {
        ServletContext context = (ServletContext) Proxy.newProxyInstance(
                ServletContext.class.getClassLoader(),
                new Class[] {ServletContext.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getAttribute":
                        case "getInitParameter":
                            return null;
                        case "getAttributeNames":
                        case "getInitParameterNames":
                            return Collections.emptyEnumeration();
                        case "setAttribute":
                            return null;
                        default:
                            return defaultValue(method.getReturnType());
                    }
                });

        return (ServletConfig) Proxy.newProxyInstance(
                ServletConfig.class.getClassLoader(),
                new Class[] {ServletConfig.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getServletName":
                            return "ReservationServlet";
                        case "getServletContext":
                            return context;
                        case "getInitParameter":
                            return null;
                        case "getInitParameterNames":
                            return Collections.emptyEnumeration();
                        default:
                            return defaultValue(method.getReturnType());
                    }
                });
    }

    private Object defaultValue(Class<?> returnType) {
        if (returnType == null || returnType.equals(Void.TYPE)) {
            return null;
        }
        if (returnType.equals(boolean.class)) {
            return false;
        }
        if (returnType.equals(int.class)) {
            return 0;
        }
        if (returnType.equals(long.class)) {
            return 0L;
        }
        if (returnType.equals(double.class)) {
            return 0.0d;
        }
        if (returnType.isEnum()) {
            return returnType.getEnumConstants()[0];
        }
        return null;
    }

    private static class ResponseState {
        int status = HttpServletResponse.SC_OK;
        String contentType;
        String characterEncoding;
        String errorMessage;
        StringWriter body = new StringWriter();
        PrintWriter writer = new PrintWriter(body);
    }

    private record ResponseCapture(HttpServletResponse response, StringWriter body, ResponseState state) {
        int status() {
            return state.status;
        }

        String errorMessage() {
            return state.errorMessage != null ? state.errorMessage : "";
        }
    }
}
