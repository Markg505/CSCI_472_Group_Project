package com.RBOS.servlets;

import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;

@WebServlet("/api/auth/*")
public class AuthServlet extends HttpServlet {
    private ObjectMapper mapper;

    @Override
    public void init() throws ServletException {
        mapper = new ObjectMapper();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/me".equals(path)) {
            resp.setContentType("application/json");
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
                            rs.getInt("user_id"),
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
                            rs.getInt("user_id"),
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
        // For simplicity, we use plain text comparison here.
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
        public Integer userId;
        public String role;
        public String fullName;
        public String email;
        public String phone;

        public SafeUser(Integer userId, String role, String fullName, String email, String phone) {
            this.userId = userId;
            this.role = role;
            this.fullName = fullName;
            this.email = email;
            this.phone = phone;
        }
    }
}
