import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const THEME_KEY = 'klaivo_theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function applyTheme(t: string) {
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-theme', resolved);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0A0A0F' : '#F8F8FC');
    localStorage.setItem(THEME_KEY, t);
  }

  async function setTheme(t: string) {
    setThemeState(t);
    applyTheme(t);
    // Persist to profile (for cross-device sync)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ theme: t }).eq('id', session.user.id);
    }
  }

  return { theme, setTheme };
}
