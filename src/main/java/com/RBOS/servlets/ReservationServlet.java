package com.RBOS.servlets;

import com.RBOS.dao.ReservationDAO;
import com.RBOS.dao.DiningTableDAO;
import com.RBOS.dao.AuditLogDAO;
import com.RBOS.models.PagedResult;
import com.RBOS.models.Reservation;
import com.RBOS.services.EmailService;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.models.DiningTable;
import com.RBOS.models.HistoryResponse;
import com.RBOS.utils.HistoryValidation;
import com.RBOS.websocket.WebSocketConfig;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.time.LocalDate;

@WebServlet("/api/reservations/*")
public class ReservationServlet extends HttpServlet {
    private static final int RETENTION_MONTHS = 13;
    private ReservationDAO reservationDAO;
    private DiningTableDAO diningTableDAO;
    private AuditLogDAO auditDAO;
    private UserDAO userDAO;
    private ObjectMapper objectMapper;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        reservationDAO = new ReservationDAO(getServletContext());
        diningTableDAO = new DiningTableDAO(getServletContext());
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

            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all reservations
                List<Reservation> reservations = reservationDAO.getAllReservations();
                response.getWriter().write(objectMapper.writeValueAsString(reservations));
            } else if ("/history".equals(pathInfo)) {
                handleHistory(request, response);
            } else if (pathInfo.startsWith("/available-tables")) {
                // Get available tables for a time period
                String startUtc = request.getParameter("startUtc");
                String endUtc = request.getParameter("endUtc");
                String partySizeStr = request.getParameter("partySize");

                if (startUtc == null || endUtc == null || partySizeStr == null) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                            "Missing parameters: startUtc, endUtc, partySize");
                    return;
                }

                int partySize = Integer.parseInt(partySizeStr);
                var availableTables = diningTableDAO.getAvailableTables(startUtc, endUtc, partySize);
                response.getWriter().write(objectMapper.writeValueAsString(availableTables));

            } else {
                // Get reservation by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String reservationId = splits[1];
                Reservation reservation = reservationDAO.getReservationById(reservationId);

                if (reservation != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(reservation));
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
            Reservation reservation = objectMapper.readValue(request.getReader(), Reservation.class);
            if (reservation.getTableId() == null || reservation.getTableId().isBlank()) {
                List<DiningTable> tables = diningTableDAO.getAllTables();
                if (tables.isEmpty()) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, "No dining tables configured");
                    return;
                }
                reservation.setTableId(tables.get(0).getTableId());
            }
            // drop unknown users to avoid FK failures
            if (reservation.getUserId() != null && !reservation.getUserId().isBlank()) {
                try {
                    UserDAO userDAO = new UserDAO(getServletContext());
                    User existing = userDAO.getUserById(reservation.getUserId());
                    if (existing == null) {
                        reservation.setUserId(null);
                    } else if (reservation.getGuestName() == null || reservation.getGuestName().isBlank()) {
                        reservation.setGuestName(existing.getFullName());
                    }
                } catch (Exception ignored) {
                }
            }
            if ((reservation.getGuestName() == null || reservation.getGuestName().isBlank())
                    && reservation.getUserId() == null) {
                reservation.setGuestName("Guest");
            }
            if (reservation.getReservationId() == null || reservation.getReservationId().isBlank()) {
                reservation.setReservationId(java.util.UUID.randomUUID().toString());
            }
            String reservationId = reservationDAO.createReservation(reservation);

            if (reservationId != null) {
                reservation.setReservationId(reservationId);

                // Send confirmation email
                try {
                    EmailService emailService = new EmailService();

                    // Get user details for email
                    UserDAO userDAO = new UserDAO(getServletContext());
                    User user = null;
                    if (reservation.getUserId() != null) {
                        user = userDAO.getUserById(reservation.getUserId());
                    }

                    if (user != null && user.getEmail() != null) {
                        // Get table details
                        DiningTableDAO tableDAO = new DiningTableDAO(getServletContext());
                        DiningTable table = tableDAO.getTableById(reservation.getTableId());

                        String reservationDate = new java.text.SimpleDateFormat("MMMM dd, yyyy")
                                .format(new java.util.Date(reservation.getStartUtc()));
                        String reservationTime = new java.text.SimpleDateFormat("h:mm a")
                                .format(new java.util.Date(reservation.getStartUtc()));

                        emailService.sendReservationConfirmation(
                                user.getEmail(),
                                user.getFullName(),
                                reservationDate,
                                reservationTime,
                                reservation.getPartySize(),
                                table != null ? table.getName() : "Your table",
                                reservationId.toString());
                    }

                    // Notify admin
                    emailService.sendAdminNotification(
                            "New Reservation Created",
                            "New reservation #" + reservationId + " created for " +
                                    (user != null ? user.getFullName() : "Guest"));

                } catch (Exception e) {
                    System.err.println("Failed to send reservation email: " + e.getMessage());
                    // Don't fail the request if email fails
                }

                // Notify via WebSocket
                String reservationJson = objectMapper.writeValueAsString(reservation);
                WebSocketConfig.notifyNewReservation(reservationJson);

                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(reservation));
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

    private void handleHistory(HttpServletRequest request, HttpServletResponse response)
            throws IOException, SQLException {
        int page = HistoryValidation.normalizePage(parseInteger(request.getParameter("page")));
        int pageSize = HistoryValidation.clampPageSize(parseInteger(request.getParameter("pageSize")));

        String rawStatus = request.getParameter("status");
        String rawStart = request.getParameter("start_utc");
        String rawEnd = request.getParameter("end_utc");

        String status;
        Instant startInstant;
        Instant endInstant;
        try {
            status = HistoryValidation.normalizeStatus(rawStatus, HistoryValidation.ALLOWED_RESERVATION_STATUSES);
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
        Instant clampedStart = HistoryValidation.clampStart(startInstant, retentionHorizon);
        Instant clampedEnd = HistoryValidation.clampEnd(endInstant, retentionHorizon, now);

        if (clampedStart.isAfter(clampedEnd)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Requested range is outside the retention window");
            return;
        }

        String startUtc = HistoryValidation.formatInstant(clampedStart);
        String endUtc = HistoryValidation.formatInstant(clampedEnd);

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

        PagedResult<Reservation> paged = reservationDAO.getReservationsWithFilters(status, startUtc, endUtc,
                scopedUserId, page, pageSize);
        HistoryResponse<Reservation> history = new HistoryResponse<>(
                paged.getItems(),
                page,
                pageSize,
                paged.getTotal(),
                RETENTION_MONTHS,
                LocalDate.now().minusMonths(RETENTION_MONTHS).toString());
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

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        try {
            String pathInfo = request.getPathInfo(); // e.g. "/10" or "/10/status"
            if (pathInfo != null) {
                String[] parts = pathInfo.split("/"); // ["", "10"] or ["", "10", "status"]
                if (parts.length == 3 && "status".equals(parts[2])) {
                    String reservationId = parts[1];

                    Map<String, Object> body = objectMapper.readValue(request.getReader(), Map.class);
                    Object statusObj = body.get("status");
                    if (statusObj == null) {
                        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing 'status'");
                        return;
                    }
                    String newStatus = String.valueOf(statusObj);

                    Reservation existing = reservationDAO.getReservationById(reservationId);
                    if (existing == null) {
                        response.sendError(HttpServletResponse.SC_NOT_FOUND);
                        return;
                    }

                    existing.setStatus(newStatus);
                    boolean ok = reservationDAO.updateReservation(existing);
                    if (!ok) {
                        response.sendError(HttpServletResponse.SC_NOT_FOUND);
                        return;
                    }

                    String reservationJson = objectMapper.writeValueAsString(existing);
                    WebSocketConfig.notifyReservationUpdate(reservationJson);
                    response.getWriter().write(reservationJson);
                    return;
                }
            }

            Reservation reservation = objectMapper.readValue(request.getReader(), Reservation.class);
            if (reservation.getUserId() != null && !reservation.getUserId().isBlank()) {
                try {
                    UserDAO userDAO = new UserDAO(getServletContext());
                    User existing = userDAO.getUserById(reservation.getUserId());
                    if (existing == null) {
                        reservation.setUserId(null);
                    } else if (reservation.getGuestName() == null || reservation.getGuestName().isBlank()) {
                        reservation.setGuestName(existing.getFullName());
                    }
                } catch (Exception ignored) {
                }
            }
            if ((reservation.getGuestName() == null || reservation.getGuestName().isBlank())
                    && reservation.getUserId() == null) {
                reservation.setGuestName("Guest");
            }
            boolean success = reservationDAO.updateReservation(reservation);

            if (success) {
                String reservationJson = objectMapper.writeValueAsString(reservation);
                WebSocketConfig.notifyReservationUpdate(reservationJson);

                response.getWriter().write(objectMapper.writeValueAsString(reservation));
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (IOException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
}
