import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white page-transition"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-body)' }}
    >
      <header
        className="border-b px-6 py-4 fixed top-0 w-full z-50 backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
          paddingTop: 'calc(12px + var(--sat))',
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-center relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 p-1.5 rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-['Manrope',sans-serif] text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Terms of Service
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-grow max-w-2xl mx-auto w-full px-6 pt-28 pb-16 overflow-y-auto leading-relaxed">
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              1. Acceptable Use and Eligibility
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              To use Klaivo, you must be at least 13 years of age. By accessing or using our services, you represent and warrant that you meet this requirement.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              You agree to use Klaivo solely for personal, educational, and study purposes. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              2. Pro Subscriptions and Billing
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              We offer a Free tier with daily limits and a premium Pro subscription tier that grants unlimited answers, study sessions, image uploads, and advanced study modes.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2" style={{ color: 'var(--text-body)' }}>
              <li>
                <strong>Billing Cycle:</strong> Pro subscriptions are billed on a recurring monthly, quarterly, or annual basis depending on your selected option.
              </li>
              <li>
                <strong>Trials:</strong> Promotional trials grant temporary Pro access. Unless cancelled prior to expiration, your selected recurring payment method will be charged.
              </li>
              <li>
                <strong>Currency Conversion:</strong> Local display pricing in regions such as Ghana, Kenya, South Africa, and India are processed in USD equivalents via Stripe. Stripe handles automatic conversion at current market exchange rates.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              3. Refund Policy
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              If you experience any issues with your subscription, billing discrepancies, or service outages, you may request a refund by contacting us within <strong>7 days</strong> of the transaction.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              Refund approvals are subject to verification of usage history and technical issues. Approved refunds will be credited back to the original payment method.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              4. Academic Integrity
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              Klaivo is designed to serve as an educational companion, explaining complex concepts, helping with active recall, and summarizing study documents.
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              You agree not to use Klaivo for any form of academic dishonesty, including cheating on live tests, submitting AI-generated output as your own coursework in violation of your institution&apos;s policies, or bypass integrity safeguards.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              5. Termination
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that violates these Terms of Service or is harmful to other users, our service, or third parties.
            </p>
          </section>

          <div className="border-t pt-6 text-xs text-center" style={{ borderColor: 'var(--ghost-border)', color: 'var(--text-secondary)' }}>
            Last updated: June 8, 2026
          </div>
        </div>
      </main>
    </div>
  );
}
