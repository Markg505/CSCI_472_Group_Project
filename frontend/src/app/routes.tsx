import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import ReservationsPage from "../pages/ReservationsPage";
import RegisterPage from "../pages/Register";
import LoginPage from "../features/auth/LoginPage";

// Admin
import AdminShell from "../pages/Admin/AdminLayout";
import Dashboard from "../pages/Admin/Dashboard";
import Users from "../pages/Admin/Users";
import Bookings from "../pages/Admin/Bookings";
import Menu from "../pages/Admin/Menu";
import Tables from "../pages/Admin/Tables";
import Inventory from "../pages/Admin/Inventory";
import Settings from "../pages/Admin/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "reservations", element: <ReservationsPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },

      // Admin (Headless UI navbar template)
      {
        path: "admin",
        element: <AdminShell />,
        children: [
          { index: true, element: <Dashboard /> }, // /admin
          { path: "users", element: <Users /> },
          { path: "bookings", element: <Bookings /> },
          { path: "menu", element: <Menu /> },
          { path: "tables", element: <Tables /> },
          { path: "inventory", element: <Inventory /> },
          { path: "settings", element: <Settings /> },
          ],
        },
      ],
    },
  ],
  {
    basename: "/RBOS_Web_Deployment"
  }
);