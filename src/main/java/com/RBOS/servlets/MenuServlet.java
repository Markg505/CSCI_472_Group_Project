package com.RBOS.servlets;

import com.RBOS.dao.MenuItemDAO;
import com.RBOS.models.MenuItem;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
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
            } else if ("/active".equals(pathInfo)) {
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
                
                int itemId = Integer.parseInt(splits[1]);
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
            Integer itemId = menuItemDAO.createMenuItem(menuItem);
            
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
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            
            int itemId = Integer.parseInt(pathInfo.split("/")[1]);
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
            
            int itemId = Integer.parseInt(pathInfo.split("/")[1]);
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
}