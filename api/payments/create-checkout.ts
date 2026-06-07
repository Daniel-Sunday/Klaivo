export const config = { runtime: 'edge' };

import { verifyAuth } from '../_utils/auth';
import { getCorsHeaders, handleCors } from '../_utils/cors';
import Stripe from 'stripe';

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const cors = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  try {
    const { user, error } = await verifyAuth(req);
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const { priceId, userId } = await req.json();
    if (!priceId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing priceId or userId' }), { status: 400, headers: cors });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key missing in backend' }), { status: 500, headers: cors });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-11-15' as any, // Cast to avoid TS version mismatches
    });

    const origin = req.headers.get('origin') || 'https://klaivo.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/home?upgraded=true`,
      cancel_url: `${origin}/upgrade`,
      client_reference_id: userId,
      customer_email: user.email,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Something went wrong' }),
      {
        status: 500,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
