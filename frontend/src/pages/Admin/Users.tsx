
import { useEffect, useMemo, useState } from "react";
import {
  listUsers,
  addUser,
  removeUser,
  type UserRow,
  type Role,
} from "../../lib/adminApi";

import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

/* ---------- component ---------- */
export default function Users() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({
    name: "",
    email: "",
    role: "user",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRows(await listUsers());
      setLoading(false);
    })();
  }, []);

  const adminCount = useMemo(() => rows.filter(r => r.role === "admin").length, [rows]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    await addUser({ name: form.name.trim(), email: form.email.trim(), role: form.role });
    setRows(await listUsers());
    setForm({ name: "", email: "", role: "user" });
    setShowAdd(false);
  }

  async function onDelete(id: string) {
    await removeUser(id);
    setRows(await listUsers());
  }

  function exportCSV() {
    const header = ["Name", "Email", "Role"];
    const lines = rows.map(r => [r.name, r.email, r.role].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Users
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Total: {rows.length}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
              Admins: {adminCount}
            </div>
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4">
          <span className="hidden sm:block">
            <button
              type="button"
              onClick={() => setShowAdd(s => !s)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
            >
              <PencilIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              New user
            </button>
          </span>

          <span className="hidden sm:block ml-3">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
            >
              <LinkIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              Export CSV
            </button>
          </span>

          <span className="sm:ml-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <CheckIcon className="mr-1.5 -ml-0.5 size-5" />
              Print
            </button>
          </span>

          {/* Mobile dropdown */}
          <Menu as="div" className="relative ml-3 sm:hidden">
            <MenuButton className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50">
              More
              <ChevronDownIcon className="-mr-1 ml-1.5 size-5 text-gray-400" />
            </MenuButton>
            <MenuItems
              transition
              className="absolute left-0 z-10 mt-2 -mr-1 w-28 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
              <MenuItem>
                <button
                  onClick={() => setShowAdd(true)}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  New
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  onClick={exportCSV}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  Export
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  onClick={() => window.print()}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  Print
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>

      {/* Add user (toggle) */}
      {showAdd && (
        <form
          onSubmit={onAdd}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm({ name: "", email: "", role: "user" }); }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Add user
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(u => (
                <tr key={u.id} className="text-sm">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                          : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                      onClick={() => onDelete(u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
