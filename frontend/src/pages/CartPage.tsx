import { useCart } from '../features/cart/CartContext';
import { apiClient } from '../api/client';
import { useAuth } from '../features/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function CartPage() {
  const { state, dispatch } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const updateQuantity = (itemId: string, qty: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, qty } });
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      alert('Please log in to place an order');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const order = {
        userId: user.id,
        source: 'web' as const,
        status: 'placed' as const,
        subtotal: state.subtotal,
        tax: state.tax,
        total: state.total,
        orderItems: state.items.map(item => ({
          itemId: item.itemId,
          qty: item.qty,
          unitPrice: item.price,
          lineTotal: item.lineTotal,
          notes: item.notes
        }))
      };

      await apiClient.createOrder(order);
      dispatch({ type: 'CLEAR_CART' });
      alert('Order placed successfully!');
      navigate('/order-confirmation');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <section className="container-xl py-16">
        <div className="text-center">
          <h1 className="h2">Your Cart</h1>
          <p className="mt-4 text-mute">Your cart is empty</p>
          <button 
            onClick={() => navigate('/menu')}
            className="btn-primary mt-6"
          >
            Browse Menu
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-xl py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="h2">Your Order</h1>
        
        <div className="mt-8 space-y-4">
          {state.items.map(item => (
            <div key={item.itemId} className="flex items-center justify-between p-4 border border-white/10 rounded-xl">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-mute">${item.price.toFixed(2)} each</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.itemId, item.qty - 1)}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQuantity(item.itemId, item.qty + 1)}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5"
                  >
                    +
                  </button>
                </div>
                
                <div className="w-20 text-right">
                  ${item.lineTotal.toFixed(2)}
                </div>
                
                <button
                  onClick={() => removeItem(item.itemId)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border border-white/10 rounded-xl space-y-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${state.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${state.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold border-t border-white/10 pt-3">
            <span>Total</span>
            <span>${state.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/menu')}
            className="btn-ghost flex-1"
          >
            Continue Shopping
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </section>
  );
}