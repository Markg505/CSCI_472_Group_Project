import React, { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { apiClient, type OrderItem } from '../../api/client';
import { useAuth } from '../auth/useAuth';

export interface CartItem {
  cartLineId: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  notes?: string;
  imageUrl?: string;
  dietaryTags?: string;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  banners: string[];
  cartToken?: string | null;
}

interface PersistedCartState {
  state: CartState;
  cartToken?: string | null;
}

const CART_STORAGE_KEY = 'rbos_cart';

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'qty' | 'lineTotal' | 'cartLineId'> & { cartLineId?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartLineId: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'HYDRATE'; payload: CartState }
  | { type: 'SET_BANNERS'; payload: string[] };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Find existing item with same itemId AND same notes (or both undefined/empty)
      const existingItem = state.items.find(item =>
        item.itemId === action.payload.itemId &&
        (item.notes || '') === (action.payload.notes || '')
      );

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.cartLineId === existingItem.cartLineId
            ? {
                ...item,
                qty: item.qty + 1,
                lineTotal: (item.qty + 1) * item.price
              }
            : item
        );
        return calculateTotals(updatedItems, state.cartToken);
      }

      const newItem: CartItem = {
        ...action.payload,
        cartLineId: action.payload.cartLineId || `${action.payload.itemId}|${action.payload.notes || ''}|${Date.now()}`,
        qty: 1,
        lineTotal: action.payload.price
      };

      return calculateTotals([...state.items, newItem], state.cartToken);
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.qty <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.cartLineId });
      }

      const updatedItems = state.items.map(item =>
        item.cartLineId === action.payload.cartLineId
          ? {
              ...item,
              qty: action.payload.qty,
              lineTotal: action.payload.qty * item.price
            }
          : item
      );

      return calculateTotals(updatedItems, state.cartToken);
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.cartLineId !== action.payload);
      return calculateTotals(updatedItems, state.cartToken);
    }

    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0, banners: [], cartToken: state.cartToken };

    case 'HYDRATE':
      return normalizeCartState({
        ...state,
        ...action.payload,
        cartToken: action.payload.cartToken ?? state.cartToken ?? null
      });

    case 'SET_BANNERS':
      return { ...state, banners: action.payload };

    default:
      return state;
  }
}

function calculateTotals(items: CartItem[], cartToken?: string | null, banners: string[] = []): CartState {
  const normalizedItems = items.map(item => ({
    ...item,
    lineTotal: item.qty * item.price
  }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return { items: normalizedItems, subtotal, tax, total, banners, cartToken };
}

function normalizeCartState(raw?: Partial<CartState>): CartState {
  const items = (raw?.items ?? []).map((item, idx) => ({
    ...item,
    cartLineId: item.cartLineId || `${item.itemId}|${item.notes || ''}|${idx}`
  }));
  const computed = calculateTotals(items, raw?.cartToken ?? null, raw?.banners ?? []);

  return {
    items,
    subtotal: typeof raw?.subtotal === 'number' ? raw.subtotal : computed.subtotal,
    tax: typeof raw?.tax === 'number' ? raw.tax : computed.tax,
    total: typeof raw?.total === 'number' ? raw.total : computed.total,
    banners: raw?.banners ?? [],
    cartToken: raw?.cartToken ?? null
  } satisfies CartState;
}

function readPersistedCart(): { state: CartState; cartToken: string | null } {
  const fallback = { state: calculateTotals([]), cartToken: null };

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored) as PersistedCartState | CartState;

    if ('state' in parsed) {
      return {
        state: normalizeCartState({ ...parsed.state, cartToken: parsed.cartToken ?? parsed.state.cartToken ?? null }),
        cartToken: parsed.cartToken ?? parsed.state.cartToken ?? null
      };
    }

    return {
      state: normalizeCartState(parsed),
      cartToken: parsed.cartToken ?? null
    };
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const persisted = readPersistedCart();
  const [state, dispatch] = useReducer(cartReducer, persisted.state);
  const [cartToken, setCartToken] = useState<string | null>(persisted.cartToken);

  const stateRef = useRef<CartState>(state);
  const lastSyncedSignature = useRef<string | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      const tokenToPersist = state.cartToken ?? cartToken ?? null;
      const toPersist = { ...state, banners: [], cartToken: tokenToPersist };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: toPersist, cartToken: tokenToPersist }));
      apiClient.updateCartToken(tokenToPersist);
      setCartToken(tokenToPersist);
    } catch {
      // ignore persistence errors
    }
  }, [state, cartToken]);

  useEffect(() => {
    let isMounted = true;
    const reconcileWithServer = async () => {
      const signature = buildSyncSignature(stateRef.current, user?.userId ?? null);
      if (signature === lastSyncedSignature.current) {
        return;
      }

      const payloadItems = stateRef.current.items.map(item => ({
        itemId: item.itemId,
        qty: item.qty,
        unitPrice: item.price,
        name: item.name,
        notes: item.notes
      }));

      try {
        const shouldPushCart = Boolean(user || payloadItems.length || stateRef.current.cartToken);

        const response = shouldPushCart
          ? await apiClient.mergeCart({
              cartToken: stateRef.current.cartToken ?? undefined,
              items: payloadItems
            })
          : await apiClient.getCart(stateRef.current.cartToken ?? undefined);

        if (!isMounted || !response) return;

        const conflicts = mergeConflictSets(response.conflicts, popStoredConflicts());

        const hydrated = buildStateFromOrder(
          response.items ?? [],
          response.subtotal,
          response.tax,
          response.total,
          response.cartToken ?? stateRef.current.cartToken ?? null
        );
        dispatch({ type: 'HYDRATE', payload: hydrated });
        if (response.cartToken) {
          apiClient.updateCartToken(response.cartToken);
          setCartToken(response.cartToken);
        }
        const banners = buildBannerMessages(conflicts);
        dispatch({ type: 'SET_BANNERS', payload: banners });
        lastSyncedSignature.current = buildSyncSignature(hydrated, user?.userId ?? null);
      } catch (error: any) {
        const msg = String(error?.message ?? '');
        console.error('Failed to sync cart with server', error);
        // If the cart token is bound to another user or forbidden, reset the token so the user can start fresh
        if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
          apiClient.updateCartToken(null);
          setCartToken(null);
          lastSyncedSignature.current = null;
          // keep local items; next sync will generate a fresh cart token
        }
        dispatch({ type: 'SET_BANNERS', payload: [] });
      }
    };

    reconcileWithServer();
    return () => {
      isMounted = false;
    };
  }, [user?.userId, state.items, state.cartToken]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

function buildStateFromOrder(orderItems: OrderItem[], subtotal: number, tax: number, total: number, cartToken?: string | null): CartState {
  const items: CartItem[] = orderItems.map(item => ({
    cartLineId: `${item.itemId}|${item.notes || ''}|${Math.random().toString(36).slice(2)}`,
    itemId: item.itemId,
    name: item.menuItem?.name ?? '',
    price: item.unitPrice ?? 0,
    qty: item.qty,
    lineTotal: item.lineTotal ?? (item.unitPrice ?? 0) * item.qty,
    notes: item.notes
  }));

  return normalizeCartState({
    items,
    subtotal,
    tax,
    total,
    banners: [],
    cartToken
  });
}

function buildSyncSignature(state: CartState, userId: string | null) {
  const normalized = [...state.items]
    .map(item => `${item.itemId}:${item.qty}:${item.notes || ''}`)
    .sort()
    .join('|');
  return `${userId ?? 'guest'}|${state.cartToken ?? ''}|${normalized}`;
}

function buildBannerMessages(conflicts?: { dropped?: any[]; clamped?: any[]; merged?: any[] }): string[] {
  const banners: string[] = [];
  if (!conflicts) return banners;

  conflicts.dropped?.forEach((c: any) => {
    const label = c.name || c.itemId;
    banners.push(`${label} was removed because it is out of stock.`);
  });
  conflicts.clamped?.forEach((c: any) => {
    const label = c.name || c.itemId;
    banners.push(`${label} quantity reduced to ${c.applied} due to limited stock.`);
  });
  conflicts.merged?.forEach((c: any) => {
    const label = c.name || c.itemId;
    banners.push(`${label} quantities were merged from your saved cart.`);
  });

  return Array.from(new Set(banners));
}

function mergeConflictSets(a?: { dropped?: any[]; clamped?: any[]; merged?: any[] }, b?: { dropped?: any[]; clamped?: any[]; merged?: any[] }) {
  return {
    dropped: [...(a?.dropped ?? []), ...(b?.dropped ?? [])],
    clamped: [...(a?.clamped ?? []), ...(b?.clamped ?? [])],
    merged: [...(a?.merged ?? []), ...(b?.merged ?? [])]
  };
}

function popStoredConflicts() {
  try {
    const raw = sessionStorage.getItem('rbos_cart_conflicts');
    if (raw) {
      sessionStorage.removeItem('rbos_cart_conflicts');
      return JSON.parse(raw) as { dropped?: any[]; clamped?: any[]; merged?: any[] };
    }
  } catch {
    // ignore storage parsing
  }
  return undefined;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
