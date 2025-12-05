package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BookingSettingsServletTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private String originalHome;

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void redirectUserHome() {
        originalHome = System.getProperty("user.home");
        System.setProperty("user.home", tempDir.getRoot().getAbsolutePath());
    }

    @After
    public void restoreUserHome() {
        if (originalHome != null) {
            System.setProperty("user.home", originalHome);
        }
    }

    @Test
    public void getReturnsDefaultsWhenFileMissing() throws Exception {
        BookingSettingsServlet servlet = new BookingSettingsServlet();
        ResponseCapture resp = buildResponse();
        HttpServletRequest req = buildRequest("GET", "");

        servlet.doGet(req, resp.response);

        assertEquals(200, resp.status);
        Map<?, ?> body = mapper.readValue(resp.body.toString(), Map.class);
        assertEquals("09:00", body.get("openTime"));
        assertEquals("21:00", body.get("closeTime"));
        assertTrue(((Map<?, ?>) body.get("daysOpen")).containsKey("mon"));
    }

    @Test
    public void putRejectsClosingBeforeOpen() throws Exception {
        BookingSettingsServlet servlet = new BookingSettingsServlet();
        ResponseCapture resp = buildResponse();
        String payload = """
                {"openTime":"22:00","closeTime":"10:00"}
                """;
        HttpServletRequest req = buildRequest("PUT", payload);

        servlet.doPut(req, resp.response);

        assertEquals(400, resp.status);
        assertTrue(resp.body.toString().contains("closeTime must be after openTime"));
    }

    @Test
    public void putPersistsSettingsToUserHome() throws Exception {
        BookingSettingsServlet servlet = new BookingSettingsServlet();
        ResponseCapture resp = buildResponse();
        String payload = """
                {"openTime":"08:00","closeTime":"18:00","daysOpen":{"sun":true}}
                """;
        HttpServletRequest req = buildRequest("PUT", payload);

        servlet.doPut(req, resp.response);

        assertEquals(200, resp.status);
        Map<?, ?> body = mapper.readValue(resp.body.toString(), Map.class);
        assertEquals("08:00", body.get("openTime"));
        assertEquals("18:00", body.get("closeTime"));

        Path saved = tempDir.getRoot().toPath().resolve(".rbos").resolve("booking-settings.json");
        assertTrue("Settings file should be created", Files.exists(saved));
        Map<?, ?> savedJson = mapper.readValue(saved.toFile(), Map.class);
        assertEquals("18:00", savedJson.get("closeTime"));
    }

    private HttpServletRequest buildRequest(String method, String payload) {
        String body = payload == null ? "" : payload;
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "getMethod":
                            return method;
                        case "getReader":
                            return new BufferedReader(new StringReader(body));
                        default:
                            return null;
                    }
                });
    }

    private ResponseCapture buildResponse() {
        ResponseCapture state = new ResponseCapture();
        HttpServletResponse resp = (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, m, args) -> {
                    switch (m.getName()) {
                        case "setStatus":
                            state.status = (Integer) args[0];
                            return null;
                        case "getWriter":
                            return state.writer;
                        case "setContentType":
                        case "setCharacterEncoding":
                            return null;
                        default:
                            return null;
                    }
                });
        state.response = resp;
        return state;
    }

    private static class ResponseCapture {
        int status = 200;
        StringWriter body = new StringWriter();
        PrintWriter writer = new PrintWriter(body);
        HttpServletResponse response;
    }
}
