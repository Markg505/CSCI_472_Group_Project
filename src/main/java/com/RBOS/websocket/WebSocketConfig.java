package com.RBOS.websocket;

import jakarta.websocket.*;
import jakarta.websocket.server.*;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.ServletContext;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint(
    value = "/realtime", 
    configurator = WebSocketConfig.WebSocketConfigurator.class
)
public class WebSocketConfig {
    private static final Set<Session> sessions = Collections.newSetFromMap(new ConcurrentHashMap<>());
    
    @OnOpen
    public void onOpen(Session session, EndpointConfig config) {
        sessions.add(session);
        System.out.println("WebSocket connected: " + session.getId() + " | Total connections: " + sessions.size());
        broadcastToAdmins("CONNECTION_ESTABLISHED", "New admin connected: " + session.getId());
    }
    
    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        System.out.println("WebSocket disconnected: " + session.getId() + " | Remaining connections: " + sessions.size());
    }
    
    @OnError
    public void onError(Session session, Throwable throwable) {
        System.err.println("WebSocket error for session " + session.getId() + ": " + throwable.getMessage());
        throwable.printStackTrace();
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        System.out.println("Received message from client " + session.getId() + ": " + message);
        // Echo back for testing
        try {
            session.getBasicRemote().sendText("Echo: " + message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public static void broadcastToAdmins(String type, String message) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("type", type);
            payload.put("message", message);
            payload.put("timestamp", System.currentTimeMillis());
            String jsonMessage = mapper.writeValueAsString(payload);

            System.out.println("Broadcasting to " + sessions.size() + " clients: " + jsonMessage);

            sessions.forEach(session -> {
                if (session.isOpen()) {
                    try {
                        session.getBasicRemote().sendText(jsonMessage);
                    } catch (Exception e) {
                        System.err.println("Failed to send message to session " + session.getId() + ": " + e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            System.err.println("Failed to broadcast WebSocket message: " + e.getMessage());
        }
    }
    
    public static void notifyNewReservation(String reservationData) {
        broadcastToAdmins("NEW_RESERVATION", reservationData);
    }
    
    public static void notifyReservationUpdate(String reservationData) {
        broadcastToAdmins("RESERVATION_UPDATED", reservationData);
    }
    
    public static void notifyNewOrder(String orderData) {
        broadcastToAdmins("NEW_ORDER", orderData);
    }
    
    public static void notifyOrderUpdate(String orderData) {
        broadcastToAdmins("ORDER_UPDATED", orderData);
    }
    
    // WebSocket Configurator
    public static class WebSocketConfigurator extends ServerEndpointConfig.Configurator {
        @Override
        public void modifyHandshake(ServerEndpointConfig config, 
                                  HandshakeRequest request, 
                                  HandshakeResponse response) {
            try {
                HttpSession httpSession = (HttpSession) request.getHttpSession();
                if (httpSession != null) {
                    ServletContext servletContext = httpSession.getServletContext();
                    config.getUserProperties().put("servletContext", servletContext);
                    System.out.println("WebSocket handshake with HTTP session");
                }
            } catch (Exception e) {
                System.out.println("No HTTP session available for WebSocket handshake");
            }
        }
    }
}
