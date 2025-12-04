package com.RBOS.servlets;

import com.RBOS.dao.AuditLogDAO;
import com.RBOS.dao.InventoryDAO;
import com.RBOS.models.Inventory;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@WebServlet("/api/inventory/*")
public class InventoryServlet extends HttpServlet {
    private InventoryDAO inventoryDAO;
    private ObjectMapper objectMapper;
    private AuditLogDAO auditLogDAO;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        inventoryDAO = new InventoryDAO(getServletContext());
        auditLogDAO = new AuditLogDAO(getServletContext());
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        System.out.println("InventoryServlet doGet path=" + request.getPathInfo());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            String pathInfo = request.getPathInfo();

            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all inventory
                List<Inventory> inventory = inventoryDAO.getAllInventory();
                response.getWriter().write(objectMapper.writeValueAsString(inventory));
            } else if ("/low-stock".equals(pathInfo)) {
                // Get low stock items
                List<Inventory> lowStock = inventoryDAO.getLowStockItems();
                response.getWriter().write(objectMapper.writeValueAsString(lowStock));
            } else {
                // Support /{inventoryId} or /item/{itemId}
                String[] splits = pathInfo.split("/");
                if (splits.length == 2 && !splits[1].isBlank()) {
                    String inventoryId = splits[1];
                    Inventory inventory = inventoryDAO.getInventoryById(inventoryId);
                    if (inventory != null) {
                        response.getWriter().write(objectMapper.writeValueAsString(inventory));
                    } else {
                        response.sendError(HttpServletResponse.SC_NOT_FOUND);
                    }
                } else if (splits.length == 3 && "item".equals(splits[1])) {
                    String itemId = splits[2];
                    Inventory inventory = inventoryDAO.getInventoryByItemId(itemId);
                    if (inventory != null) {
                        response.getWriter().write(objectMapper.writeValueAsString(inventory));
                    } else {
                        response.sendError(HttpServletResponse.SC_NOT_FOUND);
                    }
                } else {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
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
        System.out.println("InventoryServlet doPost path=" + request.getPathInfo());

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            Inventory inventory = objectMapper.readValue(request.getReader(), Inventory.class);
            if (inventory.getInventoryId() == null || inventory.getInventoryId().isBlank()) {
                inventory.setInventoryId(UUID.randomUUID().toString());
            }
            String newId = inventoryDAO.createInventory(inventory);
            if (newId == null) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to create inventory");
                return;
            }
            Inventory after = inventoryDAO.getInventoryById(newId);
            logChange("inventory", newId, "create", null, after != null ? after : inventory, request);

            response.setStatus(HttpServletResponse.SC_CREATED);
            response.getWriter().write(objectMapper.writeValueAsString(after != null ? after : inventory));
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        System.out.println("InventoryServlet doPut path=" + request.getPathInfo());

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.equals("/")) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String[] splits = pathInfo.split("/");

            // Full update /{inventoryId}
            if (splits.length == 2 && !splits[1].isBlank()) {
                String inventoryId = splits[1];
                Inventory before = inventoryDAO.getInventoryById(inventoryId);
                Inventory incoming = objectMapper.readValue(request.getReader(), Inventory.class);
                incoming.setInventoryId(inventoryId);
                if (incoming.getItemId() == null || incoming.getItemId().isBlank()) {
                    incoming.setItemId(inventoryId);
                }

                boolean success = inventoryDAO.updateInventory(incoming);
                if (success) {
                    Inventory after = inventoryDAO.getInventoryById(inventoryId);
                    logChange("inventory", inventoryId, "update", before, after != null ? after : incoming, request);
                    response.getWriter().write(objectMapper.writeValueAsString(after != null ? after : incoming));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
                return;
            }

            // Quantity/decrement legacy: /item/{itemId}/{action}
            if (splits.length != 4 || !"item".equals(splits[1])) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String itemId = splits[2];
            String action = splits[3];
            Inventory before = inventoryDAO.getInventoryByItemId(itemId);
            if ("quantity".equals(action)) {
                String quantityStr = request.getParameter("quantity");
                if (quantityStr == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Quantity parameter required");
                    return;
                }

                int quantity = Integer.parseInt(quantityStr);
                boolean success = inventoryDAO.updateInventoryQuantity(itemId, quantity);

                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
                    logChange("inventory", itemId, "update_quantity", before, updated, request);
                    response.getWriter().write(objectMapper.writeValueAsString(updated));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } else if ("decrement".equals(action)) {
                String quantityStr = request.getParameter("qty_on_hand");
                if (quantityStr == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Quantity parameter required");
                    return;
                }

                int quantity = Integer.parseInt(quantityStr);
                boolean success = inventoryDAO.decrementInventory(itemId, quantity);

                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
                    logChange("inventory", itemId, "decrement", before, updated, request);
                    response.getWriter().write(objectMapper.writeValueAsString(updated));
                } else {
                    response.sendError(HttpServletResponse.SC_CONFLICT, "Insufficient inventory");
                }
            } else {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
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
        System.out.println("InventoryServlet doDelete path=" + request.getPathInfo());
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            String inventoryId = pathInfo.split("/")[1];
            Inventory before = inventoryDAO.getInventoryById(inventoryId);
            boolean success = inventoryDAO.deleteInventory(inventoryId);
            if (success) {
                logChange("inventory", inventoryId, "delete", before, null, request);
                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        }
    }

    private void logChange(String entityType, String entityId, String action, Inventory before, Inventory after,
            HttpServletRequest request) {
        try {
            String oldJson = before != null ? objectMapper.writeValueAsString(before) : null;
            String newJson = after != null ? objectMapper.writeValueAsString(after) : null;
            HttpSession session = request.getSession(false);
            String userId = session != null && session.getAttribute("userId") != null
                    ? session.getAttribute("userId").toString()
                    : "system";
            String userName = session != null && session.getAttribute("userName") != null
                    ? session.getAttribute("userName").toString()
                    : "System";
            auditLogDAO.log(entityType, entityId, action, userId, userName, oldJson, newJson);
        } catch (Exception e) {
            // swallow audit failures to avoid blocking core flow
            e.printStackTrace();
        }
    }
}
