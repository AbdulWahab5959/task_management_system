import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ProfessionalLoader from './common/ProfessionalLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export default function ProtectedRoute({ children, requireVerified = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-5"><ProfessionalLoader label="Loading your session" detail="Verifying your secure access" className="mx-auto max-w-xl" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !user.email_verified_at) {
    return <Navigate to="/email-verification-required" replace />;
  }

  return <>{children}</>;
}
