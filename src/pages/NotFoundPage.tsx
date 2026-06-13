import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 page-transition" style={{ background: 'var(--bg-primary)' }}>
      <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe mb-6" loading="lazy" />
      <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Manrope' }}>This page doesn't exist.</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>You might have followed a broken link.</p>
      <button onClick={() => navigate('/')} className="text-white rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: 'var(--accent)' }}>
        Back to Klaivo →
      </button>
    </div>
  );
}
