import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getProfile, upsertProfile } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user) {
        const { data: profile } = await getProfile(session.user.id)
        setProfile(profile)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session)
      setSession(session)
      if (event === 'SIGNED_IN' && session) {
        setLoading(true)
        await upsertProfile(session.user)
        const { data: profile } = await getProfile(session.user.id)
        setProfile(profile)
        setLoading(false)
      } else if (session?.user) {
        setLoading(true)
        const { data: profile } = await getProfile(session.user.id)
        setProfile(profile)
        setLoading(false)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (session?.user) {
      const { data: profile } = await getProfile(session.user.id)
      setProfile(profile)
    }
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
