package com.RBOS.servlets;

import com.RBOS.dao.MenuItemDAO;
import com.RBOS.models.MenuItem;
import com.RBOS.models.MenuItemWithInventory;
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
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        menuItemDAO = new MenuItemDAO(getServletContext());
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
            MenuItem menuItem = objectMapper.readValue(request.getReader(), MenuItem.class);
            String itemId = menuItemDAO.createMenuItem(menuItem);
            
            if (itemId != null) {
                menuItem.setItemId(itemId);
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
            MenuItem menuItem = objectMapper.readValue(request.getReader(), MenuItem.class);
            menuItem.setItemId(itemId); // Ensure the ID matches the path

            boolean success = menuItemDAO.updateMenuItem(menuItem);

            if (success) {
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
            boolean success = menuItemDAO.deleteMenuItem(itemId);
            
            if (success) {
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
}