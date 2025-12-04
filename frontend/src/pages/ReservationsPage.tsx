import { useState, useEffect, useMemo } from 'react';
import { apiClient, type DiningTable, type Reservation } from '../api/client';
import { useAuth } from '../features/auth/useAuth';
import TableLayoutPicker from '../components/TableLayoutPicker';

type BookingSettings = {
  openTime: string;
  closeTime: string;
  daysOpen: { [k: string]: boolean };
  maxDaysOut: number;
  reservationLengthMinutes: number;
};

const DEFAULT_SETTINGS: BookingSettings = {
  openTime: '09:00',
  closeTime: '21:00',
  daysOpen: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  maxDaysOut: 30,
  reservationLengthMinutes: 90,
};

function isoToLocalDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}

function formatTimeFromISO(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combineDateTimeISO(date: string, time: string) {
  if (!date || !time) return '';
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function parseTimeToParts(t: string) {
  const [hh, mm] = (t || '00:00').split(':').map(s => parseInt(s, 10));
  return { hh: isNaN(hh) ? 0 : hh, mm: isNaN(mm) ? 0 : mm };
}

const LOCAL_SETTINGS_KEY = 'rbos_booking_settings';
const formatId = (id?: string) => id ?? '';

export default function ReservationsPage() {
  const { user } = useAuth();
  const uid = (user as any)?.userId ?? (user as any)?.id ?? '';
  const profileName = (user as any)?.fullName ?? '';
  const profileEmail = (user as any)?.email ?? '';
  const profilePhone = (user as any)?.phone ?? '';

  const CUTOFF_MINUTES = 120;

  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState<Record<string, Reservation>>({});
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Reservation | null>(null);
  const [lookupId, setLookupId] = useState<string>('');
  const [lookupReservation, setLookupReservation] = useState<Reservation | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'not-found'>('idle');

  const [form, setForm] = useState({
    userId: uid,
    tableId: '',
    date: '',
    startTime: '',
    partySize: '2',
    notes: '',
    guestName: profileName,
    contactEmail: profileEmail,
    contactPhone: profilePhone,
  });

  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => { setForm(f => ({ ...f, userId: uid, guestName: profileName, contactEmail: profileEmail, contactPhone: profilePhone })); }, [uid, profileName, profileEmail, profilePhone]);

  useEffect(() => {
    (async () => {
      try {
        const all = await apiClient.getReservations();
        setReservations(all ?? []);
        if (uid) {
          const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
          setMyReservations(mine);
        } else {
          setMyReservations([]);
        }
      } catch (e) {
        console.error('Failed to load reservations', e);
      }
    })();
    (async () => {
      try {
        const tbls = await apiClient.getTables();
        setTables(tbls ?? []);
      } catch (err) {
        console.error('Failed to load tables', err);
      }
    })();
    loadSettings();
  }, [uid]);

  async function loadSettings() {
    setSettingsLoading(true);
    const ac: any = apiClient;
    try {
      if (ac && typeof ac.getBookingSettings === 'function') {
        try {
          const s = await ac.getBookingSettings();
          setSettings(s ?? DEFAULT_SETTINGS);
        } catch (err) {
          const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
          setSettings(local ? JSON.parse(local) : DEFAULT_SETTINGS);
        }
      } else {
        const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
        setSettings(local ? JSON.parse(local) : DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.warn('loadSettings fallback', err);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  }

  function generateSlotsForDate(date: string) {
    if (!settings || !date) return [] as string[];
    const si = 30;
    const startDT = new Date(`${date}T${settings.openTime}:00`);
    const endDT = new Date(`${date}T${settings.closeTime}:00`);
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1);

    const wd = new Date(`${date}T00:00:00`).getDay();
    const map = ['sun','mon','tue','wed','thu','fri','sat'];
    if (!settings.daysOpen[map[wd]]) return [];

    const slots: string[] = [];
    for (let cur = new Date(startDT); cur < endDT; cur.setMinutes(cur.getMinutes() + si)) {
      const hh = String(cur.getHours()).padStart(2,'0');
      const mm = String(cur.getMinutes()).padStart(2,'0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }

  const slotOptionsForSelectedDate = useMemo(() => generateSlotsForDate(form.date), [form.date, reservations, settings]);

  const computedStartIso = useMemo(() => {
    if (!form.date || !form.startTime) return '';
    return combineDateTimeISO(form.date, form.startTime);
  }, [form.date, form.startTime]);

  const computedEndIso = useMemo(() => {
    if (!computedStartIso || !settings) return '';
    return addMinutesToISO(computedStartIso, settings.reservationLengthMinutes);
  }, [computedStartIso, settings]);

  const computedEndTime = useMemo(() => formatTimeFromISO(computedEndIso), [computedEndIso]);

  useEffect(() => {
    let mounted = true;
    const checkAvailability = async () => {
      if (!computedStartIso || !computedEndIso || !form.partySize) {
        setAvailableTables([]);
        return;
      }
      setCheckingAvailability(true);
      try {
        const partySize = parseInt(form.partySize || '2');
        const available = await apiClient.getAvailableTables(computedStartIso, computedEndIso, partySize);
        if (!mounted) return;
        const tableMap = new Map((tables ?? []).map(t => [String(t.tableId), t]));
        const filtered = (available ?? []).map(t => {
          const match = tableMap.get(String(t.tableId));
          return match ? match : t;
        }).filter((t, idx, arr) =>
          arr.findIndex(x => String(x.tableId) === String(t.tableId)) === idx
        );
        setAvailableTables(filtered);
      } catch (err) {
        console.error('Error checking availability:', err);
        if (mounted) setAvailableTables([]);
      } finally {
        if (mounted) setCheckingAvailability(false);
      }
    };

    const id = setTimeout(checkAvailability, 500);
    return () => { mounted = false; clearTimeout(id); };
  }, [computedStartIso, computedEndIso, form.partySize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);
    setConfirmation(null);

    if (!form.guestName.trim() || !form.contactEmail.trim() || !form.contactPhone.trim()) {
      setErrors('Name, email, and phone are required.');
      return;
    }
    if (!computedStartIso || !computedEndIso) {
      setErrors('Please pick a date and a start time.');
      return;
    }
    if (!form.tableId) {
      setErrors('Please select a table.');
      return;
    }

    setSubmitting(true);
    try {
      const reservationData: Reservation = {
        userId: uid,
        tableId: form.tableId,
        startUtc: computedStartIso,
        endUtc: computedEndIso,
        partySize: parseInt(form.partySize),
        notes: form.notes,
        guestName: form.guestName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        status: 'pending',
      };

      const created = await apiClient.createReservation(reservationData);
      const all = await apiClient.getReservations();
      setReservations(all ?? []);
      const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
      setMyReservations(mine);
      const latest = created?.reservationId ? created : (all ?? []).find(r => r.startUtc === computedStartIso && r.tableId === form.tableId);
      setConfirmation(latest ?? reservationData);

      setForm(f => ({
        ...f,
        tableId: '',
        date: '',
        startTime: '',
        partySize: '2',
        notes: '',
      }));
      setAvailableTables([]);
    } catch (error) {
      console.error('Error creating reservation:', error);
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('409') || /already booked/i.test(msg)) {
        setErrors('That table is already booked for the selected time. Please choose another table or time.');
      } else {
        setErrors('Failed to create reservation. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (r: Reservation) => {
    if (!r.reservationId) return;
    setEditing(prev => ({
      ...prev,
      [r.reservationId!]: {
        ...r,
        guestName: r.guestName ?? '',
        contactEmail: r.contactEmail ?? '',
        contactPhone: r.contactPhone ?? '',
      }
    }));
  };

  const changeEdit = (id: string, patch: Partial<Reservation>) => {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {} as Reservation), ...patch } }));
  };

  const saveEdit = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    if (isWithinCutoff(draft.startUtc)) {
      setErrors('This reservation is within the cutoff window and cannot be edited.');
      return;
    }
    try {
      await apiClient.updateReservation(draft);
      setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
      const all = await apiClient.getReservations();
      if (uid) {
        const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
        setMyReservations(mine);
      } else {
        setMyReservations([]);
      }
      setReservations(all ?? []);
      setErrors(null);
    } catch (e) {
      console.error(e);
      setErrors('Failed to save changes.');
    }
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
  };

  const cancelReservation = async (id: string) => {
    try {
      const target = reservations.find(r => r.reservationId === id);
      if (target && isWithinCutoff(target.startUtc)) {
        setErrors('This reservation is within the cutoff window and cannot be cancelled.');
        return;
      }
      await apiClient.updateReservationStatus(id, 'cancelled');
      const all = await apiClient.getReservations();
      if (uid) {
        const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
        setMyReservations(mine);
      } else {
        setMyReservations([]);
      }
      setReservations(all ?? []);
      setErrors(null);
    } catch (e) {
      console.error(e);
      setErrors('Failed to cancel reservation.');
    }
  };

  const dateMin = useMemo(() => {
    const now = new Date();
    const Y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const D = String(now.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
  }, []);

  const dateMax = useMemo(() => {
    if (!settings) return '';
    const now = new Date();
    now.setDate(now.getDate() + (settings.maxDaysOut ?? DEFAULT_SETTINGS.maxDaysOut));
    const Y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const D = String(now.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
  }, [settings]);

  function isWithinCutoff(startIso?: string) {
    if (!startIso) return false;
    const start = new Date(startIso).getTime();
    const now = Date.now();
    const diffMinutes = (start - now) / 60000;
    return diffMinutes < CUTOFF_MINUTES;
  }

  useEffect(() => {
    let active = true;
    const trimmed = lookupId.trim();
    if (!trimmed) {
      setLookupReservation(null);
      setLookupStatus('idle');
      return;
    }
    const local = reservations.find(r => String(r.reservationId) === trimmed);
    if (local) {
      setLookupReservation(local);
      setLookupStatus('idle');
      return;
    }
    setLookupStatus('loading');
    (async () => {
      try {
        const fetched = await apiClient.getReservationById(trimmed);
        if (!active) return;
        setLookupReservation(fetched);
        setLookupStatus('idle');
      } catch {
        if (!active) return;
        setLookupReservation(null);
        setLookupStatus('not-found');
      }
    })();
    return () => { active = false; };
  }, [lookupId, reservations]);

  return (
    <>
      {/* Testimonials header */}
      <section className="bg-card">
        <div className="container-xl py-20 md:py-28 text-center">
          <h2 className="h2">Make a Reservation</h2>
          <p className="mt-2 text-gold tracking-wide uppercase text-xs">Book your perfect table</p>
          <p className="mt-6 max-w-3xl mx-auto text-mute">
            Experience exceptional dining in an intimate setting. Reserve your table below.
          </p>
        </div>
      </section>

      {/* Booking card */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-card" />
        
        <div className="container-xl">
          <div className="mx-auto -mt-16 md:-mt-24 rounded-3xl bg-white text-black shadow-2xl border border-black/5 px-6 py-10 md:p-14 max-w-5xl">
            <div className="text-center">
              <h3 className="font-display text-3xl md:text-4xl">Book A Table</h3>
              <p className="mt-2 text-sm text-neutral-500">Don't wait and take a taste</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 grid gap-5 md:gap-6">
              {errors && (
                <div className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">
                  {errors}
                </div>
              )}
              {/* Party Size & Date/Time */}
              <div className="grid md:grid-cols-3 gap-5 md:gap-6">
                <Field label="Full Name">
                  <input
                    required
                    type="text"
                    value={form.guestName}
                    onChange={(e) => setForm(prev => ({ ...prev, guestName: e.target.value }))}
                    className="input"
                    placeholder="Name"
                  />
                </Field>

                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="input"
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    required
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="input"
                    placeholder="(555) 123-4567"
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-3 gap-5 md:gap-6">
                <Field label="Party Size">
                  <input
                    required
                    type="number"
                    min="1"
                    max="20"
                    value={form.partySize}
                    onChange={(e) => setForm(prev => ({ ...prev, partySize: e.target.value }))}
                    className="input"
                    placeholder="2"
                  />
                </Field>

                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value, startTime: '' }))}
                    min={dateMin}
                    max={dateMax || undefined}
                    className="input"
                  />
                </Field>

                <Field label="Start Time">
                  <select
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="input"
                  >
                    <option value="">Choose time</option>
                    {slotOptionsForSelectedDate.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              {/* End Time display */}
              <div className="grid md:grid-cols-1 gap-5 md:gap-6">
                <Field label="End Time">
                  <div className="input">{computedEndTime || '—'}</div>
                </Field>
              </div>

              {/* Visual Table Layout */}
              {form.date && form.startTime && (
                <Field label="Select Your Table">
                  <TableLayoutPicker
                    tables={tables}
                    availableTables={availableTables}
                    selectedTableId={form.tableId}
                    onSelectTable={(tableId) => setForm(prev => ({ ...prev, tableId }))}
                    checkingAvailability={checkingAvailability}
                  />
                </Field>
              )}

              {!form.date || !form.startTime ? (
                <div className="text-sm text-neutral-500 text-center py-4">
                  Select date and time to see available tables
                </div>
              ) : null}

              {/* Additional Notes */}
              <Field label="Special Requests (Optional)">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="input resize-none"
                  placeholder="Any special requirements or celebrations..."
                />
              </Field>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={submitting || availableTables.length === 0}
                  className="btn-primary px-7 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Booking...' : 'Book a table'}
                </button>
              </div>
            </form>

            {confirmation && (
              <div className="mt-6 rounded-xl border border-black/60 bg-black p-5 text-sm text-white/80 shadow-lg">
                <div className="font-semibold text-lg text-white">Reservation submitted</div>
                <p className="mt-2 text-white/90">
                  Confirmation #: <span className="font-mono text-white">{formatId(confirmation.reservationId)}</span>
                </p>
                <p className="mt-1">Table: {confirmation.tableId}</p>
                <p className="mt-1">Start: {new Date(confirmation.startUtc).toLocaleString()}</p>
                <p className="mt-1">Status: {confirmation.status}</p>
              </div>
            )}

            <div className="mt-12">
              <h4 className="text-xl font-semibold mb-3">My Reservations</h4>
              {uid ? (
                myReservations.length === 0 ? (
                  <div className="text-sm text-neutral-500">You have no reservations yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">ID</th>
                          <th className="px-3 py-2 text-left">Table</th>
                          <th className="px-3 py-2 text-left">Start</th>
                          <th className="px-3 py-2 text-left">End</th>
                          <th className="px-3 py-2 text-left">Party</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {myReservations.map(r => {
                          const id = r.reservationId!;
                          const ed = editing[id];
                          const isEditing = !!ed;
                          return (
                            <tr key={id}>
                              <td className="px-3 py-2">{formatId(id)}</td>
                              <td className="px-3 py-2">Table {r.tableId}</td>
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <input
                                    type="datetime-local"
                                    value={ed.startUtc?.slice(0,16) || ''}
                                    onChange={(e)=>changeEdit(id,{ startUtc: e.target.value })}
                                    className="input"
                                  />
                                ) : new Date(r.startUtc).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <input
                                    type="datetime-local"
                                    value={ed.endUtc?.slice(0,16) || ''}
                                    onChange={(e)=>changeEdit(id,{ endUtc: e.target.value })}
                                    className="input"
                                  />
                                ) : new Date(r.endUtc).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <input
                                    type="number" min={1} max={20}
                                    value={ed.partySize || 1}
                                    onChange={(e)=>changeEdit(id,{ partySize: Number(e.target.value) })}
                                    className="input w-20"
                                  />
                                ) : r.partySize}
                              </td>
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
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={ed.notes || ''}
                                    onChange={(e)=>changeEdit(id,{ notes: e.target.value })}
                                    className="input"
                                  />
                                ) : (r.notes || '-')}
                              </td>
                              <td className="px-3 py-2 space-x-2">
                                {!isEditing ? (
                                  <>
                                    <button
                                      className="rounded-md border px-2 py-1"
                                      onClick={()=>startEdit(r)}
                                      disabled={r.status === 'cancelled'}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="rounded-md border px-2 py-1"
                                      onClick={()=>cancelReservation(id)}
                                      disabled={r.status === 'cancelled' || isWithinCutoff(r.startUtc)}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="rounded-md border px-2 py-1 bg-indigo-600 text-white"
                                      onClick={()=>saveEdit(id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="rounded-md border px-2 py-1"
                                      onClick={()=>cancelEdit(id)}
                                    >
                                      Close
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="text-sm text-neutral-500">Log in to view your reservations.</div>
              )}
            </div>
          </div>
        </div>

        {/* Lookup by confirmation ID for quick modify/cancel */}
        <div className="container-xl mt-8">
          <div className="max-w-5xl mx-auto rounded-3xl bg-white text-black shadow border border-black/5 px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h4 className="text-xl font-semibold">Have a confirmation ID?</h4>
                <p className="text-sm text-neutral-500">Enter it to review or cancel quickly.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={lookupId}
                  onChange={(e)=>setLookupId(e.target.value)}
                  placeholder="Reservation ID"
                  className="input"
                />
                {lookupStatus === 'loading' && (
                  <div className="text-sm text-neutral-500 self-center">Looking up reservation...</div>
                )}
                {lookupStatus === 'not-found' && lookupId.trim() && (
                  <div className="text-sm text-rose-500 self-center">No matching reservation found.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lookup edit panel */}
        {lookupReservation && (
          <div className="max-w-5xl mx-auto mt-4 rounded-3xl bg-white text-black shadow border border-black/5 px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">Reservation {formatId(lookupReservation.reservationId)}</div>
                <div className="text-sm text-neutral-500">
                  Status: {lookupReservation.status} · Table {lookupReservation.tableId} · Party {lookupReservation.partySize}
                </div>
              </div>
              {editing[String(lookupReservation.reservationId)] ? (
                <div className="text-sm text-amber-600">Editing</div>
              ) : null}
            </div>

            {editing[String(lookupReservation.reservationId)] ? (
              (() => {
                const ed = editing[String(lookupReservation.reservationId)];
                return (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-neutral-600">
                      Guest name
                      <input
                        className="input mt-1"
                        value={ed.guestName ?? ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { guestName: e.target.value })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600">
                      Contact email
                      <input
                        className="input mt-1"
                        type="email"
                        value={ed.contactEmail ?? ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { contactEmail: e.target.value })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600">
                      Contact phone
                      <input
                        className="input mt-1"
                        type="tel"
                        value={ed.contactPhone ?? ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { contactPhone: e.target.value })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600">
                      Status
                      <div className="mt-1 px-3 py-2 rounded-md border bg-neutral-100 text-neutral-700">
                        {ed.status ?? 'pending'}
                      </div>
                    </label>
                    <label className="text-sm text-neutral-600">
                      Table
                      <select
                        className="input mt-1"
                        value={ed.tableId ?? ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { tableId: e.target.value })}
                      >
                        <option value="">Select</option>
                        {tables.map(t => (
                          <option key={t.tableId} value={t.tableId}>
                            {t.name ?? `Table ${t.tableId}`} (Seats {t.capacity})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-neutral-600">
                      Start
                      <input
                        type="datetime-local"
                        className="input mt-1"
                        value={ed.startUtc?.slice(0,16) || ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { startUtc: e.target.value })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600">
                      End
                      <input
                        type="datetime-local"
                        className="input mt-1"
                        value={ed.endUtc?.slice(0,16) || ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { endUtc: e.target.value })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600">
                      Party size
                      <input
                        type="number"
                        min={1}
                        className="input mt-1"
                        value={ed.partySize ?? 1}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { partySize: Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-sm text-neutral-600 md:col-span-2">
                      Notes
                      <input
                        className="input mt-1"
                        value={ed.notes ?? ''}
                        onChange={(e)=>changeEdit(String(lookupReservation.reservationId), { notes: e.target.value })}
                      />
                    </label>
                    <div className="md:col-span-2 flex gap-2 justify-end">
                      <button
                        className="rounded-md border px-3 py-2 text-sm"
                        onClick={()=>cancelEdit(String(lookupReservation.reservationId))}
                      >
                        Close
                      </button>
                      <button
                        className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm"
                        onClick={()=>saveEdit(String(lookupReservation.reservationId))}
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700">
                <div>
                  <div className="text-neutral-500 text-xs uppercase">When</div>
                  <div>{new Date(lookupReservation.startUtc).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs uppercase">Contact</div>
                  <div>{lookupReservation.contactEmail || '—'}</div>
                  <div>{lookupReservation.contactPhone || ''}</div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={()=>startEdit(lookupReservation)}
                    disabled={lookupReservation.status === 'cancelled' || isWithinCutoff(lookupReservation.startUtc)}
                  >
                    Modify
                  </button>
                  <button
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={()=>cancelReservation(String(lookupReservation.reservationId))}
                    disabled={lookupReservation.status === 'cancelled' || isWithinCutoff(lookupReservation.startUtc)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-20 md:h-28" />
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[13px] uppercase tracking-wide text-neutral-500">{label}</div>
      {children}
    </label>
  );
}
