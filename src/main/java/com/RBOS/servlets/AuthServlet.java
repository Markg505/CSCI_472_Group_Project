package com.RBOS.servlets;

import com.RBOS.services.EmailService;
import com.RBOS.services.EmailTemplates;

import com.RBOS.utils.DatabaseConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.dao.OrderDAO;
import com.RBOS.dao.OrderItemDAO;
import com.RBOS.dao.InventoryDAO;
import com.RBOS.models.Inventory;
import com.RBOS.models.Order;
import com.RBOS.models.OrderItem;
import com.RBOS.services.CartMergeService;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@WebServlet("/api/auth/*")
public class AuthServlet extends HttpServlet {
    private ObjectMapper mapper;
    private ServletContext servletContext;

    private static final boolean BYPASS_AUTH = false; // Set to false for production authentication
    private static final String MOCK_USER_ID = "mock-user-001";
    private static final String MOCK_ROLE = "admin";
    private static final String MOCK_NAME = "Mock User";
    private static final String MOCK_EMAIL = "mock@example.com";

    @Override
    public void init() throws ServletException {
        initialize(getServletConfig());
    }

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        initialize(config);
    }

    private void initialize(ServletConfig config) {
        mapper = new ObjectMapper();
        servletContext = config != null ? config.getServletContext() : null;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/me".equals(path)) {
            resp.setContentType("application/json");

            String uid = requireUser(req, resp);
            if (uid == null)
                return;

            try {
                SafeUser u = loadSafeUser(uid);
                if (u == null) {
                    resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    mapper.writeValue(resp.getWriter(), new Msg("unauthorized"));
                    return;
                }
                mapper.writeValue(resp.getWriter(), u);
            } catch (Exception e) {
                e.printStackTrace();
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                mapper.writeValue(resp.getWriter(), new Msg("error"));
            }
            return;
        }
        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/me".equals(path)) {
            resp.setContentType("application/json");
            String uid = requireUser(req, resp);
            if (uid == null)
                return;

            ProfileUpdateBody body;
            try {
                body = mapper.readValue(req.getReader(), ProfileUpdateBody.class);
            } catch (Exception e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid_profile"));
                return;
            }

            String fullName = safeTrim(body != null ? body.fullName : null);
            String email = safeTrim(body != null ? body.email : null);
            String phone = safeTrim(body != null ? body.phone : null);

            if (isBlank(fullName) || isBlank(email) || !isValidEmail(email)) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("Full name and a valid email are required."));
                return;
            }

            try {
                body.fullName = fullName;
                body.email = email;
                body.phone = phone;
                SafeUser updated = updateProfile(uid, body);
                if (updated == null) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    mapper.writeValue(resp.getWriter(), new Msg("update_failed"));
                    return;
                }
                mapper.writeValue(resp.getWriter(), updated);
            } catch (SQLException e) {
                if (e.getErrorCode() == 19) {
                    resp.setStatus(HttpServletResponse.SC_CONFLICT);
                    mapper.writeValue(resp.getWriter(), new Msg("Email already exists."));
                } else {
                    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    mapper.writeValue(resp.getWriter(), new Msg("error"));
                }
            }
            return;
        }

        if ("/me/password".equals(path)) {
            resp.setContentType("application/json");
            String uid = requireUser(req, resp);
            if (uid == null)
                return;

            PasswordChangeBody body;
            try {
                body = mapper.readValue(req.getReader(), PasswordChangeBody.class);
            } catch (Exception e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid_password"));
                return;
            }

            String current = safeTrim(body != null ? body.currentPassword : null);
            String next = safeTrim(body != null ? body.newPassword : null);

            if (isBlank(current)) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("Current password is required."));
                return;
            }
            if (isBlank(next) || next.length() < 8 || !hasLetterAndNumber(next)) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(),
                        new Msg("New password must be at least 8 characters and include a letter and a number."));
                return;
            }
            if (next.equals(current)) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(),
                        new Msg("New password must be different from the current password."));
                return;
            }

            try {
                body.currentPassword = current;
                body.newPassword = next;
                boolean ok = updatePassword(uid, body);
                if (!ok) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    mapper.writeValue(resp.getWriter(), new Msg("Current password is incorrect."));
                    return;
                }
                mapper.writeValue(resp.getWriter(), new Msg("password_updated"));
            } catch (SQLException e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                mapper.writeValue(resp.getWriter(), new Msg("error"));
            }
            return;
        }

        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = path(req);
        if ("/login".equals(path)) {
            resp.setContentType("application/json");

            // Normal login
            LoginBody body;
            try {
                body = mapper.readValue(req.getReader(), LoginBody.class);
            } catch (Exception e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                return;
            }
            if (body == null || body.email == null || body.password == null) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                return;
            }

            try (Connection conn = DatabaseConnection.getConnection(getServletContext());
                    PreparedStatement ps = conn.prepareStatement(
                            "SELECT user_id, role, full_name, email, phone, password_hash FROM users WHERE email = ?")) {
                ps.setString(1, body.email.trim());
                String origin = req.getRemoteAddr();
                System.out.println("Login attempt from " + origin + " for email: " + body.email);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        System.out.println(
                                "Login failed from " + origin + " for email: " + body.email + " (user not found)");
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        mapper.writeValue(resp.getWriter(), new Msg("invalid_credentials"));
                        return;
                    }
                    String userId = rs.getString("user_id");
                    String role = rs.getString("role");
                    String fullName = rs.getString("full_name");
                    String email = rs.getString("email");
                    String phone = rs.getString("phone");
                    String hash = rs.getString("password_hash");

                    if (!UserDAO.passwordMatches(body.password, hash)) {
                        System.out.println(
                                "Login failed from " + origin + " for userId: " + userId + " (invalid credentials)");
                        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        mapper.writeValue(resp.getWriter(), new Msg("invalid_credentials"));
                        return;
                    }
                    System.out.println("Login success for userId: " + userId + " from " + origin);
                    HttpSession s = req.getSession(true);
                    s.setAttribute("userId", userId);
                    s.setAttribute("role", role);
                    s.setAttribute("userName", fullName);
                    SafeUser u = new SafeUser(
                            userId,
                            role,
                            fullName,
                            email,
                            phone);
                    CartAttachResult cartResult = attachAnonymousCartToUser(resolveCartToken(req), u.userId);

                    Map<String, Object> responseBody = new HashMap<>();
                    responseBody.put("user", u);
                    if (cartResult != null) {
                        responseBody.put("cartToken", cartResult.cartToken);
                        responseBody.put("cart", cartResult.toResponse());
                        stampCartToken(resp, req, cartResult.cartToken);
                    }

                    mapper.writeValue(resp.getWriter(), responseBody);
                }
            } catch (SQLException e) {
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                mapper.writeValue(resp.getWriter(), new Msg("error"));
            }
            return;
        }
        if ("/register".equals(path)) {
            resp.setContentType("application/json");

            // Normal registration
            try {
                JsonNode root = mapper.readTree(req.getReader());

                String fullName = null;
                if (root.hasNonNull("full_name"))
                    fullName = root.get("full_name").asText();
                else if (root.hasNonNull("fullName"))
                    fullName = root.get("fullName").asText();

                // required fields
                String email = root.hasNonNull("email") ? root.get("email").asText() : null;
                String password = root.hasNonNull("password") ? root.get("password").asText() : null;

                String phone = null;
                if (root.has("phone")) {
                    String p = root.get("phone").asText("");
                    phone = p.trim().isEmpty() ? null : p.trim();
                }

                String role = null;
                if (root.hasNonNull("role"))
                    role = root.get("role").asText();

                // Basic validation
                if (fullName == null || fullName.isBlank()
                        || email == null || email.isBlank()
                        || password == null || password.isBlank()) {
                    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    mapper.writeValue(resp.getWriter(), new Msg("invalid"));
                    return;
                }

                // Build User object manually
                User user = new User();
                user.setFullName(fullName);
                user.setEmail(email.trim());
                user.setPassword(password);
                user.setPhone(phone);
                if (role != null && !role.isBlank())
                    user.setRole(role);

                UserDAO dao = new UserDAO(getServletContext());
                String userId = dao.createUser(user);

                if (userId != null) {
                    user.setUserId(userId);
                    // create session and mark user as logged in
                    HttpSession s = req.getSession(true);
                    s.setAttribute("userId", userId);

                    // NEW: send welcome email asynchronously
                    try {
                        EmailService emailService = new EmailService();
                        String emailBody = EmailTemplates.getWelcomeTemplate(user.getFullName());
                        emailService.sendEmailAsync(
                                user.getEmail(),
                                "Welcome to RBOS - Account Created",
                                emailBody);
                    } catch (Exception e) {
                        System.err.println("Failed to send welcome email: " + e.getMessage());
                        // Don't fail registration if email fails
                    }

                    // Build the SafeUser to return
                    SafeUser su = new SafeUser(
                            userId,
                            user.getRole() != null ? user.getRole() : "customer",
                            user.getFullName(),
                            user.getEmail(),
                            user.getPhone() // may be null
                    );

                    resp.setStatus(HttpServletResponse.SC_CREATED);
                    mapper.writeValue(resp.getWriter(), su);
                } else {
                    resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to create user");
                }
            } catch (SQLException e) {
                // SQLite constraint
                if (e.getErrorCode() == 19) {
                    resp.sendError(HttpServletResponse.SC_CONFLICT, "Email already exists");
                } else {
                    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    mapper.writeValue(resp.getWriter(), new Msg("error"));
                }
            } catch (Exception e) {
                e.printStackTrace();
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                String msg = e.getMessage() != null ? e.getMessage() : "invalid";
                mapper.writeValue(resp.getWriter(), new Msg(msg));
            }
            return;
        }

        if ("/logout".equals(path)) {
            resp.setContentType("application/json");
            HttpSession s = req.getSession(false);
            if (s != null)
                s.invalidate();
            mapper.writeValue(resp.getWriter(), new Msg("ok"));
            return;
        }

        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
    }

    private CartAttachResult attachAnonymousCartToUser(String cartToken, String userId) {
        if (cartToken == null || cartToken.isBlank() || userId == null) {
            return null;
        }

        OrderDAO orderDAO = new OrderDAO(getServletContext());
        OrderItemDAO orderItemDAO = new OrderItemDAO(getServletContext());
        InventoryDAO inventoryDAO = new InventoryDAO(getServletContext());

        Connection conn = null;
        try {
            conn = DatabaseConnection.getConnection(getServletContext());
            conn.setAutoCommit(false);

            Order anonymousCart = orderDAO.getCartByToken(cartToken, conn);
            if (anonymousCart == null) {
                conn.commit();
                return null;
            }
            if (anonymousCart.getUserId() != null && !anonymousCart.getUserId().equals(userId)) {
                conn.commit();
                return null;
            }

            Order userCart = orderDAO.getCartByUserId(userId, conn);

            List<OrderItem> incomingAnonItems = anonymousCart.getOrderId() != null
                    ? orderItemDAO.getOrderItemsByOrderId(anonymousCart.getOrderId())
                    : new ArrayList<>();
            List<OrderItem> existingItems = userCart != null
                    ? orderItemDAO.getOrderItemsByOrderId(userCart.getOrderId())
                    : new ArrayList<>();

            Map<String, Inventory> inventoryByItem = buildInventoryMap(incomingAnonItems, existingItems, inventoryDAO);
            CartMergeService.MergeResult result = new CartMergeService().merge(toMergeItems(incomingAnonItems),
                    existingItems, inventoryByItem);

            Order destination = userCart != null ? userCart : anonymousCart;

            orderItemDAO.deleteOrderItemsByOrderId(destination.getOrderId(), conn);

            double subtotal = 0.0;
            for (OrderItem item : result.getMergedItems()) {
                item.setOrderId(destination.getOrderId());
                subtotal += item.getLineTotal();
                orderItemDAO.createOrderItem(item, conn);
            }
            double tax = subtotal * 0.08;
            double total = subtotal + tax;
            orderDAO.updateOrderTotals(destination.getOrderId(), subtotal, tax, total, conn);

            String newToken = issueCartToken();
            if (destination == userCart) {
                orderDAO.updateCartToken(destination.getOrderId(), newToken, conn);
                if (anonymousCart != null && !anonymousCart.getOrderId().equals(destination.getOrderId())) {
                    orderDAO.deleteOrder(anonymousCart.getOrderId(), conn);
                }
            } else {
                orderDAO.updateCartOwnership(destination.getOrderId(), userId, newToken, conn);
            }

            destination.setCartToken(newToken);
            destination.setUserId(userId);
            destination.setSubtotal(subtotal);
            destination.setTax(tax);
            destination.setTotal(total);
            destination.setOrderItems(result.getMergedItems());

            conn.commit();

            CartAttachResult attachment = new CartAttachResult();
            attachment.cartToken = newToken;
            attachment.orderId = destination.getOrderId();
            attachment.items = result.getMergedItems();
            attachment.subtotal = subtotal;
            attachment.tax = tax;
            attachment.total = total;
            attachment.conflicts = Map.of(
                    "dropped", result.getDropped(),
                    "clamped", result.getClamped(),
                    "merged", result.getMergedQuantities());
            return attachment;
        } catch (SQLException e) {
            if (conn != null) {
                try {
                    conn.rollback();
                } catch (SQLException ignored) {
                }
            }
            return null;
        } finally {
            if (conn != null) {
                try {
                    conn.setAutoCommit(true);
                    conn.close();
                } catch (SQLException ignored) {
                }
            }
        }
    }

    private Map<String, Inventory> buildInventoryMap(List<OrderItem> incomingAnonItems, List<OrderItem> existingItems,
            InventoryDAO inventoryDAO) throws SQLException {
        Map<String, Inventory> inventoryByItem = new HashMap<>();

        for (OrderItem item : incomingAnonItems) {
            if (item.getItemId() == null)
                continue;
            if (!inventoryByItem.containsKey(item.getItemId())) {
                inventoryByItem.put(item.getItemId(), inventoryDAO.getInventoryByItemId(item.getItemId()));
            }
        }

        for (OrderItem item : existingItems) {
            if (item.getItemId() == null)
                continue;
            if (!inventoryByItem.containsKey(item.getItemId())) {
                inventoryByItem.put(item.getItemId(), inventoryDAO.getInventoryByItemId(item.getItemId()));
            }
        }

        return inventoryByItem;
    }

    private List<CartMergeService.MergeItem> toMergeItems(List<OrderItem> items) {
        List<CartMergeService.MergeItem> incoming = new ArrayList<>();
        for (OrderItem item : items) {
            CartMergeService.MergeItem mergeItem = new CartMergeService.MergeItem();
            mergeItem.itemId = item.getItemId();
            mergeItem.qty = item.getQty();
            mergeItem.unitPrice = item.getUnitPrice();
            if (item.getMenuItem() != null) {
                mergeItem.name = item.getMenuItem().getName();
            }
            incoming.add(mergeItem);
        }
        return incoming;
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
                if ("cart_token".equals(cookie.getName()) && cookie.getValue() != null
                        && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private String issueCartToken() {
        return UUID.randomUUID().toString();
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
        cookie.setMaxAge(60 * 60 * 24 * 30);
        response.addCookie(cookie);
    }

    private String path(HttpServletRequest req) {
        String p = req.getPathInfo();
        return (p == null || p.isEmpty()) ? "/" : p;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isValidEmail(String email) {
        return email != null && email.contains("@") && email.indexOf('@') > 0
                && email.indexOf('@') < email.length() - 1;
    }

    private boolean hasLetterAndNumber(String value) {
        boolean hasLetter = false;
        boolean hasNumber = false;
        if (value == null)
            return false;
        for (char c : value.toCharArray()) {
            if (Character.isLetter(c))
                hasLetter = true;
            if (Character.isDigit(c))
                hasNumber = true;
            if (hasLetter && hasNumber)
                return true;
        }
        return false;
    }

    public static class LoginBody {
        public String email;
        public String password;
    }

    public static class ProfileUpdateBody {
        public String fullName;
        public String email;
        public String phone;
        public String profileImageUrl;
        public String address;
        public String address2;
        public String city;
        public String state;
        public String postalCode;
    }

    public static class PasswordChangeBody {
        public String currentPassword;
        public String newPassword;
    }

    public static class Msg {
        public String message;

        public Msg(String m) {
            this.message = m;
        }
    }

    private static class CartAttachResult {
        public String cartToken;
        public String orderId;
        public List<OrderItem> items;
        public double subtotal;
        public double tax;
        public double total;
        public Map<String, Object> conflicts;

        public Map<String, Object> toResponse() {
            Map<String, Object> body = new HashMap<>();
            body.put("orderId", orderId);
            body.put("items", items);
            body.put("subtotal", subtotal);
            body.put("tax", tax);
            body.put("total", total);
            body.put("conflicts", conflicts);
            return body;
        }
    }

    public static class SafeUser {
        public String userId;
        public String role;
        public String fullName;
        public String email;
        public String phone;
        public String profileImageUrl;
        public String address;
        public String address2;
        public String city;
        public String state;
        public String postalCode;

        // 11-argument constructor (Comprehensive)
        public SafeUser(String userId, String role, String fullName, String email, String phone,
                        String profileImageUrl, String address, String address2, String city, String state, String postalCode) {
            this.userId = userId;
            this.role = role;
            this.fullName = fullName;
            this.email = email;
            this.phone = phone;
            this.profileImageUrl = profileImageUrl;
            this.address = address;
            this.address2 = address2;
            this.city = city;
            this.state = state;
            this.postalCode = postalCode;
        }

        // 5-argument constructor (for backward compatibility in login/register)
        public SafeUser(String userId, String role, String fullName, String email, String phone) {
            this(userId, role, fullName, email, phone, null, null, null, null, null, null); // Call the comprehensive constructor
        }
    }

    SafeUser loadSafeUser(String userId) throws SQLException {
        UserDAO dao = new UserDAO(servletContext);
        User user = dao.getUserById(userId);
        if (user == null)
            return null;
        return new SafeUser(user.getUserId(), user.getRole(), user.getFullName(), user.getEmail(), user.getPhone(),
                            user.getProfileImageUrl(), user.getAddress(), user.getAddress2(), user.getCity(), user.getState(), user.getPostalCode());
    }

    SafeUser updateProfile(String userId, ProfileUpdateBody body) throws SQLException {
        UserDAO dao = new UserDAO(servletContext);
        User existing = dao.getUserById(userId);
        if (existing == null)
            return null;

        existing.setFullName(body.fullName.trim());
        existing.setEmail(body.email.trim());
        existing.setPhone(body.phone != null ? body.phone.trim() : null);
        existing.setProfileImageUrl(body.profileImageUrl != null ? body.profileImageUrl.trim() : null);
        existing.setAddress(body.address != null ? body.address.trim() : null);
        existing.setAddress2(body.address2 != null ? body.address2.trim() : null);
        existing.setCity(body.city != null ? body.city.trim() : null);
        existing.setState(body.state != null ? body.state.trim() : null);
        existing.setPostalCode(body.postalCode != null ? body.postalCode.trim() : null);

        boolean ok = dao.updateProfile(
                existing.getUserId(),
                existing.getFullName(),
                existing.getEmail(),
                existing.getPhone(),
                existing.getProfileImageUrl(),
                existing.getAddress(),
                existing.getAddress2(),
                existing.getCity(),
                existing.getState(),
                existing.getPostalCode()
        );
        if (!ok)
            return null;
        return new SafeUser(existing.getUserId(), existing.getRole(), existing.getFullName(), existing.getEmail(),
                existing.getPhone(), existing.getProfileImageUrl(), existing.getAddress(), existing.getAddress2(), existing.getCity(), existing.getState(), existing.getPostalCode());
    }

    boolean updatePassword(String userId, PasswordChangeBody body) throws SQLException {
        UserDAO dao = new UserDAO(servletContext);
        return dao.updatePasswordWithValidation(userId, body.currentPassword, body.newPassword);
    }

    private String requireUser(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            mapper.writeValue(resp.getWriter(), new Msg("unauthorized"));
            return null;
        }
        return s.getAttribute("userId").toString();
    }
}
