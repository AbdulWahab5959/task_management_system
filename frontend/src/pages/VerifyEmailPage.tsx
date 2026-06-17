import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import AuthLayout from '../components/auth/AuthLayout';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const verificationUrl = searchParams.get('verification_url');
  const [message, setMessage] = useState('Verifying your email address...');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!verificationUrl) {
      return;
    }

    void authService.verifyEmail(decodeURIComponent(verificationUrl))
      .then(() => {
        if (active) {
          setMessage('Email verified successfully. You can log in now.');
        }
      })
      .catch(() => {
        if (active) {
          setError('This verification link is invalid or has expired.');
        }
      });

    return () => {
      active = false;
    };
  }, [verificationUrl]);

  return (
    <AuthLayout title="Email verification">
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-300">{verificationUrl ? message : 'Verification link is missing.'}</p>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-8">
          <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
            Go to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
