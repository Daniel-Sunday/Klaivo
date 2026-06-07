import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/* ──────────────────────── Types ──────────────────────── */
type Geo = 'NG' | 'INT';

interface Plan {
  id: string;
  label: string;
  badge: string;
  price: string;
  accent: boolean;
}

const NG_PLANS: Plan[] = [
  { id: 'trial_ng',    label: '7-Day Trial',  badge: 'Start here',              price: '₦2,500',          accent: false },
  { id: 'monthly_ng',  label: 'Monthly',       badge: 'Full access',             price: '₦18,000/month',   accent: false },
  { id: 'quarterly_ng',label: '3 Months',      badge: 'Save 17%',               price: '₦45,000',         accent: false },
  { id: 'annual_ng',   label: 'Annual',        badge: 'Best value · Save 21%',  price: '₦170,000/year',   accent: true  },
];

const INT_PLANS: Plan[] = [
  { id: 'trial_int',    label: '7-Day Trial',  badge: 'Start here',              price: '$3',           accent: false },
  { id: 'monthly_int',  label: 'Monthly',       badge: 'Full access',             price: '$15/month',    accent: false },
  { id: 'quarterly_int',label: '3 Months',      badge: 'Save 13%',               price: '$39',          accent: false },
  { id: 'annual_int',   label: 'Annual',        badge: 'Best value · Save 17%',  price: '$150/year',    accent: true  },
];

/* ──────────────────── Feature Table ──────────────────── */
const FEATURES: { feature: string; free: string; pro: string }[] = [
  { feature: 'Total answers',        free: '2 per 8 days', pro: 'Unlimited' },
  { feature: 'Follow-up questions',  free: '3 per result', pro: 'Unlimited' },
  { feature: 'Flashcards',           free: '—',            pro: '✓' },
  { feature: 'Test Me quiz',         free: '—',            pro: '✓' },
  { feature: 'Image upload',         free: '—',            pro: '✓' },
  { feature: 'Study history',        free: '✓',            pro: '✓' },
  { feature: 'All modes',            free: '✓',            pro: '✓' },
];

/* ──────────────────── FAQ Data ──────────────────────── */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How many free answers do I get?',
    a: '2 per 8 days. The window resets automatically — enough to see what Klaivo does before you decide.',
  },
  {
    q: 'What does the 7-day trial give me?',
    a: 'Full Pro access — unlimited answers, flashcards, quiz, image upload — for 7 days.',
  },
  {
    q: 'Can I upgrade from trial to monthly without waiting?',
    a: 'Yes. You\'ll see the option immediately after your trial starts.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from Settings before your next billing date.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Cards and bank transfer (Nigeria via Paystack). All major cards internationally via Stripe.',
  },
];

/* ────────────────── Geo Detection ────────────────────── */
async function detectGeo(): Promise<Geo> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return 'INT';
    const data = await res.json();
    return data?.country_code === 'NG' ? 'NG' : 'INT';
  } catch {
    return 'INT';
  }
}

/* ──────────────────── Payment ────────────────────────── */
async function initiatePaystackPayment(planId: string, email: string, userId: string) {
  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const amounts: Record<string, number> = {
    trial_ng: 250000,
    monthly_ng: 1800000,
    quarterly_ng: 4500000,
    annual_ng: 17000000,
  };
  const amount = amounts[planId];
  if (!amount || !PAYSTACK_PUBLIC_KEY) return;

  const handler = (window as any).PaystackPop?.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount,
    currency: 'NGN',
    metadata: { userId, planId },
    callback: () => { window.location.reload(); },
    onClose: () => {},
  });
  handler?.openIframe();
}

async function initiateStripePayment(planId: string, email: string, userId: string) {
  // Stripe Checkout redirect — requires a server endpoint to create a session.
  // For now, redirect to a placeholder checkout page.
  const priceMap: Record<string, number> = {
    trial_int: 300,
    monthly_int: 1500,
    quarterly_int: 3900,
    annual_int: 15000,
  };
  const amount = priceMap[planId];
  if (!amount) return;

  // If you have a create-checkout-session endpoint, use it:
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ planId, email, userId, amount }),
    });
    const json = await res.json();
    if (json?.url) {
      window.location.href = json.url;
    }
  } catch {
    // Fallback: show a toast or handle gracefully
    console.error('Stripe checkout session creation failed');
  }
}

/* ══════════════════════════════════════════════════════════
   UpgradePage Component
   ══════════════════════════════════════════════════════════ */
export default function UpgradePage() {
  const navigate = useNavigate();
  const [geo, setGeo] = useState<Geo>('INT');
  const [selectedPlan, setSelectedPlan] = useState<string>('annual_int');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    detectGeo().then((g) => {
      setGeo(g);
      setSelectedPlan(g === 'NG' ? 'annual_ng' : 'annual_int');
    });
  }, []);

  const plans = geo === 'NG' ? NG_PLANS : INT_PLANS;

  const handleGetAccess = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/onboarding');
        return;
      }
      const email = user.email || '';
      const userId = user.id;

      if (geo === 'NG') {
        await initiatePaystackPayment(selectedPlan, email, userId);
      } else {
        await initiateStripePayment(selectedPlan, email, userId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-body)' }}
    >
      {/* ─── Top Bar ─── */}
      <header
        className="border-b px-6 py-4 fixed top-0 w-full z-50 backdrop-blur-xl"
        style={{ borderColor: 'var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-center relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 p-1.5 rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-['Manrope',sans-serif] text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Upgrade to Klaivo Pro
          </h1>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-grow max-w-2xl mx-auto w-full px-6 pt-24 pb-16">

        {/* ── Hero ── */}
        <section className="text-center pt-6 pb-10">
          <h2 className="font-['Manrope',sans-serif] text-[32px] font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent)' }}>◆</span> Klaivo Pro
          </h2>
          <p className="mt-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
            Study without limits.
          </p>
        </section>

        {/* ── Feature Comparison Table ── */}
        <section className="mb-10">
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--ghost-border)' }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th className="text-left px-5 py-3.5 font-semibold font-['Manrope',sans-serif]" style={{ color: 'var(--text-secondary)' }}>Feature</th>
                  <th className="text-center px-4 py-3.5 font-semibold font-['Manrope',sans-serif]" style={{ color: 'var(--text-secondary)' }}>Free</th>
                  <th className="text-center px-4 py-3.5 font-semibold font-['Manrope',sans-serif]" style={{ color: 'var(--accent)' }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, idx) => (
                  <tr
                    key={f.feature}
                    style={{
                      borderTop: '1px solid var(--ghost-border)',
                      background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    }}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--text-body)' }}>{f.feature}</td>
                    <td className="text-center px-4 py-3.5" style={{ color: 'var(--text-secondary)' }}>{f.free}</td>
                    <td className="text-center px-4 py-3.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{f.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            Free tier resets every 8 days — enough to experience Klaivo properly and make the decision. No tricks.
          </p>
        </section>

        {/* ── Social Proof ── */}
        <section className="text-center mb-12 px-4">
          <p className="italic text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            "I used Klaivo to understand a topic my lecturer couldn't explain in 3 weeks. In 4 minutes."
          </p>
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            — Engineering student, FUTO
          </p>
        </section>

        {/* ── Pricing Cards ── */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className="text-left rounded-2xl p-6 border transition-all duration-200 cursor-pointer relative"
                  style={{
                    background: isSelected ? 'var(--accent-subtle)' : 'var(--surface-low)',
                    borderColor: isSelected ? 'var(--accent)' : (plan.accent ? 'var(--accent-border)' : 'var(--ghost-border)'),
                    boxShadow: isSelected ? '0 0 0 2px var(--accent-border)' : 'none',
                  }}
                >
                  {/* Selection indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-['Manrope',sans-serif] text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {plan.label}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--accent)' : 'var(--ghost-border)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-bold font-['Manrope',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                    {plan.price}
                  </p>
                  <p className="text-xs mt-1 font-medium" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {plan.badge}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── CTA Button ── */}
        <section className="mb-14">
          <button
            onClick={handleGetAccess}
            disabled={processing}
            className="w-full py-4 rounded-full text-base font-bold text-white font-['Manrope',sans-serif] transition-opacity duration-200 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ background: 'var(--accent)' }}
          >
            {processing ? 'Processing...' : 'Get access →'}
          </button>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-8">
          <h2 className="font-['Manrope',sans-serif] text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border overflow-hidden transition-all"
                  style={{
                    borderColor: 'var(--ghost-border)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="text-sm font-medium pr-4">{faq.q}</span>
                    <span
                      className="material-symbols-outlined text-[20px] transition-transform duration-200 shrink-0"
                      style={{
                        color: 'var(--text-secondary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-200"
                    style={{
                      maxHeight: isOpen ? '200px' : '0',
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
