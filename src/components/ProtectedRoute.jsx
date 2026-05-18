import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, requirePro = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" />
    </div>
  )

  if (!session) return <Navigate to="/" replace />
  if (profile === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" />
    </div>
  )
  if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />
  if (requirePro && !profile.is_pro) return <Navigate to="/upgrade" replace />
  return children
}
