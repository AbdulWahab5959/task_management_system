import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPaymentStatus,
  type PaymentStatusResponse,
} from '../services/payment.service';
import {
  getPaymentErrorMessage,
  logPaymentError,
} from '../utils/paymentErrors';

type PaymentStatus = PaymentStatusResponse['status'];
type StatusTone = 'success' | 'warning' | 'error' | 'info';

const statusMessages: Record<
  PaymentStatus,
  {
    title: string;
    body: string;
    tone: StatusTone;
  }
> = {
  pending: {
    title: 'Confirming payment',
    body: 'Your payment is being confirmed. This may take a few moments.',
    tone: 'info',
  },
  paid: {
    title: 'Payment successful',
    body: 'Payment successful. Your subscription is now active.',
    tone: 'success',
  },
  failed: {
    title: 'Payment failed',
    body: 'Payment failed. Please try again or contact support.',
    tone: 'error',
  },
  cancelled: {
    title: 'Checkout cancelled',
    body: 'Checkout was cancelled. Your card was not charged.',
    tone: 'warning',
  },
  expired: {
    title: 'Checkout expired',
    body: 'This checkout session expired. Please start checkout again.',
    tone: 'warning',
  },
  verification_failed: {
    title: 'Verification failed',
    body: 'We could not verify this payment. Please contact support.',
    tone: 'error',
  },
};

function isTerminalStatus(status: PaymentStatus): boolean {
  return status !== 'pending';
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'success') {
    return <CheckCircle2 className="h-10 w-10" aria-hidden="true" />;
  }

  if (tone === 'warning') {
    return <AlertTriangle className="h-10 w-10" aria-hidden="true" />;
  }

  if (tone === 'error') {
    return <XCircle className="h-10 w-10" aria-hidden="true" />;
  }

  return <Clock className="h-10 w-10" aria-hidden="true" />;
}

function getToneClasses(tone: StatusTone): string {
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  if (tone === 'error') return 'border-red-400/30 bg-red-500/10 text-red-100';
  return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100';
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const reference = useMemo(
    () => searchParams.get('reference')?.trim() ?? '',
    [searchParams],
  );
  const hasReference = reference.length > 0;
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | undefined;

    const stopPolling = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    if (!hasReference) {
      return () => {
        isMounted = false;
        stopPolling();
      };
    }

    const loadStatus = async (): Promise<PaymentStatusResponse | null> => {
      try {
        const status = await getPaymentStatus(reference);

        if (!isMounted) {
          return null;
        }

        setPayment(status);
        setError('');
        return status;
      } catch (statusError) {
        if (isMounted) {
          logPaymentError(statusError);
          setError(getPaymentErrorMessage(statusError));
          stopPolling();
        }

        return null;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void (async () => {
      setLoading(true);
      setError('');

      const initialStatus = await loadStatus();

      if (initialStatus?.status === 'pending' && isMounted) {
        intervalId = window.setInterval(() => {
          void (async () => {
            const nextStatus = await loadStatus();

            if (nextStatus && isTerminalStatus(nextStatus.status)) {
              stopPolling();
            }
          })();
        }, 3000);
      }
    })();

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [hasReference, reference]);

  const displayPayment = hasReference ? payment : null;
  const message = displayPayment ? statusMessages[displayPayment.status] : null;
  const missingReferenceError = hasReference
    ? ''
    : 'We could not find a payment reference for this checkout.';
  const displayError = missingReferenceError || error;
  const tone: StatusTone = displayError ? 'error' : message?.tone ?? 'info';

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-6 py-20">
      <div className={`w-full rounded-lg border p-8 ${getToneClasses(tone)}`}>
        <StatusIcon tone={tone} />
        <h1 className="mt-6 text-3xl font-bold text-white">
          {loading && !displayPayment ? 'Confirming payment' : message?.title ?? 'Payment status unavailable'}
        </h1>

        <p className="mt-4 text-base leading-7">
          {displayError || message?.body || 'We could not load this payment status.'}
        </p>

        {displayPayment ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-white">Reference</dt>
              <dd className="mt-1 break-all">{displayPayment.reference}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Status</dt>
              <dd className="mt-1 capitalize">{displayPayment.status.replace(/_/g, ' ')}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            Back to pricing
          </Link>
          {displayPayment?.status === 'paid' ? (
            <Link
              to="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Go to dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
