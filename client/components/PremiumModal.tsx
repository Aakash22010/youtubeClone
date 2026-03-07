import { useState } from 'react';
import api from '../lib/api';
import { RazorpayOrderResponse, RazorpayVerifyPayload } from '../types';

declare global {
  interface Window { Razorpay: any; }
}

interface PremiumModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create Razorpay order
      const { data }: { data: RazorpayOrderResponse } = await api.post('/payments/create-order');

      // 2. Load Razorpay SDK if not already present
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
          document.body.appendChild(script);
        });
      }

      // 3. Open checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'YourTube Premium',
        description: 'Unlimited video downloads',
        order_id: data.orderId,
        prefill: {
          contact: '9999999999',
          email: '',
        },
        handler: async (response: RazorpayVerifyPayload) => {
          // 4. Verify signature on backend
          await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          } satisfies RazorpayVerifyPayload);
          onSuccess();
          onClose();
        },
        theme: { color: '#2563eb' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r: any) => setError(r.error.description));
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Go Premium</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Unlock unlimited video downloads every day
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-3 mb-8">
          {[
            'Unlimited video downloads per day',
            'Access all downloads from your profile',
            'Ad-free experience',
            'Priority support',
          ].map(feature => (
            <li key={feature} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* Price */}
        <div className="text-center mb-6">
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white">₹199</span>
          <span className="text-gray-400 text-sm ml-1">/ month</span>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing…' : 'Upgrade Now — ₹199'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secured by Razorpay · Test mode active
        </p>
      </div>
    </div>
  );
};

export default PremiumModal;