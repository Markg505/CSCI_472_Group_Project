import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import ReservationsPage from "../pages/ReservationsPage";
import RegisterPage from "../pages/Register";
import LoginPage from "../features/auth/LoginPage";
import AdminLoginPage from "../pages/AdminLogin";
import CustomerDashboard from "../pages/CustomerDashboard";
import CustomerMenu from "../pages/CustomerMenu";
import CartPage from '../pages/CartPage';
import Orders from '../pages/Admin/Orders';

// Admin
import AdminShell from "../pages/Admin/AdminLayout";
import Dashboard from "../pages/Admin/Dashboard";
import Users from "../pages/Admin/Users";
import Bookings from "../pages/Admin/Bookings";
import Menu from "../pages/Admin/Menu";
import Tables from "../pages/Admin/Tables";
import Inventory from "../pages/Admin/Inventory";
import Settings from "../pages/Admin/Settings";
// import Reports from '../pages/Admin/Reports';

export const router = createBrowserRouter(
  [
    {
      path: "/*",
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "reservations", element: <ReservationsPage /> },
        { path: "login", element: <LoginPage /> },
        { path: "admin-login", element: <AdminLoginPage /> },
        { path: "register", element: <RegisterPage /> },
        { path: "dashboard", element: <CustomerDashboard /> },
        { path: "menu", element: <CustomerMenu /> },
        { path: "cart", element: <CartPage /> },
        // Admin routes
        {
          path: "admin",
          element: <AdminShell />,
          children: [
            { index: true, element: <Dashboard /> },
            { path: "users", element: <Users /> },
            { path: "bookings", element: <Bookings /> },
            { path: "menu", element: <Menu /> },
            { path: "tables", element: <Tables /> },
            { path: "inventory", element: <Inventory /> },
            { path: "orders", element: <Orders /> },
            { path: "settings", element: <Settings /> },
          ],
        },
      ],
    },
  ],
  {
    basename: '/RBOS/',
  }
);