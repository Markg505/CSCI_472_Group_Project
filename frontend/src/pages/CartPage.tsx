import { useCart } from '../features/cart/CartContext';
import { apiClient } from '../api/client';
import { useAuth } from '../features/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const { state, dispatch } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'carryout'>('carryout');

  const [useAccountAddress, setUseAccountAddress] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>(user?.fullName ?? '');
  const [customerPhone, setCustomerPhone] = useState<string>((user as any)?.phone ?? '');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>((user as any)?.address ?? '');
  const [deliveryAddress2, setDeliveryAddress2] = useState<string>((user as any)?.address2 ?? '');
  const [deliveryCity, setDeliveryCity] = useState<string>((user as any)?.city ?? '');
  const [deliveryState, setDeliveryState] = useState<string>((user as any)?.state ?? '');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>((user as any)?.postalCode ?? '');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [cardName, setCardName] = useState<string>(user?.fullName ?? '');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [billingPostalCode, setBillingPostalCode] = useState<string>((user as any)?.postalCode ?? '');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    id?: string;
    eta?: string;
    total?: number;
    fulfillmentType?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryState?: string;
    deliveryPostalCode?: string;
    items?: Array<{
      name?: string;
      qty?: number;
      unitPrice?: number;
      notes?: string;
    }>;
  } | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("rbos_delivery_fee");
      return stored ? parseFloat(stored) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const formatId = (id?: string) => {
    if (!id) return 'pending-id';
    return id;
  };

  useEffect(() => {
    setCustomerName(user?.fullName ?? '');
    setCustomerPhone((user as any)?.phone ?? '');
    setCustomerEmail(user?.email ?? '');
    setCardName(user?.fullName ?? '');
    setBillingPostalCode((user as any)?.postalCode ?? '');
    try {
      const stored = localStorage.getItem("rbos_delivery_fee");
      if (stored) setDeliveryFee(parseFloat(stored) || 0);
    } catch { /* ignore */ }

    if (useAccountAddress) {
      setDeliveryAddress((user as any)?.address ?? '');
      setDeliveryAddress2((user as any)?.address2 ?? '');
      setDeliveryCity((user as any)?.city ?? '');
      setDeliveryState((user as any)?.state ?? '');
      setDeliveryPostalCode((user as any)?.postalCode ?? '');
    }
  }, [
    user?.fullName,
    (user as any)?.phone,
    (user as any)?.address,
    (user as any)?.address2,
    (user as any)?.city,
    (user as any)?.state,
    (user as any)?.postalCode,
    useAccountAddress,
  ]);

  const updateQuantity = (cartLineId: string, qty: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartLineId, qty } });
  };

  const removeItem = (cartLineId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: cartLineId });
  };

  const handleSubmitOrder = async () => {
    setOrderError(null);
    setOrderConfirmation(null);
    if (!user) {
      setOrderError('Please log in to place an order.');
      navigate('/login');
      return;
    }

    if (fulfillmentType === 'delivery') {
      if (!customerPhone || customerPhone.trim() === '') {
        setOrderError('Please provide a phone number for delivery orders.');
        return;
      }

      if (useAccountAddress) {
        const accountAddress = (user as any)?.address;
        if (!accountAddress || accountAddress.trim() === '') {
          setOrderError('Your account does not have a delivery address saved. Please uncheck "Use address on my account" and enter a delivery address.');
          return;
        }
      } else {
        if (!deliveryAddress || deliveryAddress.trim() === '') {
          setOrderError('Please enter a street address for delivery.');
          return;
        }
        if (!deliveryCity || deliveryCity.trim() === '') {
          setOrderError('Please enter a city for delivery.');
          return;
        }
        if (!deliveryState || deliveryState.trim() === '') {
          setOrderError('Please enter a state for delivery.');
          return;
        }
        if (!deliveryPostalCode || deliveryPostalCode.trim() === '') {
          setOrderError('Please enter a postal code for delivery.');
          return;
        }
      }
    }

    if (!cardName.trim()) {
      setOrderError('Please enter the name on the card.');
      return;
    }
    if (!cardNumber.trim() || cardNumber.replace(/\s+/g, '').length < 12) {
      setOrderError('Please enter a valid card number.');
      return;
    }
    if (!cardExpiry.trim()) {
      setOrderError('Please enter an expiration date.');
      return;
    }
    if (!cardCvv.trim() || cardCvv.length < 3) {
      setOrderError('Please enter the CVV.');
      return;
    }

    setSubmitting(true);
    try {
      const order = {
        userId: (user as any)?.id ?? (user as any)?.userId ?? undefined,
        source: 'web' as const,
        status: 'placed' as const,
        fulfillmentType: fulfillmentType,
        subtotal: state.subtotal,
        tax: state.tax,
        total: state.total + (fulfillmentType === 'delivery' ? deliveryFee : 0),
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress: useAccountAddress ? (user as any)?.address ?? '' : deliveryAddress,
        deliveryAddress2: useAccountAddress ? (user as any)?.address2 ?? '' : deliveryAddress2,
        deliveryCity: useAccountAddress ? (user as any)?.city ?? '' : deliveryCity,
        deliveryState: useAccountAddress ? (user as any)?.state ?? '' : deliveryState,
        deliveryPostalCode: useAccountAddress ? (user as any)?.postalCode ?? '' : deliveryPostalCode,
        deliveryInstructions,
        deliveryFee: fulfillmentType === 'delivery' ? deliveryFee : 0,
        payment: {
          cardName: cardName.trim(),
          cardNumber: cardNumber.trim(),
          cardExpiry: cardExpiry.trim(),
          cardCvv: cardCvv.trim(),
          billingPostalCode: billingPostalCode.trim(),
        },
        orderItems: state.items.map(item => ({
          itemId: item.itemId,
          qty: item.qty,
          unitPrice: item.price,
          lineTotal: item.lineTotal,
          notes: item.notes
        }))
      };

      const created = await apiClient.createOrder(order);
      dispatch({ type: 'CLEAR_CART' });
      setOrderConfirmation({
        id: created?.orderId || created?.orderNumber || 'pending-id',
        eta: fulfillmentType === 'delivery' ? '45-60 mins' : '20-30 mins',
        total: created?.total ?? order.total,
        fulfillmentType: fulfillmentType,
        customerName,
        customerEmail,
        customerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        deliveryState: order.deliveryState,
        deliveryPostalCode: order.deliveryPostalCode,
        items: created?.orderItems?.map(i => ({
          name: i.menuItem?.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          notes: i.notes,
        })) ?? order.orderItems?.map(i => ({
          name: state.items.find(si => si.itemId === i.itemId)?.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          notes: i.notes,
        }))
      });
      // stay on page and show confirmation panel
    } catch (error) {
      console.error('Error placing order:', error);
      setOrderError('Failed to place order. Please try again.');
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

        {orderError && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {orderError}
          </div>
        )}
        {orderConfirmation && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100 space-y-2">
            <div className="font-semibold text-white text-base">Order submitted</div>
            <div>Confirmation #: <span className="font-mono">{formatId(orderConfirmation.id)}</span></div>
            <div>Estimated {orderConfirmation.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'} time: {orderConfirmation.eta}</div>
            {orderConfirmation.total !== undefined && (
              <div>Total: <span className="font-semibold text-white">${orderConfirmation.total.toFixed(2)}</span></div>
            )}
            {orderConfirmation.fulfillmentType === 'delivery' && (
              <div>
                <div className="text-xs uppercase tracking-wide text-green-200">Delivering to</div>
                <div className="text-white/90">{orderConfirmation.customerName}</div>
                <div className="text-white/80">{orderConfirmation.deliveryAddress}</div>
                <div className="text-white/80">{[orderConfirmation.deliveryCity, orderConfirmation.deliveryState, orderConfirmation.deliveryPostalCode].filter(Boolean).join(', ')}</div>
              </div>
            )}
            {orderConfirmation.items && orderConfirmation.items.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-green-200 mb-1">Items</div>
                <ul className="space-y-1">
                  {orderConfirmation.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-3 text-white/90">
                      <div>
                        <div>{i.name ?? 'Item'}</div>
                        {i.notes && <div className="text-xs text-green-200">Note: {i.notes}</div>}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div>{i.qty} x ${i.unitPrice?.toFixed(2) ?? '0.00'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-2">
              <button
                onClick={() => navigate('/')}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Return Home
              </button>
            </div>
          </div>
        )}

        {state.banners.length > 0 && (
          <div className="mt-4 space-y-2">
            {state.banners.map(msg => (
              <div key={msg} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {msg}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {state.items.map((item, idx) => (
            <div key={item.cartLineId || `${item.itemId}-${idx}`} className="flex items-center justify-between p-4 border border-white/10 rounded-xl">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-mute">${item.price.toFixed(2)} each</p>
                {item.notes && (
                  <p className="text-sm text-amber-400 mt-1 italic">Note: {item.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.cartLineId, item.qty - 1)}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQuantity(item.cartLineId, item.qty + 1)}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5"
                  >
                    +
                  </button>
                </div>

                <div className="w-20 text-right">
                  ${item.lineTotal.toFixed(2)}
                </div>

                <button
                  onClick={() => removeItem(item.cartLineId)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border border-white/10 rounded-xl">
          <h3 className="font-semibold mb-4">Order Type</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="fulfillment"
                value="carryout"
                checked={fulfillmentType === 'carryout'}
                onChange={(e) => setFulfillmentType(e.target.value as 'carryout')}
                className="w-4 h-4"
              />
              <span>Carryout</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="fulfillment"
                value="delivery"
                checked={fulfillmentType === 'delivery'}
                onChange={(e) => setFulfillmentType(e.target.value as 'delivery')}
                className="w-4 h-4"
              />
              <span>Delivery</span>
            </label>
          </div>
        </div>

        {/* Customer & delivery */}
        <div className="mt-6 p-6 border border-white/10 rounded-xl space-y-4">
          <h3 className="font-semibold">Customer Information</h3>

          <div className="grid grid-cols-1 gap-3">
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Full name"
              className="w-full"
            />
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="Phone"
              className="w-full"
            />
            <input
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              placeholder="Email"
              className="w-full"
              type="email"
            />
          </div>

        {fulfillmentType === 'delivery' && (
          <>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useAccountAddress}
                onChange={e => setUseAccountAddress(e.target.checked)}
              />
              <span>Use address on my account</span>
            </label>

            {useAccountAddress ? (
              <div className="text-sm text-mute">
                <div>{(user as any)?.fullName}</div>
                <div>{(user as any)?.phone}</div>
                {(user as any)?.address && <div>{(user as any)?.address}</div>}
                {[(user as any)?.city, (user as any)?.state, (user as any)?.postalCode].filter(Boolean).length > 0 && (
                  <div>
                    {[(user as any)?.city, (user as any)?.state, (user as any)?.postalCode].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Street address" className="w-full" />
                <input value={deliveryAddress2} onChange={e => setDeliveryAddress2(e.target.value)} placeholder="Apt / suite (optional)" className="w-full" />
                <input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} placeholder="City" className="w-full" />
                <input value={deliveryState} onChange={e => setDeliveryState(e.target.value)} placeholder="State" className="w-full" />
                <input value={deliveryPostalCode} onChange={e => setDeliveryPostalCode(e.target.value)} placeholder="Postal code" className="w-full" />
                <textarea value={deliveryInstructions} onChange={e => setDeliveryInstructions(e.target.value)} placeholder="Delivery instructions" className="w-full" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment */}
      <div className="mt-6 p-6 border border-white/10 rounded-xl space-y-4">
        <h3 className="font-semibold">Payment</h3>
        <div className="grid grid-cols-1 gap-3">
          <input
            value={cardName}
            onChange={e => setCardName(e.target.value)}
            placeholder="Name"
            className="w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore
            data-lpignore="true"
          />
          <input
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
            placeholder="Card number"
            className="w-full"
            maxLength={19}
            autoComplete="off"
            inputMode="numeric"
            name="mock-card-number"
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={cardExpiry}
            onChange={e => setCardExpiry(e.target.value)}
            placeholder="MM/YY"
            className="w-full"
            maxLength={5}
            autoComplete="off"
            inputMode="numeric"
            name="mock-card-exp"
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore
            data-lpignore="true"
          />
          <input
            value={cardCvv}
            onChange={e => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="CVV"
            className="w-full"
            maxLength={4}
            autoComplete="off"
            inputMode="numeric"
            name="mock-card-cvv"
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore
            data-lpignore="true"
          />
          <input
            value={billingPostalCode}
            onChange={e => setBillingPostalCode(e.target.value)}
            placeholder="Billing postal code"
            className="w-full"
            autoComplete="off"
            name="mock-billing-postal"
            autoCorrect="off"
            autoCapitalize="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
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
          {fulfillmentType === 'delivery' && (
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold border-t border-white/10 pt-3">
            <span>Total</span>
            <span>${(state.total + (fulfillmentType === 'delivery' ? deliveryFee : 0)).toFixed(2)}</span>
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
  const formatId = (id?: string) => {
    if (!id) return 'pending-id';
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  };
