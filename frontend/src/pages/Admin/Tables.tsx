import { useEffect, useMemo, useState } from "react";
import { apiClient, type DiningTable } from "../../api/client";
import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import {
  Menu as HUMenu,
  MenuButton,
  MenuItem as HUMenuItem,
  MenuItems as HUMenuItems,
} from "@headlessui/react";
import EditableTableMap from './EditableTableMap';
import AuditLogButton from "../../components/AuditLogButton";
import TableLayoutEditor from "../../components/TableLayoutEditor";
import { useAuth } from "../../features/auth/useAuth";


export default function TablesAdmin() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const [rows, setRows] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiningTable | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; capacity: string; basePrice: string; posX: string; posY: string }>({
    name: "",
    capacity: "",
    basePrice: "",
    posX: "",
    posY: "",
  });

  const [form, setForm] = useState<{ name: string; capacity: string; notes: string; basePrice: string }>({
    name: "",
    capacity: "",
    notes: "",
    basePrice: "0",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; capacity: string; basePrice: string }>({
    name: "",
    capacity: "",
    basePrice: "0",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  async function refresh() {
    try {
      const data = await apiClient.getTables();
      setRows(data ?? []);
    } catch (err) {
      console.error("Failed to load tables", err);
      setRows([]);
    }
  }

  const total = rows.length;
  const totalSeats = useMemo(() => rows.reduce((sum, r) => sum + (r.capacity || 0), 0), [rows]);
  const totalBase = useMemo(() => rows.reduce((sum, r) => sum + (r.basePrice || 0), 0), [rows]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cap = parseInt(form.capacity, 10);
    const base = form.basePrice ? parseFloat(form.basePrice) : 0;
    const posX = form.posX ? parseFloat(form.posX) : undefined;
    const posY = form.posY ? parseFloat(form.posY) : undefined;
    if (Number.isNaN(cap) || cap <= 0) {
      setError("Capacity must be a positive number.");
      return;
    }
    if (Number.isNaN(base) || base < 0) {
      setError("Base price must be a non-negative number.");
      return;
    }
    if (posX !== undefined && Number.isNaN(posX)) {
      setError("Position X must be a number.");
      return;
    }
    if (posY !== undefined && Number.isNaN(posY)) {
      setError("Position Y must be a number.");
      return;
    }

    const name = form.name.trim() || `Table ${rows.length + 1}`;
    const basePrice = parseFloat(form.basePrice || "0") || 0;
    await apiClient.createTable({ name, capacity: cap, basePrice });
    await refresh();
    setForm({ name: "", capacity: "", notes: "", basePrice: "0" });
    setShowAdd(false);
  }

  async function onDelete(id?: string) {
    if (!id) return;
    try {
      await apiClient.deleteTable(id);
    } catch (err) {
      console.error("Delete failed", err);
    }
    await refresh();
  }

  function startEdit(table: DiningTable) {
    setEditingId(table.tableId);
    setEditForm({
      name: table.name || "",
      capacity: String(table.capacity ?? ""),
      basePrice: String(table.basePrice ?? "0"),
    });
  }

  async function saveEdit(tableId: string) {
    const cap = parseInt(editForm.capacity, 10);
    if (Number.isNaN(cap) || cap <= 0) return;
    const basePrice = parseFloat(editForm.basePrice || "0") || 0;
    try {
      const current = rows.find(r => r.tableId === tableId);
      await apiClient.updateTable({
        tableId,
        name: editForm.name.trim() || `Table ${tableId}`,
        capacity: cap,
        // Send both snake and camel to keep backend happy
        pos_x: current?.pos_x ?? 0,
        pos_y: current?.pos_y ?? 0,
        posX: (current as any)?.posX ?? current?.pos_x ?? 0,
        posY: (current as any)?.posY ?? current?.pos_y ?? 0,
        basePrice,
      } as any);
      setEditingId(null);
      await refresh();
    } catch (err) {
      console.error("Update failed", err);
    }
  }

  function exportCSV() {
    const header = ["Name", "Capacity", "Base Price"];
    const lines = rows.map(r => [r.name || r.tableId, r.capacity, r.basePrice ?? 0].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tables.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Tables
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-indigo-500" />
              Total: {total}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Seats: {totalSeats}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-1.5 inline-block size-2 rounded-full bg-amber-500" />
              Base Fees: ${rows.reduce((sum, r) => sum + (r.basePrice ?? 0), 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4">
          <span>
            <button
              type="button"
              onClick={() => setShowAdd(s => !s)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
            >
              <PencilIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              New table
            </button>
          </span>

          <span className="ml-3">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50"
            >
              <LinkIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              Export CSV
            </button>
          </span>

          <span className="ml-3">
            <AuditLogButton entityType="table" label="View Change Log" />
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
          <HUMenu as="div" className="relative ml-3 sm:hidden">
            <MenuButton className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50">
              More
              <ChevronDownIcon className="-mr-1 ml-1.5 size-5 text-gray-400" />
            </MenuButton>
            <HUMenuItems
              transition
              className="absolute left-0 z-10 mt-2 -mr-1 w-28 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
            >
              <HUMenuItem>
                <button
                  onClick={() => setShowAdd(true)}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  New
                </button>
              </HUMenuItem>
              <HUMenuItem>
                <button
                  onClick={exportCSV}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  Export
                </button>
              </HUMenuItem>
              <HUMenuItem>
                <button
                  onClick={() => window.print()}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                >
                  Print
                </button>
              </HUMenuItem>
            </HUMenuItems>
          </HUMenu>
        </div>
      </div>

      <EditableTableMap refreshKey={rows.length} />
      
      {/* Add table (toggle) */}
      {showAdd && (
        <form
          onSubmit={onAdd}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          {error && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Table Name</label>
              <input
                type="text"
                className="w-40 rounded-md border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Main Floor 1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Capacity</label>
              <input
                type="number"
                className="w-28 rounded-md border border-slate-300 px-3 py-2"
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="4"
                min={1}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Base Price</label>
              <input
                type="number"
                className="w-32 rounded-md border border-slate-300 px-3 py-2"
                value={form.basePrice}
                onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
                placeholder="0"
                min={0}
                step="0.01"
              />
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
              <input
                type="number"
                className="w-32 rounded-md border border-slate-300 px-3 py-2"
                value={form.basePrice}
                onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
                placeholder="0.00"
                min={0}
                step="0.01"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm({ name: "", capacity: "", notes: "", basePrice: "0" }); }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Add table
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Layout Editor (admin only) */}
      {!loading && rows.length > 0 && isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <TableLayoutEditor tables={rows} onSave={handleSaveLayout} />
        </div>
      )}
      {!loading && rows.length > 0 && !isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Layout editing is restricted to administrators.
        </div>
      )}

      {/* Table list */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Base Price</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(t => {
                const isEditing = editingId === t.tableId;
                return (
                  <tr key={t.tableId} className="text-sm">
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          className="input w-40"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        />
                      ) : (t.name || t.tableId)}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          className="input w-24"
                          value={editForm.capacity}
                          onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))}
                          min={1}
                        />
                      ) : t.capacity}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          className="input w-24"
                          value={editForm.basePrice}
                          onChange={e => setEditForm(f => ({ ...f, basePrice: e.target.value }))}
                          min={0}
                          step="0.01"
                        />
                      ) : `$${(t.basePrice ?? 0).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1"
                            onClick={() => { setEditingId(null); setEditForm({ name: "", capacity: "", basePrice: "0" }); }}
                          >
                            Cancel
                          </button>
                          <button
                            className="rounded-md bg-indigo-600 px-3 py-1 text-white"
                            onClick={() => saveEdit(t.tableId)}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-md border border-slate-300 px-2 py-1"
                            onClick={() => startEdit(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                            onClick={() => onDelete(t.tableId)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No tables yet.
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
