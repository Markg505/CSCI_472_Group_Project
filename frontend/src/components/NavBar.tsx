import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth , AUTH_DEBUG_TAG } from "../features/auth/useAuth";
import { useCart } from "../features/cart/CartContext";
import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import UserMenu from "../components/UserMenu"; 

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

function AvatarCircle() {
  return (
    <div className="size-8 rounded-full bg-white/10 grid place-items-center">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 text-slate-300"
      >
        <path
          fill="currentColor"
          d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.239-8 5v.5A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5V19c0-2.761-3.58-5-8-5Z"
        />
      </svg>
    </div>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const { state: cartState } = useCart();
  console.log("NavBar tag   =", AUTH_DEBUG_TAG);
  console.log("NavBar user =", user);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (pathname.startsWith("/admin")) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  const isSignedIn = Boolean(user && (user.userId ?? user.id ?? user.email)); 
  const normalizedRole = String(user?.role ?? "").toLowerCase();
  const isAdminOrStaff = isSignedIn && (normalizedRole === "admin" || normalizedRole === "staff");

  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-bg/70 border-b border-white/10">
      <div className="container-xl h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl">
          Gem<span className="text-gold">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <LinkStyle to="/" label="Home" />
          <LinkStyle to="/menu" label="Menu" />
          <LinkStyle to="/reservations" label="Reservations" />
          {isAdminOrStaff && <LinkStyle to="/admin" label="Admin" />}
        </nav>

        
        <div className="hidden md:flex items-center gap-3">
          {/* Cart Icon */}
          <Link 
            to="/cart" 
            className="relative p-2 rounded-xl hover:bg-white/5 transition"
            aria-label="Shopping cart"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            {cartState.items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartState.items.length}
              </span>
            )}
          </Link>
          
          <UserMenu />
        </div>

        {/* Mobile */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t border-white/10">
          <div className="container-xl py-3 flex flex-col gap-2">
            <Link to="/" onClick={() => setOpen(false)}>
              Home
            </Link>
            {/* (Fixed path) */}
            <Link to="/menu" onClick={() => setOpen(false)}>
              Menu
            </Link>
            <Link to="/reservations" onClick={() => setOpen(false)}>
              Reservations
            </Link>
            {isAdminOrStaff && (
              <Link to="/admin" onClick={() => setOpen(false)}>
                Admin
              </Link>
            )}
            {user ? (
              <button
                className="btn-ghost mt-2"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="btn-primary mt-2"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
