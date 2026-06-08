import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get current user profile
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return { data, error };
}

// Upsert profile on sign in
export async function upsertProfile(user: User) {
  const rawName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
  // Clean up email prefixes like john.doe -> John
  const firstName = rawName.includes('@') 
    ? rawName.split('@')[0].split('.')[0] 
    : rawName.split(' ')[0];
  const cleanFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const { data, error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    first_name: cleanFirst,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id', ignoreDuplicates: false }).select().single();
  return { data, error };
}

// Get current session token for API calls
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function isUserPro(profile: any) {
  if (!profile?.is_pro) return false;
  if (!profile?.pro_expires_at) return false;
  return new Date(profile.pro_expires_at) > new Date();
}

export function isUserTrial(profile: any) {
  return isUserPro(profile) && profile?.is_trial === true;
}
