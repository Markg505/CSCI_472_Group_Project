package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.OrderDAO;
import com.RBOS.dao.UserDAO;
import com.RBOS.dao.InventoryDAO;
import com.RBOS.dao.MenuItemDAO;
import com.RBOS.models.HistoryResponse;
import com.RBOS.models.Order;
import com.RBOS.models.User;
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
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class OrderServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private OrderDAO orderDAO;
    private UserDAO userDAO;
    private OrderServlet servlet;
    private String customerId;
    private String otherUserId;
    private final ObjectMapper mapper = new ObjectMapper();

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("orders.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());

        userDAO = new UserDAO(null);
        orderDAO = new OrderDAO(null);

        customerId = createUser("Customer", "customer@example.com", "customer123", "customer");
        otherUserId = createUser("Other", "other@example.com", "other123", "customer");

        Order own = new Order();
        own.setOrderId("order-customer-1");
        own.setUserId(customerId);
        own.setSource("web");
        own.setStatus("placed");
        own.setSubtotal(10.0);
        own.setTax(0.8);
        own.setTotal(10.8);
        orderDAO.createOrder(own);

        Order other = new Order();
        other.setOrderId("order-other-1");
        other.setUserId(otherUserId);
        other.setSource("web");
        other.setStatus("placed");
        other.setSubtotal(15.0);
        other.setTax(1.2);
        other.setTotal(16.2);
        orderDAO.createOrder(other);

        servlet = new OrderServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void rootListingRequiresAuthentication() throws Exception {
        HttpServletRequest request = buildRequest("/", Collections.emptyMap(), null);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.status());
    }

    @Test
    public void customerCannotQueryAnotherUsersOrders() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/user/" + otherUserId, Collections.emptyMap(), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.status());
    }

    @Test
    public void customerGetsScopedResultsForStatusRoute() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/status/placed", Collections.emptyMap(), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());

        List<Order> orders = mapper.readValue(response.body().toString(), new TypeReference<List<Order>>() {});
        assertEquals(1, orders.size());
        assertEquals(customerId, orders.get(0).getUserId());
    }

    @Test
    public void historyAcceptsValidFilters() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        Instant now = Instant.now();

        Map<String, String> params = new HashMap<>();
        params.put("status", "placed");
        params.put("start_utc", now.minus(1, ChronoUnit.DAYS).toString());
        params.put("end_utc", now.plus(1, ChronoUnit.DAYS).toString());

        HttpServletRequest request = buildRequest("/history", params, session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Order> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Order>>() {});
        assertEquals(1, history.getItems().size());
        assertEquals(customerId, history.getItems().get(0).getUserId());
    }

    @Test
    public void historyRejectsUnknownStatus() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("status", "invalid-status"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.errorMessage().contains("Invalid status"));
    }

    @Test
    public void historyRejectsInvalidDateFormat() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("start_utc", "not-a-date"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.errorMessage().contains("start_utc"));
    }

    @Test
    public void historyRejectsStartAfterEnd() throws Exception {
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
    public void historyAppliesPaginationDefaultsAndRetentionMetadata() throws Exception {
        HttpSession session = buildSession(customerId, "customer");
        HttpServletRequest request = buildRequest("/history", Map.of("page", "0", "pageSize", "0"), session);
        ResponseCapture response = buildResponse();

        servlet.doGet(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        HistoryResponse<Order> history = mapper.readValue(response.body().toString(), new TypeReference<HistoryResponse<Order>>() {});
        assertEquals(1, history.getPage());
        assertEquals(com.RBOS.utils.HistoryValidation.DEFAULT_PAGE_SIZE, history.getPageSize());
        assertEquals(1, history.getTotal()); // only one order belongs to this customer
        assertEquals(13, history.getRetentionMonths());
        assertEquals(java.time.LocalDate.now().minusMonths(13).toString(), history.getRetentionHorizon());
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
    public void checkoutFailsWhenInventoryInsufficient() throws Exception {
        // seed a menu item and limited inventory
        MenuItemDAO menuItemDAO = new MenuItemDAO(null);
        InventoryDAO inventoryDAO = new InventoryDAO(null);
        com.RBOS.models.MenuItem mi = new com.RBOS.models.MenuItem("short-1", "Short", "desc", "Main", 5.0, true, null, "[]");
        try { menuItemDAO.createMenuItem(mi); } catch (Exception ignored) {}
        com.RBOS.models.Inventory inv = new com.RBOS.models.Inventory();
        inv.setItemId("short-1");
        inv.setName("Short Inv");
        inv.setSku("SHORT");
        inv.setCategory("Dry");
        inv.setUnit(com.RBOS.models.Unit.each);
        inv.setPackSize(1);
        inv.setQtyOnHand(1);
        inv.setParLevel(0);
        inv.setReorderPoint(0);
        inv.setCost(1.0);
        inv.setActive(true);
        inventoryDAO.createInventory(inv);

        String body = """
        {
          "userId":"%s",
          "source":"web",
          "status":"placed",
          "subtotal":10.0,
          "tax":0.8,
          "total":10.8,
          "orderItems":[{"itemId":"short-1","qty":2,"unitPrice":5.0,"lineTotal":10.0}]
        }
        """.formatted(customerId);
        HttpServletRequest request = buildPostRequest("/", body, null);
        ResponseCapture response = buildResponse();

        servlet.doPost(request, response.response());

        assertEquals(HttpServletResponse.SC_CONFLICT, response.status());
        com.RBOS.models.Inventory after = inventoryDAO.getInventoryByItemId("short-1");
        assertNotNull(after);
        assertEquals(Integer.valueOf(1), after.getQtyOnHand());
    }

    @Test
    public void cartMergeCreatesGuestCartAndRotatesTokenOnLogin() throws Exception {
        // ensure menu item exists to avoid FK helper writes during merge
        com.RBOS.dao.MenuItemDAO menuItemDAO = new com.RBOS.dao.MenuItemDAO(null);
        com.RBOS.models.MenuItem seed = new com.RBOS.models.MenuItem("menu-1", "Seed", "desc", "Main", 5.0, true, null, "[]");
        try { menuItemDAO.createMenuItem(seed); } catch (Exception ignored) {}

        // anonymous cart merge with one item
        String body = "{\"items\":[{\"itemId\":\"menu-1\",\"qty\":2,\"unitPrice\":5.0,\"name\":\"Item\"}]}";
        HttpServletRequest anonReq = buildPostRequest("/cart", body, null);
        ResponseCapture anonResp = buildResponse();

        servlet.doPost(anonReq, anonResp.response());

        assertEquals(HttpServletResponse.SC_OK, anonResp.status());
        Map<String, Object> anon = mapper.readValue(anonResp.body().toString(), new TypeReference<Map<String, Object>>() {});
        assertNotNull(anon.get("cartToken"));
        String anonToken = anon.get("cartToken").toString();
        assertEquals(1, ((List<?>) anon.get("items")).size());

        // same cartToken but now with logged-in user should rotate token and bind userId
        HttpSession session = buildSession(customerId, "customer");
        String bodyWithToken = "{\"items\":[{\"itemId\":\"menu-1\",\"qty\":1,\"unitPrice\":5.0,\"name\":\"Item\"}],\"cartToken\":\"" + anonToken + "\"}";
        HttpServletRequest userReq = buildPostRequest("/cart", bodyWithToken, session);
        ResponseCapture userResp = buildResponse();

        servlet.doPost(userReq, userResp.response());

        assertEquals(HttpServletResponse.SC_OK, userResp.status());
        Map<String, Object> merged = mapper.readValue(userResp.body().toString(), new TypeReference<Map<String, Object>>() {});
        assertNotNull(merged.get("cartToken"));
        assertNotEquals("cart token should rotate when bound to user", anonToken, merged.get("cartToken"));
        assertEquals(1, ((List<?>) merged.get("items")).size());
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
                        case "getRequestURI": return "/api/orders" + (pathInfo != null ? pathInfo : "");
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/orders";
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
                        case "getRequestURI": return "/api/orders" + (pathInfo != null ? pathInfo : "");
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/orders";
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
                            return "OrderServlet";
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
            return state.errorMessage;
        }
    }
}
