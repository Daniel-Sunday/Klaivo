import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Disable Vercel's default body parsing to get the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res?: any) {
  console.log('[Paystack Webhook] Request received');

  try {
    let signature = '';
    let body = '';

    // Detect environment (Web Standard Request in local Vite vs Vercel Serverless req/res in production)
    const isWebReq = typeof req.headers?.get === 'function';

    if (isWebReq) {
      signature = req.headers.get('x-paystack-signature') || '';
      body = await req.text();
    } else {
      signature = (req.headers['x-paystack-signature'] as string) || '';
      
      // Read raw stream body
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      body = Buffer.concat(buffers).toString('utf8');
    }

    console.log('[Paystack Webhook] x-paystack-signature header:', signature);

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    console.log('[Paystack Webhook] PAYSTACK_SECRET_KEY is present:', !!paystackSecretKey);

    const hash = crypto.createHmac('sha512', paystackSecretKey || '').update(body).digest('hex');
    
    if (hash.toLowerCase() !== signature?.toLowerCase()) {
      console.error('[Paystack Webhook] Signature mismatch! Computed:', hash, 'Header:', signature);
      if (isWebReq) {
        return new Response('Invalid signature', { status: 400 });
      } else {
        res.status(400).send('Invalid signature');
        return;
      }
    }
    console.log('[Paystack Webhook] Signature verified successfully');

    const event = JSON.parse(body);
    console.log('[Paystack Webhook] Event type:', event.event);

    const customerEmail = event.data?.customer?.email;
    console.log('[Paystack Webhook] Incoming customer email:', customerEmail);

    if (event.event !== 'charge.success') {
      console.log('[Paystack Webhook] Ignoring non charge.success event:', event.event);
      if (isWebReq) {
        return new Response('OK', { status: 200 });
      } else {
        res.status(200).send('OK');
        return;
      }
    }

    let metadata = event.data?.metadata;
    console.log('[Paystack Webhook] Raw metadata:', JSON.stringify(metadata));

    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
        console.log('[Paystack Webhook] Parsed metadata string successfully:', JSON.stringify(metadata));
      } catch (e: any) {
        console.error('[Paystack Webhook] Failed to parse metadata string:', e.message);
        metadata = {};
      }
    }

    const { user_id, plan } = metadata || {};
    console.log('[Paystack Webhook] Extracted user_id from metadata:', user_id);
    console.log('[Paystack Webhook] Extracted plan from metadata:', plan);

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

    console.log('[Paystack Webhook] SUPABASE_URL:', supabaseUrl);
    console.log('[Paystack Webhook] SUPABASE_SERVICE_ROLE_KEY is present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[Paystack Webhook] SUPABASE_SERVICE_KEY is present:', !!process.env.SUPABASE_SERVICE_KEY);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Database environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let targetUserId = user_id;

    if (!targetUserId && customerEmail) {
      console.log('[Paystack Webhook] No user_id found in metadata. Looking up user by email in database...');
      console.log('[Paystack Webhook] Query: supabase.from("profiles").select("id").ilike("email",', customerEmail, ').maybeSingle()');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', customerEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[Paystack Webhook] Database error querying profile by email:', profileError);
      } else if (profileData?.id) {
        targetUserId = profileData.id;
        console.log('[Paystack Webhook] Found user_id from email lookup:', targetUserId);
      } else {
        console.warn('[Paystack Webhook] No profile found with email:', customerEmail);
      }
    }

    if (!targetUserId) {
      throw new Error('Could not identify target user by metadata user_id or customer email');
    }

    const expiresAt = getExpiryDate(plan);
    const updateData = {
      is_pro: true,
      is_trial: plan === 'trial',
      pro_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    };

    console.log('[Paystack Webhook] Executing Supabase query...');
    console.log('[Paystack Webhook] Table: profiles');
    console.log('[Paystack Webhook] Action: update');
    console.log('[Paystack Webhook] Data:', JSON.stringify(updateData));
    console.log('[Paystack Webhook] Match: eq("id",', targetUserId, ')');

    const { data: updateResult, error: updateError, status: updateStatus, statusText } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select();

    console.log('[Paystack Webhook] Supabase response status:', updateStatus, statusText);
    console.log('[Paystack Webhook] Supabase response error:', JSON.stringify(updateError));
    console.log('[Paystack Webhook] Supabase response data:', JSON.stringify(updateResult));

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('[Paystack Webhook] Flow completed successfully for user_id:', targetUserId);
    
    if (isWebReq) {
      return new Response('OK', { status: 200 });
    } else {
      res.status(200).send('OK');
      return;
    }

  } catch (err: any) {
    console.error('[Paystack Webhook] Failure point logged:', err.message);
    if (res && typeof res.status === 'function') {
      res.status(500).json({ error: err.message });
    } else {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
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
