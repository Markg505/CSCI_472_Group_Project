import { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient, type DiningTable, type Reservation } from '../api/client';
import { useAuth } from '../features/auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import TableMapView from '../components/TableMapView';
import MockPaymentForm from '../components/MockPaymentForm';

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

export default function ReservationsPage() {
  const { user } = useAuth();
  const uid = (user as any)?.userId ?? (user as any)?.id ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [mapUrl, setMapUrl] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState<Record<string, Reservation>>({});
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // new form shape: date + startTime (dropdown) + computed end time
  const [form, setForm] = useState({
    userId: uid,
    tableId: '',
    date: '',
    startTime: '',
    partySize: '2',
    notes: '',
  });

  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => { setForm(f => ({ ...f, userId: uid })); }, [uid]);

  // load all reservations + my reservations + settings on mount
  useEffect(() => {
    (async () => {
      try {
        const all = await apiClient.getReservations();
        setReservations(all ?? []);
        const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
        setMyReservations(mine);
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
    (async () => {
      try {
        const cfg = await apiClient.getMapImageUrl();
        setMapUrl(cfg?.url ?? '');
      } catch (err) {
        console.warn('Failed to load map image URL', err);
        setMapUrl('');
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

  // generate slots for a given date using settings + existing reservations
  function generateSlotsForDate(date: string) {
    if (!settings || !date) return [] as string[];
    const si = 30; // fixed 30-minute slots
    const startDT = new Date(`${date}T${settings.openTime}:00`);
    const endDT = new Date(`${date}T${settings.closeTime}:00`);
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1);

    // check day open
    const wd = new Date(`${date}T00:00:00`).getDay();
    const map = ['sun','mon','tue','wed','thu','fri','sat'];
    if (!settings.daysOpen[map[wd]]) return [];

    const slots: string[] = [];
    for (let cur = new Date(startDT); cur < endDT; cur.setMinutes(cur.getMinutes() + si)) {
      const slotStartISO = cur.toISOString();
      const slotEndISO = addMinutesToISO(slotStartISO, settings.reservationLengthMinutes);
      // check conflict (if any existing reservation overlaps this slot)
      const conflict = reservations.some(r => {
        if (!r.startUtc || !r.endUtc) return false;
        const rs = new Date(r.startUtc).getTime();
        const re = new Date(r.endUtc).getTime();
        const ss = new Date(slotStartISO).getTime();
        const se = new Date(slotEndISO).getTime();
        return !(se <= rs || ss >= re);
      });
      if (!conflict) {
        const hh = String(cur.getHours()).padStart(2,'0');
        const mm = String(cur.getMinutes()).padStart(2,'0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }

  const slotOptionsForSelectedDate = useMemo(() => generateSlotsForDate(form.date), [form.date, reservations, settings]);

  // computed start/end ISO and end time string
  const computedStartIso = useMemo(() => {
    if (!form.date || !form.startTime) return '';
    return combineDateTimeISO(form.date, form.startTime);
  }, [form.date, form.startTime]);

  const computedEndIso = useMemo(() => {
    if (!computedStartIso || !settings) return '';
    return addMinutesToISO(computedStartIso, settings.reservationLengthMinutes);
  }, [computedStartIso, settings]);

  const computedEndTime = useMemo(() => formatTimeFromISO(computedEndIso), [computedEndIso]);

  // debounce availability check when date/startTime/partySize change
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

  const selectedTable = useMemo(() => tables.find(t => String(t.tableId) === String(form.tableId)), [tables, form.tableId]);
  const selectedTableFee = selectedTable?.basePrice ?? 0;

  const handleTableSelect = (tableId: string | number) => {
    setForm(prev => ({ ...prev, tableId: String(tableId) }));
    setPaymentAuthorized(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!computedStartIso || !computedEndIso) {
      alert('Please pick a date and a start time.');
      return;
    }
    if (!form.tableId) {
      alert('Please select a table.');
      return;
    }
    if (selectedTableFee > 0 && !paymentAuthorized) {
      setPaymentOpen(true);
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
        status: 'pending',
        reservationFee: selectedTableFee,
      };

      await apiClient.createReservation(reservationData);
      alert('Reservation request sent! We will confirm shortly.');
      setPaymentAuthorized(false);
      setPaymentOpen(false);

      // reload reservations and my reservations
      const all = await apiClient.getReservations();
      setReservations(all ?? []);
      const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
      setMyReservations(mine);

      setForm({
        userId: uid,
        tableId: '',
        date: '',
        startTime: '',
        partySize: '2',
        notes: '',
      });
      setAvailableTables([]);
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('Failed to create reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // editing helpers (unchanged)
  const startEdit = (r: Reservation) => {
    if (!r.reservationId) return;
    setEditing(prev => ({ ...prev, [r.reservationId!]: { ...r } }));
  };

  const changeEdit = (id: string, patch: Partial<Reservation>) => {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {} as Reservation), ...patch } }));
  };

  const saveEdit = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    try {
      await apiClient.updateReservation(draft);
      setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
      const all = await apiClient.getReservations();
      const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
      setMyReservations(mine);
      setReservations(all ?? []);
    } catch (e) {
      console.error(e);
      alert('Failed to save changes.');
    }
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
  };

  const cancelReservation = async (id: string) => {
    try {
      await apiClient.updateReservationStatus(id, 'cancelled');
      const all = await apiClient.getReservations();
      const mine = (all ?? []).filter(r => String(r.userId ?? '') === String(uid));
      setMyReservations(mine);
      setReservations(all ?? []);
    } catch (e) {
      console.error(e);
      alert('Failed to cancel reservation.');
    }
  };

  // date min/max for picker based on settings
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
              {/* Party Size & Date/Time */}
              <div className="grid md:grid-cols-3 gap-5 md:gap-6">
                <Field label="Party Size">
                  <input
                    required
                    type="number"
                    min="1"
                    max="20"
                    value={form.partySize}
                    onChange={(e) => setForm(prev => ({ ...prev, partySize: e.target.value, tableId: '' }))}
                    className="input"
                    placeholder="2"
                  />
                </Field>

                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value, startTime: '', tableId: '' }))}
                    min={dateMin}
                    max={dateMax || undefined}
                    className="input"
                  />
                </Field>

                <Field label="Start Time">
                  <select
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value, tableId: '' }))}
                    className="input"
                  >
                    <option value="">Choose time</option>
                    {slotOptionsForSelectedDate.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              {/* End Time display */}
              <div className="grid md:grid-cols-2 gap-5 md:gap-6">
                <Field label="End Time">
                  <div className="input">{computedEndTime || '—'}</div>
                </Field>
                <div className="text-sm text-neutral-600 space-y-1">
                  <div className="font-semibold">Table Fee</div>
                  {selectedTable ? (
                    <div>
                      {selectedTable.name} · ${selectedTableFee.toFixed(2)}
                      {selectedTableFee > 0 && !paymentAuthorized && (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="btn-primary px-4 py-2"
                            onClick={() => setPaymentOpen(true)}
                          >
                            Pay Reservation Fee
                          </button>
                        </div>
                      )}
                      {selectedTableFee > 0 && paymentAuthorized && (
                        <div className="mt-1 text-emerald-600 text-xs">Payment authorized</div>
                      )}
                    </div>
                  ) : (
                    <div>Select a table to see fee</div>
                  )}
                </div>
              </div>

              {/* Table Map View */}
              {checkingAvailability ? (
                <div className="text-center p-8 text-neutral-500">Checking availability...</div>
              ) : availableTables.length > 0 ? (
                <TableMapView
                  allTables={tables}
                  availableTables={availableTables}
                  selectedTableId={form.tableId}
                  onTableSelect={handleTableSelect}
                  className="mt-4"
                  mapUrl={mapUrl}
                />
              ) : form.date && form.startTime ? (
                <div className="text-center p-8 text-rose-600 bg-rose-50 rounded-lg">
                  No tables available for the selected time and party size.
                </div>
              ) : (
                <div className="text-center p-8 text-neutral-500 bg-neutral-50 rounded-lg">
                  Please select a date, time, and party size to see available tables.
                </div>
              )}


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
                  disabled={submitting || !form.tableId || availableTables.length === 0}
                  className="btn-primary px-7 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Booking...' : 'Book a table'}
                </button>
              </div>
            </form>

            <div className="mt-12">
              <h4 className="text-xl font-semibold mb-3">My Reservations</h4>
              {myReservations.length === 0 ? (
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
                            <td className="px-3 py-2">{id}</td>
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
                              ) : (r.notes || '—')}
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
                                    disabled={r.status === 'cancelled'}
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
              )}
            </div>
          </div>
        </div>

        <div className="h-20 md:h-28" />
      </section>

      {paymentOpen && selectedTableFee > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg">
            <MockPaymentForm
              total={selectedTableFee}
              onCancel={() => setPaymentOpen(false)}
              onSubmit={() => { setPaymentAuthorized(true); setPaymentOpen(false); }}
            />
          </div>
        </div>
      )}
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
