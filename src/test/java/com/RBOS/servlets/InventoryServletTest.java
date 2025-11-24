package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.InventoryDAO;
import com.RBOS.dao.MenuItemDAO;
import com.RBOS.models.Inventory;
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

public class InventoryServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private final ObjectMapper mapper = new ObjectMapper();
    private InventoryServlet servlet;
    private InventoryDAO inventoryDAO;
    private MenuItemDAO menuItemDAO;

    @Before
    public void setup() throws Exception {
        Path db = tempDir.newFile("inventory.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());
        // initialize schema and clear seeds
        try (var conn = DatabaseConnection.getConnection(null); var stmt = conn.createStatement()) {
            stmt.execute("DELETE FROM order_items");
            stmt.execute("DELETE FROM orders");
            stmt.execute("DELETE FROM inventory");
            stmt.execute("DELETE FROM menu_items");
        }
        inventoryDAO = new InventoryDAO(null);
        menuItemDAO = new MenuItemDAO(null);
        servlet = new InventoryServlet();
        servlet.init(buildServletConfig());

        // seed a menu item for FK
        MenuItem mi = new MenuItem("menu-100", "Linked", "desc", "Main", 5.0, true, null, "[]");
        menuItemDAO.createMenuItem(mi);

        Inventory inv = new Inventory();
        inv.setInventoryId("inv-1");
        inv.setItemId("menu-100");
        inv.setName("Flour");
        inv.setSku("SKU-FLOUR");
        inv.setCategory("Dry");
        inv.setUnit(com.RBOS.models.Unit.each);
        inv.setPackSize(1);
        inv.setQtyOnHand(10);
        inv.setParLevel(5);
        inv.setReorderPoint(3);
        inv.setCost(2.5);
        inv.setLocation("Pantry");
        inv.setActive(true);
        inv.setVendor("Vendor");
        inv.setLeadTimeDays(2);
        inv.setPreferredOrderQty(10);
        inv.setWasteQty(0);
        inv.setCountFreq(com.RBOS.models.CountFreq.weekly);
        inv.setConversion("1 bag");
        inventoryDAO.createInventory(inv);
    }

    @Test
    public void listAndUpdateQuantity() throws Exception {
        // initial list should contain the seeded inventory
        ResponseCapture listResp = buildResponse();
        servlet.service(buildRequest("/", "GET", null, Collections.emptyMap()), listResp.response());
        assertEquals(HttpServletResponse.SC_OK, listResp.status());
        List<Inventory> list = mapper.readValue(listResp.body().toString(), new TypeReference<List<Inventory>>() {});
        assertEquals(1, list.size());
        assertEquals("menu-100", list.get(0).getItemId());
        assertEquals(Integer.valueOf(10), list.get(0).getQtyOnHand());

        // update quantity via PUT /item/{itemId}/quantity?quantity=5
        ResponseCapture updateResp = buildResponse();
        servlet.service(buildRequest("/item/menu-100/quantity", "PUT", null, Map.of("quantity", "5")), updateResp.response());
        assertEquals(HttpServletResponse.SC_OK, updateResp.status());
        Inventory updated = mapper.readValue(updateResp.body().toString(), Inventory.class);
        assertEquals(Integer.valueOf(5), updated.getQtyOnHand());

        // get by item id path
        ResponseCapture byItem = buildResponse();
        servlet.service(buildRequest("/item/menu-100", "GET", null, Collections.emptyMap()), byItem.response());
        assertEquals(HttpServletResponse.SC_OK, byItem.status());
        Inventory fetched = mapper.readValue(byItem.body().toString(), Inventory.class);
        assertEquals(Integer.valueOf(5), fetched.getQtyOnHand());
    }

    @Test
    public void decrementInventory() throws Exception {
        // decrement via PUT /item/{itemId}/decrement?qty_on_hand=2
        ResponseCapture decResp = buildResponse();
        servlet.service(buildRequest("/item/menu-100/decrement", "PUT", null, Map.of("qty_on_hand", "2")), decResp.response());
        assertEquals(HttpServletResponse.SC_OK, decResp.status());
        Inventory updated = mapper.readValue(decResp.body().toString(), Inventory.class);
        assertEquals(Integer.valueOf(8), updated.getQtyOnHand());
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
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/inventory" + (pathInfo != null ? pathInfo : "");
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/inventory";
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
                            return "InventoryServlet";
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
