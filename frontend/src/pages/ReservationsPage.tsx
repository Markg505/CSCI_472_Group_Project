import { useState, useEffect } from 'react';
import { apiClient, type DiningTable, type Reservation } from '../api/client';
import { useAuth } from '../features/auth/useAuth';

export default function ReservationsPage() {
  const { user } = useAuth();
  const uid = (user as any)?.userId ?? (user as any)?.id ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState<Record<number, Reservation>>({});
  const [form, setForm] = useState({
    userId: uid,
    tableId: '',
    startUtc: '',
    endUtc: '',
    partySize: '2',
    notes: '',
  });

  // Check availability when dates or party size change
  useEffect(() => {
    const checkAvailability = async () => {
      if (form.startUtc && form.endUtc && form.partySize) {
        setCheckingAvailability(true);
        try {
          const partySize = parseInt(form.partySize);
          const tables = await apiClient.getAvailableTables(
            form.startUtc,
            form.endUtc,
            partySize
          );
          setAvailableTables(tables);
        } catch (error) {
          console.error('Error checking availability:', error);
        } finally {
          setCheckingAvailability(false);
        }
      }
    };

    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [form.startUtc, form.endUtc, form.partySize]);

  useEffect(() => {
    setForm(f => ({ ...f, userId: uid }));
  }, [uid]);

  useEffect(() => {
    (async () => {
      try {
        const all = await apiClient.getReservations();
        const mine = (all ?? []).filter(r => (r.userId ?? 0) === uid);
        setMyReservations(mine);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const reservationData: Reservation = {
        userId: uid,
        tableId: form.tableId,
        startUtc: form.startUtc,
        endUtc: form.endUtc,
        partySize: parseInt(form.partySize),
        notes: form.notes,
        status: 'pending'
      };

      await apiClient.createReservation(reservationData);
      alert('Reservation request sent! We will confirm shortly.');
      
      setForm({
        userId: uid,
        tableId: '0',
        startUtc: '',
        endUtc: '',
        partySize: '2',
        notes: '',
      });
      setAvailableTables([]);
      const all = await apiClient.getReservations();
      const mine = (all ?? []).filter(r => (r.userId ?? 0) === uid);
      setMyReservations(mine);
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('Failed to create reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (key: string, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

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
      const mine = (all ?? []).filter(r => (r.userId ?? 0) === uid);
      setMyReservations(mine);
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
      const mine = (all ?? []).filter(r => (r.userId ?? 0) === uid);
      setMyReservations(mine);
    } catch (e) {
      console.error(e);
      alert('Failed to cancel reservation.');
    }
  };

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
                    onChange={(e) => updateForm('partySize', e.target.value)}
                    className="input"
                    placeholder="2"
                  />
                </Field>

                <Field label="Start Time">
                  <input
                    required
                    type="datetime-local"
                    value={form.startUtc}
                    onChange={(e) => updateForm('startUtc', e.target.value)}
                    min={getMinDateTime()}
                    className="input"
                  />
                </Field>

                <Field label="End Time">
                  <input
                    required
                    type="datetime-local"
                    value={form.endUtc}
                    onChange={(e) => updateForm('endUtc', e.target.value)}
                    min={form.startUtc || getMinDateTime()}
                    className="input"
                  />
                </Field>
              </div>

              {/* Available Tables */}
              <Field label="Available Tables">
                {checkingAvailability ? (
                  <div className="text-sm text-neutral-500">Checking availability...</div>
                ) : availableTables.length > 0 ? (
                  <select
                    required
                    value={form.tableId}
                    onChange={(e) => updateForm('tableId', e.target.value)}
                    className="input"
                  >
                    <option value="">Select a table</option>
                    {availableTables.map(table => (
                      <option key={table.tableId} value={table.tableId}>
                        {table.name} (Seats {table.capacity})
                      </option>
                    ))}
                  </select>
                ) : form.startUtc && form.endUtc ? (
                  <div className="text-sm text-rose-600">
                    No tables available for the selected time and party size
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">
                    Select date and time to see available tables
                  </div>
                )}
              </Field>

              {/* Additional Notes */}
              <Field label="Special Requests (Optional)">
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
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

            <div className="mt-12">
              <h4 className="text-xl font-semibold mb-3">My Reservations</h4>
              {myReservations.length === 0 ? (
                <div className="text-sm text-neutral-500">You have no reservations yet.</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-sm">
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
