import { XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const reference = useMemo(
    () => searchParams.get('reference')?.trim() ?? '',
    [searchParams],
  );

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center px-6 py-20">
      <div className="w-full rounded-lg border border-amber-400/30 bg-amber-500/10 p-8 text-amber-100">
        <XCircle className="h-10 w-10" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-bold text-white">Checkout cancelled</h1>
        <p className="mt-4 text-base leading-7">
          Checkout was cancelled. Your card was not charged.
        </p>

        {reference ? (
          <p className="mt-5 break-all text-sm">
            Reference: <span className="font-semibold">{reference}</span>
          </p>
        ) : null}

        <Link
          to="/pricing"
          className="mt-8 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-bold leading-none text-slate-950 transition hover:bg-slate-100 active:scale-[0.96]"
        >
          Back to pricing
        </Link>
      </div>
    </section>
  );
}
