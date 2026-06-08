import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import WelcomePage from './pages/WelcomePage';
import ResultPage from './pages/ResultPage';
import FlashcardsPage from './pages/FlashcardsPage';
import QuizPage from './pages/QuizPage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import UpgradePage from './pages/UpgradePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

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
            <Route path="/flashcards/:sessionId" element={<ProtectedRoute requirePro><FlashcardsPage /></ProtectedRoute>} />
            <Route path="/quiz/:sessionId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </BrowserRouter>
      </StudyProvider>
    </AuthProvider>
  );
}
