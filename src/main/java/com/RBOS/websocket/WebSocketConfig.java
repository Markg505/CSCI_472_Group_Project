package com.RBOS.websocket;

import jakarta.websocket.*;
import jakarta.websocket.server.*;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.ServletContext;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint(value = "/realtime", configurator = WebSocketConfig.WebSocketConfigurator.class)
public class WebSocketConfig {
    private static final Set<Session> sessions = Collections.newSetFromMap(new ConcurrentHashMap<>());
    
    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        System.out.println("WebSocket connected: " + session.getId());
        broadcastToAdmins("CONNECTION_ESTABLISHED", "New admin connected");
    }
    
    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        System.out.println("WebSocket disconnected: " + session.getId());
    }
    
    @OnError
    public void onError(Session session, Throwable throwable) {
        sessions.remove(session);
        System.err.println("WebSocket error: " + session.getId());
        throwable.printStackTrace();
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        // Handle incoming messages from clients if needed
        System.out.println("Received message from client: " + message);
    }
    
    public static void broadcastToAdmins(String type, String message) {
        String jsonMessage = String.format(
            "{\"type\":\"%s\",\"message\":\"%s\",\"timestamp\":%d}",
            type, message, System.currentTimeMillis()
        );
        
        sessions.forEach(session -> {
            if (session.isOpen()) {
                try {
                    session.getBasicRemote().sendText(jsonMessage);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
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
            // Store servlet context in user properties if needed
            try {
                HttpSession httpSession = (HttpSession) request.getHttpSession();
                if (httpSession != null) {
                    ServletContext servletContext = httpSession.getServletContext();
                    config.getUserProperties().put("servletContext", servletContext);
                }
            } catch (Exception e) {
                // This is normal if there's no HttpSession
                System.out.println("No HTTP session available for WebSocket handshake");
            }
        }
    }
}