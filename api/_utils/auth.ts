import { createClient, User, SupabaseClient } from '@supabase/supabase-js';

interface VerifyAuthResult {
  user: User | null;
  error: string | null;
  supabase?: SupabaseClient;
}

export async function verifyAuth(req: Request): Promise<VerifyAuthResult> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing token' };
  }
  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { user: null, error: 'Database environment variables are missing' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  return { user, error: error?.message || null, supabase };
}
