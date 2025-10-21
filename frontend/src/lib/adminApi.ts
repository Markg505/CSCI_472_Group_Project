export type Role = "admin" | "user";

export type UserRow = { id: string; name: string; email: string; role: Role };
export type MenuItem = { id: string; name: string; price: number; category: string; available: boolean };
export type TableRow = { id: string; number: number; capacity: number; notes?: string };

let USERS: UserRow[] = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin" },
  { id: "2", name: "Bob Basic",  email: "bob@example.com",   role: "user"  },
];

let MENU: MenuItem[] = [
  { id: "m1", name: "Cheeseburger", price: 10.99, category: "Entrees", available: true },
  { id: "m2", name: "Caesar Salad", price: 8.5,  category: "Salads",  available: true },
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
export async function addMenuItem(m: Omit<MenuItem, "id">) { await wait(120); MENU.push({ id: String(Date.now()), ...m }); }
export async function removeMenuItem(id: string) { await wait(120); MENU = MENU.filter(m => m.id !== id); }

export async function listTables() { await wait(120); return [...TABLES]; }
export async function addTable(t: Omit<TableRow, "id">) { await wait(120); TABLES.push({ id: String(Date.now()), ...t }); }
export async function removeTable(id: string) { await wait(120); TABLES = TABLES.filter(t => t.id !== id); }
export type BookingStatus = "pending" | "confirmed" | "seated" | "cancelled";
export type Booking = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  datetime: string;   // ISO string
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