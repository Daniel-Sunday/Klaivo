import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSuccess(true);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* K monogram */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-10"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #6C63FF)',
          boxShadow: '0 0 40px rgba(79,142,247,0.15)',
        }}
      >
        <span
          className="text-2xl font-extrabold text-white select-none"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          K
        </span>
      </div>

      {success ? (
        /* Success state */
        <div className="w-full max-w-sm text-center space-y-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: 'var(--accent)' }}
            >
              mark_email_read
            </span>
          </div>
          <h1
            className="text-[22px] font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Check your email
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-body)', fontFamily: 'Inter, sans-serif' }}
          >
            We sent a reset link to <strong className="text-text-primary">{email}</strong>.
            <br />
            Open it to set a new password.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 mt-4"
            style={{ color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to sign in
          </Link>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1
              className="text-[22px] font-bold text-text-primary tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Reset your password
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
            >
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your email"
              className="w-full py-3.5 px-4 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 transition-all rounded-xl"
              style={{
                background: 'var(--surface-low)',
                border: `1px solid ${error ? 'var(--danger, #f44)' : 'var(--ghost-border)'}`,
                fontFamily: 'Inter, sans-serif',
              }}
              autoFocus
              autoComplete="email"
            />

            {error && (
              <p className="text-xs text-red-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 font-semibold text-text-primary text-sm hover:opacity-90 transition-opacity rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #6C63FF)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send reset link
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
