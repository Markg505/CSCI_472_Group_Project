import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

export default function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ display: "flex", gap: 12, padding: 8, borderBottom: "1px solid #ddd" }}>
      <Link to="/">Menu</Link>
      <Link to="/reservations">Reservations</Link>
      {user ? (
        <>
          <span>Hi, {user.name} ({user.role})</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}
