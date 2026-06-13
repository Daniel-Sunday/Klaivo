import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Supabase handles the hash fragment (#access_token=...) automatically.
    // We listen for PASSWORD_RECOVERY to know the token is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      }
    );

    // Also check if there's already a valid session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Something went wrong. Please try again.');
    } else {
      setSuccess(true);
      // Redirect to home after a brief moment
      setTimeout(() => navigate('/home'), 2500);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Klaivo Logo */}
      <img
        src="/logo.svg"
        alt="Klaivo"
        className="w-16 h-16 k-breathe mb-10"
        loading="lazy"
      />

      {success ? (
        /* Success state */
        <div className="w-full max-w-sm text-center space-y-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ background: 'rgba(52, 211, 153, 0.1)' }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ color: '#34D399' }}
            >
              check_circle
            </span>
          </div>
          <h1
            className="text-[22px] font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Password updated
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-body)', fontFamily: 'Inter, sans-serif' }}
          >
            Your password has been changed successfully.
            <br />
            Redirecting you now...
          </p>
          <div className="flex justify-center pt-2">
            <span className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      ) : !ready ? (
        /* Loading / waiting for Supabase to pick up the token */
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="flex justify-center mb-4">
            <span className="inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
          <h1
            className="text-[22px] font-bold text-text-primary tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Verifying your link...
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
          >
            This will only take a moment.
          </p>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1
              className="text-[22px] font-bold text-text-primary tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Set a new password
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
            >
              Choose something strong you'll remember.
            </p>
          </div>

          <div className="space-y-4">
            {/* New password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="New password"
                className="w-full py-3.5 px-4 pr-12 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 transition-all rounded-xl"
                style={{
                  background: 'var(--surface-low)',
                  border: `1px solid ${error ? 'var(--danger, #f44)' : 'var(--ghost-border)'}`,
                  fontFamily: 'Inter, sans-serif',
                }}
                autoFocus
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
                style={{ color: 'var(--text-secondary)' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Confirm new password"
                className="w-full py-3.5 px-4 pr-12 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 transition-all rounded-xl"
                style={{
                  background: 'var(--surface-low)',
                  border: `1px solid ${error && password !== confirmPassword ? 'var(--danger, #f44)' : 'var(--ghost-border)'}`,
                  fontFamily: 'Inter, sans-serif',
                }}
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
                style={{ color: 'var(--text-secondary)' }}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Password strength hint */}
            {password.length > 0 && password.length < 6 && (
              <p
                className="text-xs"
                style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
              >
                At least 6 characters required.
              </p>
            )}

            {error && (
              <p className="text-xs text-red-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3.5 px-6 font-semibold text-text-primary text-sm hover:opacity-90 transition-opacity rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #6C63FF)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
