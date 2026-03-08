import { useState } from 'react';
import api from '../lib/api';
import { Plan, PLAN_CONFIGS, PlanOrderResponse, RazorpayVerifyPayload } from '../types';

declare global { interface Window { Razorpay: any; } }

interface PlanUpgradeModalProps {
  currentPlan: Plan;
  onClose: () => void;
  onSuccess: (plan: Plan, expiresAt: string) => void;
}

const UPGRADEABLE: Plan[] = ['bronze', 'silver', 'gold'];

// All lookup maps typed as Record<string, string> so TypeScript
// doesn't complain when Plan includes 'free'
const PLAN_COLORS: Record<string, string> = {
  bronze: '#b45309',
  silver: '#64748b',
  gold: '#d97706',
};

const BORDER_COLORS: Record<string, string> = {
  bronze: 'border-amber-500',
  silver: 'border-slate-400',
  gold: 'border-yellow-500',
};

const BADGE_BG: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  silver: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const BTN_COLORS: Record<string, string> = {
  gold: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  silver: 'bg-slate-500 hover:bg-slate-600 text-white',
  bronze: 'bg-amber-600 hover:bg-amber-700 text-white',
};

export default function PlanUpgradeModal({ currentPlan, onClose, onSuccess }: PlanUpgradeModalProps) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async (plan: Plan) => {
    setSelected(plan);
    setLoading(true);
    setError('');
    try {
      // 1. Create order
      const { data }: { data: PlanOrderResponse } = await api.post('/plans/create-order', { plan });

      // 2. Load Razorpay SDK
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
          document.body.appendChild(s);
        });
      }

      // 3. Open checkout
      const cfg = PLAN_CONFIGS[plan];
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'YouTubeClone',
        description: `${cfg.name} Plan - Rs.${cfg.price}`,
        order_id: data.orderId,
        prefill: {
          contact: '9999999999',
          email: 'test@example.com',
        },
        handler: async (response: RazorpayVerifyPayload) => {
          // 4. Verify
          const verify = await api.post('/plans/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan,
          });
          onSuccess(verify.data.plan, verify.data.planExpiresAt);
          onClose();
        },
        theme: { color: PLAN_COLORS[plan] ?? '#2563eb' },
      });
      rzp.on('payment.failed', (r: any) => setError(r.error.description));
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      setSelected(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Upgrade to watch more — plans renew monthly
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {UPGRADEABLE.map((plan) => {
            const cfg = PLAN_CONFIGS[plan];
            const isCurrent = plan === currentPlan;
            const isSelected = selected === plan && loading;
            const borderColor = BORDER_COLORS[plan] ?? 'border-gray-300';
            const badgeBg = BADGE_BG[plan] ?? '';
            const btnColor = BTN_COLORS[plan] ?? 'bg-blue-600 hover:bg-blue-700 text-white';

            return (
              <div
                key={plan}
                className={`relative rounded-xl border-2 p-5 flex flex-col items-center gap-3 transition-all
                  ${isCurrent ? `${borderColor} opacity-60` : `${borderColor} hover:shadow-lg`}
                  ${plan === 'gold' ? 'ring-2 ring-yellow-400/30' : ''}
                `}
              >
                {plan === 'gold' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-0.5 rounded-full">
                    BEST VALUE
                  </span>
                )}

                <span className="text-3xl">{cfg.badge}</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cfg.name}</h3>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg}`}>
                  {cfg.watchMinutes === Infinity ? 'Unlimited' : `${cfg.watchMinutes} min`} watch time
                </span>

                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  ₹{cfg.price}
                </p>

                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading || isCurrent}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60
                    ${isCurrent
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : btnColor
                    }`}
                >
                  {isCurrent ? 'Current Plan'
                    : isSelected ? 'Processing…'
                      : `Upgrade to ${cfg.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        {/* Comparison table */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Feature', '🆓 Free', '🥉 Bronze', '🥈 Silver', '🥇 Gold'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                ['Watch time', '5 min', '7 min', '10 min', 'Unlimited'],
                ['Price', 'Free', '₹10', '₹50', '₹100'],
                ['Valid for', '—', '1 month', '1 month', '1 month'],
              ].map(([label, ...vals]) => (
                <tr key={label}>
                  <td className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-gray-800 dark:text-gray-200">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secured by Razorpay · Invoice sent to your registered email after payment
        </p>
      </div>
    </div>
  );
}