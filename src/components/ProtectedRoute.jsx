import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ProtectedRoute({ children, requirePro = false }) {
  const [state, setState] = useState({ loading: true, session: null, profile: null })

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !mounted) { setState({ loading: false, session: null, profile: null }); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (mounted) setState({ loading: false, session, profile })
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => init())
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  if (state.loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
      <div className="text-4xl font-bold animate-pulse" style={{ color: '#4F8EF7', fontFamily: 'Manrope, sans-serif' }}>K</div>
    </div>
  )

  if (!state.session) return <Navigate to="/" replace />
  if (state.session && !state.profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  if (requirePro && !state.profile?.is_pro) return <Navigate to="/upgrade" replace />
  return children
}
