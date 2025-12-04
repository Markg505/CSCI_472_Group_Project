package com.RBOS.servlets;

import com.RBOS.dao.AuditLogDAO;
import com.RBOS.dao.DiningTableDAO;
import com.RBOS.models.DiningTable;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/tables/*")
public class DiningTableServlet extends HttpServlet {
    private DiningTableDAO diningTableDAO;
    private ObjectMapper objectMapper;
    private AuditLogDAO auditLogDAO;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        diningTableDAO = new DiningTableDAO(getServletContext());
        auditLogDAO = new AuditLogDAO(getServletContext());
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            String pathInfo = request.getPathInfo();

            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all tables
                List<DiningTable> tables = diningTableDAO.getAllTables();
                response.getWriter().write(objectMapper.writeValueAsString(tables));
            } else {
                // Get table by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String tableId = splits[1];
                DiningTable table = diningTableDAO.getTableById(tableId);

                if (table != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(table));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            DiningTable table = objectMapper.readValue(request.getReader(), DiningTable.class);
            if (table.getName() == null || table.getName().isBlank()) {
                table.setName("Table " + (int) (Math.random() * 1000));
            }
            String tableId = diningTableDAO.createTable(table);

            if (tableId != null) {
                table.setTableId(tableId);
                try {
                    logAudit(request, "table", tableId, "create", null, objectMapper.writeValueAsString(table));
                } catch (Exception ignored) {
                }
                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(table));
            } else {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (IOException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String tableId = pathInfo.split("/")[1];
            DiningTable table = objectMapper.readValue(request.getReader(), DiningTable.class);
            table.setTableId(tableId); // Ensure the ID matches the path

            boolean success = diningTableDAO.updateTable(table);

            if (success) {
                try {
                    logAudit(request, "table", tableId, "update", null, objectMapper.writeValueAsString(table));
                } catch (Exception ignored) {
                }
                response.getWriter().write(objectMapper.writeValueAsString(table));
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            String tableId = pathInfo.split("/")[1];
            boolean success = diningTableDAO.deleteTable(tableId);
            if (success) {
                try {
                    logAudit(request, "table", tableId, "delete", null, null);
                } catch (Exception ignored) {
                }
                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        }
    }

    private void logAudit(HttpServletRequest req, String entityType, String entityId,
            String action, String oldValue, String newValue) throws Exception {
        HttpSession session = req.getSession(false);
        String actorId = session != null ? (String) session.getAttribute("userId") : null;
        String actorName = session != null ? (String) session.getAttribute("userName") : null;
        if (actorId != null) {
            auditLogDAO.log(entityType, entityId, action, actorId, actorName, oldValue, newValue);
        }
    }
}
