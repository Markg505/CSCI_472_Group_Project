package com.RBOS.dao;

import com.RBOS.models.Order;
import com.RBOS.models.OrderItem;
import com.RBOS.models.PagedResult;
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
                Order order = mapOrder(rs);
                order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(order.getOrderId()));
                orders.add(order);
            }
        }
        return orders;
    }

    public Order getOrderById(String orderId) throws SQLException {
        String sql = "SELECT o.*, u.full_name, u.email " +
                "FROM orders o " +
                "LEFT JOIN users u ON o.user_id = u.user_id " +
                "WHERE o.order_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, orderId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    Order order = mapOrder(rs);
                    order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(orderId));
                    return order;
                }
            }
        }
        return null;
    }

    public List<Order> getOrdersByUser(String userId) throws SQLException {
        List<Order> orders = new ArrayList<>();
        String sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_utc DESC";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Order order = mapOrder(rs);
                    orders.add(order);
                }
            }
        }
        return orders;
    }

    public PagedResult<Order> getOrdersWithFilters(String status, String startUtc, String endUtc,
            String userId, int page, int pageSize) throws SQLException {
        List<Order> orders = new ArrayList<>();
        List<String> params = new ArrayList<>();
        int total = 0;

        StringBuilder where = new StringBuilder(" WHERE 1=1");
        if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND o.status = ?");
            params.add(status);
        }
        if (startUtc != null && !startUtc.isEmpty()) {
            where.append(" AND o.created_utc >= ?");
            params.add(startUtc);
        }
        if (endUtc != null && !endUtc.isEmpty()) {
            where.append(" AND o.created_utc <= ?");
            params.add(endUtc);
        }
        if (userId != null && !userId.isEmpty()) {
            where.append(" AND o.user_id = ?");
            params.add(userId);
        }

        String countSql = "SELECT COUNT(*) FROM orders o" + where;
        String dataSql = "SELECT o.*, u.full_name, u.email " +
                "FROM orders o " +
                "LEFT JOIN users u ON o.user_id = u.user_id " +
                where +
                " ORDER BY o.created_utc DESC LIMIT ? OFFSET ?";

        try (Connection conn = DatabaseConnection.getConnection(context)) {
            try (PreparedStatement countStmt = conn.prepareStatement(countSql)) {
                for (int i = 0; i < params.size(); i++) {
                    countStmt.setString(i + 1, params.get(i));
                }
                try (ResultSet rs = countStmt.executeQuery()) {
                    if (rs.next()) {
                        total = rs.getInt(1);
                    }
                }
            }
            try (PreparedStatement dataStmt = conn.prepareStatement(dataSql)) {
                for (int i = 0; i < params.size(); i++) {
                    dataStmt.setString(i + 1, params.get(i));
                }
                dataStmt.setInt(params.size() + 1, pageSize);
                dataStmt.setInt(params.size() + 2, (page - 1) * pageSize);

                try (ResultSet dataRs = dataStmt.executeQuery()) {
                    while (dataRs.next()) {
                        Order order = mapOrder(dataRs);
                        order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(order.getOrderId()));
                        orders.add(order);
                    }
                }
            }
        }
        return new PagedResult<>(orders, total);
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
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Order order = mapOrder(rs);
                    order.setOrderItems(orderItemDAO.getOrderItemsByOrderId(order.getOrderId()));
                    orders.add(order);
                }
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
        String sql;

        if ("all".equalsIgnoreCase(status)) {
            sql = "SELECT o.*, u.full_name, u.email " +
                    "FROM orders o " +
                    "LEFT JOIN users u ON o.user_id = u.user_id " +
                    "ORDER BY o.created_utc DESC";
        } else {
            sql = "SELECT o.*, u.full_name, u.email " +
                    "FROM orders o " +
                    "LEFT JOIN users u ON o.user_id = u.user_id " +
                    "WHERE o.status = ? " +
                    "ORDER BY o.created_utc DESC";
        }

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            if (!"all".equalsIgnoreCase(status)) {
                pstmt.setString(1, status);
            }

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Order order = mapOrder(rs);
                    orders.add(order);
                }
            }
        }

        return orders;
    }

    public String createOrder(Order order) throws SQLException {
        try (Connection conn = DatabaseConnection.getConnection(context)) {
            boolean shouldRestoreAutoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false);

            try {
                String orderId = createOrder(order, conn);
                conn.commit();
                return orderId;
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(shouldRestoreAutoCommit);
            }
        }
    }

    public String createOrder(Order order, Connection conn) throws SQLException {
        String orderId = order.getOrderId();
        if (orderId == null || orderId.isBlank()) {
            orderId = java.util.UUID.randomUUID().toString();
            order.setOrderId(orderId);
        }

        String sql = "INSERT INTO orders (order_id, user_id, cart_token, source, status, fulfillment_type, " +
                "subtotal, tax, total, customer_name, customer_phone, delivery_address, delivery_address2, " +
                "delivery_city, delivery_state, delivery_postal_code, delivery_instructions) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setString(1, orderId);
            if (order.getUserId() == null || order.getUserId().isBlank()) {
                pstmt.setNull(2, java.sql.Types.VARCHAR);
            } else {
                pstmt.setString(2, order.getUserId());
            }
            pstmt.setString(3, order.getCartToken());
            pstmt.setString(4, order.getSource() != null ? order.getSource() : "web");
            pstmt.setString(5, order.getStatus() != null ? order.getStatus() : "cart");
            pstmt.setString(6, order.getFulfillmentType() != null ? order.getFulfillmentType() : "carryout");
            pstmt.setDouble(7, order.getSubtotal() != null ? order.getSubtotal() : 0.0);
            pstmt.setDouble(8, order.getTax() != null ? order.getTax() : 0.0);
            pstmt.setDouble(9, order.getTotal() != null ? order.getTotal() : 0.0);

            // customer/delivery params
            pstmt.setString(10, order.getCustomerName());
            pstmt.setString(11, order.getCustomerPhone());
            pstmt.setString(12, order.getDeliveryAddress());
            pstmt.setString(13, order.getDeliveryAddress2());
            pstmt.setString(14, order.getDeliveryCity());
            pstmt.setString(15, order.getDeliveryState());
            pstmt.setString(16, order.getDeliveryPostalCode());
            pstmt.setString(17, order.getDeliveryInstructions());

            int affectedRows = pstmt.executeUpdate();

            if (affectedRows > 0) {
                if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
                    for (OrderItem item : order.getOrderItems()) {
                        item.setOrderId(orderId);
                        orderItemDAO.createOrderItem(item, conn);
                    }
                }
                return orderId;
            }
        }
        return null;
    }

    public boolean updateOrder(Order order) throws SQLException {
        String sql = "UPDATE orders SET user_id = ?, cart_token = ?, source = ?, status = ?, fulfillment_type = ?, " +
                "subtotal = ?, tax = ?, total = ?, customer_name = ?, customer_phone = ?, delivery_address = ?, " +
                "delivery_address2 = ?, delivery_city = ?, delivery_state = ?, delivery_postal_code = ?, " +
                "delivery_instructions = ? WHERE order_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, order.getUserId());
            pstmt.setString(2, order.getCartToken());
            pstmt.setString(3, order.getSource());
            pstmt.setString(4, order.getStatus());
            pstmt.setString(5, order.getFulfillmentType());
            pstmt.setDouble(6, order.getSubtotal() != null ? order.getSubtotal() : 0.0);
            pstmt.setDouble(7, order.getTax() != null ? order.getTax() : 0.0);
            pstmt.setDouble(8, order.getTotal() != null ? order.getTotal() : 0.0);

            pstmt.setString(9, order.getCustomerName());
            pstmt.setString(10, order.getCustomerPhone());
            pstmt.setString(11, order.getDeliveryAddress());
            pstmt.setString(12, order.getDeliveryAddress2());
            pstmt.setString(13, order.getDeliveryCity());
            pstmt.setString(14, order.getDeliveryState());
            pstmt.setString(15, order.getDeliveryPostalCode());
            pstmt.setString(16, order.getDeliveryInstructions());

            pstmt.setString(17, order.getOrderId());

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateOrderStatus(String orderId, String status) throws SQLException {
        String sql = "UPDATE orders SET status = ? WHERE order_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, status);
            pstmt.setString(2, orderId);

            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateOrderTotals(String orderId, double subtotal, double tax, double total) throws SQLException {
        try (Connection conn = DatabaseConnection.getConnection(context)) {
            return updateOrderTotals(orderId, subtotal, tax, total, conn);
        }
    }

    public boolean updateOrderTotals(String orderId, double subtotal, double tax, double total, Connection conn)
            throws SQLException {
        String sql = "UPDATE orders SET subtotal = ?, tax = ?, total = ? WHERE order_id = ?";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setDouble(1, subtotal);
            pstmt.setDouble(2, tax);
            pstmt.setDouble(3, total);
            pstmt.setString(4, orderId);

            return pstmt.executeUpdate() > 0;
        }
    }

    public Order getCartByUserId(String userId) throws SQLException {
        if (userId == null) {
            return null;
        }
        String sql = "SELECT * FROM orders WHERE user_id = ? AND status = 'cart' ORDER BY created_utc DESC LIMIT 1";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    Order order = mapOrder(rs);
                    return order;
                }
            }
        }
        return null;
    }

    public Order getCartByUserId(String userId, Connection conn) throws SQLException {
        if (userId == null) {
            return null;
        }
        String sql = "SELECT * FROM orders WHERE user_id = ? AND status = 'cart' ORDER BY created_utc DESC LIMIT 1";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapOrder(rs);
                }
            }
        }
        return null;
    }

    public Order getCartByToken(String cartToken) throws SQLException {
        String sql = "SELECT * FROM orders WHERE cart_token = ? AND status = 'cart' ORDER BY created_utc DESC LIMIT 1";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, cartToken);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapOrder(rs);
                }
            }
        }
        return null;
    }

    public Order getCartByToken(String cartToken, Connection conn) throws SQLException {
        String sql = "SELECT * FROM orders WHERE cart_token = ? AND status = 'cart' ORDER BY created_utc DESC LIMIT 1";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, cartToken);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return mapOrder(rs);
                }
            }
        }
        return null;
    }

    public boolean updateCartOwnership(String orderId, String userId, String cartToken, Connection conn)
            throws SQLException {
        String sql = "UPDATE orders SET user_id = ?, cart_token = ? WHERE order_id = ?";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, userId);
            pstmt.setString(2, cartToken);
            pstmt.setString(3, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean updateCartToken(String orderId, String cartToken, Connection conn) throws SQLException {
        String sql = "UPDATE orders SET cart_token = ? WHERE order_id = ?";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, cartToken);
            pstmt.setString(2, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteOrder(String orderId, Connection conn) throws SQLException {
        String sql = "DELETE FROM orders WHERE order_id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public boolean deleteOrder(String orderId) throws SQLException {
        String sql = "DELETE FROM orders WHERE order_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, orderId);
            return pstmt.executeUpdate() > 0;
        }
    }

    public void recalculateOrderTotals(String orderId) throws SQLException {
        String sql = "UPDATE orders SET " +
                "subtotal = (SELECT COALESCE(SUM(line_total), 0) FROM order_items WHERE order_id = ?), " +
                "tax = (SELECT COALESCE(SUM(line_total), 0) * 0.08 FROM order_items WHERE order_id = ?), " +
                "total = (SELECT COALESCE(SUM(line_total), 0) * 1.08 FROM order_items WHERE order_id = ?) " +
                "WHERE order_id = ?";

        try (Connection conn = DatabaseConnection.getConnection(context);
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, orderId);
            pstmt.setString(2, orderId);
            pstmt.setString(3, orderId);
            pstmt.setString(4, orderId);

            pstmt.executeUpdate();
        }
    }

    private Order mapOrder(ResultSet rs) throws SQLException {
        Order order = new Order(
                rs.getString("order_id"),
                rs.getString("user_id"),
                rs.getString("cart_token"),
                rs.getString("source"),
                rs.getString("status"),
                rs.getDouble("subtotal"),
                rs.getDouble("tax"),
                rs.getDouble("total"),
                rs.getString("created_utc"));

        order.setFulfillmentType(rs.getString("fulfillment_type"));

        // map customer/delivery fields
        order.setCustomerName(rs.getString("customer_name"));
        order.setCustomerPhone(rs.getString("customer_phone"));
        order.setDeliveryAddress(rs.getString("delivery_address"));
        order.setDeliveryAddress2(rs.getString("delivery_address2"));
        order.setDeliveryCity(rs.getString("delivery_city"));
        order.setDeliveryState(rs.getString("delivery_state"));
        order.setDeliveryPostalCode(rs.getString("delivery_postal_code"));
        order.setDeliveryInstructions(rs.getString("delivery_instructions"));

        return order;
    }
}