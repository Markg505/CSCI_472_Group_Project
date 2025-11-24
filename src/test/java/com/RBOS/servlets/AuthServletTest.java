package com.RBOS.servlets;

import static org.junit.Assert.*;

import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.servlets.AuthServlet.PasswordChangeBody;
import com.RBOS.servlets.AuthServlet.ProfileUpdateBody;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class AuthServletTest {

    @Rule
    public TemporaryFolder tempDir = new TemporaryFolder();

    AuthServlet servlet;

    @Before
    public void initServlet() throws Exception {
        Path db = tempDir.newFile("servlet.db").toPath();
        Files.deleteIfExists(db);
        System.setProperty("RBOS_DB", db.toString());

        servlet = new AuthServlet();
        servlet.init(buildServletConfig());
    }

    @Test
    public void updateProfileDelegatesToDaoAndReturnsSafeUser() throws Exception {
        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Servlet User");
        user.setEmail("servlet@example.com");
        user.setPhone("555-3333");
        user.setPassword("ServletPass1");

        String userId = dao.createUser(user);
        assertNotNull(userId);

        ProfileUpdateBody body = new ProfileUpdateBody();
        body.fullName = "Updated Servlet";
        body.email = "updated@example.com";
        body.phone = "555-4444";

        AuthServlet.SafeUser updated = servlet.updateProfile(userId, body);
        assertNotNull(updated);
        assertEquals("Updated Servlet", updated.fullName);
        assertEquals("updated@example.com", updated.email);
        assertEquals("555-4444", updated.phone);

        User persisted = dao.getUserById(userId);
        assertEquals("Updated Servlet", persisted.getFullName());
        assertEquals("updated@example.com", persisted.getEmail());
        assertEquals("555-4444", persisted.getPhone());
    }

    @Test
    public void updatePasswordChecksCurrentBeforeHashing() throws Exception {
        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Password Servlet");
        user.setEmail("pw-servlet@example.com");
        user.setPhone("555-5555");
        user.setPassword("CurrentPass8");

        String userId = dao.createUser(user);
        assertNotNull(userId);

        PasswordChangeBody invalid = new PasswordChangeBody();
        invalid.currentPassword = "bad";
        invalid.newPassword = "NewPass123";
        assertFalse(servlet.updatePassword(userId, invalid));

        PasswordChangeBody valid = new PasswordChangeBody();
        valid.currentPassword = "CurrentPass8";
        valid.newPassword = "NewPass123";
        assertTrue(servlet.updatePassword(userId, valid));

        User updated = dao.getUserById(userId);
        assertTrue(UserDAO.passwordMatches("NewPass123", updated.getPasswordHash()));
    }

    @Test
    public void profilePutRejectsInvalidEmail() throws Exception {
        ResponseCapture response = buildResponse();
        HttpSession session = buildSession();
        HttpServletRequest request = buildRequest("/me", session, """
                {"fullName":"Bad Email","email":"not-an-email","phone":"555-2222"}
                """);

        servlet.doPut(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.body().contains("Full name and a valid email are required."));
    }

    @Test
    public void passwordPutRejectsWeakOrSamePassword() throws Exception {
        ResponseCapture response = buildResponse();
        HttpSession session = buildSession();
        HttpServletRequest request = buildRequest("/me/password", session, """
                {"currentPassword":"ServletPass1","newPassword":"password"}
                """);

        servlet.doPut(request, response.response());

        assertEquals(HttpServletResponse.SC_BAD_REQUEST, response.status());
        assertTrue(response.body().contains("New password must be at least 8 characters"));
    }

    @Test
    public void loginFailsWithBadPassword() throws Exception {
        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Login User");
        user.setEmail("login@example.com");
        user.setPhone("555-9999");
        user.setPassword("ValidPass1");
        String userId = dao.createUser(user);
        assertNotNull(userId);

        HttpServletRequest request = buildPostRequest("/login", """
                {"email":"login@example.com","password":"wrong"}
                """, null);
        ResponseCapture response = buildResponse();

        servlet.doPost(request, response.response());

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.status());
        assertTrue(response.body().contains("invalid_credentials"));
    }

    @Test
    public void logoutClearsSession() throws Exception {
        HttpSession session = buildSession();
        session.setAttribute("userId", "u123");
        session.setAttribute("role", "customer");

        HttpServletRequest request = buildPostRequest("/logout", "", session);
        ResponseCapture response = buildResponse();

        servlet.doPost(request, response.response());

        assertEquals(HttpServletResponse.SC_OK, response.status());
        assertTrue(response.body().contains("ok"));
    }

    @Test
    public void cachedContextPreventsIllegalStateWhenServletContextUnavailable() throws Exception {
        ThrowingContextAuthServlet throwingServlet = new ThrowingContextAuthServlet();
        throwingServlet.init();

        UserDAO dao = new UserDAO(null);
        User user = new User();
        user.setFullName("Throwing Context");
        user.setEmail("throwing@example.com");
        user.setPhone("555-0000");
        user.setPassword("ContextPass8");

        String userId = dao.createUser(user);
        assertNotNull(userId);

        AuthServlet.SafeUser safeUser = throwingServlet.loadSafeUser(userId);
        assertNotNull(safeUser);

        ProfileUpdateBody profileBody = new ProfileUpdateBody();
        profileBody.fullName = "Updated Throwing Context";
        profileBody.email = "throwing-updated@example.com";
        profileBody.phone = "555-1111";

        AuthServlet.SafeUser updated = throwingServlet.updateProfile(userId, profileBody);
        assertNotNull(updated);
        assertEquals("Updated Throwing Context", updated.fullName);
        assertEquals("throwing-updated@example.com", updated.email);
        assertEquals("555-1111", updated.phone);

        PasswordChangeBody passwordBody = new PasswordChangeBody();
        passwordBody.currentPassword = "ContextPass8";
        passwordBody.newPassword = "ContextPass9";

        assertTrue(throwingServlet.updatePassword(userId, passwordBody));

        User reloaded = dao.getUserById(userId);
        assertTrue(UserDAO.passwordMatches("ContextPass9", reloaded.getPasswordHash()));
    }

    private HttpSession buildSession() {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("userId", "session-user");
        attributes.put("role", "customer");

        return (HttpSession) java.lang.reflect.Proxy.newProxyInstance(
                HttpSession.class.getClassLoader(),
                new Class[] {HttpSession.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getAttribute":
                            return attributes.get(args[0]);
                        case "setAttribute":
                            attributes.put((String) args[0], args[1]);
                            return null;
                        case "getId":
                            return "session-id";
                        default:
                            return null;
                    }
                });
    }

    private HttpServletRequest buildRequest(String pathInfo, HttpSession session, String body) {
        String payload = body == null ? "" : body;
        Map<String, String> headers = new HashMap<>();
        return (HttpServletRequest) java.lang.reflect.Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getPathInfo":
                            return pathInfo;
                        case "getMethod":
                            return "PUT";
                        case "getReader":
                            return new java.io.BufferedReader(new java.io.StringReader(payload));
                        case "getSession":
                            return session;
                        case "getHeader":
                            return headers.get(args[0]);
                        case "getHeaderNames":
                            return Collections.enumeration(headers.keySet());
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/auth" + pathInfo;
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/auth";
                        default:
                            return null;
                    }
                });
    }

    private HttpServletRequest buildPostRequest(String pathInfo, String body, HttpSession session) {
        String payload = body == null ? "" : body;
        return (HttpServletRequest) java.lang.reflect.Proxy.newProxyInstance(
                HttpServletRequest.class.getClassLoader(),
                new Class[] {HttpServletRequest.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getPathInfo": return pathInfo;
                        case "getMethod": return "POST";
                        case "getReader": return new java.io.BufferedReader(new java.io.StringReader(payload));
                        case "getSession": return session;
                        case "getProtocol": return "HTTP/1.1";
                        case "getScheme": return "http";
                        case "getServerName": return "localhost";
                        case "getServerPort": return 8080;
                        case "getRequestURI": return "/api/auth" + pathInfo;
                        case "getContextPath": return "";
                        case "getServletPath": return "/api/auth";
                        case "getParameterNames": return Collections.emptyEnumeration();
                        default:
                            return null;
                    }
                });
    }

    private jakarta.servlet.ServletConfig buildServletConfig() {
        jakarta.servlet.ServletContext context = (jakarta.servlet.ServletContext) java.lang.reflect.Proxy.newProxyInstance(
                jakarta.servlet.ServletContext.class.getClassLoader(),
                new Class[] {jakarta.servlet.ServletContext.class},
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

        return (jakarta.servlet.ServletConfig) java.lang.reflect.Proxy.newProxyInstance(
                jakarta.servlet.ServletConfig.class.getClassLoader(),
                new Class[] {jakarta.servlet.ServletConfig.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getServletName":
                            return "AuthServlet";
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

    private ResponseCapture buildResponse() {
        ResponseState state = new ResponseState();
        HttpServletResponse response = (HttpServletResponse) java.lang.reflect.Proxy.newProxyInstance(
                HttpServletResponse.class.getClassLoader(),
                new Class[] {HttpServletResponse.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "setStatus":
                            state.status = (Integer) args[0];
                            return null;
                        case "sendError":
                            state.status = (Integer) args[0];
                            if (args.length > 1 && args[1] instanceof String)
                                state.body.write(args[1].toString());
                            return null;
                        case "getWriter":
                            return state.writer;
                        case "getStatus":
                            return state.status;
                        default:
                            return null;
                    }
                });
        return new ResponseCapture(response, state);
    }

    private record ResponseCapture(HttpServletResponse response, ResponseState state) {
        int status() {
            return state.status;
        }

        String body() {
            return state.body.toString();
        }
    }

    private static class ResponseState {
        int status = HttpServletResponse.SC_OK;
        java.io.StringWriter body = new java.io.StringWriter();
        java.io.PrintWriter writer = new java.io.PrintWriter(body);
    }

    private static class ThrowingContextAuthServlet extends AuthServlet {
        @Override
        public ServletContext getServletContext() {
            throw new IllegalStateException("ServletContext unavailable");
        }
    }
}
