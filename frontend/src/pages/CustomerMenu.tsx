import { useMemo, useState, useEffect } from "react";
import { useCart } from "../features/cart/CartContext";
import { useNotifications } from "../features/notifications/NotificationContext";
import { apiClient, type MenuItemWithInventory } from "../api/client";

type Dietary = "veg" | "vegan" | "gf" | "spicy";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop";

const CATEGORY_MAPPING: Record<string, string> = {
  "Pizza": "Mains",
  "Salad": "Starters", 
  "Pasta": "Pasta",
  "Main": "Mains",
  "Side": "Starters",
  "Dessert": "Desserts",
  "Beverage": "Drinks"
};

const DIET_LABEL: Record<Dietary, string> = {
  veg: "Vegetarian",
  vegan: "Vegan",
  gf: "Gluten-Free",
  spicy: "Spicy",
};

function icon(t: Dietary) {
  switch (t) {
    case "veg": return "🌿";
    case "vegan": return "🌱";
    case "gf": return "💠";
    case "spicy": return "🌶";
  }
}

function groupByCategory(items: any[]): [string, any[]][] {
  const map = new Map<string, any[]>();
  for (const d of items) {
    const category = d.displayCategory;
    if (!map.has(category)) map.set(category, []);
    map.get(category)!.push(d);
  }
  const categories = ["Starters", "Mains", "Pasta", "Desserts", "Drinks"];
  const order = new Map(categories.map((c, i) => [c, i]));
  return Array.from(map.entries()).sort(
    ([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99)
  );
}

function parseDietaryTags(dietaryTags: string): Dietary[] {
  if (!dietaryTags) return [];
  try {
    const tags = JSON.parse(dietaryTags);
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

export default function MenuPage() {
  const { dispatch } = useCart();
  const { addNotification } = useNotifications();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [diet, setDiet] = useState<Set<Dietary>>(new Set());
  const [menuItems, setMenuItems] = useState<MenuItemWithInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const items = await apiClient.getMenuWithInventory();
        setMenuItems(items);
      } catch (error) {
        console.error('Error loading menu items:', error);
        // Fallback to basic menu items if with-inventory fails
        const basicItems = await apiClient.getActiveMenuItems();
        setMenuItems(basicItems as MenuItemWithInventory[]);
      } finally {
        setLoading(false);
      }
    };
    loadMenuItems();
  }, []);

  const addToCart = (menuItem: MenuItemWithInventory) => {
    dispatch({ 
      type: 'ADD_ITEM', 
      payload: {
        itemId: menuItem.itemId,
        name: menuItem.name,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl,
        dietaryTags: menuItem.dietaryTags
      }
    });
    
    // Show success notification
    addNotification({
      type: 'success',
      title: 'Added to cart',
      message: `${menuItem.name} has been added to your order`
    });
  };

  const enhancedMenu = useMemo(() => {
    return menuItems.map(item => {
      const dietaryTags = parseDietaryTags(item.dietaryTags);
      const isAvailable = item.active && (!item.inventory || item.inventory.available);
      const hasLowStock = item.inventory ? item.inventory.qtyOnHand <= item.inventory.reorderPoint : false;
      
      return {
        ...item,
        id: item.itemId,
        displayCategory: CATEGORY_MAPPING[item.category] || "Mains",
        dietary: dietaryTags,
        image: item.imageUrl || FALLBACK_IMG,
        available: isAvailable,
        badge: hasLowStock ? "Low Stock" : undefined
      };
    });
  }, [menuItems]);

  const filtered = useMemo(() => {
    let items = enhancedMenu;
    if (category !== "All") items = items.filter((d) => d.displayCategory === category);
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

  const CATEGORIES = ["All", "Starters", "Mains", "Pasta", "Desserts", "Drinks"];

  if (loading) {
    return (
      <section className="container-xl py-16">
        <div className="text-center">
          <h1 className="h2">Our Menu</h1>
          <p className="mt-4 text-mute">Loading menu items...</p>
        </div>
      </section>
    );
  }

  return (
    <>
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

      <section className="container-xl">
        <div className="rounded-3xl bg-card border border-white/10 p-5 md:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
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
                  <div className="h-44 w-full overflow-hidden bg-white/5 flex items-center justify-center">
                    <img
                      src={d.image}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      alt={d.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-display text-xl">{d.name}</h4>
                        {d.badge && (
                          <span className="mt-1 inline-block rounded-full bg-amber-500/15 text-amber-500 text-xs px-2 py-1">
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
                        {d.available ? 'Add to order' : 'Out of Stock'}
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
        
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-mute">No dishes found matching your criteria.</p>
          </div>
        )}
      </section>
    </>
  );
}