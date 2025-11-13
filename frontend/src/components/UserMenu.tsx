// src/components/UserMenu.tsx
import React from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

type UserMenuProps = {
  adminPath?: string;
};

function AvatarCircle() {
  return (
    <div className="size-8 rounded-full bg-white/10 grid place-items-center">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-slate-300">
        <path
          fill="currentColor"
          d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.239-8 5v.5A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5V19c0-2.761-3.58-5-8-5Z"
        />
      </svg>
    </div>
  );
}

const UserMenu: React.FC<UserMenuProps> = ({ adminPath = "/admin" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isSignedIn = Boolean(user && (user.userId ?? user.id ?? user.email));
  const role = String(user?.role ?? "").toLowerCase();
  const isAdminOrStaff = isSignedIn && (role === "admin" || role === "staff");

  const displayName = user?.fullName ?? (user as any)?.fullName ?? user?.email ?? "Account";

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  if (!user) {
    return (
      <Link to="/login" className="btn-primary">
        Sign in
      </Link>
    );
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="relative flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
        <span className="sr-only">Open user menu</span>
        <AvatarCircle />
        <span className="text-sm text-slate-300 max-w-40 truncate">Hi, {displayName}</span>
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5
                   data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:transform
                   data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in z-50"
      >
        <MenuItem>
          {({ active }) => (
            <Link to="/account" className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}>
              Your profile
            </Link>
          )}
        </MenuItem>

        <MenuItem>
          {({ active }) => (
            <Link to="/settings" className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}>
              Settings
            </Link>
          )}
        </MenuItem>

        <MenuItem>
          {({ active }) => (
            <Link to="/" className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}>
              Return to site
            </Link>
          )}
        </MenuItem>

        {isAdminOrStaff && (
          <MenuItem>
            {({ active }) => (
              <Link to={adminPath} className={`block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}>
                Admin
              </Link>
            )}
          </MenuItem>
        )}

        <div className="my-1 border-t border-gray-100" />

        <MenuItem>
          {({ active }) => (
            <button
              onClick={handleSignOut}
              className={`w-full text-left block px-4 py-2 text-sm ${active ? "bg-gray-100" : ""}`}
            >
              Sign out
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default UserMenu;
