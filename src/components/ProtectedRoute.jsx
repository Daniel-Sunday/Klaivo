import { Navigate } from 'react-router-dom'
import { supabase, getProfile } from '../lib/supabase'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('ProtectedRoute: Checking auth status')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('ProtectedRoute: Session:', session?.user?.id)
      setSession(session)

      if (session) {
        const { data: profile, error } = await getProfile(session.user.id)
        console.log('ProtectedRoute: Profile check:', { profile, error, onboarding_complete: profile?.onboarding_complete })
        setOnboardingComplete(profile?.onboarding_complete || false)
      }

      setLoading(false)
    }

    checkAuth()

    // Add periodic re-check to detect changes
    const interval = setInterval(async () => {
      console.log('ProtectedRoute: Periodic check')
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await getProfile(session.user.id)
        console.log('ProtectedRoute: Periodic profile check:', { onboarding_complete: profile?.onboarding_complete })
        setOnboardingComplete(profile?.onboarding_complete || false)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    console.log('ProtectedRoute: Still loading')
    return <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#F0F0F5]">Loading...</div>
  }

  if (!session) {
    console.log('ProtectedRoute: No session, redirecting to /')
    return <Navigate to="/" />
  }

  if (!onboardingComplete) {
    console.log('ProtectedRoute: Onboarding not complete, redirecting to /onboarding')
    return <Navigate to="/onboarding" />
  }

  console.log('ProtectedRoute: All checks passed, rendering children')
  return children
}
