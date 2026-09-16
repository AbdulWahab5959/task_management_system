import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export default function ProtectedRoute({ children, requireVerified = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="session-loader-screen" role="status" aria-live="polite" aria-label="Loading your session" aria-busy="true">
        <div className="session-loader-dots" aria-hidden="true"><span /><span /><span /></div>
        <span className="sr-only">Verifying your secure access</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user.email_verified_at) {
    return <Navigate to="/email-verification-required" replace />;
  }

  return <>{children}</>;
}
