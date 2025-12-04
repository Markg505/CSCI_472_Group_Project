package com.RBOS.servlets;

import com.RBOS.dao.AuditLogDAO;
import com.RBOS.models.AuditLog;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

@WebServlet("/api/audit-log/*")
public class AuditLogServlet extends HttpServlet {
    private AuditLogDAO auditLogDAO;
    private ObjectMapper objectMapper;

    @Override
    public void init() throws ServletException {
        auditLogDAO = new AuditLogDAO(getServletContext());
        objectMapper = new ObjectMapper();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // Check if user is admin
        HttpSession session = request.getSession(false);
        if (session == null || !"admin".equals(session.getAttribute("role"))) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Admin access required");
            return;
        }

        String pathInfo = request.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all audit logs or by entity type
                String entityType = request.getParameter("entityType");
                List<AuditLog> logs;

                if (entityType != null && !entityType.isEmpty()) {
                    logs = auditLogDAO.getLogsByEntityType(entityType);
                } else {
                    logs = auditLogDAO.getAllLogs();
                }

                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(objectMapper.writeValueAsString(logs));

            } else if ("/export".equals(pathInfo)) {
                // Export to CSV
                exportToCSV(request, response);
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        }
    }

    private void exportToCSV(HttpServletRequest request, HttpServletResponse response)
            throws SQLException, IOException {

        String entityType = request.getParameter("entityType");
        List<AuditLog> logs;

        if (entityType != null && !entityType.isEmpty()) {
            logs = auditLogDAO.getLogsByEntityType(entityType);
        } else {
            logs = auditLogDAO.getAllLogs();
        }

        // Set response headers for CSV download
        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        String filename = "audit_log_" + new SimpleDateFormat("yyyy-MM-dd_HHmmss").format(new Date()) + ".csv";
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

        PrintWriter writer = response.getWriter();

        // Write CSV header
        writer.println("Timestamp,User,Entity Type,Entity ID,Action,Old Values,New Values");

        // Write data rows
        for (AuditLog log : logs) {
            writer.print(escapeCSV(log.getCreatedUtc()));
            writer.print(",");
            writer.print(escapeCSV(log.getUserName()));
            writer.print(",");
            writer.print(escapeCSV(log.getEntityType()));
            writer.print(",");
            writer.print(escapeCSV(log.getEntityId()));
            writer.print(",");
            writer.print(escapeCSV(log.getAction()));
            writer.print(",");
            writer.print(escapeCSV(log.getOldValues()));
            writer.print(",");
            writer.print(escapeCSV(log.getNewValues()));
            writer.println();
        }

        writer.flush();
    }

    private String escapeCSV(String value) {
        if (value == null) {
            return "";
        }
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
