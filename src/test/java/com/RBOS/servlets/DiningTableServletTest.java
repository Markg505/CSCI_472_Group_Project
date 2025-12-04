package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.DiningTableDAO;
import com.RBOS.models.DiningTable;
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
import java.util.Enumeration;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class DiningTableServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private DiningTableServlet servlet;
    private DiningTableDAO dao;
    private final ObjectMapper mapper = new ObjectMapper();

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("tables.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());
        // trigger schema
        try (var conn = DatabaseConnection.getConnection(null); var stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM reservations");
            stmt.execute("DELETE FROM dining_tables");
        }

        dao = new DiningTableDAO(null);
        servlet = new DiningTableServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void getAllTablesReturnsEmptyThenReflectsCreates() throws Exception {
        // initial GET
        ResponseCapture emptyResp = buildResponse();
        servlet.doGet(buildRequest("/", "GET", null, Collections.emptyMap()), emptyResp.response());
        assertEquals(HttpServletResponse.SC_OK, emptyResp.status());
        List<DiningTable> emptyList = mapper.readValue(emptyResp.body().toString(), new TypeReference<List<DiningTable>>() {});
        assertTrue(emptyList.isEmpty());

        // create table
        ResponseCapture createResp = buildResponse();
        servlet.doPost(buildRequest("/", "POST", "{\"name\":\"Main\",\"capacity\":4}", Collections.emptyMap()), createResp.response());
        assertEquals(HttpServletResponse.SC_CREATED, createResp.status());
        DiningTable created = mapper.readValue(createResp.body().toString(), DiningTable.class);
        assertNotNull(created.getTableId());
        assertEquals("Main", created.getName());
        assertEquals(Integer.valueOf(4), Integer.valueOf(created.getCapacity()));

        // GET after create
        ResponseCapture listResp = buildResponse();
        servlet.doGet(buildRequest("/", "GET", null, Collections.emptyMap()), listResp.response());
        List<DiningTable> list = mapper.readValue(listResp.body().toString(), new TypeReference<List<DiningTable>>() {});
        assertEquals(1, list.size());
        assertEquals(created.getTableId(), list.get(0).getTableId());
    }

    @Test
    public void deleteRemovesTable() throws Exception {
        DiningTable t = new DiningTable();
        t.setName("Temp");
        t.setCapacity(2);
        String id = dao.createTable(t);
        assertNotNull(id);

        ResponseCapture deleteResp = buildResponse();
        servlet.doDelete(buildRequest("/" + id, "DELETE", null, Collections.emptyMap()), deleteResp.response());
        assertEquals(HttpServletResponse.SC_NO_CONTENT, deleteResp.status());

        ResponseCapture listResp = buildResponse();
        servlet.doGet(buildRequest("/", "GET", null, Collections.emptyMap()), listResp.response());
        List<DiningTable> list = mapper.readValue(listResp.body().toString(), new TypeReference<List<DiningTable>>() {});
        assertTrue(list.isEmpty());
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
                            return "DiningTableServlet";
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
