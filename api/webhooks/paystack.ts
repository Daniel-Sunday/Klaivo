import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request) {
  // Verify Paystack signature
  const signature = req.headers.get('x-paystack-signature');
  const body = await req.text();
  const crypto = await import('crypto');
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || '').update(body).digest('hex');
  if (hash !== signature) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(body);
  if (event.event !== 'charge.success') return new Response('OK', { status: 200 });

  const { user_id, plan } = event.data.metadata;
  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  const expiresAt = getExpiryDate(plan);
  await supabase.from('profiles').update({
    is_pro: true,
    pro_expires_at: expiresAt,
    updated_at: new Date().toISOString()
  }).eq('id', user_id);

  return new Response('OK', { status: 200 });
}

function getExpiryDate(plan: string) {
  const now = new Date();
  if (plan === 'trial')     now.setDate(now.getDate() + 7);
  if (plan === 'monthly')   now.setMonth(now.getMonth() + 1);
  if (plan === 'quarterly') now.setMonth(now.getMonth() + 3);
  if (plan === 'annual')    now.setFullYear(now.getFullYear() + 1);
  return now.toISOString();
}
