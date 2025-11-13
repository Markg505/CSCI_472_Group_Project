package com.RBOS.servlets;

import com.RBOS.dao.*;
import com.RBOS.models.*;
import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Date;

@WebServlet("/api/reports/*")
public class ReportServlet extends HttpServlet {
    private ReservationDAO reservationDAO;
    private OrderDAO orderDAO;
    private UserDAO userDAO;
    private MenuItemDAO menuItemDAO;
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        ServletContext context = getServletContext();
        reservationDAO = new ReservationDAO(context);
        orderDAO = new OrderDAO(context);
        userDAO = new UserDAO(context);
        menuItemDAO = new MenuItemDAO(context);
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.equals("/")) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            
            String reportType = pathInfo.substring(1); // Remove leading slash
            
            switch (reportType) {
                case "dashboard-metrics":
                    getDashboardMetrics(response);
                    break;
                case "reservation-analytics":
                    getReservationAnalytics(request, response);
                    break;
                case "sales-analytics":
                    getSalesAnalytics(request, response);
                    break;
                case "customer-analytics":
                    getCustomerAnalytics(response);
                    break;
                case "menu-performance":
                    getMenuPerformance(request, response);
                    break;
                default:
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (Exception e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            e.printStackTrace();
        }
    }
    
    private void getDashboardMetrics(HttpServletResponse response) throws SQLException, IOException {
        ObjectNode metrics = objectMapper.createObjectNode();
        
        // Today's date
        String today = new java.sql.Date(System.currentTimeMillis()).toString();
        
        // Reservation metrics
        List<Reservation> reservations = reservationDAO.getAllReservations();
        long todayReservations = reservations.stream()
            .filter(r -> r.getStartUtc().startsWith(today))
            .count();
        long pendingReservations = reservations.stream()
            .filter(r -> "pending".equals(r.getStatus()))
            .count();
        
        // Order metrics
        List<Order> orders = orderDAO.getAllOrders();
        double todayRevenue = orders.stream()
            .filter(o -> o.getCreatedUtc() != null && o.getCreatedUtc().startsWith(today))
            .filter(o -> "paid".equals(o.getStatus()))
            .mapToDouble(Order::getTotal)
            .sum();
        long todayOrders = orders.stream()
            .filter(o -> o.getCreatedUtc() != null && o.getCreatedUtc().startsWith(today))
            .count();
        
        // Customer metrics
        List<User> users = userDAO.getAllUsers();
        long totalCustomers = users.stream()
            .filter(u -> "customer".equals(u.getRole()))
            .count();
        
        metrics.put("todayReservations", todayReservations);
        metrics.put("pendingReservations", pendingReservations);
        metrics.put("todayRevenue", todayRevenue);
        metrics.put("todayOrders", todayOrders);
        metrics.put("totalCustomers", totalCustomers);
        metrics.put("totalReservations", reservations.size());
        metrics.put("totalOrders", orders.size());
        
        response.getWriter().write(objectMapper.writeValueAsString(metrics));
    }
    
    private void getReservationAnalytics(HttpServletRequest request, HttpServletResponse response) 
            throws SQLException, IOException {
        String period = request.getParameter("period") != null ? 
            request.getParameter("period") : "week";
        
        ObjectNode analytics = objectMapper.createObjectNode();
        ArrayNode timelineData = objectMapper.createArrayNode();
        ArrayNode statusData = objectMapper.createArrayNode();
        ArrayNode partySizeData = objectMapper.createArrayNode();
        
        List<Reservation> reservations = reservationDAO.getAllReservations();
        
        // Filter by period
        Calendar cal = Calendar.getInstance();
        switch (period) {
            case "week":
                cal.add(Calendar.DAY_OF_YEAR, -7);
                break;
            case "month":
                cal.add(Calendar.MONTH, -1);
                break;
            case "quarter":
                cal.add(Calendar.MONTH, -3);
                break;
            default:
                cal.add(Calendar.DAY_OF_YEAR, -7);
        }
        
        Date startDate = cal.getTime();
        List<Reservation> filteredReservations = reservations.stream()
            .filter(r -> {
                try {
                    Date resDate = new java.util.Date(r.getStartUtc());
                    return resDate.after(startDate);
                } catch (Exception e) {
                    return false;
                }
            })
            .collect(Collectors.toList());
        
        // Timeline data (reservations per day)
        Map<String, Long> dailyCounts = filteredReservations.stream()
            .collect(Collectors.groupingBy(
                r -> r.getStartUtc().substring(0, 10),
                Collectors.counting()
            ));
        
        dailyCounts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                ObjectNode dayData = objectMapper.createObjectNode();
                dayData.put("date", entry.getKey());
                dayData.put("count", entry.getValue());
                timelineData.add(dayData);
            });
        
        // Status distribution
        Map<String, Long> statusCounts = reservations.stream()
            .collect(Collectors.groupingBy(
                Reservation::getStatus,
                Collectors.counting()
            ));
        
        statusCounts.forEach((status, count) -> {
            ObjectNode statusNode = objectMapper.createObjectNode();
            statusNode.put("status", status);
            statusNode.put("count", count);
            statusData.add(statusNode);
        });
        
        // Party size distribution
        Map<Integer, Long> partySizeCounts = reservations.stream()
            .collect(Collectors.groupingBy(
                Reservation::getPartySize,
                Collectors.counting()
            ));
        
        partySizeCounts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                ObjectNode sizeNode = objectMapper.createObjectNode();
                sizeNode.put("partySize", entry.getKey());
                sizeNode.put("count", entry.getValue());
                partySizeData.add(sizeNode);
            });
        
        analytics.set("timeline", timelineData);
        analytics.set("statusDistribution", statusData);
        analytics.set("partySizeDistribution", partySizeData);
        analytics.put("totalReservations", filteredReservations.size());
        analytics.put("avgPartySize", filteredReservations.stream()
            .mapToInt(Reservation::getPartySize)
            .average()
            .orElse(0.0));
        
        response.getWriter().write(objectMapper.writeValueAsString(analytics));
    }
    
    private void getSalesAnalytics(HttpServletRequest request, HttpServletResponse response) 
            throws SQLException, IOException {
        String period = request.getParameter("period") != null ? 
            request.getParameter("period") : "week";
        
        ObjectNode analytics = objectMapper.createObjectNode();
        ArrayNode revenueData = objectMapper.createArrayNode();
        ArrayNode orderCountData = objectMapper.createArrayNode();
        ArrayNode sourceData = objectMapper.createArrayNode();
        
        List<Order> orders = orderDAO.getAllOrders();
        
        // Filter paid orders and by period
        Calendar cal = Calendar.getInstance();
        switch (period) {
            case "week":
                cal.add(Calendar.DAY_OF_YEAR, -7);
                break;
            case "month":
                cal.add(Calendar.MONTH, -1);
                break;
            case "quarter":
                cal.add(Calendar.MONTH, -3);
                break;
            default:
                cal.add(Calendar.DAY_OF_YEAR, -7);
        }
        
        Date startDate = cal.getTime();
        List<Order> filteredOrders = orders.stream()
            .filter(o -> "paid".equals(o.getStatus()))
            .filter(o -> {
                try {
                    if (o.getCreatedUtc() == null) return false;
                    Date orderDate = new java.util.Date(o.getCreatedUtc());
                    return orderDate.after(startDate);
                } catch (Exception e) {
                    return false;
                }
            })
            .collect(Collectors.toList());
        
        // Revenue by day
        Map<String, Double> dailyRevenue = filteredOrders.stream()
            .collect(Collectors.groupingBy(
                o -> o.getCreatedUtc().substring(0, 10),
                Collectors.summingDouble(Order::getTotal)
            ));
        
        dailyRevenue.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                ObjectNode dayData = objectMapper.createObjectNode();
                dayData.put("date", entry.getKey());
                dayData.put("revenue", entry.getValue());
                revenueData.add(dayData);
            });
        
        // Order count by day
        Map<String, Long> dailyOrders = filteredOrders.stream()
            .collect(Collectors.groupingBy(
                o -> o.getCreatedUtc().substring(0, 10),
                Collectors.counting()
            ));
        
        dailyOrders.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                ObjectNode dayData = objectMapper.createObjectNode();
                dayData.put("date", entry.getKey());
                dayData.put("count", entry.getValue());
                orderCountData.add(dayData);
            });
        
        // Orders by source
        Map<String, Long> sourceCounts = orders.stream()
            .collect(Collectors.groupingBy(
                Order::getSource,
                Collectors.counting()
            ));
        
        sourceCounts.forEach((source, count) -> {
            ObjectNode sourceNode = objectMapper.createObjectNode();
            sourceNode.put("source", source);
            sourceNode.put("count", count);
            sourceData.add(sourceNode);
        });
        
        double totalRevenue = filteredOrders.stream()
            .mapToDouble(Order::getTotal)
            .sum();
        double avgOrderValue = filteredOrders.stream()
            .mapToDouble(Order::getTotal)
            .average()
            .orElse(0.0);
        
        analytics.set("revenueTimeline", revenueData);
        analytics.set("orderCountTimeline", orderCountData);
        analytics.set("sourceDistribution", sourceData);
        analytics.put("totalRevenue", totalRevenue);
        analytics.put("totalOrders", filteredOrders.size());
        analytics.put("avgOrderValue", avgOrderValue);
        
        response.getWriter().write(objectMapper.writeValueAsString(analytics));
    }
    
    private void getCustomerAnalytics(HttpServletResponse response) throws SQLException, IOException {
        ObjectNode analytics = objectMapper.createObjectNode();
        ArrayNode customerData = objectMapper.createArrayNode();
        ArrayNode loyaltyData = objectMapper.createArrayNode();
        
        List<User> users = userDAO.getAllUsers();
        List<Reservation> reservations = reservationDAO.getAllReservations();
        List<Order> orders = orderDAO.getAllOrders();
        
        // Customer role distribution
        Map<String, Long> roleCounts = users.stream()
            .collect(Collectors.groupingBy(
                User::getRole,
                Collectors.counting()
            ));
        
        roleCounts.forEach((role, count) -> {
            ObjectNode roleNode = objectMapper.createObjectNode();
            roleNode.put("role", role);
            roleNode.put("count", count);
            customerData.add(roleNode);
        });
        
        // Customer loyalty (reservations per customer)
        Map<String, Long> reservationsPerCustomer = reservations.stream()
            .filter(r -> r.getUserId() != null)
            .collect(Collectors.groupingBy(
                Reservation::getUserId,
                Collectors.counting()
            ));
        
        Map<String, Long> loyaltyDistribution = new HashMap<>();
        loyaltyDistribution.put("1 visit", reservationsPerCustomer.values().stream().filter(count -> count == 1).count());
        loyaltyDistribution.put("2-5 visits", reservationsPerCustomer.values().stream().filter(count -> count >= 2 && count <= 5).count());
        loyaltyDistribution.put("6+ visits", reservationsPerCustomer.values().stream().filter(count -> count > 5).count());
        
        loyaltyDistribution.forEach((category, count) -> {
            ObjectNode loyaltyNode = objectMapper.createObjectNode();
            loyaltyNode.put("category", category);
            loyaltyNode.put("count", count);
            loyaltyData.add(loyaltyNode);
        });
        
        analytics.set("roleDistribution", customerData);
        analytics.set("loyaltyDistribution", loyaltyData);
        analytics.put("totalUsers", users.size());
        analytics.put("customersWithReservations", reservationsPerCustomer.size());
        analytics.put("avgReservationsPerCustomer", 
            reservationsPerCustomer.values().stream().mapToLong(Long::longValue).average().orElse(0.0));
        
        response.getWriter().write(objectMapper.writeValueAsString(analytics));
    }
    
    private void getMenuPerformance(HttpServletRequest request, HttpServletResponse response) 
            throws SQLException, IOException {
        ObjectNode analytics = objectMapper.createObjectNode();
        ArrayNode topItems = objectMapper.createArrayNode();
        ArrayNode categoryPerformance = objectMapper.createArrayNode();
        
        List<Order> orders = orderDAO.getAllOrders();
        List<MenuItem> menuItems = menuItemDAO.getAllMenuItems();
        
        // Get all order items
        Map<String, Double> itemRevenue = new HashMap<>();
        Map<String, Long> itemQuantity = new HashMap<>();
        
        for (Order order : orders) {
            if (order.getOrderItems() != null) {
                for (OrderItem item : order.getOrderItems()) {
                    itemRevenue.merge(item.getItemId(), item.getLineTotal(), Double::sum);
                    itemQuantity.merge(item.getItemId(), (long) item.getQty(), Long::sum);
                }
            }
        }
        
        // Top performing items by revenue
        itemRevenue.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(10)
            .forEach(entry -> {
                ObjectNode itemNode = objectMapper.createObjectNode();
                MenuItem menuItem = menuItems.stream()
                    .filter(m -> m.getItemId().equals(entry.getKey()))
                    .findFirst()
                    .orElse(null);
                
                if (menuItem != null) {
                    itemNode.put("itemId", menuItem.getItemId());
                    itemNode.put("name", menuItem.getName());
                    itemNode.put("revenue", entry.getValue());
                    itemNode.put("quantity", itemQuantity.getOrDefault(entry.getKey(), 0L));
                    itemNode.put("price", menuItem.getPrice());
                    topItems.add(itemNode);
                }
            });
        
        // Category performance
        Map<String, Double> categoryRevenue = new HashMap<>();
        for (Order order : orders) {
            if (order.getOrderItems() != null) {
                for (OrderItem item : order.getOrderItems()) {
                    MenuItem menuItem = menuItems.stream()
                        .filter(m -> m.getItemId().equals(item.getItemId()))
                        .findFirst()
                        .orElse(null);
                    
                    if (menuItem != null) {
                        // Simple category detection based on name (in real app, menu items should have categories)
                        String category = determineCategory(menuItem.getName());
                        categoryRevenue.merge(category, item.getLineTotal(), Double::sum);
                    }
                }
            }
        }
        
        categoryRevenue.forEach((category, revenue) -> {
            ObjectNode categoryNode = objectMapper.createObjectNode();
            categoryNode.put("category", category);
            categoryNode.put("revenue", revenue);
            categoryPerformance.add(categoryNode);
        });
        
        analytics.set("topItems", topItems);
        analytics.set("categoryPerformance", categoryPerformance);
        analytics.put("totalMenuItems", menuItems.size());
        analytics.put("activeMenuItems", menuItems.stream().filter(MenuItem::getActive).count());
        
        response.getWriter().write(objectMapper.writeValueAsString(analytics));
    }
    
    private String determineCategory(String itemName) {
        itemName = itemName.toLowerCase();
        if (itemName.contains("pizza") || itemName.contains("pasta") || itemName.contains("burger")) {
            return "Mains";
        } else if (itemName.contains("salad") || itemName.contains("soup")) {
            return "Starters";
        } else if (itemName.contains("cake") || itemName.contains("dessert") || itemName.contains("ice cream")) {
            return "Desserts";
        } else if (itemName.contains("coffee") || itemName.contains("tea") || itemName.contains("juice")) {
            return "Drinks";
        } else {
            return "Other";
        }
    }
}