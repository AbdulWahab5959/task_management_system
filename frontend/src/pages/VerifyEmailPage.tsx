import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Verifying your email address...');
  const [error, setError] = useState('');

  useEffect(() => {
    const verificationUrl = searchParams.get('verification_url');

    if (!verificationUrl) {
      setMessage('Verification link is missing.');
      return;
    }

    void authService.verifyEmail(decodeURIComponent(verificationUrl))
      .then(() => {
        setMessage('Email verified successfully. You can log in now.');
      })
      .catch(() => {
        setError('This verification link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12 text-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
          <h1 className="text-3xl font-semibold">Email verification</h1>
          <p className="mt-4 text-sm text-slate-300">{message}</p>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <div className="mt-8">
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}