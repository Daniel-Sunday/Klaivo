import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get current user profile
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return { data, error }
}

// Upsert profile on sign in
export async function upsertProfile(user) {
  const firstName = user.user_metadata?.full_name?.split(' ')[0]
    || user.email?.split('@')[0]
    || 'there'

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
    .maybeSingle()
  return { data, error }
}

// Get current session token for API calls
export async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
