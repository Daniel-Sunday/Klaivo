import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'What exactly is Klaivo?',
    answer:
      'Klaivo is an AI study companion that turns any topic into a full structured answer — built around your level, your goal, and your course materials. Not a search engine. Not a chatbot. A result engine.',
  },
  {
    question: 'Is Klaivo free?',
    answer:
      'Yes. You get 3 free answers every day — no credit card needed. Upgrade to Pro when you want unlimited answers, flashcards, quizzes, and document upload.',
  },
  {
    question: 'What makes Klaivo different from ChatGPT or Google?',
    answer:
      "Klaivo doesn't need you to know how to ask the right question. You give it a topic, tell it what you need, and it builds the answer for you — structured, deep, and ready for your exam or assignment.",
  },
  {
    question: 'Can I upload my lecture notes or textbooks?',
    answer:
      'Yes. Pro users can upload images of their notes and study materials. Klaivo reads your photos and builds answers directly from what you uploaded.',
  },
  {
    question: 'What subjects does Klaivo cover?',
    answer:
      "Every subject. Science, arts, engineering, medicine, law, business — if you're studying it, Klaivo can help with it.",
  },
  {
    question: 'Is Klaivo built for Nigerian students?',
    answer:
      "Klaivo was born in Nigeria and understands the Nigerian curriculum — WAEC, JAMB, university courses. But it works for every student, everywhere.",
  },
];

const GEO_PRICING = {
  NG: { trial: '₦2,500', monthly: '₦18,000', quarterly: '₦45,000', annual: '₦170,000', trialDays: 7, currency: '₦' },
  GH: { trial: '₵18',    monthly: '₵200',    quarterly: '₵540',    annual: '₵2,000',   trialDays: 7, currency: '₵' },
  KE: { trial: 'KSh 400', monthly: 'KSh 4,500', quarterly: 'KSh 12,000', annual: 'KSh 45,000', trialDays: 7, currency: 'KSh' },
  ZA: { trial: 'R35',    monthly: 'R400',    quarterly: 'R1,050',   annual: 'R3,900',   trialDays: 7, currency: 'R' },
  IN: { trial: '₹100',   monthly: '₹1,200',  quarterly: '₹3,200',   annual: '₹12,000',  trialDays: 7, currency: '₹' },
  default: { trial: '$3', monthly: '$15', quarterly: '$39', annual: '$150', trialDays: 7, currency: '$' },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  const [selectedCountry, setSelectedCountry] = useState<keyof typeof GEO_PRICING>('default');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [geoFailed, setGeoFailed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('/api/geo');
        if (!response.ok) {
          throw new Error('Geo fetch failed');
        }
        const data = await response.json();
        const countryCode = data?.country_code;
        if (countryCode && countryCode in GEO_PRICING) {
          setSelectedCountry(countryCode as keyof typeof GEO_PRICING);
        } else {
          setSelectedCountry('default');
        }
      } catch {
        setSelectedCountry('default');
        setGeoFailed(true);
      }
    };

    detectCountry();
  }, []);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/onboarding' }
    });
    if (error) {
      setAuthMessage('Error signing in with Google. Please try again.');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email) {
      setAuthMessage('Please enter your email address.');
      return;
    }
    setAuthLoading(true);
    setAuthMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/onboarding' }
    });
    setAuthLoading(false);
    if (error) {
      setAuthMessage('Error sending magic link. Please try again.');
    } else {
      setAuthMessage('Check your email — we sent you a link to sign in.');
    }
  };

  const pricing = GEO_PRICING[selectedCountry];
  const freePrice = pricing.currency === 'KSh' ? 'KSh 0' : `${pricing.currency}0`;

  return (
    <div className="bg-surface-dim text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      <header
        className="fixed top-0 w-full z-50 bg-bg-primary/80 backdrop-blur-xl transition-all duration-300"
        style={{ paddingTop: 'calc(12px + var(--sat))' }}
      >
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tighter text-text-primary font-headline">
              Klaivo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-text-body hover:text-accent transition-colors duration-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-6 items-center absolute top-full left-0 right-0 bg-bg-primary/95 backdrop-blur-xl p-6 md:p-0 md:bg-transparent md:static md:backdrop-blur-none`}>
              <a
                className="text-text-body hover:text-accent font-body text-sm transition-colors duration-300"
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                className="text-text-body hover:text-accent font-body text-sm transition-colors duration-300"
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                className="text-text-body hover:text-accent font-body text-sm transition-colors duration-300"
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <button
                className="md:hidden w-full bg-gradient-primary text-text-primary px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
                onClick={() => {
                  navigate('/onboarding');
                  setMobileMenuOpen(false);
                }}
              >
                Get Started
              </button>
            </div>
            <button
              className="hidden md:block bg-gradient-primary text-text-primary px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
              onClick={() => navigate('/onboarding')}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="pt-24 md:pt-32 pb-20">
        <section className="px-6 mx-auto max-w-lg md:max-w-3xl flex flex-col items-center text-center mb-32 pt-12">
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-text-primary mb-8">
            The AI for students who&apos;ve outgrown the old way.
          </h1>
          <div className="w-full max-w-sm space-y-4">
            <button
              className="w-full bg-text-primary text-surface-dim py-3.5 px-6 flex items-center justify-center gap-3 font-medium hover:bg-white transition-colors rounded-lg"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-xs font-label uppercase tracking-widest text-muted">OR</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  className="w-full bg-surface-container-low ghost-border py-3.5 px-4 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-sm rounded-lg"
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                className="w-full bg-gradient-primary text-text-primary py-3.5 px-6 font-semibold hover:opacity-90 transition-opacity rounded-lg"
                onClick={handleEmailSignIn}
                disabled={authLoading}
              >
                {authLoading ? 'Sending...' : 'Continue with email'}
              </button>
            </div>
            {authMessage && (
              <p className={`text-xs pt-2 ${authMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {authMessage}
              </p>
            )}
            <p className="text-xs text-text-secondary pt-4 leading-relaxed">
              By continuing, you agree to Klaivo&apos;s{' '}
              <Link className="underline hover:text-text-body transition-colors" to="/terms">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link className="underline hover:text-text-body transition-colors" to="/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="px-6 py-24 bg-surface max-w-5xl mx-auto rounded-3xl ghost-border mb-32 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center mx-auto max-w-3xl">
            <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-text-primary mb-6">
              Meet Klaivo.
            </h2>
            <p className="text-text-body text-lg md:text-xl leading-relaxed">
              Meet Klaivo, the AI that studies with you. It guides your thinking, not just answers
              questions — helping you understand deeply, retain more, and move from confusion to
              clarity.
            </p>
          </div>
        </section>

        <section id="features" className="px-6 max-w-5xl mx-auto mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-high ghost-border p-8 rounded-2xl hover:bg-surface-container-highest transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low ghost-border flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  menu_book
                </span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-text-primary mb-3">
                Real answers, instantly.
              </h3>
              <p className="text-text-body leading-relaxed text-sm">
                Drop any topic and get a full structured answer — explanation, key points, exam
                ready. All inside Klaivo.
              </p>
            </div>
            <div className="bg-surface-container-high ghost-border p-8 rounded-2xl hover:bg-surface-container-highest transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low ghost-border flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  upload_file
                </span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-text-primary mb-3">
                Upload your materials.
              </h3>
              <p className="text-text-body leading-relaxed text-sm">
                Lecture notes, PDFs, textbook pages. Klaivo reads them and builds answers directly
                from your course content.
              </p>
            </div>
            <div className="bg-surface-container-high ghost-border p-8 rounded-2xl hover:bg-surface-container-highest transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low ghost-border flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  style
                </span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-text-primary mb-3">
                Study that actually sticks.
              </h3>
              <p className="text-text-body leading-relaxed text-sm">
                Turn any answer into flashcards or a quiz instantly. Learn it, test yourself, and
                own it before the exam.
              </p>
            </div>
            <div className="bg-surface-container-high ghost-border p-8 rounded-2xl hover:bg-surface-container-highest transition-colors duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-surface-container-low ghost-border flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: "'FILL' 0" }}
                >
                  person
                </span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-text-primary mb-3">
                A companion that walks with you.
              </h3>
              <p className="text-text-body leading-relaxed text-sm">
                Klaivo adapts to your level and your goal every single session — from confusion to
                clarity, every time.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 bg-surface-container-low max-w-5xl mx-auto rounded-3xl border border-border-subtle/50 mb-32 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold font-label">
              A study tool built differently.
            </p>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
              Join our early users
            </h2>
          </div>
        </section>

        <section id="pricing" className="px-6 max-w-5xl mx-auto mb-32 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-6">
            Simple pricing. No surprises.
          </h2>

          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-full bg-surface-container-low p-1 border border-border-subtle/50">
              {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-6 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                    billingCycle === cycle
                      ? 'bg-gradient-primary text-text-primary shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
            <div className="bg-surface-container-low ghost-border p-8 rounded-3xl flex flex-col">
              <h3 className="font-headline text-2xl font-bold text-text-primary mb-2">Free</h3>
              <div className="text-text-body mb-8 text-sm">For casual study sessions.</div>
              <div className="text-3xl font-headline font-bold text-text-primary mb-8">
                {freePrice} <span className="text-sm font-normal text-text-secondary">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-text-secondary text-sm">check</span>3
                  answers per day
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-text-secondary text-sm">check</span>
                  Full structured result
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-text-secondary text-sm">check</span>
                  All results saved
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-text-secondary text-sm">check</span>3
                  follow-up questions per result
                </li>
              </ul>
              <button
                className="w-full ghost-border bg-transparent text-text-primary rounded-full py-3 font-medium hover:bg-surface-container-high transition-colors"
                onClick={() => navigate('/onboarding')}
              >
                Get Started
              </button>
            </div>

            <div className="bg-surface-container-high border border-primary/30 p-8 rounded-3xl flex flex-col relative overflow-hidden shadow-[0_0_40px_rgba(79,142,247,0.1)]">
              <div className="absolute top-0 right-0 bg-gradient-primary text-text-primary text-xs font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase">
                Most Popular
              </div>
              <h3 className="font-headline text-2xl font-bold text-primary mb-2">Pro</h3>
              <div className="text-text-body mb-8 text-sm">For absolute academic clarity.</div>
              <div className="mb-8">
                <div className="text-3xl font-headline font-bold text-text-primary">
                  {pricing[billingCycle]}
                  <span className="text-sm font-normal text-text-secondary ml-1">
                    /{billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'}
                  </span>
                </div>
                <div className="text-xs text-text-secondary mt-2">
                  Includes {pricing.trialDays}-day trial for only {pricing.trial}
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Unlimited answers
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Unlimited photo & material uploads
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Advanced study modes (flashcards & quizzes)
                </li>
                <li className="flex items-center gap-3 text-sm text-text-body">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  No advertisements
                </li>
              </ul>
              <button
                className="w-full bg-gradient-primary text-text-primary rounded-full py-3 font-semibold hover:opacity-90 transition-opacity"
                onClick={() => navigate('/onboarding')}
              >
                Start Free Trial
              </button>
            </div>
          </div>
          {geoFailed && selectedCountry !== 'NG' && (
            <button
              className="mt-6 text-center text-text-secondary text-sm hover:text-text-body transition-colors underline"
              onClick={() => setSelectedCountry('NG')}
            >
              See pricing in ₦
            </button>
          )}
        </section>

        <section id="faq" className="px-6 max-w-3xl mx-auto mb-32">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-text-primary mb-10 text-center">
            Questions students ask
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <button
                  key={item.question}
                  className="w-full text-left bg-surface-container-low ghost-border rounded-xl p-6 hover:bg-surface-container-high transition-colors cursor-pointer group"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-text-primary">{item.question}</h4>
                    <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">
                      {isOpen ? 'remove' : 'add'}
                    </span>
                  </div>
                  {isOpen && (
                    <p className="text-text-body leading-relaxed text-sm mt-4 pr-8">{item.answer}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border-subtle bg-bg-primary">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 max-w-7xl mx-auto gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-['Manrope'] font-bold text-text-primary text-xl tracking-tighter">
              Klaivo
            </span>
            <span className="text-text-secondary text-sm">Think with AI. Study like never before.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              className="text-text-secondary hover:text-text-primary text-sm underline-offset-4 hover:underline transition-colors"
              to="/privacy"
            >
              Privacy Policy
            </Link>
            <Link
              className="text-text-secondary hover:text-text-primary text-sm underline-offset-4 hover:underline transition-colors"
              to="/terms"
            >
              Terms of Service
            </Link>
            <a
              className="text-text-secondary hover:text-text-primary text-sm underline-offset-4 hover:underline transition-colors"
              href="#"
            >
              Twitter
            </a>
            <a
              className="text-text-secondary hover:text-text-primary text-sm underline-offset-4 hover:underline transition-colors"
              href="#"
            >
              LinkedIn
            </a>
          </div>
          <div className="text-text-secondary text-sm font-['Inter'] text-center md:text-right">
            © 2026 Klaivo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
