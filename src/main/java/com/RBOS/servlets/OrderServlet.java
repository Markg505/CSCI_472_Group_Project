package com.RBOS.servlets;

import com.RBOS.dao.OrderDAO;
import com.RBOS.dao.OrderItemDAO;
import com.RBOS.dao.MenuItemDAO;
import com.RBOS.dao.InventoryDAO;
import com.RBOS.dao.AuditLogDAO;
import com.RBOS.models.Inventory;
import com.RBOS.models.Order;
import com.RBOS.models.OrderItem;
import com.RBOS.services.CartMergeService;
import com.RBOS.services.EmailService;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.utils.DatabaseConnection;
import com.RBOS.models.HistoryResponse;
import com.RBOS.models.PagedResult;
import com.RBOS.utils.HistoryValidation;
import com.RBOS.websocket.WebSocketConfig;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@WebServlet("/api/orders/*")
public class OrderServlet extends HttpServlet {
    private static final int RETENTION_MONTHS = 13;
    private OrderDAO orderDAO;
    private OrderItemDAO orderItemDAO;
    private AuditLogDAO auditDAO;
    private UserDAO userDAO;
    private ObjectMapper objectMapper;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        orderDAO = new OrderDAO(getServletContext());
        orderItemDAO = new OrderItemDAO(getServletContext());
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
            String sessionUserId = getSessionUserId(request);
            String sessionRole = getSessionRole(request);

            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all orders or filter by status
                String status = request.getParameter("status");
                String requestedUserId = request.getParameter("userId");
                String scopedUserId;
                try {
                    scopedUserId = HistoryValidation.resolveScopedUserId(sessionRole, sessionUserId, requestedUserId);
                } catch (SecurityException ex) {
                    if (sessionUserId == null) {
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
                    } else {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, ex.getMessage());
                    }
                    return;
                }

                List<Order> orders;

                if (scopedUserId != null) {
                    orders = orderDAO.getOrdersByUser(scopedUserId);
                    if (status != null && !status.isEmpty() && !"all".equalsIgnoreCase(status)) {
                        orders = orders.stream()
                                .filter(o -> status.equals(o.getStatus()))
                                .toList();
                    }
                } else {
                    if (status != null && !status.isEmpty()) {
                        orders = orderDAO.getOrdersByStatus(status);
                    } else {
                        orders = orderDAO.getAllOrders();
                    }
                }

                response.getWriter().write(objectMapper.writeValueAsString(orders));
            } else if ("/history".equals(pathInfo)) {
                handleHistory(request, response);
            } else if (pathInfo.startsWith("/user/")) {
                // Get orders by user ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 3) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String userId = splits[2];
                try {
                    HistoryValidation.resolveScopedUserId(sessionRole, sessionUserId, userId);
                } catch (SecurityException ex) {
                    if (sessionUserId == null) {
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
                    } else {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, ex.getMessage());
                    }
                    return;
                }
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
                String requestedUserId = request.getParameter("userId");
                String scopedUserId;
                try {
                    scopedUserId = HistoryValidation.resolveScopedUserId(sessionRole, sessionUserId, requestedUserId);
                } catch (SecurityException ex) {
                    if (sessionUserId == null) {
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
                    } else {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, ex.getMessage());
                    }
                    return;
                }

                List<Order> statusOrders;
                if (scopedUserId != null) {
                    statusOrders = orderDAO.getOrdersByUser(scopedUserId).stream()
                            .filter(o -> status.equalsIgnoreCase("all") || status.equals(o.getStatus()))
                            .toList();
                } else {
                    statusOrders = orderDAO.getOrdersByStatus(status);
                }
                response.getWriter().write(objectMapper.writeValueAsString(statusOrders));

            } else if ("/cart".equals(pathInfo)) {
                handleGetCart(request, response);
            } else {
                // Get order by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String orderId = splits[1];
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

        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection(getServletContext());
            conn.setAutoCommit(false);

            String pathInfo = request.getPathInfo();
            if ("/cart".equals(pathInfo)) {
                handleMergeCart(request, response, conn);
                return;
            }

            Order order = objectMapper.readValue(request.getReader(), Order.class);
            InventoryDAO inventoryDAO = new InventoryDAO(getServletContext());
            MenuItemDAO menuItemDAO = new MenuItemDAO(getServletContext());

            // drop unknown users to avoid FK failures
            order.setUserId(resolveExistingUserId(order.getUserId()));

            // ensure menu items exist to satisfy FK constraints
            if (order.getOrderItems() != null) {
                order.getOrderItems().removeIf(i -> i == null || i.getItemId() == null || i.getItemId().isBlank() || i.getQty() == null || i.getQty() <= 0);
                for (OrderItem item : order.getOrderItems()) {
                    ensureMenuItemPresent(menuItemDAO, item.getItemId(), item.getMenuItem() != null ? item.getMenuItem().getName() : null,
                            item.getUnitPrice() != null ? item.getUnitPrice() : 0.0);
                }
                if (order.getOrderItems().isEmpty()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "No order items provided");
                    return;
                }
            }

            // Validate delivery address for delivery orders
            if ("delivery".equals(order.getFulfillmentType())) {
                if (order.getDeliveryAddress() == null || order.getDeliveryAddress().isBlank()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Delivery address is required for delivery orders");
                    return;
                }
                if (order.getDeliveryCity() == null || order.getDeliveryCity().isBlank()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Delivery city is required for delivery orders");
                    return;
                }
                if (order.getDeliveryState() == null || order.getDeliveryState().isBlank()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Delivery state is required for delivery orders");
                    return;
                }
                if (order.getDeliveryPostalCode() == null || order.getDeliveryPostalCode().isBlank()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                        "Delivery postal code is required for delivery orders");
                    return;
                }
            }

            // recalc totals from surviving items
            double orderSubtotal = 0.0;
            for (OrderItem item : order.getOrderItems()) {
                double price = item.getUnitPrice() != null ? item.getUnitPrice() : 0.0;
                item.setLineTotal(price * item.getQty());
                orderSubtotal += item.getLineTotal();
            }
            double orderTax = orderSubtotal * 0.08;
            double orderTotal = orderSubtotal + orderTax;
            order.setSubtotal(orderSubtotal);
            order.setTax(orderTax);
            order.setTotal(orderTotal);

            // Validate inventory
            List<String> outOfStockItems = new ArrayList<>();

            for (OrderItem item : order.getOrderItems()) {
                Inventory inventory = inventoryDAO.getInventoryByItemId(item.getItemId());
                
                if (inventory == null || !inventory.getActive()) {
                    outOfStockItems.add("Item not available: " + item.getItemId());
                    continue;
                }

                if (inventory.getQtyOnHand() < item.getQty()) {
                    outOfStockItems.add("Insufficient stock for: " + inventory.getName() + 
                        " (Available: " + inventory.getQtyOnHand() + ", Requested: " + item.getQty() + ")");
                    continue;
                }
            }

            if (!outOfStockItems.isEmpty()) {
                conn.rollback();
                response.setStatus(HttpServletResponse.SC_CONFLICT);

                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Inventory issues");
                errorResponse.put("details", outOfStockItems);

                response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
                return;
            }

            // Create order
            String orderId = orderDAO.createOrder(order, conn);
            
            if (orderId != null) {
                order.setOrderId(orderId);
                
                // Update inventory
                for (OrderItem item : order.getOrderItems()) {
                    boolean success = inventoryDAO.decrementInventory(item.getItemId(), item.getQty(), conn);
                    if (!success) {
                        conn.rollback();
                        response.sendError(HttpServletResponse.SC_CONFLICT,
                                "Failed to update inventory for item: " + item.getItemId());
                        return;
                    }
                }
                
                conn.commit();

                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("order", orderId, "create", actorId, getSessionUserName(request),
                                null, "Order created: $" + order.getTotal());
                } catch (Exception e) {
                    e.printStackTrace();
                }

                // Send notifications
                sendOrderNotifications(order);

                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(order));
            } else {
                conn.rollback();
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }

        } catch (Exception e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ex) {}
            }
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e.getMessage());
            e.printStackTrace();
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException e) {}
            }
        }
    }

    private void handleHistory(HttpServletRequest request, HttpServletResponse response) throws IOException, SQLException {
        String rawStatus = request.getParameter("status");
        String rawStart = request.getParameter("start_utc");
        String rawEnd = request.getParameter("end_utc");

        int page = HistoryValidation.normalizePage(parseInteger(request.getParameter("page")));
        int pageSize = HistoryValidation.clampPageSize(parseInteger(request.getParameter("pageSize")));

        String status;
        Instant startInstant;
        Instant endInstant;
        try {
            status = HistoryValidation.normalizeStatus(rawStatus, HistoryValidation.ALLOWED_ORDER_STATUSES);
            startInstant = HistoryValidation.parseIsoInstant(rawStart, "start_utc");
            endInstant = HistoryValidation.parseIsoInstant(rawEnd, "end_utc");
        } catch (IllegalArgumentException ex) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, ex.getMessage());
            return;
        }

        if (startInstant != null && endInstant != null && startInstant.isAfter(endInstant)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "start_utc must be before or equal to end_utc");
            return;
        }

        Instant now = Instant.now();
        Instant retentionHorizon = HistoryValidation.retentionHorizon(now, RETENTION_MONTHS);
        Instant clampedStart = startInstant != null ? HistoryValidation.clampStart(startInstant, retentionHorizon, now) : null;
        Instant clampedEnd = endInstant != null ? HistoryValidation.clampEnd(endInstant, retentionHorizon, now) : null;

        if (clampedStart != null && clampedEnd != null && clampedStart.isAfter(clampedEnd)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Requested range is outside the retention window");
            return;
        }

        String startUtc = clampedStart != null ? HistoryValidation.formatInstant(clampedStart) : null;
        String endUtc = clampedEnd != null ? HistoryValidation.formatInstant(clampedEnd) : null;

        String sessionUserId = getSessionUserId(request);
        String sessionRole = getSessionRole(request);
        String requestedUserId = request.getParameter("userId");

        String scopedUserId;
        try {
            scopedUserId = HistoryValidation.resolveScopedUserId(sessionRole, sessionUserId, requestedUserId);
        } catch (SecurityException ex) {
            if (sessionUserId == null) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, ex.getMessage());
            } else {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, ex.getMessage());
            }
            return;
        }

        PagedResult<Order> paged = orderDAO.getOrdersWithFilters(status, startUtc, endUtc, scopedUserId, page, pageSize);
        HistoryResponse<Order> history = new HistoryResponse<>(
                paged.getItems(),
                page,
                pageSize,
                paged.getTotal(),
                RETENTION_MONTHS,
                LocalDate.now().minusMonths(RETENTION_MONTHS).toString()
        );
        response.getWriter().write(objectMapper.writeValueAsString(history));
    }

    private String getSessionUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Object attr = session.getAttribute("userId");
        return attr != null ? attr.toString() : null;
    }

    private String getSessionRole(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Object attr = session.getAttribute("role");
        return attr != null ? attr.toString() : null;
    }

    private Integer parseInteger(String value) {
        try {
            return value != null ? Integer.parseInt(value) : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String resolveCartToken(HttpServletRequest request) {
        String header = request.getHeader("X-Cart-Token");
        if (header != null && !header.isBlank()) {
            return header.trim();
        }

        String queryToken = request.getParameter("cartToken");
        if (queryToken != null && !queryToken.isBlank()) {
            return queryToken.trim();
        }

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("cart_token".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }

    private String issueCartToken() {
        return UUID.randomUUID().toString();
    }

    private String ensureCartTokenUnique(String orderId, String desiredToken, Connection conn) throws SQLException {
        String candidate = desiredToken;
        int attempts = 0;
        while (attempts < 5) {
            if (candidate == null || candidate.isBlank()) {
                candidate = issueCartToken();
            }
            Order existing = orderDAO.getCartByToken(candidate, conn);
            if (existing == null || existing.getOrderId().equals(orderId)) {
                return candidate;
            }
            candidate = null;
            attempts++;
        }
        // last resort
        return UUID.randomUUID().toString();
    }

    private boolean ensureMenuItemPresent(MenuItemDAO menuItemDAO, String itemId, String name, double price) {
        if (itemId == null || itemId.isBlank())
            return false;
        try {
            if (menuItemDAO.getMenuItemById(itemId) != null)
                return true;
            com.RBOS.models.MenuItem menu = new com.RBOS.models.MenuItem();
            menu.setItemId(itemId);
            menu.setName(name != null && !name.isBlank() ? name : "Item " + itemId);
            menu.setPrice(price);
            menu.setActive(true);
            menu.setCategory("Misc");
            menu.setDescription("");
            menu.setImageUrl(null);
            menu.setDietaryTags("[]");
            String createdId = menuItemDAO.createMenuItem(menu);
            return createdId != null || menuItemDAO.getMenuItemById(itemId) != null;
        } catch (Exception e) {
            System.err.println("Failed to ensure menu item exists for " + itemId + ": " + e.getMessage());
            return false;
        }
    }

    private String resolveExistingUserId(String userId) {
        if (userId == null || userId.isBlank())
            return null;
        try {
            UserDAO userDAO = new UserDAO(getServletContext());
            return userDAO.getUserById(userId) != null ? userId : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Inventory fallbackInventory(String itemId, String name) {
        Inventory inv = new Inventory();
        inv.setInventoryId(UUID.randomUUID().toString());
        inv.setItemId(itemId);
        inv.setName(name != null ? name : itemId);
        inv.setActive(true);
        inv.setQtyOnHand(1_000_000); // effectively unlimited
        inv.setParLevel(0);
        inv.setReorderPoint(0);
        inv.setSku("generated-" + itemId);
        return inv;
    }

    private void stampCartToken(HttpServletResponse response, HttpServletRequest request, String cartToken) {
        if (cartToken == null || cartToken.isBlank()) {
            return;
        }

        response.setHeader("X-Cart-Token", cartToken);

        Cookie cookie = new Cookie("cart_token", cartToken);
        String path = request.getContextPath();
        cookie.setPath(path == null || path.isBlank() ? "/" : path);
        cookie.setHttpOnly(false);
        cookie.setSecure(request.isSecure());
        cookie.setMaxAge(60 * 60 * 24 * 30); // 30 days
        response.addCookie(cookie);
    }

    private void sendOrderNotifications(Order order) {
        // NOTE: Customer email notifications are now sent directly in OrderDAO.createOrder()
        // with appropriate templates for delivery vs carryout orders
        try {
            // Send admin notification
            EmailService emailService = new EmailService();
            emailService.sendAdminNotification(
                    "New Order Received",
                    String.format("Order #%s - Total: $%.2f", order.getOrderId(), order.getTotal())
            );

            // Send WebSocket notification for real-time updates
            String orderJson = objectMapper.writeValueAsString(order);
            WebSocketConfig.notifyNewOrder(orderJson);

        } catch (Exception e) {
            System.err.println("Failed to send order notifications: " + e.getMessage());
        }
    }

    private void handleGetCart(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String sessionUserId = getSessionUserId(request);
        String requestedToken = resolveCartToken(request);

        try (Connection conn = DatabaseConnection.getConnection(getServletContext())) {
            Order cart = null;
            if (sessionUserId != null) {
                cart = orderDAO.getCartByUserId(sessionUserId, conn);
            }

            if (cart == null && requestedToken != null) {
                cart = orderDAO.getCartByToken(requestedToken, conn);
                if (cart != null && cart.getUserId() != null && !cart.getUserId().equals(sessionUserId)) {
                    response.sendError(sessionUserId == null ? HttpServletResponse.SC_UNAUTHORIZED : HttpServletResponse.SC_FORBIDDEN,
                            "Cart is bound to another user");
                    return;
                }
            }

            if (cart == null) {
                cart = new Order();
                String newOrderId = UUID.randomUUID().toString();
                cart.setOrderId(newOrderId);
                cart.setUserId(resolveExistingUserId(sessionUserId));
                cart.setStatus("cart");
                cart.setSource("web");
                cart.setSubtotal(0.0);
                cart.setTax(0.0);
                cart.setTotal(0.0);
                cart.setCartToken(requestedToken != null ? requestedToken : issueCartToken());
                String createdOrderId = orderDAO.createOrder(cart, conn);
                cart.setOrderId(createdOrderId != null ? createdOrderId : newOrderId);
            } else if (cart.getCartToken() == null) {
                String refreshed = requestedToken != null ? requestedToken : issueCartToken();
                orderDAO.updateCartToken(cart.getOrderId(), refreshed, conn);
                cart.setCartToken(refreshed);
            }

            List<OrderItem> items = new ArrayList<>();
            if (cart.getOrderId() != null) {
                items = orderItemDAO.getOrderItemsByOrderId(cart.getOrderId());
                cart.setOrderItems(items);
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("orderId", cart.getOrderId());
            payload.put("items", items);
            payload.put("subtotal", cart.getSubtotal() != null ? cart.getSubtotal() : 0.0);
            payload.put("tax", cart.getTax() != null ? cart.getTax() : 0.0);
            payload.put("total", cart.getTotal() != null ? cart.getTotal() : 0.0);
            payload.put("cartToken", cart.getCartToken());
            payload.put("conflicts", Map.of(
                    "dropped", new ArrayList<>(),
                    "clamped", new ArrayList<>(),
                    "merged", new ArrayList<>()
            ));

            stampCartToken(response, request, cart.getCartToken());
            response.getWriter().write(objectMapper.writeValueAsString(payload));
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    private void handleMergeCart(HttpServletRequest request, HttpServletResponse response, Connection conn) throws IOException {
        String sessionUserId = getSessionUserId(request);
        String requestedToken = resolveCartToken(request);

        try {
            CartMergePayload payload = objectMapper.readValue(request.getReader(), CartMergePayload.class);
            List<CartMergeService.MergeItem> incoming = payload != null && payload.items != null ? payload.items : new ArrayList<>();
            incoming.removeIf(i -> i == null || i.itemId == null || i.itemId.isBlank());
            if (payload != null && payload.cartToken != null && (requestedToken == null || requestedToken.isBlank())) {
                requestedToken = payload.cartToken;
            }

            Order cart = null;
            if (sessionUserId != null) {
                cart = orderDAO.getCartByUserId(sessionUserId, conn);
            }
            if (cart == null && requestedToken != null) {
                cart = orderDAO.getCartByToken(requestedToken, conn);
            }

            if (cart != null && cart.getUserId() != null && !cart.getUserId().equals(sessionUserId)) {
                response.sendError(sessionUserId == null ? HttpServletResponse.SC_UNAUTHORIZED : HttpServletResponse.SC_FORBIDDEN,
                        "Cart is bound to another user");
                return;
            }

            if (cart == null) {
                cart = new Order();
                String newOrderId = UUID.randomUUID().toString();
                cart.setOrderId(newOrderId);
                cart.setUserId(sessionUserId);
                cart.setStatus("cart");
                cart.setSource("web");
                cart.setSubtotal(0.0);
                cart.setTax(0.0);
                cart.setTotal(0.0);
                String initialToken = requestedToken != null ? requestedToken : issueCartToken();
                cart.setCartToken(initialToken);
                String createdOrderId = orderDAO.createOrder(cart, conn);
                cart.setOrderId(createdOrderId != null ? createdOrderId : newOrderId);
            }

            String resolvedUser = resolveExistingUserId(sessionUserId);
            if (resolvedUser != null && cart.getUserId() == null) {
                cart.setUserId(resolvedUser);
                // rotate token when binding to a user to avoid collisions
                String uniqueToken = ensureCartTokenUnique(cart.getOrderId(), null, conn);
                orderDAO.updateCartOwnership(cart.getOrderId(), resolvedUser, uniqueToken, conn);
                cart.setCartToken(uniqueToken);
            } else if (cart.getCartToken() == null || cart.getCartToken().isBlank()) {
                String newToken = ensureCartTokenUnique(cart.getOrderId(), requestedToken, conn);
                orderDAO.updateCartToken(cart.getOrderId(), newToken, conn);
                cart.setCartToken(newToken);
            } else {
                // ensure existing token is not colliding with another cart
                String newToken = ensureCartTokenUnique(cart.getOrderId(), cart.getCartToken(), conn);
                if (!newToken.equals(cart.getCartToken())) {
                    orderDAO.updateCartToken(cart.getOrderId(), newToken, conn);
                    cart.setCartToken(newToken);
                }
            }
            stampCartToken(response, request, cart.getCartToken());

            // Drop existing items from merge math to avoid doubling quantities on refresh;
            // we will replace server cart with the incoming payload.
            List<OrderItem> existingItems = new ArrayList<>();

            Map<String, Inventory> inventoryByItem = new HashMap<>();
            InventoryDAO inventoryDAO = new InventoryDAO(getServletContext());

            for (CartMergeService.MergeItem item : incoming) {
                if (item.itemId == null) {
                    continue;
                }
                if (!inventoryByItem.containsKey(item.itemId)) {
                    ensureMenuItemPresent(new MenuItemDAO(getServletContext()), item.itemId, item.name, item.unitPrice != null ? item.unitPrice : 0.0);
                    Inventory inv = inventoryDAO.getInventoryByItemId(item.itemId);
                    if (inv == null) {
                        inv = fallbackInventory(item.itemId, item.name);
                    }
                    inventoryByItem.put(item.itemId, inv);
                }
            }
            for (OrderItem item : existingItems) {
                if (!inventoryByItem.containsKey(item.getItemId())) {
                    Inventory inv = inventoryDAO.getInventoryByItemId(item.getItemId());
                    if (inv == null) {
                        inv = fallbackInventory(item.getItemId(), item.getMenuItem() != null ? item.getMenuItem().getName() : null);
                    }
                    inventoryByItem.put(item.getItemId(), inv);
                }
            }

            CartMergeService.MergeResult result = new CartMergeService().merge(incoming, existingItems, inventoryByItem);

            // Filter out menu items that no longer exist to avoid FK failures, and create missing menu rows
            MenuItemDAO menuItemDAO = new MenuItemDAO(getServletContext());
            List<OrderItem> persistedItems = new ArrayList<>();
            List<CartMergeService.Conflict> droppedConflicts = new ArrayList<>(result.getDropped());
            for (OrderItem item : result.getMergedItems()) {
                if (item.getItemId() == null || item.getItemId().isBlank()) {
                    droppedConflicts.add(new CartMergeService.Conflict(
                            item.getItemId(),
                            item.getMenuItem() != null ? item.getMenuItem().getName() : "unknown",
                            "missing_item_id",
                            item.getQty(),
                            0));
                    continue;
                }
                if (!ensureMenuItemPresent(menuItemDAO, item.getItemId(),
                        item.getMenuItem() != null ? item.getMenuItem().getName() : null,
                        item.getUnitPrice() != null ? item.getUnitPrice() : 0.0)) {
                    droppedConflicts.add(new CartMergeService.Conflict(
                            item.getItemId(),
                            item.getMenuItem() != null ? item.getMenuItem().getName() : item.getItemId(),
                            "missing_menu_item",
                            item.getQty(),
                            0));
                    continue;
                }
                persistedItems.add(item);
            }

            orderItemDAO.deleteOrderItemsByOrderId(cart.getOrderId(), conn);

            double subtotal = 0.0;
            for (OrderItem item : persistedItems) {
                item.setOrderId(cart.getOrderId());
                subtotal += item.getLineTotal();
                orderItemDAO.createOrderItem(item, conn);
            }
            double tax = subtotal * 0.08;
            double total = subtotal + tax;
            orderDAO.updateOrderTotals(cart.getOrderId(), subtotal, tax, total, conn);
            conn.commit();

            cart.setSubtotal(subtotal);
            cart.setTax(tax);
            cart.setTotal(total);
            cart.setOrderItems(persistedItems);

            Map<String, Object> conflicts = new HashMap<>();
            conflicts.put("dropped", droppedConflicts);
            conflicts.put("clamped", result.getClamped());
            conflicts.put("merged", result.getMergedQuantities());

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("orderId", cart.getOrderId());
            responseBody.put("items", result.getMergedItems());
            responseBody.put("subtotal", subtotal);
            responseBody.put("tax", tax);
            responseBody.put("total", total);
            responseBody.put("cartToken", cart.getCartToken());
            responseBody.put("conflicts", conflicts);

            stampCartToken(response, request, cart.getCartToken());

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write(objectMapper.writeValueAsString(responseBody));

        } catch (SQLException e) {
            try { if (conn != null) conn.rollback(); } catch (SQLException ignored) {}
            if (e.getMessage() != null && e.getMessage().toLowerCase().contains("busy")) {
                response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Database is busy, please retry");
            } else {
                response.sendError(HttpServletResponse.SC_CONFLICT, "Cart update failed: " + e.getMessage());
            }
        }
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length < 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            
            String[] pathParts = pathInfo.split("/");
            String orderId = pathParts[1];
            
            boolean statusPath = pathParts.length >= 3 && "status".equals(pathParts[2]);
            if (statusPath) {
                // Update only order status
                String newStatus = resolveStatus(request, pathParts);
                if (newStatus == null || newStatus.isBlank()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Status parameter required");
                    return;
                }
                
                // Get old order for audit
                Order oldOrder = orderDAO.getOrderById(orderId);
                String oldStatus = oldOrder != null ? oldOrder.getStatus() : null;

                boolean success = orderDAO.updateOrderStatus(orderId, newStatus);
                if (success) {
                    // Log audit
                    try {
                        String actorId = getSessionUserId(request);
                        auditDAO.log("order", orderId, "update_status", actorId, getSessionUserName(request),
                                    "Status: " + oldStatus, "Status: " + newStatus);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }

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

    private String resolveStatus(HttpServletRequest request, String[] pathParts) {
        String status = request.getParameter("status");
        if (status != null && !status.isBlank()) {
            return status;
        }
        // try JSON body
        try {
            Map<?,?> body = objectMapper.readValue(request.getReader(), Map.class);
            Object statusObj = body.get("status");
            if (statusObj != null && !statusObj.toString().isBlank()) {
                return statusObj.toString();
            }
        } catch (Exception ignored) {}
        // try query string manually
        String qs = request.getQueryString();
        if (qs != null) {
            for (String pair : qs.split("&")) {
                String[] kv = pair.split("=");
                if (kv.length == 2 && "status".equalsIgnoreCase(kv[0])) {
                    return java.net.URLDecoder.decode(kv[1], java.nio.charset.StandardCharsets.UTF_8);
                }
            }
        }
        if (pathParts.length >= 4 && pathParts[3] != null && !pathParts[3].isBlank()) {
            return pathParts[3];
        }
        try {
            Map<?, ?> body = objectMapper.readValue(request.getReader(), Map.class);
            Object statusVal = body != null ? body.get("status") : null;
            if (statusVal != null)
                return statusVal.toString();
        } catch (Exception ignored) {
        }
        return null;
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

            String orderId = pathInfo.split("/")[1];
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

    private String getSessionUserName(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "System";
        try {
            String userId = getSessionUserId(request);
            if (userId == null) return "System";
            User user = userDAO.getUserById(userId);
            return user != null ? user.getFullName() : "System";
        } catch (Exception e) {
            return "System";
        }
    }

    private static class CartMergePayload {
        public List<CartMergeService.MergeItem> items;
        public String cartToken;
    }
}

