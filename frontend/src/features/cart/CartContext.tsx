import React, { createContext, useContext, useReducer } from 'react';
import { type MenuItem, type OrderItem } from '../../api/client';

interface CartItem extends OrderItem {
  itemName: string;
  item?: MenuItem;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  note: string;
}

type CartAction = 
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: number; qty: number } }
  | { type: 'UPDATE_NOTE'; payload: string }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.itemId === action.payload.itemId);
      let newItems: CartItem[];
      
      if (existingItem) {
        newItems = state.items.map(item =>
          item.itemId === action.payload.itemId
            ? { 
                ...item, 
                qty: item.qty + 1,
                lineTotal: (item.qty + 1) * item.unitPrice
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          itemId: action.payload.itemId,
          qty: 1,
          unitPrice: action.payload.price,
          lineTotal: action.payload.price,
          notes: '',
          itemName: action.payload.name,
          item: action.payload
        };
        newItems = [...state.items, newItem];
      }
      
      return calculateTotals({ ...state, items: newItems });
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.itemId !== action.payload);
      return calculateTotals({ ...state, items: newItems });
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.itemId === action.payload.itemId
          ? { 
              ...item, 
              qty: action.payload.qty,
              lineTotal: action.payload.qty * item.unitPrice
            }
          : item
      ).filter(item => item.qty > 0);
      
      return calculateTotals({ ...state, items: newItems });
    }

    case 'UPDATE_NOTE':
      return { ...state, note: action.payload };

    case 'CLEAR_CART':
      return { items: [], subtotal: 0, tax: 0, total: 0, note: '' };

    default:
      return state;
  }
};

const calculateTotals = (state: CartState): CartState => {
  const subtotal = state.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  
  return { ...state, subtotal, tax, total };
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    note: ''
  });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};