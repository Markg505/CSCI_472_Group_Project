import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './features/cart/CartContext';
import { NotificationProvider } from './features/notifications/NotificationContext';
import HomePage from './pages/HomePage';
import CustomerMenu from './pages/CustomerMenu';
import ReservationsPage from './pages/ReservationsPage';
import CartPage from './pages/CartPage';
import AdminLayout from './pages/Admin/AdminLayout';
import './index.css';

export default function App() {
  return (
    <CartProvider>
      <NotificationProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<CustomerMenu />} />
              <Route path="/reservations" element={<ReservationsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/admin/*" element={<AdminLayout />} />
            </Routes>
          </div>
      </NotificationProvider>
    </CartProvider>
  );
}