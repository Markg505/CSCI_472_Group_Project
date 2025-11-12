package com.RBOS.servlets;

import com.RBOS.dao.OrderDAO;
import com.RBOS.dao.OrderItemDAO;
import com.RBOS.models.Order;
import com.RBOS.services.EmailService;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.websocket.WebSocketConfig;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/orders/*")
public class OrderServlet extends HttpServlet {
    private OrderDAO orderDAO;
    private OrderItemDAO orderItemDAO;
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        orderDAO = new OrderDAO(getServletContext());
        orderItemDAO = new OrderItemDAO(getServletContext());
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            
            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all orders or filter by status
                String status = request.getParameter("status");
                List<Order> orders;
                
                if (status != null && !status.isEmpty()) {
                    orders = orderDAO.getOrdersByStatus(status);
                } else {
                    orders = orderDAO.getAllOrders();
                }
                
                response.getWriter().write(objectMapper.writeValueAsString(orders));
            } else if (pathInfo.startsWith("/user/")) {
                // Get orders by user ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 3) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }
                
                int userId = Integer.parseInt(splits[2]);
                List<Order> userOrders = orderDAO.getOrdersByUser(userId);
                response.getWriter().write(objectMapper.writeValueAsString(userOrders));
                
            } else if (pathInfo.startsWith("/status/")) {
                // Get orders by status
                String[] splits = pathInfo.split("/");
                if (splits.length != 3) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }
                
                String status = splits[2];
                List<Order> statusOrders = orderDAO.getOrdersByStatus(status);
                response.getWriter().write(objectMapper.writeValueAsString(statusOrders));
                
            } else {
                // Get order by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }
                
                int orderId = Integer.parseInt(splits[1]);
                Order order = orderDAO.getOrderById(orderId);
                
                if (order != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(order));
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
            Order order = objectMapper.readValue(request.getReader(), Order.class);
            Integer orderId = orderDAO.createOrder(order);

            if (orderId != null) {
                order.setOrderId(orderId);

                // Recalculate totals after creating order items
                orderDAO.recalculateOrderTotals(orderId);

                // Fetch the complete order with recalculated totals
                Order completeOrder = orderDAO.getOrderById(orderId);

                // Send confirmation email
                try {
                    EmailService emailService = new EmailService();

                    // Get user details for email
                    UserDAO userDAO = new UserDAO(getServletContext());
                    User user = null;
                    if (order.getUserId() != null) {
                        user = userDAO.getUserById(order.getUserId());
                    }

                    if (user != null && user.getEmail() != null) {
                        // Calculate estimated ready time (30-45 minutes from now)
                        String estimatedTime = new java.text.SimpleDateFormat("h:mm a")
                                .format(new java.util.Date(System.currentTimeMillis() + 45 * 60 * 1000));

                        emailService.sendOrderConfirmation(
                            user.getEmail(),
                            user.getFullName(),
                            String.valueOf(orderId),
                            order.getTotal(),
                            estimatedTime
                        );
                    }

                    // Notify admin
                    emailService.sendAdminNotification(
                            "New Order Received",
                            "New order #" + orderId + " received with total: $" + order.getTotal()
                    );

                } catch (Exception e) {
                    System.err.println("Failed to send order email: " + e.getMessage());
                    // Don't fail the request if email fails
                }

                // Notify via WebSocket
                String orderJson = objectMapper.writeValueAsString(order);
                WebSocketConfig.notifyNewOrder(orderJson);

                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(order));
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
            
            String[] pathParts = pathInfo.split("/");
            int orderId = Integer.parseInt(pathParts[1]);
            
            if (pathParts.length == 3 && "status".equals(pathParts[2])) {
                // Update only order status
                String newStatus = request.getParameter("status");
                if (newStatus == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Status parameter required");
                    return;
                }
                
                boolean success = orderDAO.updateOrderStatus(orderId, newStatus);
                if (success) {
                    // Send status update email
                    try {
                        EmailService emailService = new EmailService();
                        Order order = orderDAO.getOrderById(orderId);

                        if (order != null && order.getUserId() != null) {
                            UserDAO userDAO = new UserDAO(getServletContext());
                            User user = userDAO.getUserById(order.getUserId());

                            if (user != null && user.getEmail() != null) {
                                String updateMessage = "Your order status has been updated to: " + newStatus;
                                if ("ready".equals(newStatus)) {
                                    updateMessage = "Your order is ready!";
                                } else if ("cancelled".equals(newStatus)) {
                                    updateMessage = "Your order has been cancelled. Please contact us if this is an error.";
                                }

                                emailService.sendOrderStatusUpdate(
                                        user.getEmail(),
                                        user.getFullName(),
                                        String.valueOf(orderId),
                                        newStatus,
                                        updateMessage
                                );
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to send order status email: " + e.getMessage());
                    }

                    Order updatedOrder = orderDAO.getOrderById(orderId);

                    // Notify via WebSocket
                    String orderJson = objectMapper.writeValueAsString(updatedOrder);
                    WebSocketConfig.notifyOrderUpdate(orderJson);

                    response.getWriter().write(objectMapper.writeValueAsString(updatedOrder));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } else {
                // Update entire order
                Order order = objectMapper.readValue(request.getReader(), Order.class);
                order.setOrderId(orderId); // Ensure the ID matches the path
                
                boolean success = orderDAO.updateOrder(order);
                
                if (success) {
                    response.getWriter().write(objectMapper.writeValueAsString(order));
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
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            
            int orderId = Integer.parseInt(pathInfo.split("/")[1]);
            boolean success = orderDAO.deleteOrder(orderId);
            
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