export const config = { runtime: 'edge' };
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://klaivo.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await req.json();
    const { event, data } = body;

    // Verify Paystack webhook signature
    const hash = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const expectedHash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');

    if (hash !== expectedHash) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: CORS_HEADERS });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Database credentials missing' }), { status: 500, headers: CORS_HEADERS });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (event === 'charge.success') {
      const { customer: { email }, metadata: { userId } } = data;

      // Update user to pro
      const proExpiresAt = new Date();
      proExpiresAt.setMonth(proExpiresAt.getMonth() + 1);

      await supabase
        .from('profiles')
        .update({
          is_pro: true,
          pro_expires_at: proExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      // Log the event
      await supabase
        .from('user_events')
        .insert({
          user_id: userId,
          event_name: 'subscription_activated',
          properties: { provider: 'paystack', amount: data.amount },
          created_at: new Date().toISOString()
        });
    }

    return new Response(JSON.stringify({ received: true }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
