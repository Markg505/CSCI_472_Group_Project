package com.RBOS.servlets;

import com.RBOS.dao.ReservationDAO;
import com.RBOS.dao.DiningTableDAO;
import com.RBOS.models.Reservation;
import com.RBOS.services.EmailService;
import com.RBOS.dao.UserDAO;
import com.RBOS.models.User;
import com.RBOS.models.DiningTable;
import com.RBOS.websocket.WebSocketConfig;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@WebServlet("/api/reservations/*")
public class ReservationServlet extends HttpServlet {
    private ReservationDAO reservationDAO;
    private DiningTableDAO diningTableDAO;
    private ObjectMapper objectMapper;

    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        reservationDAO = new ReservationDAO(getServletContext());
        diningTableDAO = new DiningTableDAO(getServletContext());
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

                int reservationId = Integer.parseInt(splits[1]);
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
            Integer reservationId = reservationDAO.createReservation(reservation);

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
                    int reservationId = Integer.parseInt(parts[1]);

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
