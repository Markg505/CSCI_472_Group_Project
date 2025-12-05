package com.RBOS.servlets;

import static org.junit.Assert.*;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class MainServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    @Before
    public void pointDbAtTemp() {
        System.setProperty("RBOS_DB", tempDir.getRoot().toPath().resolve("main.db").toString());
    }

    @Test
    public void initAndPingReturnsRunningMessage() throws Exception {
        MainServlet servlet = new MainServlet();
        servlet.init(buildConfig());

        ResponseCapture response = buildResponse();
        HttpServletRequest request = buildRequest();

        servlet.doGet(request, response.response);

        assertEquals(200, response.status);
        assertTrue("Response should contain running marker", response.body.toString().contains("Application is running"));
    }

    private ServletConfig buildConfig() {
        ServletContext context = (ServletContext) Proxy.newProxyInstance(
                ServletContext.class.getClassLoader(),
                new Class[] {ServletContext.class},
                (proxy, method, args) -> null);

        return (ServletConfig) Proxy.newProxyInstance(
                ServletConfig.class.getClassLoader(),
                new Class[] {ServletConfig.class},
                (proxy, method, args) -> {
                    if ("getServletContext".equals(method.getName())) return context;
                    return null;
                });
    }

    private HttpServletRequest buildRequest() {
        return (HttpServletRequest) Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, method, args) -> {
                    if ("getMethod".equals(method.getName())) return "GET";
                    return null;
                });
    }

    private ResponseCapture buildResponse() {
        ResponseCapture state = new ResponseCapture();
        HttpServletResponse resp = (HttpServletResponse) Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "setStatus":
                            state.status = (Integer) args[0];
                            return null;
                        case "getWriter":
                            return state.writer;
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
