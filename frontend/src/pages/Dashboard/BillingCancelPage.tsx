import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg pt-12">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <XCircle className="h-8 w-8 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-amber-900">Payment Cancelled</h1>
        <p className="mt-2 text-sm text-amber-700">
          Your checkout was cancelled. No charges were made.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard/billing"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Back to billing
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}