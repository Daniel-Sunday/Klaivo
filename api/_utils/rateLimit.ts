import { SupabaseClient } from '@supabase/supabase-js';

export async function checkAndIncrementRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    await supabase.from('rate_limits').insert({
      user_id: userId,
      call_count: 1,
      window_start: now.toISOString()
    });
    return { allowed: true, remaining: 9 };
  }

  const isNewWindow = new Date(existing.window_start) < windowStart;
  if (isNewWindow) {
    await supabase.from('rate_limits')
      .update({
        call_count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', userId);
    return { allowed: true, remaining: 9 };
  }

  if (existing.call_count >= 10) {
    return { allowed: false, remaining: 0 };
  }

  await supabase.from('rate_limits')
    .update({
      call_count: existing.call_count + 1,
      updated_at: now.toISOString()
    })
    .eq('user_id', userId);

  return { allowed: true, remaining: 10 - existing.call_count - 1 };
}
