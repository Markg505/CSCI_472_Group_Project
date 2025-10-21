import { useEffect, useMemo, useState } from "react";
import {
  listBookings,
  listUsers,
  listMenu,
  listTables,
  type Booking,
  type UserRow,
  type MenuItem,
  type TableRow,
} from "../../lib/adminApi";
import {
  CalendarIcon,
  UserGroupIcon,
  TableCellsIcon,
  ChartBarIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, u, m, t] = await Promise.all([
        listBookings(),
        listUsers(),
        listMenu(),
        listTables(),
      ]);
      setBookings(b);
      setUsers(u);
      setMenu(m);
      setTables(t);
      setLoading(false);
    })();
  }, []);

  const isToday = (iso: string) => {
    const dt = new Date(iso);
    const now = new Date();
    return (
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate()
    );
  };

  const todays = useMemo(
    () => bookings.filter(b => isToday(b.datetime)),
    [bookings]
  );
  const todaysActive = useMemo(
    () => todays.filter(b => b.status !== "cancelled"),
    [todays]
  );

  const todayBookingsCount = todaysActive.length;
  const pendingToday = todays.filter(b => b.status === "pending").length;

  const seatsBookedToday = todaysActive.reduce((sum, b) => sum + b.partySize, 0);
  const totalSeats = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const utilPct = totalSeats ? Math.round((seatsBookedToday / totalSeats) * 100) : 0;

  const avgPartyToday = todaysActive.length
    ? (seatsBookedToday / todaysActive.length).toFixed(1)
    : "—";

  const peakHour = useMemo(() => {
    if (!todaysActive.length) return "—";
    const bucket = new Map<number, number>(); // hour -> count
    todaysActive.forEach(b => {
      const h = new Date(b.datetime).getHours();
      bucket.set(h, (bucket.get(h) || 0) + 1);
    });
    let bestH = -1, bestC = -1;
    for (const [h, c] of bucket) if (c > bestC) { bestC = c; bestH = h; }
    if (bestH < 0) return "—";
    const next = (bestH + 1) % 24;
    const fmt = (n: number) =>
      new Date(2000, 0, 1, n).toLocaleTimeString([], { hour: "numeric" });
    return `${fmt(bestH)}–${fmt(next)}`;
  }, [todaysActive]);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Overview
          </h2>

          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <CalendarIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Today’s bookings: {todayBookingsCount}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Staff users: {users.length}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <TableCellsIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Capacity: {totalSeats} seats
            </div>
          </div>
        </div>

        
        <div className="mt-5 lg:mt-0 lg:ml-4">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-xs">
            <AdjustmentsHorizontalIcon className="mr-1.5 size-4 text-slate-500" />
            Manage cards
          </span>
        </div>
      </div>

     
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Seats booked today"
            value={String(seatsBookedToday)}
            sub={`Utilization: ${utilPct}% of ${totalSeats || 0}`}
            icon={<ChartBarIcon className="size-6 text-indigo-600" />}
          />
          <StatCard
            title="Avg. party size (today)"
            value={String(avgPartyToday)}
            sub={`${todayBookingsCount} active bookings`}
            icon={<UserGroupIcon className="size-6 text-emerald-600" />}
          />
          <StatCard
            title="Pending confirmations"
            value={String(pendingToday)}
            sub="Bookings awaiting action"
            icon={<ExclamationTriangleIcon className="size-6 text-amber-600" />}
          />
          <StatCard
            title="Peak booking hour"
            value={peakHour}
            sub="Most requested time today"
            icon={<ClockIcon className="size-6 text-sky-600" />}
          />
        </div>
      )}

      
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Recent activity (demo)</h3>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li>• {todayBookingsCount} booking(s) scheduled today</li>
            <li>• {users.filter(u => u.role === "admin").length} admin user(s)</li>
            <li>• {menu.length} menu item(s) live</li>
            <li>• Seating capacity totals {totalSeats}</li>
          </ul>
        </div>
      )}
    </div>
  );
}


function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-medium text-slate-600">{title}</div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      </div>
      <div className="shrink-0 rounded-lg bg-slate-50 p-2">{icon}</div>
    </div>
  );
}
