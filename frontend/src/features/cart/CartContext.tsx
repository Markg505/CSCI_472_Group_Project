import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export interface CartItem {
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
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'qty' | 'lineTotal'> }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.itemId === action.payload.itemId);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.itemId === action.payload.itemId
            ? { 
                ...item, 
                qty: item.qty + 1,
                lineTotal: (item.qty + 1) * item.price
              }
            : item
        );
        return calculateTotals(updatedItems);
      }
      
      const newItem: CartItem = {
        ...action.payload,
        qty: 1,
        lineTotal: action.payload.price
      };
      
      return calculateTotals([...state.items, newItem]);
    }
    
    case 'UPDATE_QUANTITY': {
      if (action.payload.qty <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.itemId });
      }
      
      const updatedItems = state.items.map(item =>
        item.itemId === action.payload.itemId
          ? { 
              ...item, 
              qty: action.payload.qty,
              lineTotal: action.payload.qty * item.price
            }
          : item
      );
      
      return calculateTotals(updatedItems);
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.itemId !== action.payload);
      return calculateTotals(updatedItems);
    }
    
    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0 };
      
    default:
      return state;
  }
}

function calculateTotals(items: CartItem[]): CartState {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  
  return { items, subtotal, tax, total };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0
  });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}