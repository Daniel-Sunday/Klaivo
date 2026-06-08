import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-11-15' as any
  });
  const signature = req.headers.get('stripe-signature') || '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription as string;

    if (userId && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0].price.id;

      const plan = getPlanFromPriceId(priceId);
      const expiresAt = getExpiryDate(plan);
      const isTrial = plan === 'trial';

      const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
      await supabase.from('profiles').update({
        is_pro: true,
        is_trial: isTrial,
        pro_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Subscription cancelled — let pro_expires_at expire naturally, don't revoke immediately
  }

  return new Response('OK', { status: 200 });
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
  if (plan === 'monthly')   now.setMonth(now.getMonth() + 1);
  if (plan === 'quarterly') now.setMonth(now.getMonth() + 3);
  if (plan === 'annual')    now.setFullYear(now.getFullYear() + 1);
  return now.toISOString();
}
