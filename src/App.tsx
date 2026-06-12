import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StudyProvider } from './context/StudyContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { analytics } from './lib/analytics';

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

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" loading="lazy" />
    </div>
  );
}

export default function App() {
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [toastType, setToastType] = useState<'offline' | 'online' | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setToastType('online');
      setShowOfflineToast(true);
      const timer = setTimeout(() => {
        setShowOfflineToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setToastType('offline');
      setShowOfflineToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setToastType('offline');
      setShowOfflineToast(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

          {/* Global Offline/Online Toast */}
          {showOfflineToast && (
            <div 
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 font-medium text-sm backdrop-blur-md"
              style={{
                background: 'var(--surface-low)',
                color: 'var(--text-primary)',
                border: `1px solid ${toastType === 'offline' ? 'var(--danger)' : 'var(--success)'}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              <span 
                className="material-symbols-outlined text-[20px] select-none"
                style={{ color: toastType === 'offline' ? 'var(--danger)' : 'var(--success)' }}
              >
                {toastType === 'offline' ? 'wifi_off' : 'wifi'}
              </span>
              <span>
                {toastType === 'offline' ? (
                  <>
                    You're offline. Your last sessions are still saved.<br />
                    Connect and come back to keep studying.
                  </>
                ) : (
                  "Back online! Connection restored."
                )}
              </span>
              {toastType === 'offline' && (
                <button 
                  onClick={() => setShowOfflineToast(false)}
                  className="ml-2 text-text-secondary hover:text-text-primary text-xs bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center rounded-full hover:bg-white/5"
                  aria-label="Dismiss offline notification"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          )}
        </BrowserRouter>
      </StudyProvider>
    </AuthProvider>
  );
}
