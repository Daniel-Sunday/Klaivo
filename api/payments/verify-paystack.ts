export const config = { runtime: 'edge' };

import { verifyAuth } from '../_utils/auth';
import { getCorsHeaders, handleCors } from '../_utils/cors';

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const cors = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  try {
    const { user, error, supabase } = await verifyAuth(req);
    if (error || !user || !supabase) {
      return new Response(JSON.stringify({ error: error || 'Unauthorized' }), { status: 401, headers: cors });
    }

    const { reference, plan } = await req.json();
    if (!reference || !plan) {
      return new Response(JSON.stringify({ error: 'Missing reference or plan' }), { status: 400, headers: cors });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return new Response(JSON.stringify({ error: 'Paystack secret key missing in backend' }), { status: 500, headers: cors });
    }

    // Call Paystack API to verify transaction
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!paystackRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to verify transaction with Paystack' }), { status: 400, headers: cors });
    }

    const paystackData = await paystackRes.json();
    if (paystackData.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Transaction was not successful' }), { status: 400, headers: cors });
    }

    // Double check that the metadata user_id matches to prevent cross-account attacks
    const metadata = paystackData.data.metadata;
    const metadataUserId = typeof metadata === 'string' 
      ? JSON.parse(metadata).user_id 
      : metadata?.user_id;

    if (metadataUserId && metadataUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'User ID mismatch' }), { status: 400, headers: cors });
    }

    // Calculate expiry date
    const expiresAt = getExpiryDate(plan);
    const isTrial = plan === 'trial';

    // Update profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        is_trial: isTrial,
        pro_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: cors });
    }

    return new Response(
      JSON.stringify({ success: true }),
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

function getExpiryDate(plan: string) {
  const now = new Date();
  if (plan === 'trial')     now.setDate(now.getDate() + 7);
  else if (plan === 'monthly')   now.setMonth(now.getMonth() + 1);
  else if (plan === 'quarterly') now.setMonth(now.getMonth() + 3);
  else if (plan === 'annual')    now.setFullYear(now.getFullYear() + 1);
  else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}
