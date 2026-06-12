import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

const savedTheme = localStorage.getItem('klaivo_theme') || 'dark';
const resolved = savedTheme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : savedTheme;
document.documentElement.setAttribute('data-theme', resolved);

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
REQUIRED_ENV.forEach(key => {
  if (!import.meta.env[key]) {
    document.body.innerHTML = `<div style="font-family:monospace;padding:2rem;color:#F87171;background:#0A0A0F;min-height:100vh;">Missing required env var: ${key}<br/>Check your .env file.</div>`
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // disable in dev
  tracesSampleRate: 0.1, // 10% of sessions for performance
  beforeSend(event) {
    // Scrub any PII before sending
    if (event.user) { delete event.user.email; delete event.user.name }
    return event
  },
})

function AppCrashFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="text-4xl font-bold mb-4" style={{ color: 'var(--accent)', fontFamily: 'Manrope' }}>K</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Manrope' }}>Something went wrong.</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Hmm — something unexpected happened. Let's start fresh.</p>
        <button onClick={() => window.location.href = '/'} className="text-white rounded-full px-6 py-3 text-sm font-semibold" style={{ background: 'var(--accent)' }}>
          Back to Klaivo
        </button>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<AppCrashFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/service-worker.ts')
    .catch(err => console.warn('SW registration failed:', err))
}
