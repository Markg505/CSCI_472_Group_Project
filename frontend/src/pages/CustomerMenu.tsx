import { useMemo, useState, useEffect, useRef } from "react";
import { useCart } from "../features/cart/CartContext";
import { useNotifications } from "../features/notifications/NotificationContext";
import { apiClient, type MenuItemWithInventory } from "../api/client";

type Dietary = "veg" | "vegan" | "gf" | "spicy";
type ModifierChoice = { id: string; label: string; price?: number };
type ModifierGroup = { id: string; name: string; required?: boolean; choices: ModifierChoice[] };

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
  const [itemWithNotes, setItemWithNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const loadMenuItems = async () => {
    try {
      const items = await apiClient.getMenuWithInventory();
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
      const basicItems = await apiClient.getActiveMenuItems();
      setMenuItems(basicItems as MenuItemWithInventory[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();

    // Refresh menu every 30 seconds to pick up out-of-stock changes
    const interval = setInterval(() => {
      loadMenuItems();
    }, 30000);

    // Refetch when page regains focus
    const handleFocus = () => {
      loadMenuItems();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const addToCart = (menuItem: MenuItemWithInventory, customNotes?: string, modifiers?: ModifierChoice[]) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        itemId: menuItem.itemId,
        name: menuItem.name,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl,
        dietaryTags: menuItem.dietaryTags,
        notes: buildNotes(customNotes, modifiers)
      }
    });

    addNotification({
      type: 'success',
      title: 'Added to cart',
      message: `${menuItem.name} has been added to your order`
    });
  };

  const handleAddWithNotes = (menuItem: MenuItemWithInventory) => {
    addToCart(menuItem, notes);
    setItemWithNotes(null);
    setNotes("");
  };

  function buildNotes(customNotes?: string, modifiers?: ModifierChoice[]) {
    const mods = (modifiers ?? []).map(m => `${m.label}${m.price ? ` (+$${m.price.toFixed(2)})` : ''}`);
    const parts: string[] = [];
    if (mods.length) parts.push(`Mods: ${mods.join(', ')}`);
    if (customNotes?.trim()) parts.push(customNotes.trim());
    return parts.join(' | ');
  }

  const DEFAULT_MODIFIERS: Record<string, ModifierGroup[]> = {
    Pizza: [
      { id: 'size', name: 'Size', required: true, choices: [
        { id: 'sm', label: 'Small', price: 0 },
        { id: 'lg', label: 'Large', price: 3 }
      ]},
      { id: 'extras', name: 'Extras', choices: [
        { id: 'cheese', label: 'Extra cheese', price: 1.5 },
        { id: 'pep', label: 'Pepperoni', price: 2 }
      ]}
    ],
    Salad: [
      { id: 'dressing', name: 'Dressing', required: true, choices: [
        { id: 'ranch', label: 'Ranch' },
        { id: 'vin', label: 'Vinaigrette' }
      ]}
    ]
  };

  const [selectedMods, setSelectedMods] = useState<Record<string, Set<string>>>({});

  function toggleModifier(itemId: string, group: ModifierGroup, choice: ModifierChoice) {
    setSelectedMods(prev => {
      const next: Record<string, Set<string>> = { ...prev };
      const key = `${itemId}:${group.id}`;
      const current = new Set<string>(Array.from(next[key] ?? [] as Set<string> | string[]));
      if (group.required) {
        current.clear();
        current.add(choice.id);
      } else {
        current.has(choice.id) ? current.delete(choice.id) : current.add(choice.id);
      }
      next[key] = current;
      return next;
    });
  }

  function selectedChoicesFor(itemId: string, group: ModifierGroup): ModifierChoice[] {
    const key = `${itemId}:${group.id}`;
    const ids = selectedMods[key];
    return group.choices.filter(c => ids?.has(c.id));
  }

  function requiredModsComplete(item: MenuItemWithInventory & { id: string }) {
    const groups = DEFAULT_MODIFIERS[item.category] ?? [];
    return groups.every(g => !g.required || selectedChoicesFor(item.id, g).length > 0);
  }

  const enhancedMenu = useMemo(() => {
    return menuItems.map(item => {
      const dietaryTags = parseDietaryTags(item.dietaryTags);
      const isAvailable = item.active && (!item.inventory || item.inventory.available) && !item.outOfStock;
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
                  className={`group overflow-hidden rounded-3xl border border-white/10 bg-card transition shadow ${
                    !d.available ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
                  }`}
                >
                  <div className="h-44 w-full overflow-hidden bg-white/5 flex items-center justify-center">
                    <img
                      src={d.image}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                      }}
                      alt={d.name}
                      className={`h-full w-full object-cover transition duration-300 ${
                        d.available ? 'group-hover:scale-[1.03]' : ''
                      }`}
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

                    {/* Modifiers */}
                    {(DEFAULT_MODIFIERS[d.category] ?? []).map(group => (
                      <div key={group.id} className="mt-3 border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-mute">{group.name}{group.required ? ' *' : ''}</p>
                          {group.required && (
                            <span className="text-xs text-amber-400">Choose one</span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.choices.map(choice => {
                            const selected = selectedMods[`${d.id}:${group.id}`]?.has(choice.id);
                            return (
                              <button
                                key={choice.id}
                                onClick={() => toggleModifier(d.id, group, choice)}
                                className={`px-3 py-1 rounded-full border text-xs ${
                                  selected ? 'border-gold text-gold' : 'border-white/10 text-white/70'
                                }`}
                              >
                                {choice.label}{choice.price ? ` (+$${choice.price.toFixed(2)})` : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(d.dietary ?? []).map((t) => (
                        <span key={t} className="tag">
                          {icon(t)} {DIET_LABEL[t]}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-2">
                      {d.available && itemWithNotes !== d.id && (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            className="btn-primary rounded-xl px-4 py-2 flex-1"
                            onClick={() => {
                              const mods = (DEFAULT_MODIFIERS[d.category] ?? []).flatMap(g => selectedChoicesFor(d.id, g));
                              const modCost = mods.reduce((sum, m) => sum + (m.price ?? 0), 0);
                              addToCart({ ...d, price: d.price + modCost } as any, undefined, mods);
                            }}
                            disabled={!requiredModsComplete(d)}
                          >
                            Add to order
                          </button>
                          <button
                            className="btn-ghost rounded-xl px-3 py-2 text-sm"
                            onClick={() => setItemWithNotes(d.id)}
                          >
                            + Notes
                          </button>
                        </div>
                      )}

                      {d.available && itemWithNotes === d.id && (
                        <div className="space-y-2">
                          <textarea
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm resize-none"
                            placeholder="Special instructions or modifications..."
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              className="btn-primary rounded-xl px-4 py-2 flex-1 text-sm"
                              onClick={() => {
                                const mods = (DEFAULT_MODIFIERS[d.category] ?? []).flatMap(g => selectedChoicesFor(d.id, g));
                                const modCost = mods.reduce((sum, m) => sum + (m.price ?? 0), 0);
                                addToCart({ ...d, price: d.price + modCost } as any, notes, mods);
                                setItemWithNotes(null);
                                setNotes("");
                              }}
                              disabled={!requiredModsComplete(d)}
                            >
                              Add with notes
                            </button>
                            <button
                              className="btn-ghost rounded-xl px-3 py-2 text-sm"
                              onClick={() => {
                                setItemWithNotes(null);
                                setNotes("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {!d.available && (
                        <div className="relative group/tooltip">
                          <button
                            className="btn-primary rounded-xl px-4 py-2 w-full opacity-50 cursor-not-allowed"
                            disabled
                          >
                            Out of Stock
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            This item is currently out of stock
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
                          </div>
                        </div>
                      )}
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
