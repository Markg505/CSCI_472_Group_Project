import { useEffect, useMemo, useState } from "react";
import {
  listInventory, addInventoryItem, updateInventoryItem, removeInventoryItem,
  type InventoryItem, type Unit, type CountFreq, type Allergen
} from "../../lib/adminApi";
import {
  CheckIcon, LinkIcon, PencilIcon, TrashIcon, TagIcon, ChevronDownIcon, PlusIcon
} from "@heroicons/react/20/solid";
import {
  Menu as HUMenu, MenuButton, MenuItem as HUMenuItem, MenuItems as HUMenuItems
} from "@headlessui/react";
import AuditLogButton from "../../components/AuditLogButton";

const UNITS: Unit[] = ["each","lb","oz","case","bag"];
const COUNTS: CountFreq[] = ["daily","weekly","monthly"];
const ALLERGENS: Allergen[] = ["none","gluten","dairy","eggs","soy","peanuts","tree-nuts","shellfish","fish","sesame"];

type FormState = Omit<InventoryItem, "id">;

const emptyForm: FormState = {
  name: "", sku: "", category: "",
  unit: "each", packSize: 1,
  qtyOnHand: 0, parLevel: 0, reorderPoint: 0,
  cost: 0, location: "", active: true,
  vendor: "", leadTimeDays: 0, preferredOrderQty: 0,
  wasteQty: 0, lastCountedAt: new Date().toISOString().slice(0,10),
  countFreq: "weekly", lot: "", expiryDate: "",
  allergen: "none",
  conversion: "",
};

export default function InventoryAdmin() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRows(await listInventory());
      setLoading(false);
    })();
  }, []);

  const totalSkus = rows.length;
  const belowPar = useMemo(() => rows.filter(r => r.qtyOnHand < r.parLevel).length, [rows]);
  const toReorder = useMemo(() => rows.filter(r => r.qtyOnHand <= r.reorderPoint).length, [rows]);
  const inventoryValue = useMemo(
    () => rows.reduce((sum, r) => sum + r.qtyOnHand * r.cost, 0),
    [rows]
  );

  function statusFor(r: InventoryItem) {
    if (r.qtyOnHand <= r.reorderPoint) return { txt: "reorder", cls: "bg-rose-50 text-rose-700 ring-rose-200" };
    if (r.qtyOnHand < r.parLevel) return { txt: "below par", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
    return { txt: "ok", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;
    await addInventoryItem({
      ...form,
      packSize: Number(form.packSize) || 1,
      qtyOnHand: Number(form.qtyOnHand) || 0,
      parLevel: Number(form.parLevel) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
      cost: Number(form.cost) || 0,
      leadTimeDays: Number(form.leadTimeDays) || 0,
      preferredOrderQty: Number(form.preferredOrderQty) || 0,
      wasteQty: Number(form.wasteQty) || 0,
    });
    setRows(await listInventory());
    setForm(emptyForm);
    setShowAdd(false);
  }

  async function onDelete(id: string) {
    await removeInventoryItem(id);
    setRows(await listInventory());
  }

  async function onSaveEdit() {
    if (!editing) return;
    const { id, ...patch } = editing;
    await updateInventoryItem(id, patch);
    setRows(await listInventory());
    setEditing(null);
  }

  function exportCSV() {
    const header = [
      "Name","SKU","Category","Unit","PackSize",
      "QtyOnHand","ParLevel","ReorderPoint","Cost","Location","Active",
      "Vendor","LeadTimeDays","PreferredOrderQty","WasteQty","LastCountedAt","CountFreq","Lot","ExpiryDate","Allergen","Conversion"
    ];
    const lines = rows.map(r => [
      r.name, r.sku, r.category, r.unit, r.packSize,
      r.qtyOnHand, r.parLevel, r.reorderPoint, r.cost.toFixed(2), r.location, r.active ? "yes" : "no",
      r.vendor, r.leadTimeDays, r.preferredOrderQty, r.wasteQty, r.lastCountedAt, r.countFreq, r.lot, r.expiryDate, r.allergen, r.conversion
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "inventory.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header + KPIs */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Inventory
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <TagIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              SKUs: {totalSkus}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-amber-500" />
              Below par: {belowPar}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-rose-500" />
              Reorder: {toReorder}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
              Value: ${inventoryValue.toFixed(2)}
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
              <PlusIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
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

          <span className="hidden sm:block ml-3">
            <AuditLogButton entityType="inventory" label="View Change Log" />
          </span>

          <span className="sm:ml-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
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
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100"
                >
                  New
                </button>
              </HUMenuItem>
              <HUMenuItem>
                <button
                  onClick={exportCSV}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100"
                >
                  Export
                </button>
              </HUMenuItem>
              <HUMenuItem>
                <button
                  onClick={() => window.print()}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100"
                >
                  Print
                </button>
              </HUMenuItem>
            </HUMenuItems>
          </HUMenu>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={onAdd} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm grid gap-3 md:grid-cols-6">
          <Input label="Name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Input label="SKU" value={form.sku} onChange={v=>setForm(f=>({...f,sku:v}))}/>
          <Input label="Category" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))}/>
          <Select label="Unit" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v as Unit}))} options={UNITS}/>
          <Num label="Pack Size" value={form.packSize} onChange={v=>setForm(f=>({...f,packSize:v}))}/>
          <Num label="Cost (per unit)" step="0.01" value={form.cost} onChange={v=>setForm(f=>({...f,cost:v}))}/>

          <Num label="Qty On Hand" value={form.qtyOnHand} onChange={v=>setForm(f=>({...f,qtyOnHand:v}))}/>
          <Num label="Par Level" value={form.parLevel} onChange={v=>setForm(f=>({...f,parLevel:v}))}/>
          <Num label="Reorder Point" value={form.reorderPoint} onChange={v=>setForm(f=>({...f,reorderPoint:v}))}/>
          <Input label="Location" value={form.location} onChange={v=>setForm(f=>({...f,location:v}))}/>
          <Input label="Vendor" value={form.vendor} onChange={v=>setForm(f=>({...f,vendor:v}))}/>
          <Num label="Lead Time (days)" value={form.leadTimeDays} onChange={v=>setForm(f=>({...f,leadTimeDays:v}))}/>

          <Num label="Preferred Order Qty" value={form.preferredOrderQty} onChange={v=>setForm(f=>({...f,preferredOrderQty:v}))}/>
          <Num label="Waste Qty" value={form.wasteQty} onChange={v=>setForm(f=>({...f,wasteQty:v}))}/>
          <DateInput label="Last Counted" value={form.lastCountedAt} onChange={v=>setForm(f=>({...f,lastCountedAt:v}))}/>
          <Select label="Count Freq" value={form.countFreq} onChange={v=>setForm(f=>({...f,countFreq:v as CountFreq}))} options={COUNTS}/>
          <Input label="Lot" value={form.lot} onChange={v=>setForm(f=>({...f,lot:v}))}/>
          <DateInput label="Expiry Date" value={form.expiryDate} onChange={v=>setForm(f=>({...f,expiryDate:v}))}/>

          <Select label="Allergen" value={form.allergen} onChange={v=>setForm(f=>({...f,allergen:v as Allergen}))} options={ALLERGENS}/>
          <Input label="Conversion" value={form.conversion} onChange={v=>setForm(f=>({...f,conversion:v}))}/>

          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" className="size-4 rounded border-slate-300"
              checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
            <label htmlFor="active" className="text-sm text-slate-700">Active</label>
          </div>

          <div className="md:col-span-6 flex gap-2 justify-end">
            <button type="button" onClick={()=>{setShowAdd(false); setForm(emptyForm);}}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Add item
            </button>
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
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Cat.</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">Pack</th>
                <th className="px-3 py-2 text-right">On Hand</th>
                <th className="px-3 py-2 text-right">Par</th>
                <th className="px-3 py-2 text-right">Reorder</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2">Allergen</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => {
                const value = r.qtyOnHand * r.cost;
                const s = statusFor(r);
                return (
                  <tr key={r.id} className="text-sm">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.unit}</td>
                    <td className="px-3 py-2 text-right">{r.packSize}</td>
                    <td className="px-3 py-2 text-right">{r.qtyOnHand}</td>
                    <td className="px-3 py-2 text-right">{r.parLevel}</td>
                    <td className="px-3 py-2 text-right">{r.reorderPoint}</td>
                    <td className="px-3 py-2 text-right">${r.cost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${value.toFixed(2)}</td>
                    <td className="px-3 py-2 capitalize">{r.allergen.replace("-", " ")}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
                        {s.txt}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button className="rounded-md border bg-white px-2 py-1 hover:bg-slate-50"
                        onClick={()=>setEditing(r)}>
                        <PencilIcon className="size-5 text-slate-600" />
                      </button>
                      <button className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                        onClick={()=>onDelete(r.id)}>
                        <TrashIcon className="size-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                    No inventory yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Edit: {editing.name}</h3>
            <div className="grid gap-3 md:grid-cols-6">
              <Input label="Name" value={editing.name} onChange={v=>setEditing(e=>e && ({...e, name:v}))}/>
              <Input label="SKU" value={editing.sku} onChange={v=>setEditing(e=>e && ({...e, sku:v}))}/>
              <Input label="Category" value={editing.category} onChange={v=>setEditing(e=>e && ({...e, category:v}))}/>
              <Select label="Unit" value={editing.unit} onChange={v=>setEditing(e=>e && ({...e, unit:v as Unit}))} options={UNITS}/>
              <Num label="Pack Size" value={editing.packSize} onChange={v=>setEditing(e=>e && ({...e, packSize:v}))}/>
              <Num label="Cost (per unit)" step="0.01" value={editing.cost} onChange={v=>setEditing(e=>e && ({...e, cost:v}))}/>

              <Num label="Qty On Hand" value={editing.qtyOnHand} onChange={v=>setEditing(e=>e && ({...e, qtyOnHand:v}))}/>
              <Num label="Par Level" value={editing.parLevel} onChange={v=>setEditing(e=>e && ({...e, parLevel:v}))}/>
              <Num label="Reorder Point" value={editing.reorderPoint} onChange={v=>setEditing(e=>e && ({...e, reorderPoint:v}))}/>
              <Input label="Location" value={editing.location} onChange={v=>setEditing(e=>e && ({...e, location:v}))}/>
              <Input label="Vendor" value={editing.vendor} onChange={v=>setEditing(e=>e && ({...e, vendor:v}))}/>
              <Num label="Lead Time (days)" value={editing.leadTimeDays} onChange={v=>setEditing(e=>e && ({...e, leadTimeDays:v}))}/>

              <Num label="Preferred Order Qty" value={editing.preferredOrderQty} onChange={v=>setEditing(e=>e && ({...e, preferredOrderQty:v}))}/>
              <Num label="Waste Qty" value={editing.wasteQty} onChange={v=>setEditing(e=>e && ({...e, wasteQty:v}))}/>
              <DateInput label="Last Counted" value={editing.lastCountedAt} onChange={v=>setEditing(e=>e && ({...e, lastCountedAt:v}))}/>
              <Select label="Count Freq" value={editing.countFreq} onChange={v=>setEditing(e=>e && ({...e, countFreq:v as CountFreq}))} options={COUNTS}/>
              <Input label="Lot" value={editing.lot} onChange={v=>setEditing(e=>e && ({...e, lot:v}))}/>
              <DateInput label="Expiry Date" value={editing.expiryDate} onChange={v=>setEditing(e=>e && ({...e, expiryDate:v}))}/>

              <Select label="Allergen" value={editing.allergen} onChange={v=>setEditing(e=>e && ({...e, allergen:v as Allergen}))} options={ALLERGENS}/>
              <Input label="Conversion" value={editing.conversion} onChange={v=>setEditing(e=>e && ({...e, conversion:v}))}/>

              <div className="flex items-center gap-2">
                <input id="active2" type="checkbox" className="size-4 rounded border-slate-300"
                  checked={editing.active} onChange={e=>setEditing(x=>x && ({...x, active:e.target.checked}))}/>
                <label htmlFor="active2" className="text-sm text-slate-700">Active</label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setEditing(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={onSaveEdit}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- tiny input helpers --- */
function Input({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input className="w-full rounded-md border border-slate-300 px-3 py-2"
        value={value} onChange={e=>onChange(e.target.value)} />
    </div>
  );
}
function Num({label,value,onChange,step}:{label:string;value:number;onChange:(v:number)=>void;step?:string}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type="number" step={step ?? "1"} className="w-full rounded-md border border-slate-300 px-3 py-2"
        value={value} onChange={e=>onChange(Number(e.target.value))} />
    </div>
  );
}
function Select<T extends string>({label,value,onChange,options}:{label:string;value:T;onChange:(v:T)=>void;options:T[]}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <select className="w-full rounded-md border border-slate-300 px-3 py-2"
        value={value} onChange={e=>onChange(e.target.value as T)}>
        {options.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function DateInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input type="date" className="w-full rounded-md border border-slate-300 px-3 py-2"
        value={value} onChange={e=>onChange(e.target.value)} />
    </div>
  );
}
