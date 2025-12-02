// frontend/src/pages/Bookings.tsx
import { useEffect, useMemo, useState } from 'react';
import { apiClient, type Reservation, type HistoryResult, type DiningTable } from '../../api/client';
import { CalendarIcon, CheckIcon, ChevronDownIcon, LinkIcon, UserGroupIcon } from '@heroicons/react/20/solid';
import { Menu as HUMenu, MenuButton as HUMenuButton, MenuItem as HUMenuItem, MenuItems as HUMenuItems } from '@headlessui/react';

const statusOptions = ['pending', 'confirmed', 'cancelled', 'no_show'] as const;

type BookingSettings = {
  openTime: string;
  closeTime: string;
  daysOpen: { [k: string]: boolean };
  maxDaysOut: number;
  reservationLengthMinutes: number;
  // slotIntervalMinutes removed per request — we use fixed 30min slots
};

const DEFAULT_SETTINGS: BookingSettings = {
  openTime: '09:00',
  closeTime: '21:00',
  daysOpen: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  maxDaysOut: 30,
  reservationLengthMinutes: 90,
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoToLocalDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}

function parseTimeToParts(t: string) {
  const [hh, mm] = (t || '00:00').split(':').map(s => parseInt(s, 10));
  return { hh: isNaN(hh) ? 0 : hh, mm: isNaN(mm) ? 0 : mm };
}

function combineDateTimeISO(date: string, time: string) {
  if (!date || !time) return '';
  // create local datetime and return ISO
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

function formatTimeFromISO(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

const LOCAL_SETTINGS_KEY = 'rbos_booking_settings';

export default function Bookings() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyMeta, setHistoryMeta] = useState<HistoryResult<Reservation> | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);

  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const [form, setForm] = useState({
    reservationId: undefined as string|undefined,
    userId: '' as string,
    guestName: '' as string,
    tableId: '' as string,
    date: '',
    startTime: '',
    partySize: 2 as number,
    notes: '',
    status: 'pending' as Reservation['status'] | string,
  });

  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false); // toggles settings panel

  // load reservations + settings on mount
  useEffect(() => { loadReservations(); loadSettings(); loadTables(); }, []);

  async function loadTables() {
    try {
      const data = await apiClient.getTables();
      setTables(data ?? []);
      if ((data ?? []).length > 0) {
        setForm(f => ({ ...f, tableId: f.tableId || String(data[0].tableId) }));
      }
    } catch (err) {
      console.warn('Failed to load tables', err);
      setTables([]);
    }
  }

  async function loadReservations() {
    try {
      setLoading(true);
      const data = await apiClient.getReservationHistory({ pageSize: 50 });
      const items = data?.items ?? [];
      if (items.length === 0) {
        // fallback to raw list if history endpoint is empty or filtered server-side
        const raw = await apiClient.getReservations();
        setReservations(raw ?? []);
        setHistoryMeta(data ?? null);
      } else {
        setReservations(items);
        setHistoryMeta(data);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      try {
        const raw = await apiClient.getReservations();
        setReservations(raw ?? []);
      } catch (inner) {
        console.error('Fallback load failed', inner);
        setReservations([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      setSettingsLoading(true);
      // prefer API if available
      const ac: any = apiClient;
      if (ac && typeof ac.getBookingSettings === 'function') {
        try {
          const s = await ac.getBookingSettings();
          setSettings(s ?? DEFAULT_SETTINGS);
        } catch (err) {
          console.warn('api getBookingSettings failed, ', err);
          const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
          setSettings(local ? JSON.parse(local) : DEFAULT_SETTINGS);
        }
      } else {
        // fallback to localStorage
        const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
        setSettings(local ? JSON.parse(local) : DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.warn('Could not load booking settings, using defaults', err);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    const ac: any = apiClient;
    try {
      if (ac && typeof ac.updateBookingSettings === 'function') {
        const updated = await ac.updateBookingSettings(settings);
        setSettings(updated ?? settings);
        setSettingsMsg('Saved');
      } else {
        // fallback: persist locally so the UI still works
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
        setSettingsMsg('Saved');
      }
      setTimeout(() => setSettingsMsg(null), 2500);
    } catch (err) {
      console.error('Failed to save settings', err);
      // fallback to local storage on error
      try {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
        setSettingsMsg('Saved');
        setTimeout(() => setSettingsMsg(null), 2500);
      } catch (e) {
        setSettingsMsg('Save failed');
        setTimeout(() => setSettingsMsg(null), 4000);
      }
    } finally {
      setSettingsSaving(false);
    }
  }

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reservations.filter(r => (r.startUtc ?? '').startsWith(today) && r.status !== 'cancelled').length;
  }, [reservations]);

  async function handleStatusUpdate(reservationId?: string, newStatus?: string) {
    if (!reservationId) {
      console.warn("handleStatusUpdate: missing reservationId");
      return;
    }
    try {
      await apiClient.updateReservationStatus(reservationId, newStatus ?? 'pending');
      await loadReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      alert('Failed to update reservation status');
    }
  }

  async function handleDelete(reservationId?: string) {
    if (!reservationId) return;
    if (!confirm('Delete reservation?')) return;
    try {
      await apiClient.deleteReservation(reservationId);
      await loadReservations();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete reservation');
    }
  }

  function clearForm() {
    setForm({
      reservationId: undefined,
      userId: '',
      guestName: '',
      tableId: '',
      date: '',
      startTime: '',
      partySize: 2,
      notes: '',
      status: 'pending',
    });
    setEditing(null);
    setShowForm(false);
  }

  function openNewForm() {
    clearForm();
    setShowForm(true);
  }

  useEffect(() => {
    if (showForm && !form.tableId && tables.length) {
      setForm(f => ({ ...f, tableId: String(tables[0].tableId) }));
    }
  }, [showForm, tables]);

  function openEditForm(r: Reservation) {
    setEditing(r);
    setForm({
      reservationId: r.reservationId,
      userId: r.userId ?? '',
      guestName: r.guestName ?? '',
      tableId: String(r.tableId ?? ''),
      date: isoToLocalDate(r.startUtc),
      startTime: formatTimeFromISO(r.startUtc),
      partySize: r.partySize ?? 2,
      notes: r.notes ?? '',
      status: r.status ?? 'pending',
    });
    setShowForm(true);
  }

  async function onSubmitForm(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!settings) {
      alert('Booking settings not loaded');
      return;
    }

    if (!form.date || !form.startTime) {
      alert('Pick date and start time');
      return;
    }

    const startIso = combineDateTimeISO(form.date, form.startTime);
    const endIso = addMinutesToISO(startIso, settings.reservationLengthMinutes);

    const tableId = form.tableId || (tables.length ? String(tables[0].tableId) : '');
    if (!tableId) {
      alert('Pick a table');
      return;
    }

    const cleanedUserId = form.userId?.trim();
    const payload: Reservation = {
      reservationId: form.reservationId,
      userId: cleanedUserId && cleanedUserId.length > 0 ? cleanedUserId : undefined,
      guestName: form.guestName?.trim() || undefined,
      tableId,
      startUtc: startIso,
      endUtc: endIso,
      partySize: Number(form.partySize),
      status: (form.status as any) ?? 'pending',
      notes: form.notes ?? '',
    };

    try {
      if (editing && editing.reservationId) {
        await apiClient.updateReservation(payload);
      } else {
        await apiClient.createReservation(payload);
      }
      await loadReservations();
      clearForm();
    } catch (err) {
      console.error('save failed', err);
      alert('Failed to save reservation');
    }
  }

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

  // tabs: current = start >= today; history = start < today
  const todayStart = startOfToday();
  const currentReservations = reservations.filter(r => {
    if (!r.startUtc) return true;
    return new Date(r.startUtc) >= todayStart;
  });
  const historyReservations = reservations.filter(r => {
    if (!r.startUtc) return false;
    return new Date(r.startUtc) < todayStart;
  });

  function exportCSV() {
    const header = ['ID','Customer ID','Table ID','Start Time','End Time','Party Size','Status','Notes'];
    const list = (tab === 'history' ? historyReservations : currentReservations);
    const lines = list.map(r => [
      r.reservationId ?? '',
      r.userId ?? 'N/A',
      r.tableId,
      formatDate(r.startUtc),
      formatDate(r.endUtc),
      r.partySize,
      r.status,
      (r.notes ?? '').replace(/,/g, ';'),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `reservations-${tab}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  // generate available start slots for a date based on settings and existing reservations
  function generateSlotsForDate(date: string) {
    if (!settings || !date) return [] as string[];
    const si = 30; // fixed half-hour slots per your request
    const open = parseTimeToParts(settings.openTime);
    const close = parseTimeToParts(settings.closeTime);

    // check day open
    const wd = new Date(`${date}T00:00:00`).getDay();
    const map = ['sun','mon','tue','wed','thu','fri','sat'];
    if (!settings.daysOpen[map[wd]]) return [];

    const startDT = new Date(`${date}T${settings.openTime}:00`);
    const endDT = new Date(`${date}T${settings.closeTime}:00`);
    // if close <= open, treat close as next day
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1);

    const slots: string[] = [];
    for (let cur = new Date(startDT); cur < endDT; cur.setMinutes(cur.getMinutes() + si)) {
      const slotStartISO = cur.toISOString();
      const slotEndISO = addMinutesToISO(slotStartISO, settings.reservationLengthMinutes);
      // check conflict
      const conflict = reservations.some(r => {
        if (!r.startUtc || !r.endUtc) return false;
        const rs = new Date(r.startUtc).getTime();
        const re = new Date(r.endUtc).getTime();
        const ss = new Date(slotStartISO).getTime();
        const se = new Date(slotEndISO).getTime();
        return !(se <= rs || ss >= re); // overlap if not (slot ends <= res.start OR slot starts >= res.end)
      });
      if (!conflict) {
        const hh = String(cur.getHours()).padStart(2,'0');
        const mm = String(cur.getMinutes()).padStart(2,'0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }

  // computed end time string for the currently selected start
  const computedEndTime = useMemo(() => {
    if (!settings) return '';
    if (!form.date || !form.startTime) return '';
    const startIso = combineDateTimeISO(form.date, form.startTime);
    const endIso = addMinutesToISO(startIso, settings.reservationLengthMinutes);
    return formatTimeFromISO(endIso);
  }, [form.date, form.startTime, settings]);

  const slotOptionsForSelectedDate = useMemo(() => generateSlotsForDate(form.date), [form.date, settings, reservations]);

  // UI
  return (
    <div className="space-y-6 text-slate-900">
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Reservations</h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <CalendarIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Today: {todayCount}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <UserGroupIcon className="mr-1.5 size-5 shrink-0 text-gray-400" />
              Total: {reservations.length}
            </div>
            {historyMeta && (
              <div className="mt-2 text-sm text-gray-500">
                Retention: {historyMeta.retentionMonths} months (records start {historyMeta.retentionHorizon})
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex lg:mt-0 lg:ml-4 items-center gap-3">
          <div className="flex gap-2">
            <button className={`rounded-md px-3 py-2 text-sm ${tab==='current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`} onClick={() => setTab('current')}>Current</button>
            <button className={`rounded-md px-3 py-2 text-sm ${tab==='history' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`} onClick={() => setTab('history')}>History</button>
          </div>

          <span>
            <button type="button" onClick={openNewForm}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              New reservation
            </button>
          </span>

          <span>
            <button type="button" onClick={exportCSV}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <LinkIcon className="mr-1.5 -ml-0.5 size-5 text-gray-400" />
              Export CSV
            </button>
          </span>

          <span>
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500">
              <CheckIcon className="mr-1.5 -ml-0.5 size-5" />
              Print
            </button>
          </span>
        </div>
      </div>

      {/* SETTINGS toggle button */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            Booking settings
          </button>
        </div>
      </div>

      {/* SETTINGS (embedded) */}
      {showSettings && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Booking Settings</h3>
              <div className="text-xs text-slate-500 mt-1"></div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveSettings}
                disabled={settingsLoading || settingsSaving}
                className={`rounded-md px-3 py-1 text-sm text-white ${settingsSaving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              >
                {settingsSaving ? 'Saving…' : 'Save'}
              </button>
              {settingsMsg && <div className="text-sm text-slate-600">{settingsMsg}</div>}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Open time</label>
              <input
                type="time"
                value={settings?.openTime ?? DEFAULT_SETTINGS.openTime}
                onChange={(e) => setSettings(s => s ? { ...s, openTime: e.target.value } : { ...DEFAULT_SETTINGS, openTime: e.target.value })}
                className="rounded-md border px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Close time</label>
              <input
                type="time"
                value={settings?.closeTime ?? DEFAULT_SETTINGS.closeTime}
                onChange={(e) => setSettings(s => s ? { ...s, closeTime: e.target.value } : { ...DEFAULT_SETTINGS, closeTime: e.target.value })}
                className="rounded-md border px-3 py-2 w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Days open</label>
              <div className="flex gap-2 flex-wrap">
                {(['mon','tue','wed','thu','fri','sat','sun'] as (keyof BookingSettings['daysOpen'])[]).map(d => (
                  <label key={d} className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                    <input
                      type="checkbox"
                      checked={settings?.daysOpen[d] ?? DEFAULT_SETTINGS.daysOpen[d]}
                      onChange={(e) => setSettings(s => s ? { ...s, daysOpen: { ...s.daysOpen, [d]: e.target.checked } } : { ...DEFAULT_SETTINGS, daysOpen: { ...DEFAULT_SETTINGS.daysOpen, [d]: e.target.checked } })}
                    />
                    <span className="text-sm capitalize">{d}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max booking window</label>
              <input
                type="number"
                min={0}
                value={settings?.maxDaysOut ?? DEFAULT_SETTINGS.maxDaysOut}
                onChange={(e) => setSettings(s => s ? { ...s, maxDaysOut: Number(e.target.value) } : { ...DEFAULT_SETTINGS, maxDaysOut: Number(e.target.value) })}
                className="rounded-md border px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reservation length</label>
              <input
                type="number"
                min={5}
                value={settings?.reservationLengthMinutes ?? DEFAULT_SETTINGS.reservationLengthMinutes}
                onChange={(e) => setSettings(s => s ? { ...s, reservationLengthMinutes: Number(e.target.value) } : { ...DEFAULT_SETTINGS, reservationLengthMinutes: Number(e.target.value) })}
                className="rounded-md border px-3 py-2 w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={onSubmitForm} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer ID</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} placeholder="123" />
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (optional)</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} placeholder="Guest name" />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Table</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.tableId}
                onChange={e => setForm(f => ({ ...f, tableId: e.target.value }))}
              >
                <option value="">Select table</option>
                {tables.map(t => (
                  <option key={t.tableId} value={t.tableId}>
                    {t.name ?? `Table ${t.tableId}`} (Seats {t.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" className="rounded-md border border-slate-300 px-3 py-2" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value, startTime: '' }))} />
            </div>

            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Start time</label>
              <select
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 w-full"
              >
                <option value="">Choose time</option>
                {slotOptionsForSelectedDate.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">End time</label>
              <div className="rounded-md border border-slate-300 px-3 py-2 bg-gray-50 text-sm">{computedEndTime || '—'}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Party Size</label>
              <input type="number" min={1} className="w-20 rounded-md border border-slate-300 px-3 py-2" value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: Number(e.target.value) }))} />
            </div>

            <div className="ml-auto flex gap-2 items-end">
              <button type="button" onClick={clearForm} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                {editing ? 'Save' : 'Add reservation'}
              </button>
            </div>

            <div className="w-full mt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading reservations...</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Party Size</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(tab === 'history' ? historyReservations : currentReservations).map(r => (
                <tr key={r.reservationId ?? ''} className="text-sm">
                  <td className="px-3 py-2">{r.reservationId ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.userId ? `User ${r.userId}` : 'Guest'}
                    {r.guestName ? ` · ${r.guestName}` : ''}
                  </td>
                  <td className="px-3 py-2">Table {r.tableId}</td>
                  <td className="px-3 py-2">
                    {formatDate(r.startUtc)}<br/>to {formatDate(r.endUtc)}
                  </td>
                  <td className="px-3 py-2">{r.partySize}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      r.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.notes}</td>
                  <td className="px-3 py-2 text-right">
                    {tab === 'history' ? (
                      <span className="text-slate-500 text-sm">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={r.status ?? 'pending'}
                          onChange={(e) => handleStatusUpdate(String(r.reservationId), e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                        >
                          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <button onClick={() => openEditForm(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-50">
                          Edit
                        </button>

                        <button onClick={() => handleDelete(r.reservationId)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(tab === 'current' ? currentReservations : historyReservations).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">No reservations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
