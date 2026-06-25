import { Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { Plan } from '../../types/subscription.types';
import { createCheckout } from '../../services/payment.service';
import {
  getPaymentErrorMessage,
  logPaymentError,
} from '../../utils/paymentErrors';

interface PaymentFormProps {
  plan: Plan;
  onSuccess?: () => void;
  onCancel: () => void;
}

export function PaymentForm({
  plan,
  onCancel,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const checkout = await createCheckout({
        plan_id: plan.id,
        gateway: 'stripe',
      });

      window.location.assign(checkout.checkout_url);
    } catch (checkoutError) {
      logPaymentError(checkoutError);
      setError(getPaymentErrorMessage(checkoutError));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Subscription</h2>
      <p className="text-gray-600 mb-6">
        Subscribe to <span className="font-semibold text-gray-900">{plan.name}</span> for{' '}
        <span className="font-semibold text-gray-900">${parseFloat(plan.price.toString()).toFixed(2)}/{plan.interval}</span>
      </p>

      {error ? (
        <div role="alert" className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">{error}</p>
        </div>
      ) : null}

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          aria-busy={loading}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Starting secure checkout...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Subscribe Now
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        You can cancel anytime.
      </p>
    </div>
  );
}
