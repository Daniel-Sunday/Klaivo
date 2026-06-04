const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
REQUIRED_ENV.forEach(key => {
  if (!import.meta.env[key]) {
    document.body.innerHTML = `<div style="font-family:monospace;padding:2rem;color:#F87171;background:#0A0A0F;min-height:100vh;">Missing required env var: ${key}<br/>Check your .env file.</div>`
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
