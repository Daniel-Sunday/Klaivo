import { getAuthToken } from './supabase';
import { analytics } from './analytics';

// ─────────────────────────────────────────
// PLAN DEFINITIONS
// trial     = 7-day full access
// monthly   = recurring monthly
// quarterly = every 3 months ($39 / ₦45,000)
// annual    = every 12 months ($150 / ₦170,000)
// ─────────────────────────────────────────
const PLANS: Record<string, Record<string, { amount?: number; priceId?: string; label: string; period: string }>> = {
  NG: {
    trial:     { amount: 250000,   label: '₦2,500 — 7 days',         period: 'trial' },
    monthly:   { amount: 1800000,  label: '₦18,000/month',            period: 'monthly' },
    quarterly: { amount: 4500000,  label: '₦45,000 — 3 months',       period: 'quarterly' },
    annual:    { amount: 17000000, label: '₦170,000 — 12 months',     period: 'annual' },
  },
  INT: {
    trial:     { priceId: 'price_trial_id',     label: '$3 — 7 days',          period: 'trial' },
    monthly:   { priceId: 'price_monthly_id',   label: '$15/month',             period: 'monthly' },
    quarterly: { priceId: 'price_quarterly_id', label: '$39 — 3 months',        period: 'quarterly' },
    annual:    { priceId: 'price_annual_id',     label: '$150 — 12 months',     period: 'annual' },
  }
};

interface PaystackOptions {
  email: string;
  plan: string;
  userId: string;
}

export async function initiatePaystackPayment({ email, plan, userId }: PaystackOptions): Promise<{ reference: string; plan: string }> {
  const planConfig = PLANS.NG[plan];
  if (!planConfig) throw new Error(`Invalid plan: ${plan}`);

  analytics.paymentInitiated('paystack', plan);

  return new Promise((resolve, reject) => {
    const handler = (window as any).PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email,
      amount: planConfig.amount,
      currency: 'NGN',
      metadata: { user_id: userId, plan, provider: 'paystack' },
      callback: (response: any) => {
        analytics.paymentCompleted('paystack', plan);
        resolve({ reference: response.reference, plan });
      },
      onClose: () => reject(new Error('PAYMENT_CANCELLED')),
    });
    handler.openIframe();
  });
}

interface StripeOptions {
  email: string;
  plan: string;
  userId: string;
}

export async function initiateStripeCheckout({ email, plan, userId }: StripeOptions): Promise<void> {
  const planConfig = PLANS.INT[plan];
  if (!planConfig) throw new Error(`Invalid plan: ${plan}`);
  
  analytics.paymentInitiated('stripe', plan);

  const token = await getAuthToken();

  const response = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ priceId: planConfig.priceId, email, userId, plan })
  });

  if (!response.ok) {
    throw new Error('STRIPE_CHECKOUT_FAILED');
  }

  const { url } = await response.json() as { url: string };
  window.location.href = url; // Stripe hosted checkout
}
