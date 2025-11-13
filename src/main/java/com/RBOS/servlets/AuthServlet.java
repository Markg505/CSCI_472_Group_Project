package com.RBOS.servlets;

import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;

@WebServlet("/api/auth/*")
public class AuthServlet extends HttpServlet {
    private ObjectMapper mapper;
    private static final boolean BYPASS_AUTH = true; // Temporary bypass flag
    private static final String MOCK_USER_ID = "mock-user-001";
    private static final String MOCK_ROLE = "admin";
    private static final String MOCK_NAME = "Mock User";
    private static final String MOCK_EMAIL = "mock@example.com";

    @Override
    public void init() throws ServletException {
        mapper = new ObjectMapper();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/me".equals(path)) {
            resp.setContentType("application/json");
            
            if (BYPASS_AUTH) {
                // Always return mock user when bypass is enabled
                SafeUser mockUser = new SafeUser(
                    MOCK_USER_ID,
                    MOCK_ROLE,
                    MOCK_NAME,
                    MOCK_EMAIL,
                    null
                );
                mapper.writeValue(resp.getWriter(), mockUser);
                return;
            }
            
            // Authentication
            HttpSession s = req.getSession(false);
            if (s == null || s.getAttribute("userId") == null) {
                resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                mapper.writeValue(resp.getWriter(), new Msg("unauthorized"));
                return;
            }
            String uid = s.getAttribute("userId").toString();
            try (Connection conn = DatabaseConnection.getConnection(getServletContext());
                    PreparedStatement ps = conn.prepareStatement(
                            "SELECT user_id, role, full_name, email, phone FROM users WHERE user_id = ?")) {
                ps.setString(1, uid);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        mapper.writeValue(resp.getWriter(), new Msg("unauthorized"));
                        return;
                    }
                    SafeUser u = new SafeUser(
                            rs.getString("user_id"),
                            rs.getString("role"),
                            rs.getString("full_name"),
                            rs.getString("email"),
                            rs.getString("phone"));
                    mapper.writeValue(resp.getWriter(), u);
                }
            } catch (Exception e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                mapper.writeValue(resp.getWriter(), new Msg("error"));
            }
            return;
        }
        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/login".equals(path)) {
            resp.setContentType("application/json");
            
            if (BYPASS_AUTH) {
                // Auto-login with mock user
                HttpSession s = req.getSession(true);
                s.setAttribute("userId", MOCK_USER_ID);
                SafeUser mockUser = new SafeUser(
                    MOCK_USER_ID,
                    MOCK_ROLE,
                    MOCK_NAME,
                    MOCK_EMAIL,
                    null
                );
                mapper.writeValue(resp.getWriter(), mockUser);
                return;
            }
            
            // Normal login
            LoginBody body;
            try {
                body = mapper.readValue(req.getReader(), LoginBody.class);
            } catch (Exception e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                return;
            }
            if (body == null || body.email == null || body.password == null) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection(getServletContext());
                    PreparedStatement ps = conn.prepareStatement(
                            "SELECT user_id, role, full_name, email, phone, password_hash FROM users WHERE email = ?")) {
                ps.setString(1, body.email.trim());
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        mapper.writeValue(resp.getWriter(), new Msg("invalid_credentials"));
                        return;
                    }
                    String hash = rs.getString("password_hash");
                    if (!checkPassword(body.password, hash)) {
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        mapper.writeValue(resp.getWriter(), new Msg("invalid_credentials"));
                        return;
                    }
                    HttpSession s = req.getSession(true);
                    s.setAttribute("userId", rs.getInt("user_id"));
                    SafeUser u = new SafeUser(
                            rs.getString("user_id"),
                            rs.getString("role"),
                            rs.getString("full_name"),
                            rs.getString("email"),
                            rs.getString("phone"));
                    mapper.writeValue(resp.getWriter(), u);
                }
            } catch (SQLException e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                mapper.writeValue(resp.getWriter(), new Msg("error"));
            }
            return;
        }
        if ("/register".equals(path)) {
            resp.setContentType("application/json");
            
            if (BYPASS_AUTH) {
                // Auto-login with mock user for registration
                HttpSession s = req.getSession(true);
                s.setAttribute("userId", MOCK_USER_ID);
                SafeUser mockUser = new SafeUser(
                    MOCK_USER_ID,
                    MOCK_ROLE,
                    MOCK_NAME,
                    MOCK_EMAIL,
                    null
                );
                resp.setStatus(HttpServletResponse.SC_CREATED);
                mapper.writeValue(resp.getWriter(), mockUser);
                return;
            }
            
            // Normal registration
            try {

                JsonNode root = mapper.readTree(req.getReader());

                String fullName = null;
                if (root.hasNonNull("full_name"))
                    fullName = root.get("full_name").asText();
                else if (root.hasNonNull("fullName"))
                    fullName = root.get("fullName").asText();

                // required fields
                String email = root.hasNonNull("email") ? root.get("email").asText() : null;
                String password = root.hasNonNull("password") ? root.get("password").asText() : null;

                String phone = null;
                if (root.has("phone")) {
                    String p = root.get("phone").asText("");
                    phone = p.trim().isEmpty() ? null : p.trim();
                }

                String role = null;
                if (root.hasNonNull("role"))
                    role = root.get("role").asText();

                // Basic validation
                if (fullName == null || fullName.isBlank()
                        || email == null || email.isBlank()
                        || password == null || password.isBlank()) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                    return;
                }

                // Build User object manually
                User user = new User();
                user.setFullName(fullName);
                user.setEmail(email.trim());
                user.setPassword(password);
                user.setPhone(phone);
                if (role != null && !role.isBlank())
                    user.setRole(role);

                UserDAO dao = new UserDAO(getServletContext());
                String userId = dao.createUser(user);

                if (userId != null) {
                    user.setUserId(userId);
                    // create session and mark user as logged in
                    HttpSession s = req.getSession(true);
                    s.setAttribute("userId", userId);

                    // Build the SafeUser to return
                    SafeUser su = new SafeUser(
                            userId,
                            user.getRole() != null ? user.getRole() : "customer",
                            user.getFullName(),
                            user.getEmail(),
                            user.getPhone() // may be null
                    );

                    resp.setStatus(HttpServletResponse.SC_CREATED);
                    mapper.writeValue(resp.getWriter(), su);
                } else {
                    resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to create user");
                }
            } catch (SQLException e) {
                // SQLite constraint
                if (e.getErrorCode() == 19) {
                    resp.sendError(HttpServletResponse.SC_CONFLICT, "Email already exists");
                } else {
                    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    mapper.writeValue(resp.getWriter(), new Msg("error"));
                }
            } catch (Exception e) {

                e.printStackTrace();

                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);

                String msg = e.getMessage() != null ? e.getMessage() : "invalid";
                mapper.writeValue(resp.getWriter(), new Msg(msg));
            }
            return;
        }

        if ("/logout".equals(path)) {
            resp.setContentType("application/json");
            HttpSession s = req.getSession(false);
            if (s != null)
                s.invalidate();
            mapper.writeValue(resp.getWriter(), new Msg("ok"));
            return;
        }

        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
    }

    private String path(HttpServletRequest req) {
        String p = req.getPathInfo();
        return (p == null || p.isEmpty()) ? "/" : p;
    }

    private boolean checkPassword(String raw, String stored) {
        return stored != null && stored.equals(raw);
    }

    public static class LoginBody {
        public String email;
        public String password;
    }

    public static class Msg {
        public String message;

        public Msg(String m) {
            this.message = m;
        }
    }

    public static class SafeUser {
        public String userId;
        public String role;
        public String fullName;
        public String email;
        public String phone;

        public SafeUser(String userId, String role, String fullName, String email, String phone) {
            this.userId = userId;
            this.role = role;
            this.fullName = fullName;
            this.email = email;
            this.phone = phone;
        }
    }
}