package com.RBOS.servlets;

import com.RBOS.dao.MenuItemDAO;
import com.RBOS.dao.InventoryDAO;
import com.RBOS.dao.AuditLogDAO;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
import com.RBOS.models.User;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/menu/*")
public class MenuServlet extends HttpServlet {
    private MenuItemDAO menuItemDAO;
    private AuditLogDAO auditDAO;
    private UserDAO userDAO;
    private ObjectMapper objectMapper;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        menuItemDAO = new MenuItemDAO(getServletContext());
        auditDAO = new AuditLogDAO(getServletContext());
        userDAO = new UserDAO(getServletContext());
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            
            if (pathInfo == null || pathInfo.equals("/")) {
                // Check if we want only active items
                String activeOnly = request.getParameter("activeOnly");
                List<MenuItem> menuItems;
                
                if ("true".equalsIgnoreCase(activeOnly)) {
                    menuItems = menuItemDAO.getActiveMenuItems();
                } else {
                    menuItems = menuItemDAO.getAllMenuItems();
                }
                
                response.getWriter().write(objectMapper.writeValueAsString(menuItems));
            }   else if ("/with-inventory".equals(pathInfo)) {
                // Get menu items with inventory information
                List<MenuItemWithInventory> menuItems = menuItemDAO.getActiveMenuItemsWithInventory();
                response.getWriter().write(objectMapper.writeValueAsString(menuItems));
            }   else if ("/active".equals(pathInfo)) {
                // Get only active menu items
                List<MenuItem> activeItems = menuItemDAO.getActiveMenuItems();
                response.getWriter().write(objectMapper.writeValueAsString(activeItems));
            } else {
                // Get menu item by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String itemId = splits[1];
                MenuItem menuItem = menuItemDAO.getMenuItemById(itemId);
                
                if (menuItem != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(menuItem));
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
            JsonNode root = objectMapper.readTree(request.getReader());
            MenuItem menuItem = objectMapper.treeToValue(root, MenuItem.class);
            String itemId = menuItemDAO.createMenuItem(menuItem);
            
            if (itemId != null) {
                menuItem.setItemId(itemId);

                linkInventory(root, itemId);

                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("menu_item", itemId, "create", actorId, getSessionUserName(request),
                            null, "Menu item created: " + menuItem.getName());
                } catch (Exception e) {
                    e.printStackTrace();
                }

                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(menuItem));
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
            if (pathInfo == null) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String[] splits = pathInfo.split("/");

            // Handle image update: PUT /api/menu/{itemId}/image
            if (splits.length == 3 && "image".equals(splits[2])) {
                String itemId = splits[1];
                JsonNode json = objectMapper.readTree(request.getReader());
                String imageUrl = json.get("imageUrl").asText();

                // Basic URL validation
                if (imageUrl != null && !imageUrl.isEmpty() &&
                        !imageUrl.matches("^https?://.+")) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid URL format");
                    return;
                }

                boolean success = updateMenuItemImage(itemId, imageUrl);
                if (success) {
                    MenuItem updatedItem = menuItemDAO.getMenuItemById(itemId);
                    response.getWriter().write(objectMapper.writeValueAsString(updatedItem));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
                return;
            }

            // Handle regular menu item update: PUT /api/menu/{itemId}
            if (splits.length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String itemId = splits[1];

            // Get old menu item data for audit
            MenuItem oldItem = menuItemDAO.getMenuItemById(itemId);
            String oldValue = oldItem != null ? objectMapper.writeValueAsString(oldItem) : null;

            JsonNode root = objectMapper.readTree(request.getReader());
            MenuItem menuItem = objectMapper.treeToValue(root, MenuItem.class);
            menuItem.setItemId(itemId); // Ensure the ID matches the path

            boolean success = menuItemDAO.updateMenuItem(menuItem);

            if (success) {
                linkInventory(root, itemId);

                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("menu_item", itemId, "update", actorId, getSessionUserName(request),
                            oldValue, objectMapper.writeValueAsString(menuItem));
                } catch (Exception e) {
                    e.printStackTrace();
                }

                response.getWriter().write(objectMapper.writeValueAsString(menuItem));
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

            String itemId = pathInfo.split("/")[1];

            // Get menu item data before deletion for audit
            MenuItem deletedItem = menuItemDAO.getMenuItemById(itemId);
            String oldValue = deletedItem != null ? objectMapper.writeValueAsString(deletedItem) : null;

            boolean success = menuItemDAO.deleteMenuItem(itemId);

            if (success) {
                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("menu_item", itemId, "delete", actorId, getSessionUserName(request),
                            oldValue, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
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

    private boolean updateMenuItemImage(String itemId, String imageUrl) throws SQLException {
        String sql = "UPDATE menu_items SET image_url = ? WHERE item_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(getServletContext());
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, imageUrl);
            pstmt.setString(2, itemId);

            return pstmt.executeUpdate() > 0;
        }
    }

    private void linkInventory(JsonNode root, String itemId) {
        try {
            String inventoryId = root.hasNonNull("inventoryId") ? root.get("inventoryId").asText() : null;
            String inventorySku = root.hasNonNull("inventorySku") ? root.get("inventorySku").asText() : null;
            InventoryDAO inventoryDAO = new InventoryDAO(getServletContext());
            if (inventoryId != null && !inventoryId.isBlank()) {
                inventoryDAO.linkInventoryById(inventoryId, itemId);
            } else if (inventorySku != null && !inventorySku.isBlank()) {
                inventoryDAO.linkInventoryBySku(inventorySku, itemId);
            }
        } catch (Exception e) {
            // swallow linking errors to avoid failing menu updates
            System.err.println("Inventory link skipped: " + e.getMessage());
        }
    }

    private String getSessionUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "system";
        Object userId = session.getAttribute("userId");
        return userId != null ? userId.toString() : "system";
    }

    private String getSessionUserName(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "System";
        try {
            String userId = getSessionUserId(request);
            if ("system".equals(userId)) return "System";
            User user = userDAO.getUserById(userId);
            return user != null ? user.getFullName() : "System";
        } catch (Exception e) {
            return "System";
        }
    }
}
