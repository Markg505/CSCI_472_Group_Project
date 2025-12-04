export type Role = "admin" | "user";
export type CountFreq = "daily" | "weekly" | "monthly";
export type Unit = "each" | "lb" | "oz" | "case" | "bag";
export type Allergen =
  | "none" | "gluten" | "dairy" | "eggs" | "soy"
  | "peanuts" | "tree-nuts" | "shellfish" | "fish" | "sesame";

export type UserRow = { id: string; name: string; email: string; role: Role };
export type MenuItem = { itemId: string; name: string; price: number; category: string; active: boolean, imageUrl: string, dietaryTags: string, description: string, outOfStock?: boolean};
export type TableRow = { id: string; number: number; capacity: number; notes?: string };
export type InventoryItem = {
  id: string;
  name: string;
  sku: string;                 
  category: string;
  unit: Unit;                  
  packSize: number;            
  qtyOnHand: number;
  parLevel: number;            
  reorderPoint: number;        
  cost: number;               
  location: string;           
  active: boolean;
  vendor: string;              
  leadTimeDays: number;
  preferredOrderQty: number;
  wasteQty: number;            
  lastCountedAt: string;      
  countFreq: CountFreq;        
  lot: string;                 
  expiryDate: string;          
  allergen: Allergen;          
  conversion: string;          
};
export type NewInventoryItem = Omit<InventoryItem, "id">;

let USERS: UserRow[] = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Basic",  email: "bob@example.com",   role: "user"  },
];

let MENU: MenuItem[] = [
  { itemId: "m1", name: "Cheeseburger", price: 10.99, category: "Entrees", active: true, imageUrl: '', dietaryTags: '', description: '' },
  { itemId: "m2", name: "Caesar Salad", price: 8.5,  category: "Salads",  active: true, imageUrl: '', dietaryTags: '', description: '' },
];

let TABLES: TableRow[] = [
  { id: "t1", number: 1, capacity: 4 },
  { id: "t2", number: 2, capacity: 2 },
];

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function listUsers() { await wait(120); return [...USERS]; }
export async function addUser(u: Omit<UserRow, "id">) { await wait(120); USERS.push({ id: String(Date.now()), ...u }); }
export async function removeUser(id: string) { await wait(120); USERS = USERS.filter(u => u.id !== id); }

export async function listMenu() { await wait(120); return [...MENU]; }
export async function addMenuItem(m: Omit<MenuItem, "itemId">) { await wait(120); MENU.push({ itemId: String(Date.now()), ...m }); }
export async function removeMenuItem(id: string) { await wait(120); MENU = MENU.filter(m => m.itemId !== id); }

export async function listTables() { await wait(120); return [...TABLES]; }
export async function addTable(t: Omit<TableRow, "id">) { await wait(120); TABLES.push({ id: String(Date.now()), ...t }); }
export async function removeTable(id: string) { await wait(120); TABLES = TABLES.filter(t => t.id !== id); }
export type BookingStatus = "pending" | "confirmed" | "seated" | "cancelled";
export type Booking = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  datetime: string;
  notes?: string;
  status: BookingStatus;
};

let BOOKINGS: Booking[] = [
  {
    id: "b1",
    name: "Jane Doe",
    phone: "555-0101",
    partySize: 4,
    datetime: new Date(Date.now() + 3600_000).toISOString(),
    status: "confirmed",
    notes: "Window seat",
  },
];

export async function listBookings(): Promise<Booking[]> {
  await wait(120); return [...BOOKINGS].sort((a,b)=>a.datetime.localeCompare(b.datetime));
}

export async function addBooking(b: Omit<Booking, "id"|"status"> & { status?: BookingStatus }) {
  await wait(120);
  BOOKINGS.push({ id: String(Date.now()), status: b.status ?? "pending", ...b });
}

export async function updateBooking(id: string, patch: Partial<Booking>) {
  await wait(120);
  BOOKINGS = BOOKINGS.map(b => (b.id === id ? { ...b, ...patch } : b));
}

export async function removeBooking(id: string) {
  await wait(120);
  BOOKINGS = BOOKINGS.filter(b => b.id !== id);
}
const KEY = "RBOS_INVENTORY_FULL_DROPDOWN";
let INVENTORY: InventoryItem[] = load();

function todayISO(): string {
  return new Date().toISOString().slice(0,10);
}

function safeRandomId(): string {
  try {
    const c: any = (globalThis as any).crypto;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID().toString();
    }
  } catch {}
  return `inv-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function seed(): InventoryItem[] {
  const rows: InventoryItem[] = [
    {
      id: "111111",
      name: "Brioche Buns",
      sku: "BN-BRIOCHE-12",
      category: "Bakery",
      unit: "case",
      packSize: 12,
      qtyOnHand: 3,
      parLevel: 4,
      reorderPoint: 2,
      cost: 16.5,
      location: "Dry A3",
      active: true,

      vendor: "Sunrise Bakery",
      leadTimeDays: 2,
      preferredOrderQty: 4,
      wasteQty: 6,
      lastCountedAt: todayISO(),
      countFreq: "weekly",
      lot: "BB-2409A",
      expiryDate: "",
      allergen: "gluten",
      conversion: "1 case = 12 each",
    },
    {
      id: "111112",
      name: "Ground Beef 80/20",
      sku: "MEAT-GB80-5LB",
      category: "Meat",
      unit: "lb",
      packSize: 5,
      qtyOnHand: 18,
      parLevel: 20,
      reorderPoint: 12,
      cost: 3.2,
      location: "Walk-in",
      active: true,
      vendor: "Acme Meats",
      leadTimeDays: 1,
      preferredOrderQty: 50,
      wasteQty: 0,
      lastCountedAt: todayISO(),
      countFreq: "weekly",
      lot: "GB-2410",
      expiryDate: "",
      allergen: "none",
      conversion: "1 bag = 5 lb",
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(rows));
  return rows;
}

function load(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as InventoryItem[];
  } catch {
    return seed();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(INVENTORY));
}

export async function listInventory(): Promise<InventoryItem[]> {
  return structuredClone(INVENTORY);
}

export async function addInventoryItem(item: NewInventoryItem): Promise<InventoryItem> {
  const row: InventoryItem = { ...item, id: safeRandomId() };
  INVENTORY.unshift(row);
  save();
  return structuredClone(row);
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<NewInventoryItem>
): Promise<InventoryItem> {
  const idx = INVENTORY.findIndex(r => r.id === id);
  if (idx === -1) throw new Error("not found");
  INVENTORY[idx] = { ...INVENTORY[idx], ...patch };
  save();
  return structuredClone(INVENTORY[idx]);
}

export async function removeInventoryItem(id: string): Promise<void> {
  INVENTORY = INVENTORY.filter(r => r.id !== id);
  save();}
