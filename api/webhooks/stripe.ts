import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable Vercel's default body parsing to get the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res?: any) {
  console.log('[Stripe Webhook] Request received');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-11-15' as any
  });

  try {
    let signature = '';
    let body = '';

    // Detect environment (Web Standard Request in local Vite vs Vercel Serverless req/res in production)
    const isWebReq = typeof req.headers?.get === 'function';

    if (isWebReq) {
      signature = req.headers.get('stripe-signature') || '';
      body = await req.text();
    } else {
      signature = (req.headers['stripe-signature'] as string) || '';
      
      // Read raw stream body
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      body = Buffer.concat(buffers).toString('utf8');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      if (isWebReq) {
        return new Response(`Webhook error: ${err.message}`, { status: 400 });
      } else {
        res.status(400).send(`Webhook error: ${err.message}`);
        return;
      }
    }

    console.log('[Stripe Webhook] Event verified successfully. Event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription as string;

      console.log('[Stripe Webhook] Checkout completed. userId:', userId, 'subscriptionId:', subscriptionId);

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        const plan = getPlanFromPriceId(priceId);
        const expiresAt = getExpiryDate(plan);
        const isTrial = plan === 'trial';

        console.log('[Stripe Webhook] Plan resolved:', plan, 'Expires at:', expiresAt);

        const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
        
        console.log('[Stripe Webhook] Updating profiles table for user:', userId);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            is_trial: isTrial,
            pro_expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('[Stripe Webhook] Supabase update failed:', updateError.message);
          throw updateError;
        }

        console.log('[Stripe Webhook] User profile successfully upgraded to Pro!');
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      // Subscription cancelled — let pro_expires_at expire naturally, don't revoke immediately
      console.log('[Stripe Webhook] Customer subscription deleted event received.');
    }

    if (isWebReq) {
      return new Response('OK', { status: 200 });
    } else {
      res.status(200).send('OK');
      return;
    }

  } catch (err: any) {
    console.error('[Stripe Webhook] Failure point logged:', err.message);
    if (res && typeof res.status === 'function') {
      res.status(500).json({ error: err.message });
    } else {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
}

function getPlanFromPriceId(priceId: string) {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_TRIAL || '']:     'trial',
    [process.env.STRIPE_PRICE_MONTHLY || '']:   'monthly',
    [process.env.STRIPE_PRICE_QUARTERLY || '']: 'quarterly',
    [process.env.STRIPE_PRICE_ANNUAL || '']:    'annual',
  };
  return map[priceId] || 'monthly';
}

function getExpiryDate(plan: string) {
  const now = new Date();
  if (plan === 'trial')     now.setDate(now.getDate() + 7);
  else if (plan === 'monthly')   now.setMonth(now.getMonth() + 1);
  else if (plan === 'quarterly') now.setMonth(now.getMonth() + 3);
  else if (plan === 'annual')    now.setFullYear(now.getFullYear() + 1);
  else {
    // Default fallback to 1 month instead of expiring instantly if plan is missing/unrecognized
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}
