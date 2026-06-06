import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'system';

let globalTheme: Theme = (localStorage.getItem('theme') as Theme) || 'system';
const listeners = new Set<(theme: Theme) => void>();

const applyTheme = (newTheme: Theme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  
  if (newTheme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(newTheme);
  }
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(globalTheme);

  useEffect(() => {
    const handleChange = (newTheme: Theme) => {
      setThemeState(newTheme);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    globalTheme = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    listeners.forEach(l => l(newTheme));
  };

  // Add system listener if system theme is selected
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      applyTheme('system');
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  return { theme, setTheme };
}

// Apply theme immediately on load
if (typeof window !== 'undefined') {
  applyTheme(globalTheme);
}
