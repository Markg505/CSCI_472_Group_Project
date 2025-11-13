package com.RBOS.servlets;

import com.RBOS.dao.InventoryDAO;
import com.RBOS.models.Inventory;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/inventory/*")
public class InventoryServlet extends HttpServlet {
    private InventoryDAO inventoryDAO;
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        inventoryDAO = new InventoryDAO(getServletContext());
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
    protected void doPut(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || !pathInfo.startsWith("/item/")) {
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
                boolean success = inventoryDAO.updateInventoryQuantity(itemId, quantity);
                
                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
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
                boolean success = inventoryDAO.decrementInventory(itemId, quantity);
                
                if (success) {
                    Inventory updated = inventoryDAO.getInventoryByItemId(itemId);
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
}