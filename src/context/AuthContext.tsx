import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase, getProfile, upsertProfile } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import type { Subscription } from '@supabase/supabase-js';
import { setAnalyticsUser } from '../lib/analytics';

interface AuthContextType {
  session: Session | null;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Prevent StrictMode double-subscription — only one listener at a time
  const subscriptionRef = useRef<Subscription | null>(null);

  // Track whether the first session load is complete so that subsequent
  // SIGNED_IN events (fired on tab refocus re-auth) don't flash a loading screen.
  const initializedRef = useRef(false);

  useEffect(() => {
    // Guard against stale async callbacks after unmount
    let mounted = true;

    // Helper: load profile and apply theme
    const loadProfile = async (userId: string) => {
      const { data: profileData } = await getProfile(userId);
      if (!mounted) return;
      setProfile(profileData);
      if (profileData?.theme) {
        localStorage.setItem('klaivo_theme', profileData.theme);
        const resolved = profileData.theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : profileData.theme;
        document.documentElement.setAttribute('data-theme', resolved);
      }
    };

    // Use onAuthStateChange as the SOLE source of session truth.
    // It fires INITIAL_SESSION synchronously on registration, so there is
    // no need for a separate getSession() call. Calling both causes GoTrue
    // lock contention — the "Lock was not released within 5000ms" error.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      console.log('Auth state change:', event);
      setSession(newSession);

      // Defer all asynchronous calls to prevent deadlocks on the GoTrue navigator lock.
      // Since onAuthStateChange subscriber is executed inside GoTrue's lock acquisition,
      // calling other Supabase API endpoints (which themselves require the lock) inside
      // the synchronous call stack of the subscriber will deadlock the client.
      setTimeout(async () => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && newSession) {
          setAnalyticsUser(newSession.user.id);
          if (!initializedRef.current) {
            // First sign-in: show loading, upsert profile, then load it
            setLoading(true);
            try {
              await upsertProfile(newSession.user);
              await loadProfile(newSession.user.id);
              initializedRef.current = true;
            } finally {
              if (mounted) setLoading(false);
            }
          } else {
            // Subsequent SIGNED_IN (tab refocus re-auth) — silently refresh
            // profile in the background without touching loading state.
            await upsertProfile(newSession.user);
            await loadProfile(newSession.user.id);
          }
        } else if (event === 'INITIAL_SESSION' && newSession?.user) {
          setAnalyticsUser(newSession.user.id);
          // First load / page refresh — hydrate profile
          try {
            await loadProfile(newSession.user.id);
            initializedRef.current = true;
          } finally {
            if (mounted) setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          setAnalyticsUser(newSession.user.id);
          // Tab re-focus / background refresh — session is already set above,
          // silently refresh profile without flashing a loading screen.
          await loadProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT' || !newSession) {
          setAnalyticsUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && !newSession) {
          setAnalyticsUser(null);
          // No existing session on first load
          setLoading(false);
        }
      }, 0);
    });

    subscriptionRef.current = subscription;

    return () => {
      mounted = false;
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const { data: profileData } = await getProfile(session.user.id);
      setProfile(profileData);
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
