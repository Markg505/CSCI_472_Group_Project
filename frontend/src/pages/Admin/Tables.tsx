
import { useEffect, useMemo, useState } from "react";
import {
  listTables,
  addTable,
  removeTable,
  type TableRow,
} from "../../lib/adminApi";

import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  UserGroupIcon, // for seats
} from "@heroicons/react/20/solid";
import {
  Menu as HUMenu,
  MenuButton,
  MenuItem as HUMenuItem,
  MenuItems as HUMenuItems,
} from "@headlessui/react";

export default function TablesAdmin() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState<{ number: string; capacity: string; notes: string }>({
    number: "",
    capacity: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRows(await listTables());
      setLoading(false);
    })();
  }, []);

  const total = rows.length;
  const totalSeats = useMemo(() => rows.reduce((sum, r) => sum + (r.capacity || 0), 0), [rows]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(form.number, 10);
    const cap = parseInt(form.capacity, 10);
    if (Number.isNaN(num) || Number.isNaN(cap) || cap <= 0) return;

    await addTable({ number: num, capacity: cap, notes: form.notes.trim() || undefined });
    setRows(await listTables());
    setForm({ number: "", capacity: "", notes: "" });
    setShowAdd(false);
  }

  async function onDelete(id: string) {
    await removeTable(id);
    setRows(await listTables());
  }

  function exportCSV() {
    const header = ["Number", "Capacity", "Notes"];
    const lines = rows.map(r => [r.number, r.capacity, (r.notes ?? "").replaceAll("\n", " ")].join(","));
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
              {/* total tables */}
              <span className="mr-1.5 inline-block size-2 rounded-full bg-indigo-500" />
              Total: {total}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Seats: {totalSeats}
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
              New table
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

      {/* Add table (toggle) */}
      {showAdd && (
        <form
          onSubmit={onAdd}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Table #</label>
              <input
                type="number"
                className="w-28 rounded-md border border-slate-300 px-3 py-2"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                placeholder="1"
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
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Window, high-top, etc."
              />
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm({ number: "", capacity: "", notes: "" }); }}
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

      {/* Table list */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">Table #</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(t => (
                <tr key={t.id} className="text-sm">
                  <td className="px-3 py-2">{t.number}</td>
                  <td className="px-3 py-2">{t.capacity}</td>
                  <td className="px-3 py-2">{t.notes}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                      onClick={() => onDelete(t.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
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
