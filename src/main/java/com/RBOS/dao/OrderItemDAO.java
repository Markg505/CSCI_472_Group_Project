package com.RBOS.dao;

import com.RBOS.models.OrderItem;
import com.RBOS.utils.DatabaseConnection;
import jakarta.servlet.ServletContext;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class OrderItemDAO {
    private ServletContext context;
    
    public OrderItemDAO(ServletContext context) {
        this.context = context;
    }
    
    public List<OrderItem> getOrderItemsByOrderId(int orderId) throws SQLException {
        List<OrderItem> orderItems = new ArrayList<>();
        String sql = "SELECT oi.*, mi.name as item_name " +
                    "FROM order_items oi " +
                    "JOIN menu_items mi ON oi.item_id = mi.item_id " +
                    "WHERE oi.order_id = ? " +
                    "ORDER BY oi.order_item_id";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderId);
            ResultSet rs = pstmt.executeQuery();
            
            while (rs.next()) {
                OrderItem orderItem = new OrderItem(
                    rs.getInt("order_item_id"),
                    rs.getInt("order_id"),
                    rs.getInt("item_id"),
                    rs.getInt("qty"),
                    rs.getDouble("unit_price"),
                    rs.getDouble("line_total"),
                    rs.getString("notes")
                );
                orderItems.add(orderItem);
            }
        }
        return orderItems;
    }
    
    public OrderItem getOrderItemById(int orderItemId) throws SQLException {
        String sql = "SELECT oi.*, mi.name as item_name " +
                    "FROM order_items oi " +
                    "JOIN menu_items mi ON oi.item_id = mi.item_id " +
                    "WHERE oi.order_item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderItemId);
            ResultSet rs = pstmt.executeQuery();
            
            if (rs.next()) {
                return new OrderItem(
                    rs.getInt("order_item_id"),
                    rs.getInt("order_id"),
                    rs.getInt("item_id"),
                    rs.getInt("qty"),
                    rs.getDouble("unit_price"),
                    rs.getDouble("line_total"),
                    rs.getString("notes")
                );
            }
        }
        return null;
    }
    
    public Integer createOrderItem(OrderItem orderItem) throws SQLException {
        return createOrderItem(orderItem, null);
    }
    
    // Overloaded method to accept connection for transaction handling
    public Integer createOrderItem(OrderItem orderItem, Connection existingConn) throws SQLException {
        String sql = "INSERT INTO order_items (order_id, item_id, qty, unit_price, line_total, notes) VALUES (?, ?, ?, ?, ?, ?)";
        
        boolean shouldClose = false;
        Connection conn = existingConn;
        
        try {
            if (conn == null) {
                conn = DatabaseConnection.getConnection(context);
                shouldClose = true;
            }
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                
                pstmt.setInt(1, orderItem.getOrderId());
                pstmt.setInt(2, orderItem.getItemId());
                pstmt.setInt(3, orderItem.getQty());
                pstmt.setDouble(4, orderItem.getUnitPrice());
                pstmt.setDouble(5, orderItem.getLineTotal());
                pstmt.setString(6, orderItem.getNotes());
                
                int affectedRows = pstmt.executeUpdate();
                
                if (affectedRows > 0) {
                    try (ResultSet generatedKeys = pstmt.getGeneratedKeys()) {
                        if (generatedKeys.next()) {
                            return generatedKeys.getInt(1);
                        }
                    }
                }
            }
        } finally {
            if (shouldClose && conn != null) {
                conn.close();
            }
        }
        return null;
    }
    
    public boolean updateOrderItem(OrderItem orderItem) throws SQLException {
        String sql = "UPDATE order_items SET item_id = ?, qty = ?, unit_price = ?, line_total = ?, notes = ? WHERE order_item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderItem.getItemId());
            pstmt.setInt(2, orderItem.getQty());
            pstmt.setDouble(3, orderItem.getUnitPrice());
            pstmt.setDouble(4, orderItem.getLineTotal());
            pstmt.setString(5, orderItem.getNotes());
            pstmt.setInt(6, orderItem.getOrderItemId());
            
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteOrderItem(int orderItemId) throws SQLException {
        String sql = "DELETE FROM order_items WHERE order_item_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderItemId);
            return pstmt.executeUpdate() > 0;
        }
    }
    
    public boolean deleteOrderItemsByOrderId(int orderId) throws SQLException {
        String sql = "DELETE FROM order_items WHERE order_id = ?";
        
        try (Connection conn = DatabaseConnection.getConnection(context);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }
    
    // Calculate line total for an order item
    public double calculateLineTotal(int qty, double unitPrice) {
        return qty * unitPrice;
    }
}