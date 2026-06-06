import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, getProfile, upsertProfile } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

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

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data: profileData } = await getProfile(session.user.id);
        setProfile(profileData);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event, newSession);
      setSession(newSession);
      if (event === 'SIGNED_IN' && newSession) {
        setLoading(true);
        await upsertProfile(newSession.user);
        const { data: profileData } = await getProfile(newSession.user.id);
        setProfile(profileData);
        if (profileData?.theme) {
          localStorage.setItem('klaivo_theme', profileData.theme);
          const resolved = profileData.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : profileData.theme;
          document.documentElement.setAttribute('data-theme', resolved);
        }
        setLoading(false);
      } else if (newSession?.user) {
        setLoading(true);
        const { data: profileData } = await getProfile(newSession.user.id);
        setProfile(profileData);
        if (profileData?.theme) {
          localStorage.setItem('klaivo_theme', profileData.theme);
          const resolved = profileData.theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : profileData.theme;
          document.documentElement.setAttribute('data-theme', resolved);
        }
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session?.user) {
      const { data: profileData } = await getProfile(session.user.id);
      setProfile(profileData);
    }
  };

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
