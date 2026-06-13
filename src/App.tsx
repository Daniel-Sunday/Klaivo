import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { analytics } from './lib/analytics';
import { useToast } from './context/ToastContext';

let deferredInstallPrompt: any = null;

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null;
}

export function showInstallPrompt() {
  if (!deferredInstallPrompt) return false;
  const alreadyShown = localStorage.getItem('klaivo_install_shown');
  if (alreadyShown) return false;

  analytics.installPromptShown();
  return true;
}

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
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" loading="lazy" />
    </div>
  );
}

export default function App() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Keyboard scrolling fix for focused inputs/textareas on mobile viewports
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
      ) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    };

    const viewport = window.visualViewport;
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  // Offline/Online connections check
  useEffect(() => {
    const handleOnline = () => {
      showToast("Back online! Connection restored.", "success");
    };

    const handleOffline = () => {
      showToast("You're offline. Your last sessions are still saved. Connect to keep studying.", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setTimeout(() => {
        showToast("You're offline. Your last sessions are still saved. Connect to keep studying.", "warning");
      }, 500);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  return (
    <AuthProvider>
      <StudyProvider>
        <BrowserRouter>
          <Suspense fallback={<SplashLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
              <Route path="/result/:sessionId" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
              <Route path="/flashcards/:sessionId" element={<ProtectedRoute requirePro><FlashcardsPage /></ProtectedRoute>} />
              <Route path="/quiz/:sessionId" element={<ProtectedRoute requirePro><QuizPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/s/:sessionId" element={<SharedResultPage />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </StudyProvider>
    </AuthProvider>
  );
}
