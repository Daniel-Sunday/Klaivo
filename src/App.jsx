import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StudyProvider } from './context/StudyContext'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import FlashcardsPage from './pages/FlashcardsPage.jsx'
import QuizPage from './pages/QuizPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <AuthProvider>
      <StudyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/home" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
            <Route path="/result/:sessionId" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
            <Route path="/flashcards/:sessionId" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
            <Route path="/quiz/:sessionId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </StudyProvider>
    </AuthProvider>
  )
}
