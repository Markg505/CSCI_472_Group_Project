package com.RBOS.servlets;

import static org.junit.Assert.*;

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
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BookingSettingsServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    private BookingSettingsServlet servlet;
    private final ObjectMapper mapper = new ObjectMapper();

    @Before
    public void setup() throws Exception {
        // isolate settings file to a temp home directory
        Path home = tempDir.newFolder("home").toPath();
        System.setProperty("user.home", home.toString());
        Files.deleteIfExists(home.resolve(".rbos/booking-settings.json"));

        servlet = new BookingSettingsServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void getReturnsDefaults() throws Exception {
        ResponseCapture resp = buildResponse();
        servlet.service(buildRequest("/", "GET", null), resp.response());
        assertEquals(HttpServletResponse.SC_OK, resp.status());
        BookingSettingsServlet.BookingSettings settings = mapper.readValue(resp.body().toString(), BookingSettingsServlet.BookingSettings.class);
        assertNotNull(settings);
        assertEquals("09:00", settings.openTime);
        assertEquals("21:00", settings.closeTime);
    }

    @Test
    public void putUpdatesSettingsAndValidatesTimes() throws Exception {
        String payload = """
        {
          "openTime":"08:00",
          "closeTime":"22:00",
          "daysOpen":{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true,"sun":false},
          "maxDaysOut":60,
          "reservationLengthMinutes":120
        }""";
        ResponseCapture updateResp = buildResponse();
        servlet.service(buildRequest("/", "PUT", payload), updateResp.response());
        assertEquals(HttpServletResponse.SC_OK, updateResp.status());
        BookingSettingsServlet.BookingSettings updated = mapper.readValue(updateResp.body().toString(), BookingSettingsServlet.BookingSettings.class);
        assertEquals("08:00", updated.openTime);
        assertEquals("22:00", updated.closeTime);
        assertEquals(Integer.valueOf(60), Integer.valueOf(updated.maxDaysOut));
        assertEquals(Integer.valueOf(120), Integer.valueOf(updated.reservationLengthMinutes));

        // invalid: close before open
        String badPayload = """
        {
          "openTime":"22:00",
          "closeTime":"08:00",
          "daysOpen":{"mon":true},
          "maxDaysOut":30,
          "reservationLengthMinutes":90
        }""";
        ResponseCapture badResp = buildResponse();
        servlet.service(buildRequest("/", "PUT", badPayload), badResp.response());
        assertEquals(HttpServletResponse.SC_BAD_REQUEST, badResp.status());
    }

    private HttpServletRequest buildRequest(String pathInfo, String method, String body) {
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "getPathInfo": return pathInfo;
                        case "getMethod": return method;
                        case "getReader": return new BufferedReader(new StringReader(body != null ? body : ""));
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/booking-settings";
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/booking-settings";
                        case "getParameterNames": return Collections.emptyEnumeration();
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
                            return "BookingSettingsServlet";
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
