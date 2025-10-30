import { useState } from "react";

const times = [
  "5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
];

export default function BookingPage() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    time: "",
    date: "",
    people: "",
  });

  function update<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
     
      await new Promise((r) => setTimeout(r, 700));
      alert("Reservation request sent!");
      setForm({ name:"", email:"", time:"", date:"", people:"" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Testimonials header (minimal, to match your screenshot vibe) */}
      <section className="bg-card">
        <div className="container-xl py-20 md:py-28 text-center">
          <h2 className="h2">Testimonials</h2>
          <p className="mt-2 text-gold tracking-wide uppercase text-xs">Trust the people who taste us</p>
          <p className="mt-6 max-w-3xl mx-auto text-mute">
            
          </p>

          {/* avatar + arrows */}
          <div className="mt-10 flex items-center justify-center gap-6">
            <img
              src="https://i.pravatar.cc/80?img=5"
              alt="Sarah Lima"
              className="h-16 w-16 rounded-full ring-2 ring-white/10"
            />
            <div className="text-left">
              <div className="text-sm tracking-wider text-mute">SARAH LIMA</div>
              <div className="mt-2 flex gap-4 justify-center text-text/60">
                <button className="btn-ghost px-3 py-1 rounded-xl">←</button>
                <button className="btn-ghost px-3 py-1 rounded-xl">→</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking card */}
      <section className="relative">
        {/* dark separator strip like the screenshot */}
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-card" />

        <div className="container-xl">
          <div className="mx-auto -mt-16 md:-mt-24 rounded-3xl bg-white text-black shadow-2xl border border-black/5 px-6 py-10 md:p-14 max-w-5xl">
            <div className="text-center">
              <h3 className="font-display text-3xl md:text-4xl">Book A Table</h3>
              <p className="mt-2 text-sm text-neutral-500">Don’t wait and take a taste</p>
            </div>

            <form onSubmit={onSubmit} className="mt-10 grid gap-5 md:gap-6">
              {/* Row 1 */}
              <div className="grid md:grid-cols-2 gap-5 md:gap-6">
                <Field label="Name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    type="text"
                    placeholder="John Doe"
                    className="input"
                  />
                </Field>

                <Field label="Email">
                  <input
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    type="email"
                    placeholder="johndoe@gmail.com"
                    className="input"
                  />
                </Field>
              </div>

              {/* Row 2 */}
              <div className="grid md:grid-cols-3 gap-5 md:gap-6">
                <Field label="Time">
                  <div className="relative">
                    <select
                      required
                      value={form.time}
                      onChange={(e) => update("time", e.target.value)}
                      className="input appearance-none pr-10"
                    >
                      <option value="">Choose your time</option>
                      {times.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">▾</span>
                  </div>
                </Field>

                <Field label="Date">
                  <div className="relative">
                    <input
                      required
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                      type="date"
                      className="input pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">📅</span>
                  </div>
                </Field>

                <Field label="People">
                  <input
                    required
                    value={form.people}
                    onChange={(e) => update("people", e.target.value)}
                    type="number"
                    min={1}
                    placeholder="Enter Number Of People"
                    className="input"
                  />
                </Field>
              </div>

              <div className="pt-2">
                <button className="btn-primary px-7 py-3 rounded-xl" disabled={submitting}>
                  {submitting ? "Booking…" : "Book a table"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* light section below the card to mirror screenshot spacing */}
        <div className="h-20 md:h-28" />
      </section>
    </>
  );
}

/** Small label+field wrapper with consistent spacing */
function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[13px] uppercase tracking-wide text-neutral-500">{props.label}</div>
      {props.children}
    </label>
  );
}