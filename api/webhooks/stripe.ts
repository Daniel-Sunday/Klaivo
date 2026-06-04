export const config = { runtime: 'edge' };
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://klaivo.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15' as any // default / compatible version if needed
    });
    
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') || '';

    let event: Stripe.Event;
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: CORS_HEADERS });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Database credentials missing' }), { status: 500, headers: CORS_HEADERS });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { customer_email, metadata } = session;

      if (customer_email) {
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
          .eq('email', customer_email);

        // Log the event
        if (metadata && metadata.userId) {
          await supabase
            .from('user_events')
            .insert({
              user_id: metadata.userId,
              event_name: 'subscription_activated',
              properties: { provider: 'stripe', amount: session.amount_total },
              created_at: new Date().toISOString()
            });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
