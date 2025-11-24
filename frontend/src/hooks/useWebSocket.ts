import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp: number;
}

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/RBOS/realtime`;
  };

   const connect = useCallback(() => {
    try {
      if (reconnectTimeout.current) {
        window.clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      const wsUrl = getWebSocketUrl();
      console.log('WebSocket Connection Attempt:');
      console.log('URL:', wsUrl);
      console.log('Mode:', import.meta.env.MODE);
      console.log('VITE_WS_BASE:', import.meta.env.VITE_WS_BASE);
      
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected to:', wsUrl);
      };
      
      ws.current.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason || 'Unknown reason');
        
        reconnectTimeout.current = window.setTimeout(() => {
          console.log('Reconnecting WebSocket...');
          connect();
        }, 3000);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket connection failed for URL:', wsUrl);
        console.error('Error details:', error);
      };
      
      ws.current.onmessage = (event) => {
        const raw = event.data;
        if (typeof raw !== 'string') {
          console.warn('Ignoring non-text WebSocket frame');
          return;
        }
        try {
          const message: WebSocketMessage = JSON.parse(raw);
          setLastMessage(message);
          console.log('WebSocket message:', message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'payload:', raw);
        }
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        window.clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage, sendMessage };
};
