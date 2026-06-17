import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setMessage('Your password has been reset successfully.');
    } catch {
      setError('The password reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
          <h1 className="text-3xl font-semibold">Reset password</h1>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {message ? <div className="rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
            {error ? <div className="rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="reset-password">Password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="reset-password-confirmation">
                Confirm password
              </label>
              <input
                id="reset-password-confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>

            <Link to="/login" className="block text-center text-sm text-cyan-300 hover:text-cyan-200">
              Back to login
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}