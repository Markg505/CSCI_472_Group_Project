import { useMemo, useState, useEffect } from "react";
import { useCart } from "../features/cart/CartContext";
import { apiClient, type MenuItem } from "../api/client";

type Dietary = "veg" | "vegan" | "gf" | "spicy";
type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  dietary?: Dietary[];
  image?: string;
  badge?: string;
  fit?: "cover" | "contain";
  available?: boolean;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

const MENU: Dish[] = [
  // Starters
  {
    id: "burrata",
    name: "Citrus Burrata",
    description:
      "Creamy burrata, blood orange, candied pistachio, basil oil, grilled sourdough.",
    price: 14,
    category: "Starters",
    dietary: ["veg"],
    image: "https://heinstirred.com/wp-content/uploads/2024/07/CitrusBurrataA.jpg",
    badge: "Chef's choice",
    fit: "contain",
  },
  {
    id: "crudo",
    name: "Hamachi Crudo",
    description: "Yuzu kosho, pickled radish, sesame, cold-pressed olive oil.",
    price: 16,
    category: "Starters",
    dietary: ["gf"],
    image:
      "https://pickledplum.com/wp-content/uploads/2024/12/Hamachi-Crudo-1200-3.jpg",
  },

  // Mains
  {
    id: "ribeye",
    name: "Charred Ribeye (12oz)",
    description:
      "Smoked garlic butter, crispy shallots, rosemary jus, marrow potatoes.",
    price: 38,
    category: "Mains",
    dietary: ["gf"],
    image:
      "https://media.istockphoto.com/id/587207508/photo/sliced-grilled-steak-ribeye-with-herb-butter.jpg?s=612x612&w=0&k=20&c=gm6Kg6rHYH0xWTF5oszm6NZ-hp9aPRbk9V1kvCr8MQI=",
  },
  {
    id: "salmon",
    name: "Miso-Glazed Salmon",
    description: "Black rice, bok choy, ginger-scallion relish, sesame crunch.",
    price: 29,
    category: "Mains",
    dietary: ["gf"],
    image:
      "https://therecipecritic.com/wp-content/uploads/2023/01/miso_salmon-1-750x1000.jpg",
  },

  // Pasta
  {
    id: "cacio",
    name: "Cacio e Pepe",
    description: "Hand-cut tonnarelli, Pecorino Romano, tellicherry pepper.",
    price: 22,
    category: "Pasta",
    dietary: ["veg"],
    image:
      "https://www.seriouseats.com/thmb/qSS5nT0P49d5poYDucntia_qXBw=/750x0/filters:no_upscale():max_bytes(150000):strip_icc()/spaghetti-cacio-e-pepe-recipe-hero-02_1-70880518badb4d428f5d5b03d303fabc.JPG",
  },
  {
    id: "ragu",
    name: "Wild Boar Ragù",
    description: "Pappardelle, red wine, Parmigiano-Reggiano, gremolata.",
    price: 26,
    category: "Pasta",
    image:
      "https://images.squarespace-cdn.com/content/v1/5d4995025e751100013e113c/1585687131209-EUANN8EMFMEVUUVJEGFA/IMG_0411.jpeg?format=2500w",
  },

  // Desserts
  {
    id: "torta",
    name: "Flourless Chocolate Torta",
    description: "Espresso chantilly, cocoa nibs, sea salt.",
    price: 11,
    category: "Desserts",
    dietary: ["gf", "veg"],
    image:
      "https://www.wellplated.com/wp-content/uploads/2016/12/Flourless-Chocolate-Torte-with-Almond.jpg",
  },
  {
    id: "panna",
    name: "Vanilla Bean Panna Cotta",
    description: "Macerated berries, lemon zest, mint.",
    price: 10,
    category: "Desserts",
    dietary: ["gf", "veg"],
    image:
      "https://www.alaskafromscratch.com/wp-content/uploads/2014/07/IMG_93841.jpg",
  },

  // Drinks
  {
    id: "negroni",
    name: "Smoked Negroni",
    description: "Gin, Campari, sweet vermouth, orange oils.",
    price: 13,
    category: "Drinks",
    image:
      "https://nomageddon.com/wp-content/uploads/2017/06/classic-negroni.jpg",
  },
  {
    id: "spritz",
    name: "Citrus Spritz (NA)",
    description: "House bitter, tonic, grapefruit, bubbles.",
    price: 9,
    category: "Drinks",
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop",
  },
];

const CATEGORIES = ["Starters", "Mains", "Pasta", "Desserts", "Drinks"] as const;
const DIET_LABEL: Record<Dietary, string> = {
  veg: "Vegetarian",
  vegan: "Vegan",
  gf: "Gluten-Free",
  spicy: "Spicy",
};

// ---------- helpers ----------
function icon(t: Dietary) {
  switch (t) {
    case "veg":
      return "🌿";
    case "vegan":
      return "🌱";
    case "gf":
      return "💠";
    case "spicy":
      return "🌶";
  }
}

function groupByCategory(items: Dish[]): [string, Dish[]][] {
  const map = new Map<string, Dish[]>();
  for (const d of items) {
    if (!map.has(d.category)) map.set(d.category, []);
    map.get(d.category)!.push(d);
  }
  const order = new Map(CATEGORIES.map((c, i) => [c, i]));
  return Array.from(map.entries()).sort(
    ([a], [b]) => (order.get(a as any) ?? 99) - (order.get(b as any) ?? 99)
  );
}

export default function MenuPage() {
  const { dispatch } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [diet, setDiet] = useState<Set<Dietary>>(new Set());
  const [activeMenuItems, setActiveMenuItems] = useState<MenuItem[]>([]);

  // Load active menu items from API
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const items = await apiClient.getActiveMenuItems();
        setActiveMenuItems(items);
      } catch (error) {
        console.error('Error loading menu items:', error);
      }
    };
    loadMenuItems();
  }, []);

  const addToCart = (dish: Dish) => {
    const menuItem: MenuItem = {
      itemId: parseInt(dish.id.replace(/\D/g, '') || '1'), // Extract numbers from id
      name: dish.name,
      price: dish.price,
      active: true
    };
    dispatch({ type: 'ADD_ITEM', payload: menuItem });
  };

  // Combine static dish data with real menu items
  const enhancedMenu = useMemo(() => {
    return MENU.map(dish => {
      // Try to find matching menu item by name (since IDs don't match)
      const menuItem = activeMenuItems.find(item => 
        item.name.toLowerCase() === dish.name.toLowerCase()
      );
      return {
        ...dish,
        available: menuItem ? menuItem.active : true,
        actualPrice: menuItem ? menuItem.price : dish.price
      };
    });
  }, [activeMenuItems]);

  const filtered = useMemo(() => {
    let items = enhancedMenu;
    if (category !== "All") items = items.filter((d) => d.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }
    if (diet.size) {
      items = items.filter((d) =>
        Array.from(diet).every((tag) => d.dietary?.includes(tag))
      );
    }
    return items;
  }, [query, category, diet, enhancedMenu]);

  function toggleDiet(tag: Dietary) {
    setDiet((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  return (
    <>
      {/* HERO (added bottom padding so nothing overlaps) */}
      <section className="relative h-[48vh] min-h-[360px] w-full overflow-hidden pb-16 md:pb-24">
        <img
          src="https://images.unsplash.com/photo-1543332164-6e82f355badc?q=80&w=1600&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/40" />
        <div className="relative h-full container-xl flex items-end">
          <div className="pb-6">
            <h1 className="h1">
              Our <span className="text-gold">Menu</span>
            </h1>
            <p className="mt-3 text-mute max-w-2xl">
              Seasonal, local and made from scratch. Filter by dietary tags or search for your favorite dish.
            </p>
            <div className="mt-6">
              <a href="/reservations" className="btn-primary">
                Reserve a table
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTROLS (no negative margin; sits below the hero cleanly) */}
      <section className="container-xl">
        <div className="rounded-3xl bg-card border border-white/10 p-5 md:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {["All", ...CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`chip ${category === c ? "chip-active" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="ms-auto flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative">
                <input
                  className="input pe-10 w-full sm:w-72"
                  placeholder="Search dishes…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                  ⌕
                </span>
              </div>

              {/* Dietary filters */}
              <div className="flex flex-wrap gap-2">
                {(["veg", "vegan", "gf", "spicy"] as Dietary[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleDiet(t)}
                    className={`chip ${diet.has(t) ? "chip-active" : ""}`}
                    aria-pressed={diet.has(t)}
                  >
                    {icon(t)} {DIET_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MENU GRID */}
      <section className="container-xl py-10 md:py-16">
        {groupByCategory(filtered).map(([cat, dishes]) => (
          <div key={cat} className="mb-12 md:mb-16">
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="h2">{cat}</h3>
              <span className="text-sm text-mute">
                {dishes.length} item{dishes.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {dishes.map((d) => (
                <article
                  key={d.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-card hover:border-white/20 transition shadow"
                >
                  {/* image with fallback + graceful placeholder */}
                  <div className="h-44 w-full overflow-hidden bg-white/5 flex items-center justify-center">
                    {d.image ? (
                      <img
                        src={d.image}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                        }}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-mute">Photo coming soon</div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-display text-xl">{d.name}</h4>
                        {d.badge && (
                          <span className="mt-1 inline-block rounded-full bg-gold/15 text-gold text-xs px-2 py-1">
                            {d.badge}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 rounded-xl bg-white/5 px-2.5 py-1 text-gold font-medium">
                        ${d.price.toFixed(2)}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-mute leading-relaxed">
                      {d.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(d.dietary ?? []).map((t) => (
                        <span key={t} className="tag">
                          {icon(t)} {DIET_LABEL[t]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <button 
                        className="btn-primary rounded-xl px-4 py-2"
                        onClick={() => addToCart(d)}
                        disabled={!d.available}
                      >
                        {d.available ? 'Add to order' : 'Unavailable'}
                      </button>
                      <span className="text-xs text-mute">
                        Ask your server for allergens
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}