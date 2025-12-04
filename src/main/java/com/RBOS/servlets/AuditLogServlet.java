package com.RBOS.servlets;

import com.RBOS.dao.AuditLogDAO;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.AuditLog;
import com.RBOS.models.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@WebServlet("/api/audit-log/export")
public class AuditLogServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // Check authentication and admin role
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            System.out.println("AuditLogServlet: No session or userId. Session: " + session);
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Not authenticated\"}");
            return;
        }

        String userId = session.getAttribute("userId").toString();
        System.out.println("AuditLogServlet: UserId from session: " + userId);

        // Load user to check role
        try {
            UserDAO userDAO = new UserDAO(getServletContext());
            User user = userDAO.getUserById(userId);

            System.out.println("AuditLogServlet: User loaded: "
                    + (user != null ? user.getUserId() + " role=" + user.getRole() : "null"));

            if (user == null || !"admin".equalsIgnoreCase(user.getRole())) {
                response.setStatus(403);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Admin access required\"}");
                return;
            }
        } catch (Exception e) {
            System.out.println("AuditLogServlet: Exception verifying user: " + e.getMessage());
            e.printStackTrace();
            response.setStatus(500);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Failed to verify user: " + e.getMessage() + "\"}");
            return;
        }

        // Get entity type filter (optional)
        String entityType = request.getParameter("entityType");

        try {
            AuditLogDAO auditDAO = new AuditLogDAO(getServletContext());

            // Ensure table exists
            auditDAO.ensureTableExists();

            List<AuditLog> logs;

            if (entityType != null && !entityType.isEmpty()) {
                logs = auditDAO.getByEntityType(entityType);
            } else {
                logs = auditDAO.getAll();
            }

            // Generate CSV
            response.setContentType("text/csv");
            response.setCharacterEncoding("UTF-8");

            String filename = entityType != null && !entityType.isEmpty()
                    ? String.format("audit_log_%s_%s.csv", entityType, getCurrentTimestamp())
                    : String.format("audit_log_all_%s.csv", getCurrentTimestamp());

            response.setHeader("Content-Disposition", String.format("attachment; filename=\"%s\"", filename));

            PrintWriter writer = response.getWriter();

            // Write CSV header
            writer.println("Timestamp,Entity Type,Entity ID,Action,User ID,User Name,Old Value,New Value");

            // Write data rows
            for (AuditLog log : logs) {
                writer.println(String.format("%s,%s,%s,%s,%s,%s,%s,%s",
                        escapeCsv(log.createdUtc),
                        escapeCsv(log.entityType),
                        escapeCsv(log.entityId),
                        escapeCsv(log.action),
                        escapeCsv(log.userId),
                        escapeCsv(log.userName),
                        escapeCsv(log.oldValue),
                        escapeCsv(log.newValue)));
            }

            writer.flush();

        } catch (Exception e) {
            response.setStatus(500);
            response.setContentType("application/json");
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getName();
            response.getWriter().write("{\"error\":\"" + errorMsg.replace("\"", "'") + "\"}");
            e.printStackTrace();
        }
    }

    /**
     * Escape CSV values to handle commas, quotes, and newlines
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        // If value contains comma, quote, or newline, wrap in quotes and escape
        // existing quotes
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * Get current timestamp for filename
     */
    private String getCurrentTimestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
    }
}
