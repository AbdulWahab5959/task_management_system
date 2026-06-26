import { CheckCircle2, Crown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCurrentBilling } from '../../services/billing.service';

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [refreshed, setRefreshed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Try to refresh subscription data after payment
    const refreshSubscription = async () => {
      setRefreshing(true);
      try {
        // Wait a moment for webhook to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await getCurrentBilling();
        setRefreshed(true);
      } catch {
        // Silently fail - user can manually refresh
        setRefreshed(true);
      } finally {
        setRefreshing(false);
      }
    };

    void refreshSubscription();
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg pt-12">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-emerald-900">Payment Successful</h1>
        <p className="mt-2 text-sm text-emerald-700">
          Your subscription is being activated. This may take a few moments.
        </p>

        {refreshing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Confirming your subscription...
          </div>
        )}

        {refreshed && !refreshing && (
          <p className="mt-3 text-xs text-emerald-500">
            {sessionId ? `Session: ${sessionId.substring(0, 8)}...` : 'Subscription confirmed'}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard/billing"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
            View billing
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}