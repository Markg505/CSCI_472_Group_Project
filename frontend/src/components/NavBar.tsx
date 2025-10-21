import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { useState } from "react";

const LinkStyle = ({ to, label }: { to: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-3 py-2 rounded-xl transition ${isActive ? "bg-white/10" : "hover:bg-white/5"}`
    }
  >
    {label}
  </NavLink>
);

export default function NavBar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

    if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-bg/70 border-b border-white/10">
      <div className="container-xl h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl">Gem<span className="text-gold">.</span></Link>

        <nav className="hidden md:flex items-center gap-1">
          <LinkStyle to="/" label="Home" />
          <LinkStyle to="/menu" label="Menu" />
          <LinkStyle to="/reservations" label="Reservations" />
          {user?.role !== "CUSTOMER" && <LinkStyle to="/admin" label="Admin" />}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-mute text-sm">Hi, {user.name}</span>
              <button className="btn-ghost" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn-primary">Sign in</Link>
          )}
        </div>

        {/* Mobile */}
        <button className="md:hidden p-2 rounded-xl hover:bg-white/5" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10">
          <div className="container-xl py-3 flex flex-col gap-2">
            <Link to="/" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/menu" onClick={() => setOpen(false)}>Menu</Link>
            <Link to="/reservations" onClick={() => setOpen(false)}>Reservations</Link>
            {user?.role !== "CUSTOMER" && <Link to="/admin" onClick={() => setOpen(false)}>Admin</Link>}
            {user ? (
              <button className="btn-ghost mt-2" onClick={() => { logout(); setOpen(false); }}>Logout</button>
            ) : (
              <Link to="/login" className="btn-primary mt-2" onClick={() => setOpen(false)}>Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
