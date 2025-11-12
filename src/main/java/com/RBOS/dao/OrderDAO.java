package com.RBOS.dao;

import com.RBOS.models.Order;
import com.RBOS.models.OrderItem;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class OrderDAO {
    private ServletContext context;
    private OrderItemDAO orderItemDAO;
    
    public OrderDAO(ServletContext context) {
        this.context = context;
        this.orderItemDAO = new OrderItemDAO(context);
    }
    
    public List<Order> getAllOrders() throws SQLException {
        List<Order> orders = new ArrayList<>();
        String sql = "SELECT o.*, u.full_name, u.email " +
                    "FROM orders o " +
                    "LEFT JOIN users u ON o.user_id = u.user_id " +
                    "ORDER BY o.created_utc DESC";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                Order order = new Order(
                    rs.getInt("order_id"),
                    rs.getInt("user_id"),
                    rs.getString("source"),
                    rs.getString("status"),
                    rs.getDouble("subtotal"),
                    rs.getDouble("tax"),
                    rs.getDouble("total"),
                    rs.getString("created_utc")
                );
                
                // Load order items for each order
                order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(order.getOrderId()));
                orders.add(order);
            }
        }
        return orders;
    }
    
    public Order getOrderById(int orderId) throws SQLException {
        String sql = "SELECT o.*, u.full_name, u.email " +
                    "FROM orders o " +
                    "LEFT JOIN users u ON o.user_id = u.user_id " +
                    "WHERE o.order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                Order order = new Order(
                    rs.getInt("order_id"),
                    rs.getInt("user_id"),
                    rs.getString("source"),
                    rs.getString("status"),
                    rs.getDouble("subtotal"),
                    rs.getDouble("tax"),
                    rs.getDouble("total"),
                    rs.getString("created_utc")
                );
                
                // Load order items
                order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(orderId));
                return order;
            }
        }
        return null;
    }
    
    public List<Order> getOrdersByUser(int userId) throws SQLException {
        List<Order> orders = new ArrayList<>();
        String sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_utc DESC";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                Order order = new Order(
                    rs.getInt("order_id"),
                    rs.getInt("user_id"),
                    rs.getString("source"),
                    rs.getString("status"),
                    rs.getDouble("subtotal"),
                    rs.getDouble("tax"),
                    rs.getDouble("total"),
                    rs.getString("created_utc")
                );
                
                orders.add(order);
            }
        }
        return orders;
    }

    public List<Order> getOrdersByDateRange(String startDate, String endDate) throws SQLException {
        List<Order> orders = new ArrayList<>();
        String sql = "SELECT o.*, u.full_name, u.email " +
                "FROM orders o " +
                "LEFT JOIN users u ON o.user_id = u.user_id " +
                "WHERE DATE(o.created_utc) BETWEEN ? AND ? " +
                "ORDER BY o.created_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, startDate);
            pstmt.setString(2, endDate);
            ResultSet rs = pstmt.executeQuery();

            while (rs.next()) {
                Order order = new Order(
                        rs.getInt("order_id"),
                        rs.getInt("user_id"),
                        rs.getString("source"),
                        rs.getString("status"),
                        rs.getDouble("subtotal"),
                        rs.getDouble("tax"),
                        rs.getDouble("total"),
                        rs.getString("created_utc")
                );
                order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(order.getOrderId()));
                orders.add(order);
            }
        }
        return orders;
    }

    public Map<String, Object> getOrderStatistics(String period) throws SQLException {
        Map<String, Object> stats = new HashMap<>();
        String sql = "";

        switch (period) {
            case "today":
                sql = "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue " +
                        "FROM orders WHERE DATE(created_utc) = DATE('now') AND status IN ('placed', 'paid')";
                break;
            case "week":
                sql = "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue " +
                        "FROM orders WHERE created_utc >= DATE('now', '-7 days') AND status IN ('placed', 'paid')";
                break;
            case "month":
                sql = "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue " +
                        "FROM orders WHERE created_utc >= DATE('now', '-30 days') AND status IN ('placed', 'paid')";
                break;
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            if (rs.next()) {
                stats.put("orderCount", rs.getInt("count"));
                stats.put("revenue", rs.getDouble("revenue"));
            }
        }
        return stats;
    }

    public List<Order> getOrdersByStatus(String status) throws SQLException {
        List<Order> orders = new ArrayList<>();
        String sql = "SELECT o.*, u.full_name, u.email " +
                    "FROM orders o " +
                    "LEFT JOIN users u ON o.user_id = u.user_id " +
                    "WHERE o.status = ? " +
                    "ORDER BY o.created_utc DESC";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, status);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                Order order = new Order(
                    rs.getInt("order_id"),
                    rs.getInt("user_id"),
                    rs.getString("source"),
                    rs.getString("status"),
                    rs.getDouble("subtotal"),
                    rs.getDouble("tax"),
                    rs.getDouble("total"),
                    rs.getString("created_utc")
                );
                
                orders.add(order);
            }
        }
        return orders;
    }
    
    public Integer createOrder(Order order) throws SQLException {
        String sql = "INSERT INTO orders (user_id, source, status, subtotal, tax, total) VALUES (?, ?, ?, ?, ?, ?)";
        
        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection(context);
            conn.setAutoCommit(false); // Start transaction
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                pstmt.setObject(1, order.getUserId(), Types.INTEGER);
                pstmt.setString(2, order.getSource() != null ? order.getSource() : "web");
                pstmt.setString(3, order.getStatus() != null ? order.getStatus() : "cart");
                pstmt.setDouble(4, order.getSubtotal() != null ? order.getSubtotal() : 0.0);
                pstmt.setDouble(5, order.getTax() != null ? order.getTax() : 0.0);
                pstmt.setDouble(6, order.getTotal() != null ? order.getTotal() : 0.0);
                
                int affectedRows = pstmt.executeUpdate();
                
                if (affectedRows > 0) {
                    try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            int orderId = generatedKeys.getInt(1);
                            
                            // Create order items if provided
                            if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
                                for (OrderItem item : order.getOrderItems()) {
                                    item.setOrderId(orderId);
                                    orderItemDAO.createOrderItem(item, conn);
                                }
                            }
                            
                            conn.commit();
                            return orderId;
                        }
                    }
                }
                conn.rollback();
            }
        } catch (SQLException e) {
            if (conn != null) {
                conn.rollback();
            }
            throw e;
        } finally {
            if (conn != null) {
                conn.setAutoCommit(true);
                conn.close();
            }
        }
        return null;
    }
    
    public boolean updateOrder(Order order) throws SQLException {
        String sql = "UPDATE orders SET user_id = ?, source = ?, status = ?, subtotal = ?, tax = ?, total = ? WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setObject(1, order.getUserId(), Types.INTEGER);
            pstmt.setString(2, order.getSource());
            pstmt.setString(3, order.getStatus());
            pstmt.setDouble(4, order.getSubtotal());
            pstmt.setDouble(5, order.getTax());
            pstmt.setDouble(6, order.getTotal());
            pstmt.setInt(7, order.getOrderId());
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean updateOrderStatus(int orderId, String status) throws SQLException {
        String sql = "UPDATE orders SET status = ? WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, status);
            pstmt.setInt(2, orderId);
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean updateOrderTotals(int orderId, double subtotal, double tax, double total) throws SQLException {
        String sql = "UPDATE orders SET subtotal = ?, tax = ?, total = ? WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setDouble(1, subtotal);
            pstmt.setDouble(2, tax);
            pstmt.setDouble(3, total);
            pstmt.setInt(4, orderId);
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteOrder(int orderId) throws SQLException {
        // Order items will be deleted due to CASCADE
        String sql = "DELETE FROM orders WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }
    
    // Calculate order totals based on order items
    public void recalculateOrderTotals(int orderId) throws SQLException {
        String sql = "UPDATE orders SET " +
                    "subtotal = (SELECT COALESCE(SUM(line_total), 0) FROM order_items WHERE order_id = ?), " +
                    "tax = (SELECT COALESCE(SUM(line_total), 0) * 0.08 FROM order_items WHERE order_id = ?), " + // 8% tax example
                    "total = (SELECT COALESCE(SUM(line_total), 0) * 1.08 FROM order_items WHERE order_id = ?) " +
                    "WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderId);
            pstmt.setInt(2, orderId);
            pstmt.setInt(3, orderId);
            pstmt.setInt(4, orderId);
            
            pstmt.executeUpdate();
        }
    }
}