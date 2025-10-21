
import { useEffect, useMemo, useState } from "react";
import {
  listMenu,
  addMenuItem,
  removeMenuItem,
  type MenuItem,
} from "../../lib/adminApi";

import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  TagIcon,
} from "@heroicons/react/20/solid";
import {
  Menu as HUMenu,
  MenuButton,
  MenuItem as HUMenuItem,
  MenuItems as HUMenuItems,
} from "@headlessui/react";

export default function MenuAdmin() {
  const [rows, setRows] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    price: string;         
    category: string;
    available: boolean;
  }>({
    name: "",
    price: "",
    category: "",
    available: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRows(await listMenu());
      setLoading(false);
    })();
  }, []);

  const total = rows.length;
  const availableCount = useMemo(() => rows.filter(r => r.available).length, [rows]);
  const categoryCount = useMemo(() => new Set(rows.map(r => r.category)).size, [rows]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseFloat(form.price);
    if (!form.name.trim() || Number.isNaN(priceNum)) return;

    await addMenuItem({
      name: form.name.trim(),
      price: priceNum,
      category: form.category.trim() || "Uncategorized",
      available: form.available,
    });

    setRows(await listMenu());
    setForm({ name: "", price: "", category: "", available: true });
    setShowAdd(false);
  }

  async function onDelete(id: string) {
    await removeMenuItem(id);
    setRows(await listMenu());
  }

  function exportCSV() {
    const header = ["Name", "Category", "Price", "Available"];
    const lines = rows.map(r =>
      [r.name, r.category, r.price.toFixed(2), r.available ? "yes" : "no"].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "menu.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Menu
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <TagIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Items: {total}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-green-500" />
              Available: {availableCount}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
              Categories: {categoryCount}
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
              New item
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

      {/* Add item (toggle) */}
      {showAdd && (
        <form
          onSubmit={onAdd}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Cheeseburger"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Price</label>
              <input
                type="number"
                step="0.01"
                className="w-28 rounded-md border border-slate-300 px-3 py-2"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="10.99"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
              <input
                className="w-40 rounded-md border border-slate-300 px-3 py-2"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Entrees"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="available"
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={form.available}
                onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
              />
              <label htmlFor="available" className="text-sm text-slate-700">Available</label>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm({ name: "", price: "", category: "", available: true }); }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Add item
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
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(m => (
                <tr key={m.id} className="text-sm">
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">{m.category}</td>
                  <td className="px-3 py-2">${m.price.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.available
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200"
                      }`}
                    >
                      {m.available ? "yes" : "no"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                      onClick={() => onDelete(m.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No menu items yet.
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
