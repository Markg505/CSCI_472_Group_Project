// src/.../AdminShell.tsx
import {
  Disclosure, DisclosureButton, DisclosurePanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import "./admin.css";
import NotificationBell from '../../components/NotificationBell';
import UserMenu from '../../components/UserMenu';
import { useAuth } from "../../features/auth/useAuth";

const nav = [
  { name: "Dashboard", to: "/admin" },
  { name: "Users", to: "/admin/users" },
  { name: "Bookings", to: "/admin/bookings" },
  { name: "Orders", to: "/admin/orders" },
  { name: "Menu", to: "/admin/menu" },
  { name: "Tables", to: "/admin/tables" },
  { name: "Inventory", to: "/admin/inventory" },
  { name: "Reports", to: "/admin/reports" },
];

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // display name fallback
  const displayName = (user?.fullName ?? (user as any)?.fullName ?? user?.email) || "Admin";

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  // simple avatar fallback 
  const imageUrl = (user && (user as any).imageUrl) || "https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top dark nav */}
      <Disclosure as="nav" className="bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <img
                alt="Your Company"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                className="size-8"
              />
              <div className="hidden md:block">
                <div className="flex items-baseline gap-1">
                  {nav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/admin"}
                      className={({ isActive }: { isActive: boolean }) =>
                        cx(
                          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-800 text-white shadow-inner"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )
                      }
                    >
                      {item.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <NotificationBell />

                
                <UserMenu adminPath="/admin" />
              </div>
            </div>

            {/* Mobile toggle */}
            <div className="-mr-2 flex md:hidden">
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:bg-white/5 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500">
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                <Bars3Icon aria-hidden="true" className="block size-6 group-data-[open]:hidden" />
                <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-[open]:block" />
              </DisclosureButton>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <DisclosurePanel className="md:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            {nav.map((item) => (
              <DisclosureButton
                key={item.to}
                as={NavLink}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }: { isActive: boolean }) =>
                  cx(
                    "block rounded-md px-3 py-2 text-base font-medium",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                {item.name}
              </DisclosureButton>
            ))}

            <div className="border-t border-white/5 mt-2 pt-2">
              <DisclosureButton as={NavLink} to="/admin/profile" className="block px-3 py-2 text-base text-slate-300 hover:bg-white/5 rounded-md">
                Your profile
              </DisclosureButton>
              <DisclosureButton as={Link} to="/" className="block px-3 py-2 text-base text-slate-300 hover:bg-white/5 rounded-md">
                Return to site
              </DisclosureButton>
              <DisclosureButton
                as="button"
                onClick={() => { handleSignOut(); }}
                className="block w-full text-left px-3 py-2 text-base text-slate-300 hover:bg-white/5 rounded-md"
              >
                Sign out
              </DisclosureButton>
            </div>
          </div>
        </DisclosurePanel>
      </Disclosure>

      {/* Page content container */}
      <main className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="admin-panel rounded-2xl p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
