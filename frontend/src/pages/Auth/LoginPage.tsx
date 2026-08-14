import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthLayout from '../../components/auth/AuthLayout';
import type { LoginCredentials } from '../../types/auth.types';

type FieldErrors = Partial<Record<keyof LoginCredentials, string[]>> & { email?: string[] };

type ApiError = {
  response?: {
    data?: {
      message?: string;
      errors?: FieldErrors;
      verified?: boolean;
    };
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({ email: searchParams.get('email') ?? '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await login(formData);
      const redirectParam = searchParams.get('redirect');
      const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/dashboard';

      if (response.requires_email_verification) {
        navigate(`/email-verification-required?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const planId = searchParams.get('plan_id');

      if (redirectTo === '/pricing' && planId && /^\d+$/.test(planId)) {
        navigate(`/dashboard/billing/checkout/${planId}`);
        return;
      }

      navigate(redirectTo);
    } catch (exception: unknown) {
      const apiError = exception as ApiError;
      setFieldErrors(apiError.response?.data?.errors ?? {});
      if (apiError.response?.data?.verified === false) {
        const redirectParam = searchParams.get('redirect');
        const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/dashboard';
        navigate(`/email-verification-required?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      setError(apiError.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      subtitle={
        <>
          Or{' '}
          <Link to={`/register?redirect=${encodeURIComponent(searchParams.get('redirect') ?? '/dashboard')}&email=${encodeURIComponent(searchParams.get('email') ?? '')}`} className="text-cyan-300 hover:text-cyan-200">
            create an account
          </Link>
          {/* {' '}or{' '} */}
          
        </>
      }
    >
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {error ? <div className="rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div>
          <label className="mb-1 block text-sm text-slate-200" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
          />
          {fieldErrors.email?.[0] ? <p className="mt-1 text-sm text-rose-300">{fieldErrors.email[0]}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-200" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
          />
          {fieldErrors.password?.[0] ? <p className="mt-1 text-sm text-rose-300">{fieldErrors.password[0]}</p> : null}
        </div>
        <Link to="/forgot-password" className="text-cyan-300 hover:text-cyan-200 text-end block text-sm">
            forgot password
          </Link>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
