import {
  Disclosure, DisclosureButton, DisclosurePanel,
  Menu, MenuButton, MenuItem, MenuItems,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { NavLink, Outlet } from "react-router-dom";
import "./admin.css";
import NotificationBell from '../../components/NotificationBell';

const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};

const nav = [
  { name: "Dashboard", to: "/admin" },
  { name: "Users", to: "/admin/users" },
  { name: "Bookings", to: "/admin/bookings" },
  { name: "Menu", to: "/admin/menu" },
  { name: "Tables", to: "/admin/tables" },
  { name: "Inventory", to: "/admin/inventory" },
  { name: "Settings", to: "/admin/settings" },
];

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function AdminShell() {
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

                <Menu as="div" className="relative ml-3">
                  <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt=""
                      src={user.imageUrl}
                      className="size-8 rounded-full outline -outline-offset-1 outline-white/10"
                    />
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition
                               data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:transform
                               data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in"
                  >
                    {[
                      { name: "Your profile", to: "#" },
                      { name: "Settings", to: "/admin/settings" },
                      { name: "Sign out", to: "/" },
                    ].map((i) => (
                      <MenuItem key={i.name}>
                        <a
                          href={i.to}
                          className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:outline-hidden"
                        >
                          {i.name}
                        </a>
                      </MenuItem>
                    ))}
                  </MenuItems>
                </Menu>
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
          </div>
        </DisclosurePanel>
      </Disclosure>

      

      {/* Page content container */}
      <main className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Example big patterned panel like the screenshot */}
          <div className="admin-panel rounded-2xl p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
