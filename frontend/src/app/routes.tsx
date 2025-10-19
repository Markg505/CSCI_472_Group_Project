import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import ReservationsPage from "../pages/ReservationsPage";
import LoginPage from "../features/auth/LoginPage";
import App from "../App";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "reservations", element: <ReservationsPage /> },
      { path: "login", element: <LoginPage /> },
    ]
  }
]);
