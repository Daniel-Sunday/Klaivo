import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SharedResultPage = lazy(() => import('./pages/SharedResultPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" loading="lazy" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StudyProvider>
        <BrowserRouter>
          <Suspense fallback={<SplashLoader />}>
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
              <Route path="/s/:sessionId" element={<SharedResultPage />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </StudyProvider>
    </AuthProvider>
  );
}
