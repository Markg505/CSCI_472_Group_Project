export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative h-[72vh] min-h-[520px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1600&auto=format&fit=crop"
          alt="Restaurant entrance"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/40" />
        <div className="relative h-full container-xl flex items-center">
          <div className="max-w-2xl">
            <h1 className="h1">Restaurant <span className="text-gold">GEM</span></h1>
            <p className="mt-6 text-lg md:text-xl text-mute">
              Seasonal tasting menus crafted with precision. Reserve your table and let us take care of the rest.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="/reservations" className="btn-primary">Reserve a table</a>
              <a href="/menu" className="btn-ghost">View menu</a>
            </div>
          </div>
        </div>
      </section>

      {/* STORY / ABOUT */}
      <section className="container-xl py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <img
            className="rounded-3xl border border-white/10"
            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop"
            alt=""
          />
          <div>
            <h2 className="h2">Where cultural heritage meets culinary excellence</h2>
            <p className="mt-5 text-mute leading-relaxed">
              We layer bold spices, French precision and local produce into dishes that feel both familiar and daring.
              Every plate tells a story and ends with a smile.
            </p>
          </div>
        </div>
      </section>

      {/* IMAGE GRID */}
      <section className="container-xl pb-24 md:pb-32">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[
            "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1464306076886-da185f6a9d05?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop",
          ].map((src, i) => (
            <img key={i} src={src} className="rounded-3xl border border-white/10 object-cover h-52 md:h-64 w-full" />
          ))}
        </div>
      </section>
    </>
  );
}
