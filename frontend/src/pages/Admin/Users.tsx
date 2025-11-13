// src/features/admin/Users.tsx
import { useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  LinkIcon,
  PencilIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useAuth } from "../../features/auth/useAuth";
import { apiClient, type User } from '../../api/client'; 

type RawUser = Partial<User>;

function safeId(u: RawUser) {
  return String((u as any).userId ?? (u as any).id ?? "");
}
function safeName(u: RawUser) {
  return u.fullName ?? (u as any).full_name ?? (u as any).name ?? "";
}
function safeEmail(u: RawUser) {
  return u.email ?? "";
}
function safePhone(u: RawUser) {
  return u.phone ?? "";
}
function safeRole(u: RawUser) {
  return (u.role ?? "customer") as User["role"];
}

export default function Users() {
  const [rows, setRows] = useState<RawUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // --- edit state ---
  const [editUser, setEditUser] = useState<RawUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "customer" });

  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "customer" });

  const { user: me } = useAuth();
  const myRole = String(me?.role ?? "").toLowerCase();
  const isAdmin = myRole === "admin";
  const isStaff = myRole === "staff";

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.listUsers();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("list users failed:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const adminCount = useMemo(() => rows.filter(r => safeRole(r).toLowerCase() === "admin").length, [rows]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return alert("Only admins can add users.");
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      await apiClient.createUser({
        fullName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role as User["role"],
        password: "changeme",
      });
      await load();
      setForm({ name: "", email: "", phone: "", role: "customer" });
      setShowAdd(false);
    } catch (err: any) {
      console.error("add failed", err);
      alert(err?.message ?? "Add failed");
    }
  }

  async function onDelete(u: RawUser) {
    if (!isAdmin) return alert("Only admins can delete users.");
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    const id = safeId(u);
    try {
      await apiClient.deleteUser(Number(id));
      await load();
    } catch (err: any) {
      console.error("delete failed", err);
      alert(err?.message ?? "Delete failed");
    }
  }

 
  function startEdit(u: RawUser) {
    if (!isAdmin) return alert("Only admins can edit users.");
    setEditUser(u);
    setEditForm({
      name: safeName(u),
      email: safeEmail(u),
      phone: safePhone(u),
      role: safeRole(u),
    });
    setShowAdd(false); // ensure only one form visible
  }

  // cancel edit
  function cancelEdit() {
    setEditUser(null);
    setEditForm({ name: "", email: "", phone: "", role: "customer" });
  }

  // save edit
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return alert("Only admins can edit users.");
    if (!editUser) return;
    const id = Number(safeId(editUser));
    if (!id) return alert("Missing user id");

    try {
      await apiClient.updateUser({
        userId: id,
        fullName: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role as User["role"],
      } as User);
      await load();
      cancelEdit();
    } catch (err: any) {
      console.error("update failed", err);
      alert(err?.message ?? "Update failed");
    }
  }
  

  function exportCSV() {
    const header = ["ID", "Name", "Email", "Phone", "Role"];
    const lines = rows.map(r => {
      const id = safeId(r);
      return [id, safeName(r), safeEmail(r), safePhone(r), safeRole(r)]
        .map(s => `"${String(s ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });
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
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Users</h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Total: {rows.length}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
              Admins: {adminCount}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              You: {me?.email ?? "guest"} ({me?.role ?? "none"})
            </div>
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4">
          <span className="hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setShowAdd(s => !s);
                cancelEdit();
              }}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
              disabled={!isAdmin}
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
        </div>
      </div>

      
      {showAdd && !editUser && (
        <form onSubmit={onAdd} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" className="w-full rounded-md border border-slate-300 px-3 py-2" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input type="tel" className="rounded-md border border-slate-300 px-3 py-2" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="customer">customer</option>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "", role: "customer" }); }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Add user</button>
            </div>
          </div>
        </form>
      )}

      {/* Edit user form (prefilled) */}
      {editUser && (
        <form onSubmit={saveEdit} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" className="w-full rounded-md border border-slate-300 px-3 py-2" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input type="tel" className="rounded-md border border-slate-300 px-3 py-2" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                <option value="customer">customer</option>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Save changes</button>
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
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(u => {
                const id = safeId(u);
                const name = safeName(u);
                const email = safeEmail(u);
                const phone = safePhone(u);
                const role = safeRole(u);

                return (
                  <tr key={String(id)} className="text-sm">
                    <td className="px-3 py-2">{String(id)}</td>
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{email}</td>
                    <td className="px-3 py-2">{phone}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${String(role).toLowerCase() === "admin" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200" : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"}`}>{role}</span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button onClick={() => startEdit(u)} className={`rounded-md border px-2 py-1 text-sm ${isAdmin ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "border-slate-200 bg-slate-50 text-slate-400"}`} disabled={!isAdmin}>Edit</button>
                      <button onClick={() => onDelete(u)} className={`rounded-md border px-2 py-1 text-sm ${isAdmin ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-50 text-slate-400"}`} disabled={!isAdmin}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
