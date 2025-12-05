package com.RBOS.websocket;

import static org.junit.Assert.*;

import jakarta.websocket.EncodeException;
import jakarta.websocket.RemoteEndpoint;
import jakarta.websocket.Session;
import java.io.IOException;
import java.io.OutputStream;
import java.io.Writer;
import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.nio.ByteBuffer;
import java.util.Set;
import org.junit.After;
import org.junit.Test;

public class WebSocketConfigTest {

    @After
    public void clearSessions() throws Exception {
        getSessions().clear();
    }

    @Test
    public void broadcastSendsJsonToOpenSessions() throws Exception {
        BasicCapture basic = new BasicCapture();
        Session session = buildSession("s1", basic, true);
        getSessions().add(session);

        WebSocketConfig.broadcastToAdmins("TYPE", "hello");

        assertNotNull("Message should be sent", basic.lastMessage);
        assertTrue(basic.lastMessage.contains("TYPE"));
        assertTrue(basic.lastMessage.contains("hello"));
    }

    @Test
    public void onOpenAddsSessionAndOnCloseRemoves() throws Exception {
        WebSocketConfig ws = new WebSocketConfig();
        BasicCapture basic = new BasicCapture();
        Session session = buildSession("s2", basic, true);

        ws.onOpen(session, null);
        assertFalse(getSessions().isEmpty());
        assertNotNull("Connection established broadcast", basic.lastMessage);

        ws.onClose(session);
        assertTrue(getSessions().isEmpty());
    }

    @SuppressWarnings("unchecked")
    private Set<Session> getSessions() throws Exception {
        Field f = WebSocketConfig.class.getDeclaredField("sessions");
        f.setAccessible(true);
        return (Set<Session>) f.get(null);
    }

    private Session buildSession(String id, RemoteEndpoint.Basic basic, boolean isOpen) {
        return (Session) Proxy.newProxyInstance(
                Session.class.getClassLoader(),
                new Class[] {Session.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getBasicRemote":
                            return basic;
                        case "isOpen":
                            return isOpen;
                        case "getId":
                            return id;
                        case "hashCode":
                            return id.hashCode();
                        case "equals":
                            return proxy == args[0] || (args != null && args[0] instanceof Session
                                    && id.equals(((Session) args[0]).getId()));
                        default:
                            return null;
                    }
                });
    }

    private static class BasicCapture implements RemoteEndpoint.Basic {
        String lastMessage;

        @Override public void sendText(String text) throws IOException { this.lastMessage = text; }
        @Override public void sendText(String partialMessage, boolean isLast) throws IOException { this.lastMessage = partialMessage; }
        @Override public void sendBinary(ByteBuffer data) throws IOException {}
        @Override public void sendBinary(ByteBuffer partialByte, boolean isLast) throws IOException {}
        @Override public void sendObject(Object data) throws IOException, EncodeException { this.lastMessage = String.valueOf(data); }
        @Override public OutputStream getSendStream() throws IOException { return null; }
        @Override public Writer getSendWriter() throws IOException { return null; }
        @Override public void setBatchingAllowed(boolean allowed) throws IOException {}
        @Override public boolean getBatchingAllowed() { return false; }
        @Override public void flushBatch() throws IOException {}
        @Override public void sendPing(ByteBuffer applicationData) throws IOException {}
        @Override public void sendPong(ByteBuffer applicationData) throws IOException {}
    }
}
