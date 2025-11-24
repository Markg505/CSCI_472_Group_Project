package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.MenuItemDAO;
import com.RBOS.models.MenuItem;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class MenuServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private final ObjectMapper mapper = new ObjectMapper();
    private MenuServlet servlet;
    private MenuItemDAO dao;

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("menu.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());
        // initialize schema and clear seeded menu_items
        try (var conn = DatabaseConnection.getConnection(null); var stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM order_items");
            stmt.execute("DELETE FROM orders");
            stmt.execute("DELETE FROM inventory");
            stmt.execute("DELETE FROM menu_items");
        }
        dao = new MenuItemDAO(null);
        servlet = new MenuServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void listActiveThenCreateAndFetchById() throws Exception {
        // initially empty
        ResponseCapture empty = buildResponse();
        servlet.doGet(buildRequest("/", "GET", null, Collections.emptyMap()), empty.response());
        assertEquals(HttpServletResponse.SC_OK, empty.status());
        List<MenuItem> none = mapper.readValue(empty.body().toString(), new TypeReference<List<MenuItem>>() {});
        assertTrue(none.isEmpty());

        // create a menu item
        String payload = "{\"itemId\":\"m-1\",\"name\":\"Test Item\",\"price\":9.5,\"category\":\"Main\",\"active\":true,\"description\":\"desc\",\"dietaryTags\":\"[]\"}";
        ResponseCapture created = buildResponse();
        servlet.doPost(buildRequest("/", "POST", payload, Collections.emptyMap()), created.response());
        assertEquals(HttpServletResponse.SC_CREATED, created.status());
        MenuItem createdItem = mapper.readValue(created.body().toString(), MenuItem.class);
        assertEquals("m-1", createdItem.getItemId());
        assertEquals("Test Item", createdItem.getName());

        // fetch by id
        ResponseCapture byId = buildResponse();
        servlet.doGet(buildRequest("/m-1", "GET", null, Collections.emptyMap()), byId.response());
        assertEquals(HttpServletResponse.SC_OK, byId.status());
        MenuItem fetched = mapper.readValue(byId.body().toString(), MenuItem.class);
        assertEquals("m-1", fetched.getItemId());
    }

    @Test
    public void updateAndDeleteMenuItem() throws Exception {
        // seed item via DAO
        MenuItem seed = new MenuItem("m-2", "Seed", "desc", "Main", 5.0, true, null, "[]");
        dao.createMenuItem(seed);

        // update
        String updatePayload = "{\"name\":\"Updated\",\"price\":7.25,\"category\":\"Side\",\"active\":false,\"description\":\"new\",\"dietaryTags\":\"[]\"}";
        ResponseCapture updateResp = buildResponse();
        servlet.doPut(buildRequest("/m-2", "PUT", updatePayload, Collections.emptyMap()), updateResp.response());
        assertEquals(HttpServletResponse.SC_OK, updateResp.status());
        MenuItem updated = mapper.readValue(updateResp.body().toString(), MenuItem.class);
        assertEquals("Updated", updated.getName());
        assertEquals(Double.valueOf(7.25), updated.getPrice());
        assertFalse(updated.getActive());

        // delete
        ResponseCapture delResp = buildResponse();
        servlet.doDelete(buildRequest("/m-2", "DELETE", null, Collections.emptyMap()), delResp.response());
        assertEquals(HttpServletResponse.SC_NO_CONTENT, delResp.status());

        ResponseCapture byId = buildResponse();
        servlet.doGet(buildRequest("/m-2", "GET", null, Collections.emptyMap()), byId.response());
        assertEquals(HttpServletResponse.SC_NOT_FOUND, byId.status());
    }

    private HttpServletRequest buildRequest(String pathInfo, String method, String body, Map<String, String> params) {
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "getPathInfo": return pathInfo;
                        case "getMethod": return method;
                        case "getReader": return new BufferedReader(new StringReader(body != null ? body : ""));
                        case "getParameter":
                            return params.get(args[0]);
                        case "getParameterMap":
                            return params;
                        case "getParameterNames":
                            return Collections.enumeration(params.keySet());
                        default:
                            return null;
                    }
                });
    }

    private ResponseCapture buildResponse() {
        ResponseState state = new ResponseState();
        HttpServletResponse response = (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "setStatus":
                            state.status = (int) args[0];
                            return null;
                        case "sendError":
                            state.status = (int) args[0];
                            state.errorMessage = args.length > 1 ? (String) args[1] : null;
                            return null;
                        case "setContentType":
                            state.contentType = (String) args[0];
                            return null;
                        case "setCharacterEncoding":
                            state.characterEncoding = (String) args[0];
                            return null;
                        case "getWriter":
                            return state.writer;
                        default:
                            return null;
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
                        default:
                            return null;
                    }
                });

        return (ServletConfig) Proxy.newProxyInstance(
                ServletConfig.class.getClassLoader(),
                new Class[] {ServletConfig.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getServletName":
                            return "MenuServlet";
                        case "getServletContext":
                            return context;
                        case "getInitParameter":
                            return null;
                        case "getInitParameterNames":
                            return Collections.emptyEnumeration();
                        default:
                            return null;
                    }
                });
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
        int status() { return state.status; }
        String errorMessage() { return state.errorMessage != null ? state.errorMessage : ""; }
    }
}
