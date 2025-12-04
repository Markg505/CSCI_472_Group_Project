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
import java.util.HashMap;
import java.util.Map;

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
            } else if (pathInfo.split("/").length == 2) {
                // Get inventory by inventory_id
                String inventoryId = pathInfo.substring(1);
                Inventory inventory = inventoryDAO.getInventoryById(inventoryId);
                if (inventory != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(inventory));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } else if (pathInfo.startsWith("/item/")) {
                // Get inventory by item ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 3) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String itemId = splits[2];
                Inventory inventory = inventoryDAO.getInventoryByItemId(itemId);
                
                if (inventory != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(inventory));
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
            if (!isAdmin(request)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN);
                return;
            }

            Inventory inventory = objectMapper.readValue(request.getReader(), Inventory.class);
            String inventoryId = inventoryDAO.createInventory(inventory);
            if (inventoryId != null) {
                inventory.setInventoryId(inventoryId);
                logAudit(request, "create", inventoryId, null, toMap(inventory));
                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(inventory));
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
            if (pathInfo == null || pathInfo.equals("/")) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            // Full record update by inventory_id
            if (pathInfo.split("/").length == 2) {
                if (!isAdmin(request)) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN);
                    return;
                }
                String inventoryId = pathInfo.substring(1);
                Inventory before = inventoryDAO.getInventoryById(inventoryId);
                if (before == null) {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                    return;
                }
                Inventory inventory = objectMapper.readValue(request.getReader(), Inventory.class);
                inventory.setInventoryId(inventoryId);
                boolean success = inventoryDAO.updateInventory(inventory);
                if (success) {
                    logAudit(request, "update", inventoryId, toMap(before), toMap(inventory));
                    Inventory updated = inventoryDAO.getInventoryById(inventoryId);
                    response.getWriter().write(objectMapper.writeValueAsString(updated));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
                return;
            }

            if (!pathInfo.startsWith("/item/")) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            
            String[] splits = pathInfo.split("/");
            if (splits.length != 4) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String itemId = splits[2];
            String action = splits[3];
            
            if ("quantity".equals(action)) {
                // Update quantity
                String quantityStr = request.getParameter("quantity");
                if (quantityStr == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Quantity parameter required");
                    return;
                }
                
                int quantity = Integer.parseInt(quantityStr);
                Inventory before = inventoryDAO.getInventoryByItemId(itemId);
                boolean success = inventoryDAO.updateInventoryQuantity(itemId, quantity);
                
                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
                    logQtyAudit(request, itemId, before, updated);
                    response.getWriter().write(objectMapper.writeValueAsString(updated));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } else if ("decrement".equals(action)) {
                // Decrement inventory
                String quantityStr = request.getParameter("qty_on_hand");
                if (quantityStr == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Quantity parameter required");
                    return;
                }
                
                int quantity = Integer.parseInt(quantityStr);
                Inventory before = inventoryDAO.getInventoryByItemId(itemId);
                boolean success = inventoryDAO.decrementInventory(itemId, quantity);
                
                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
                    logQtyAudit(request, itemId, before, updated);
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
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            if (!isAdmin(request)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
            String inventoryId = pathInfo.substring(1);
            Inventory existing = inventoryDAO.getInventoryById(inventoryId);
            boolean success = inventoryDAO.deleteInventory(inventoryId);
            if (success) {
                logAudit(request, "delete", inventoryId, toMap(existing), null);
                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        }
    }

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session != null && "admin".equals(session.getAttribute("role"));
    }

    private void logQtyAudit(HttpServletRequest request, String entityId, Inventory before, Inventory after) throws SQLException {
        HttpSession session = request.getSession(false);
        String actingUserId = session != null ? (String) session.getAttribute("userId") : null;
        String actingUserName = session != null ? (String) session.getAttribute("userName") : null;
        if (actingUserId != null && actingUserName != null && before != null && after != null) {
            Map<String, Object> oldValues = new HashMap<>();
            oldValues.put("qtyOnHand", before.getQtyOnHand());

            Map<String, Object> newValues = new HashMap<>();
            newValues.put("qtyOnHand", after.getQtyOnHand());

            auditLogDAO.logAction(actingUserId, actingUserName, "inventory", entityId, "update", oldValues, newValues);
        }
    }

    private void logAudit(HttpServletRequest request, String action, String entityId, Map<String, Object> oldValues, Map<String, Object> newValues) throws SQLException {
        HttpSession session = request.getSession(false);
        String actingUserId = session != null ? (String) session.getAttribute("userId") : null;
        String actingUserName = session != null ? (String) session.getAttribute("userName") : null;
        if (actingUserId != null && actingUserName != null) {
            auditLogDAO.logAction(actingUserId, actingUserName, "inventory", entityId, action, oldValues, newValues);
        }
    }

    private Map<String, Object> toMap(Inventory inv) {
        if (inv == null) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("itemId", inv.getItemId());
        map.put("name", inv.getName());
        map.put("sku", inv.getSku());
        map.put("category", inv.getCategory());
        map.put("unit", inv.getUnit() != null ? inv.getUnit().name() : null);
        map.put("packSize", inv.getPackSize());
        map.put("qtyOnHand", inv.getQtyOnHand());
        map.put("parLevel", inv.getParLevel());
        map.put("reorderPoint", inv.getReorderPoint());
        map.put("cost", inv.getCost());
        map.put("location", inv.getLocation());
        map.put("active", inv.getActive());
        map.put("vendor", inv.getVendor());
        map.put("leadTimeDays", inv.getLeadTimeDays());
        map.put("preferredOrderQty", inv.getPreferredOrderQty());
        map.put("wasteQty", inv.getWasteQty());
        map.put("lastCountedAt", inv.getLastCountedAt());
        map.put("countFreq", inv.getCountFreq() != null ? inv.getCountFreq().name() : null);
        map.put("lot", inv.getLot());
        map.put("expiryDate", inv.getExpiryDate());
        map.put("allergen", inv.getAllergen() != null ? inv.getAllergen().name() : null);
        map.put("conversion", inv.getConversion());
        return map;
    }
}
