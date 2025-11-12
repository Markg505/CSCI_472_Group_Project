import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp: number;
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // const wsUrl = `ws://localhost:8080/RBOS/realtime`
      const wsUrl = `${protocol}//${host}${url}`;
      
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Simple reconnect without storing timeout
        setTimeout(() => {
          connect();
        }, 3000);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  }, [isConnected]);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage, sendMessage };
};