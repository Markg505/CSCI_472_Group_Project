package com.RBOS.servlets;

import com.RBOS.dao.AuditLogDAO;
import com.RBOS.dao.ConfigDAO;
import com.RBOS.dao.DiningTableDAO;
import com.RBOS.models.DiningTable;
import com.RBOS.websocket.WebSocketConfig;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@WebServlet("/api/tables/*")
public class DiningTableServlet extends HttpServlet {
    private DiningTableDAO diningTableDAO;
    private ConfigDAO configDAO;
    private ObjectMapper objectMapper;
    private AuditLogDAO auditLogDAO;

    private Map<String, Object> tableToMap(DiningTable table) {
        if (table == null) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("name", table.getName());
        map.put("capacity", table.getCapacity());
        map.put("basePrice", table.getBasePrice());
        map.put("posX", table.getPosX());
        map.put("posY", table.getPosY());
        return map;
    }

    private void logTableAction(HttpServletRequest request, String tableId, String action, Map<String, Object> oldValues, Map<String, Object> newValues) {
        try {
            HttpSession session = request.getSession(false);
            String actingUserId = session != null ? (String) session.getAttribute("userId") : null;
            String actingUserName = session != null ? (String) session.getAttribute("userName") : null;
            if (actingUserId != null && actingUserName != null) {
                auditLogDAO.logAction(actingUserId, actingUserName, "table", tableId, action, oldValues, newValues);
            }
        } catch (Exception e) {
            System.err.println("Failed to log table action: " + e.getMessage());
        }
    }

    private boolean requireAdmin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        String role = session != null ? (String) session.getAttribute("role") : null;
        if (!"admin".equals(role)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Admin access required");
            return false;
        }
        return true;
    }

    public static class PositionUpdatePayload {
        public int x;
        public int y;
    }

    public static class MapUrlPayload {
        public String url;
    }
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        diningTableDAO = new DiningTableDAO(getServletContext());
        configDAO = new ConfigDAO(getServletContext());
        auditLogDAO = new AuditLogDAO(getServletContext());
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            
            if ("/config/map-image".equals(pathInfo)) {
                String url = configDAO.getConfigValue("map_image_url");
                response.getWriter().write(objectMapper.writeValueAsString(Map.of("url", url)));
                return;
            }

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

        if (!requireAdmin(request, response)) {
            return;
        }
        
        try {
            DiningTable table = objectMapper.readValue(request.getReader(), DiningTable.class);
            if (table.getName() == null || table.getName().isBlank()) {
                table.setName("Table " + (int)(Math.random() * 1000));
            }

            if (table.getBasePrice() == null) {
                table.setBasePrice(0.0);
            }
            HttpSession session = request.getSession(false);
            String actingUserId = session != null ? (String) session.getAttribute("userId") : null;
            String actingUserName = session != null ? (String) session.getAttribute("userName") : null;

            String tableId = diningTableDAO.createTable(table);
            
            if (tableId != null) {
                table.setTableId(tableId);
                try {
                    logAudit(request, "table", tableId, "create", null, objectMapper.writeValueAsString(table));
                } catch (Exception ignored) {}

                Map<String, Object> newValues = tableToMap(table);
                logTableAction(request, tableId, "create", null, newValues);

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

        if (!requireAdmin(request, response)) {
            return;
        }
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            if ("/config/map-image".equals(pathInfo)) {
                MapUrlPayload payload = objectMapper.readValue(request.getReader(), MapUrlPayload.class);
                String oldUrl = configDAO.getConfigValue("map_image_url");
                boolean success = configDAO.setConfigValue("map_image_url", payload.url);
                if (success) {
                    Map<String, Object> oldValues = new HashMap<>();
                    oldValues.put("url", oldUrl);
                    Map<String, Object> newValues = new HashMap<>();
                    newValues.put("url", payload.url);
                    logTableAction(request, "map_image_url", "update_map_image", oldValues, newValues);
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of("url", payload.url)));
                } else {
                    response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                }
                return;
            }

            String[] splits = pathInfo.split("/");
            if (splits.length == 3 && "position".equals(splits[2])) {
                String tableId = splits[1];
                PositionUpdatePayload payload = objectMapper.readValue(request.getReader(), PositionUpdatePayload.class);
                DiningTable before = diningTableDAO.getTableById(tableId);
                boolean success = diningTableDAO.updateTablePosition(tableId, payload.x, payload.y);
                if (success) {
                    DiningTable after = before != null ? new DiningTable(
                            before.getTableId(),
                            before.getName(),
                            before.getCapacity(),
                            payload.x,
                            payload.y,
                            Optional.ofNullable(before.getBasePrice()).orElse(0.0)
                    ) : null;
                    logTableAction(request, tableId, "move", tableToMap(before), tableToMap(after));
                    WebSocketConfig.notifyTableMoved(tableId, payload.x, payload.y);
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                            "tableId", tableId,
                            "x", payload.x,
                            "y", payload.y
                    )));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
                return;
            }

            if (splits.length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String tableId = splits[1];
            DiningTable existing = diningTableDAO.getTableById(tableId);
            DiningTable table = objectMapper.readValue(request.getReader(), DiningTable.class);
            table.setTableId(tableId); // Ensure the ID matches the path
            if (table.getBasePrice() == null && existing != null) {
                table.setBasePrice(existing.getBasePrice());
            }
            
            boolean success = diningTableDAO.updateTable(table);
            
            if (success) {
                try {
                    logAudit(request, "table", tableId, "update", null, objectMapper.writeValueAsString(table));
                } catch (Exception ignored) {}
                logTableAction(request, tableId, "update", tableToMap(existing), tableToMap(table));
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

        if (!requireAdmin(request, response)) {
            return;
        }
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            String tableId = pathInfo.split("/")[1];
            DiningTable existing = diningTableDAO.getTableById(tableId);
            boolean success = diningTableDAO.deleteTable(tableId);
            if (success) {
                try {
                    logAudit(request, "table", tableId, "delete", null, null);
                } catch (Exception ignored) {}
                logTableAction(request, tableId, "delete", tableToMap(existing), null);
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
            java.util.Map<String, Object> oldMap = oldValue != null ? java.util.Map.of("raw", oldValue) : null;
            java.util.Map<String, Object> newMap = newValue != null ? java.util.Map.of("raw", newValue) : null;
            auditLogDAO.logAction(actorId, actorName, entityType, entityId, action, oldMap, newMap);
        }
    }
}
