import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';

vi.mock('../../auth/useAuth', () => {
  return {
    useAuth: () => ({ user: mockUser })
  };
});

const mockMergeCart = vi.fn();
const mockGetCart = vi.fn();
const mockUpdateCartToken = vi.fn();

vi.mock('../../../api/client', () => ({
  apiClient: {
    mergeCart: (...args: any[]) => mockMergeCart(...args),
    getCart: (...args: any[]) => mockGetCart(...args),
    updateCartToken: (...args: any[]) => mockUpdateCartToken(...args)
  }
}));

let mockUser: any = null;

function CartProbe() {
  const { state } = useCart();
  return (
    <div>
      <div data-testid="banner-count">{state.banners.length}</div>
      <div data-testid="item-count">{state.items.length}</div>
      <div data-testid="subtotal">{state.subtotal}</div>
      <div data-testid="items">{state.items.map(i => `${i.itemId}:${i.qty}`).join(',')}</div>
    </div>
  );
}

describe('CartProvider merge behavior', () => {
  beforeEach(() => {
    mockUser = null;
    mockMergeCart.mockReset();
    mockGetCart.mockReset();
    mockUpdateCartToken.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('surfaces banner messages for conflicts returned by backend', async () => {
    mockUser = { userId: 'u1', email: 'test@example.com' };
    mockMergeCart.mockResolvedValue({
      items: [
        { itemId: 'pizza', qty: 1, unitPrice: 12, lineTotal: 12, menuItem: { name: 'Pizza' } }
      ],
      subtotal: 12,
      tax: 0.96,
      total: 12.96,
      cartToken: 'token-merged',
      conflicts: {
        dropped: [{ itemId: 'salad', name: 'Salad', reason: 'out_of_stock', requested: 2, applied: 0 }],
        clamped: [{ itemId: 'pizza', name: 'Pizza', reason: 'limited_stock', requested: 3, applied: 1 }],
        merged: [{ itemId: 'pizza', name: 'Pizza', reason: 'merged', requested: 3, applied: 1 }]
      }
    });

    localStorage.setItem('rbos_cart', JSON.stringify({
      items: [{ itemId: 'pizza', name: 'Pizza', price: 12, qty: 2, lineTotal: 24 }],
      subtotal: 24,
      tax: 1.92,
      total: 25.92,
      banners: []
    }));

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockMergeCart).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('banner-count').textContent).toBe('3'));
    expect(screen.getByTestId('subtotal').textContent).toBe('12');
    expect(mockUpdateCartToken).toHaveBeenCalledWith('token-merged');
  });

  it('persists merged cart across login/logout cycles', async () => {
    mockUser = { userId: 'u1', email: 'test@example.com' };

    localStorage.setItem(
      'rbos_cart',
      JSON.stringify({
        state: {
          items: [{ itemId: 'pasta', name: 'Pasta', price: 10, qty: 1, lineTotal: 10 }],
          subtotal: 10,
          tax: 0.8,
          total: 10.8,
          banners: []
        },
        cartToken: 'anon-pasta'
      })
    );

    mockMergeCart.mockResolvedValue({
      items: [
        { itemId: 'pasta', qty: 3, unitPrice: 10, lineTotal: 30, menuItem: { name: 'Pasta' } }
      ],
      subtotal: 30,
      tax: 2.4,
      total: 32.4,
      conflicts: { merged: [] },
      cartToken: 'token-user'
    });

    const { rerender } = render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(screen.getByTestId('item-count').textContent).toBe('1'));
    expect(screen.getByTestId('items').textContent).toContain('pasta:3');
    expect(mockUpdateCartToken).toHaveBeenCalledWith('token-user');

    mockUser = null;
    rerender(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(screen.getByTestId('item-count').textContent).toBe('1'));
    expect(localStorage.getItem('rbos_cart')).toContain('pasta');
  });

  it('rehydrates a guest cart and rotates the token on fetch', async () => {
    mockGetCart.mockResolvedValue({
      items: [
        { itemId: 'calzone', qty: 1, unitPrice: 8, lineTotal: 8, menuItem: { name: 'Calzone' } }
      ],
      subtotal: 8,
      tax: 0.64,
      total: 8.64,
      cartToken: 'guest-token'
    });

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockGetCart).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(screen.getByTestId('item-count').textContent).toBe('1'));
    expect(screen.getByTestId('items').textContent).toContain('calzone:1');
    expect(mockUpdateCartToken).toHaveBeenCalledWith('guest-token');
  });

  it('deduplicates duplicate rows and renders conflict banners for dropped items', async () => {
    mockUser = { userId: 'user-merge', email: 'merge@example.com' };
    const duplicateLocal = {
      items: [
        { itemId: 'soda', name: 'Soda', price: 3, qty: 1, lineTotal: 3 },
        { itemId: 'soda', name: 'Soda', price: 3, qty: 1, lineTotal: 3 },
        { itemId: 'salad', name: 'Salad', price: 6, qty: 2, lineTotal: 12 }
      ],
      subtotal: 18,
      tax: 1.44,
      total: 19.44,
      banners: []
    };

    localStorage.setItem('rbos_cart', JSON.stringify({ state: duplicateLocal, cartToken: null }));

    mockMergeCart.mockResolvedValue({
      items: [
        { itemId: 'soda', qty: 2, unitPrice: 3, lineTotal: 6, menuItem: { name: 'Soda' } }
      ],
      subtotal: 6,
      tax: 0.48,
      total: 6.48,
      cartToken: 'token-merged',
      conflicts: {
        dropped: [{ itemId: 'salad', name: 'Salad', reason: 'out_of_stock', requested: 2, applied: 0 }],
        merged: [{ itemId: 'soda', name: 'Soda', reason: 'merged', requested: 2, applied: 2 }]
      }
    });

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockMergeCart).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('banner-count').textContent).toBe('2'));
    expect(screen.getByTestId('item-count').textContent).toBe('1');
    expect(screen.getByTestId('items').textContent).toContain('soda:2');
    expect(mockUpdateCartToken).toHaveBeenCalledWith('token-merged');
  });

  it('attaches a new token when logging in after logout/login loop', async () => {
    localStorage.setItem(
      'rbos_cart',
      JSON.stringify({
        state: {
          items: [{ itemId: 'pasta', name: 'Pasta', price: 10, qty: 1, lineTotal: 10 }],
          subtotal: 10,
          tax: 0.8,
          total: 10.8,
          banners: []
        },
        cartToken: 'anon-token'
      })
    );

    mockUser = { userId: 'first', email: 'first@example.com' };
    mockMergeCart.mockResolvedValueOnce({
      items: [{ itemId: 'pasta', qty: 2, unitPrice: 10, lineTotal: 20, menuItem: { name: 'Pasta' } }],
      subtotal: 20,
      tax: 1.6,
      total: 21.6,
      cartToken: 'user-token-1'
    });

    const { rerender } = render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockMergeCart).toHaveBeenCalled());
    await waitFor(() => expect(mockUpdateCartToken).toHaveBeenCalledWith('user-token-1'));

    mockUser = { userId: 'second', email: 'second@example.com' };
    mockMergeCart.mockResolvedValueOnce({
      items: [{ itemId: 'pasta', qty: 1, unitPrice: 10, lineTotal: 10, menuItem: { name: 'Pasta' } }],
      subtotal: 10,
      tax: 0.8,
      total: 10.8,
      cartToken: 'user-token-2'
    });

    rerender(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockMergeCart).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockUpdateCartToken).toHaveBeenCalledWith('user-token-2'));
    expect(screen.getByTestId('item-count').textContent).toBe('1');
    expect(screen.getByTestId('items').textContent).toContain('pasta:1');
  });

  it('surfaces stored conflicts from sessionStorage even when merge returns none', async () => {
    mockUser = { userId: 'conflict-user', email: 'conflict@example.com' };
    sessionStorage.setItem(
      'rbos_cart_conflicts',
      JSON.stringify({
        dropped: [{ itemId: 'soup', name: 'Soup', reason: 'out_of_stock', requested: 1, applied: 0 }]
      })
    );

    mockMergeCart.mockResolvedValue({
      items: [{ itemId: 'soup', qty: 0, unitPrice: 5, lineTotal: 0, menuItem: { name: 'Soup' } }],
      subtotal: 0,
      tax: 0,
      total: 0,
      cartToken: 'token-stored',
      conflicts: { dropped: [], clamped: [], merged: [] }
    });

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await waitFor(() => expect(mockMergeCart).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('banner-count').textContent).toBe('1'));
    expect(sessionStorage.getItem('rbos_cart_conflicts')).toBeNull();
  });
});
