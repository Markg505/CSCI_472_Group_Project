// src/App.tsx
import { Outlet } from "react-router-dom";
import { CartProvider } from "./features/cart/CartContext";
import { NotificationProvider } from "./features/notifications/NotificationContext";
import { AuthProvider } from "./features/auth/useAuth";
import { useWebSocket } from "./hooks/useWebSocket";
import NavBar from "./components/NavBar";
import "./index.css";

function WebSocketStatus() {
  const { isConnected, lastMessage } = useWebSocket();

  console.log('WebSocket connection status:', isConnected);
  if (lastMessage) {
    console.log('Last WebSocket message:', lastMessage);
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <WebSocketStatus />
          <div className="min-h-screen bg-bg text-fg">
            <NavBar />
            <Outlet />
          </div>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}