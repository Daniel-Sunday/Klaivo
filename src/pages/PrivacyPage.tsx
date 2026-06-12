import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-body)' }}
    >
      {/* Top Bar */}
      <header
        className="border-b px-6 py-4 fixed top-0 w-full z-50 backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
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
            Privacy Policy
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-grow max-w-2xl mx-auto w-full px-6 pt-28 pb-16 overflow-y-auto leading-relaxed">
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              1. Information We Collect
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              To provide you with a personalized study experience, Klaivo collects the following categories of information:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2" style={{ color: 'var(--text-body)' }}>
              <li>
                <strong>Account Credentials:</strong> We collect your email address when you sign in via Google OAuth or Magic Link.
              </li>
              <li>
                <strong>Academic Profile:</strong> We ask for your academic level (e.g., secondary, undergraduate, graduate) to tailor the study responses to your curriculum.
              </li>
              <li>
                <strong>Study Session Data:</strong> We store the topics, queries, generated answers, flashcards, quizzes, and chat histories generated during your learning sessions.
              </li>
              <li>
                <strong>Uploaded Materials:</strong> We collect and process images of notes, whiteboard sessions, or study sheets that you upload to create structured answers.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              2. How We Use Your Information
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              We use the collected information solely for operating, improving, and customizing Klaivo. Specifically, we use it to:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2" style={{ color: 'var(--text-body)' }}>
              <li>Generate highly context-aware explanations, structured answers, flashcards, and quizzes.</li>
              <li>Save your learning history so you can retrieve past study sessions at any time.</li>
              <li>Analyze user interaction trends to enhance our underlying educational models and user interface.</li>
              <li>Send transaction emails, support replies, and essential updates related to your account.</li>
            </ul>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Klaivo does not sell, lease, or distribute your personal data or uploaded documents to third-party advertisers or data brokers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              3. Data Retention and Control
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              You retain full control over your data. We store your account details and study history for as long as your account is active.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              At any point, you can request the deletion of your account and all associated study materials, uploaded images, and sessions directly from the settings page or by contacting support. Once deleted, this data cannot be recovered.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              4. Contact Us
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please feel free to reach out to us at:
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              support@klaivo.com
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
