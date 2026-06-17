import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await authService.forgotPassword({ email });
      setMessage('If this email exists, a password reset link has been sent.');
    } catch {
      setMessage('If this email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
          <h1 className="text-3xl font-semibold">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-300">Enter your email and we will send a reset link.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {message ? <div className="rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
            {error ? <div className="rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send reset link'}
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