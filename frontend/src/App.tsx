// src/App.tsx
import { Outlet } from "react-router-dom";
import { CartProvider } from "./features/cart/CartContext";
import { NotificationProvider } from "./features/notifications/NotificationContext";
import { AuthProvider } from "./features/auth/useAuth";
import NavBar from "./components/NavBar";
import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-bg text-fg">
            <NavBar />
            <Outlet />
          </div>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}