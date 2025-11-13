import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth , AUTH_DEBUG_TAG } from "../features/auth/useAuth";
import { useState, Fragment } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";



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
      {/* simple person icon */}
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
          {user?.role !== "CUSTOMER" && <LinkStyle to="/admin" label="Admin" />}
        </nav>

        {/* Right side (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Menu as="div" className="relative">
            <MenuButton className="relative flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
              <span className="sr-only">Open user menu</span>
              <AvatarCircle />
              <span className="text-sm text-slate-300 max-w-40 truncate">Hi, {user.name}</span>
            </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5
                           data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:transform
                           data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in z-50"
              >
                <MenuItem>
                  {({ active }) => (
                    <Link
                      to="/account"
                      className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
                    >
                      Your profile
                    </Link>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <Link
                      to="/settings"
                      className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
                    >
                      Settings
                    </Link>
                  )}
                </MenuItem>
                {user?.role !== "CUSTOMER" && (
                  <MenuItem>
                    {({ active }) => (
                      <Link
                        to="/admin"
                        className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
                      >
                        Admin
                      </Link>
                    )}
                  </MenuItem>
                )}
                <div className="my-1 border-t border-gray-100" />
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`w-full text-left block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
                    >
                      Sign out
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
          ) : (
            <Link to="/login" className="btn-primary">
              Sign in
            </Link>
          )}
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
            {user?.role !== "CUSTOMER" && (
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
