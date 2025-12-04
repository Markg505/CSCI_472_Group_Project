import React, { useState } from 'react';

interface MockPaymentFormProps {
  onSubmit: () => void;
  onCancel: () => void;
  total: number;
}

export default function MockPaymentForm({ onSubmit, onCancel, total }: MockPaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate a network request
    setTimeout(() => {
      onSubmit();
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="p-6 rounded-xl bg-card border border-white/10">
      <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
      <p className="text-sm text-mute mb-6">This is a mock payment form. No real transaction will be processed.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-mute">
            Card Number
          </label>
          <input
            type="text"
            id="cardNumber"
            placeholder="**** **** **** ****"
            className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-mute">
              Expiry Date
            </label>
            <input
              type="text"
              id="expiryDate"
              placeholder="MM/YY"
              className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
              required
            />
          </div>
          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-mute">
              CVV
            </label>
            <input
              type="text"
              id="cvv"
              placeholder="***"
              className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-fg"
              required
            />
          </div>
        </div>
        <div className="flex justify-between items-center pt-4">
           <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded bg-gray-600 text-white font-semibold hover:bg-gray-500 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-6 py-2 rounded bg-gold text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
