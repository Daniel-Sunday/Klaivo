import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUserPro } from '../lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
  requirePro?: boolean;
}

export function ProtectedRoute({ children, requirePro = false }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" />
    </div>
  );

  if (!session) return <Navigate to="/" replace />;
  if (profile === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" />
    </div>
  );
  if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  if (requirePro && !isUserPro(profile)) return <Navigate to="/upgrade" replace />;
  return <>{children}</>;
}
