import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { RegisterData } from '../../types/auth.types';

type FieldErrors = Partial<Record<keyof RegisterData, string[]>>;

type ApiError = {
  response?: {
    data?: {
      message?: string;
      errors?: FieldErrors;
    };
  };
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    setFieldErrors({});

    try {
      const response = await register(formData);

      if (response.requires_email_verification) {
        navigate('/email-verification-required');
        return;
      }

      navigate('/dashboard');
    } catch (exception: unknown) {
      const apiError = exception as ApiError;
      setFieldErrors(apiError.response?.data?.errors ?? {});
      setError(apiError.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
          <h1 className="text-3xl font-semibold">Register</h1>
          <p className="mt-2 text-sm text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
              sign in
            </Link>
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error ? <div className="rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="register-name">
                Name
              </label>
              <input
                id="register-name"
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
              {fieldErrors.name?.[0] ? <p className="mt-1 text-sm text-rose-300">{fieldErrors.name[0]}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
              {fieldErrors.email?.[0] ? <p className="mt-1 text-sm text-rose-300">{fieldErrors.email[0]}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
              {fieldErrors.password?.[0] ? <p className="mt-1 text-sm text-rose-300">{fieldErrors.password[0]}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-200" htmlFor="register-password-confirmation">
                Confirm password
              </label>
              <input
                id="register-password-confirmation"
                type="password"
                value={formData.password_confirmation}
                onChange={(event) => setFormData((current) => ({ ...current, password_confirmation: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              />
              {fieldErrors.password_confirmation?.[0] ? (
                <p className="mt-1 text-sm text-rose-300">{fieldErrors.password_confirmation[0]}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}