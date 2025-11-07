import { useState, useEffect } from 'react';
import { apiClient, type DiningTable } from '../api/client';
import { useAuth } from '../features/auth/useAuth';

export default function ReservationsPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [form, setForm] = useState({
    userId: user?.id || 0,
    tableId: 0,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const reservationData = {
        userId: user?.id,
        tableId: parseInt(form.tableId.toString()),
        startUtc: form.startUtc,
        endUtc: form.endUtc,
        partySize: parseInt(form.partySize),
        notes: form.notes,
        status: 'pending' as const
      };

      await apiClient.createReservation(reservationData);
      alert('Reservation request sent! We will confirm shortly.');
      
      // Reset form
      setForm({
        userId: user?.id || 0,
        tableId: 0,
        startUtc: '',
        endUtc: '',
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

  const updateForm = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
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