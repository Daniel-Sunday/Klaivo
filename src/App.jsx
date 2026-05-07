import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, upsertProfile } from './lib/supabase'
import { StudyProvider } from './context/StudyContext'
import LandingPage from './pages/LandingPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import FlashcardsPage from './pages/FlashcardsPage.jsx'
import QuizPage from './pages/QuizPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Session error:', error)
        }
        console.log('Session:', session)
        setSession(session)
        setLoading(false)
      } catch (err) {
        console.error('Auth initialization error:', err)
        setLoading(false)
      }
    }

    initializeAuth()

    // Add timeout fallback in case Supabase doesn't respond
    const timeout = setTimeout(() => {
      console.log('Auth timeout - forcing load complete')
      setLoading(false)
    }, 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)
        if (event === 'SIGNED_IN' && session) {
          await upsertProfile(session.user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#F0F0F5]">Loading...</div>
  }

  return (
    <StudyProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage session={session} />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/home" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </StudyProvider>
  )
}
