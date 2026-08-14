import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import AuthLayout from '../components/auth/AuthLayout';

export default function EmailVerificationRequiredPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/dashboard';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resendVerification = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await authService.sendVerificationNotification();
      setMessage('Verification email sent.');
    } catch {
      setError('Unable to resend the verification email right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Please verify your email address before continuing."
    >
      {message ? <div className="mt-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="mt-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => void resendVerification()}
          disabled={loading}
          className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Resend verification email'}
        </button>

        <Link
          to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="block w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-white transition hover:border-cyan-400 hover:text-cyan-200"
        >
          Back to login
        </Link>

        <button
          type="button"
          onClick={() => navigate(redirectTo)}
          className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Continue after verifying
        </button>
      </div>
    </AuthLayout>
  );
}
