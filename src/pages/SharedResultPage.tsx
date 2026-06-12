import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session } from '../types';

const MODE_NAMES: Record<string, string> = {
  understand: 'Explain Topic',
  write: 'Write Essay/Draft',
  prepare: 'Exam Prep',
  revise: 'Revision Notes',
};

const MODE_HERO_KEYS: Record<string, string> = {
  understand: 'full_answer',
  prepare: 'full_answer',
  write: 'full_draft',
  revise: 'full_notes',
};

function SkeletonCard() {
  return (
    <div className="bg-bg-secondary border border-ghost-border rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-5/6" />
        <div className="h-3 bg-white/5 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function SharedResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadSharedSession() {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('topic, mode, level, result_json, created_at, is_shared')
          .eq('id', sessionId)
          .eq('is_shared', true)
          .single();

        if (error) throw error;
        setSession(data as unknown as Session);
      } catch (err) {
        console.error('Failed to load shared session:', err);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadSharedSession();
    }
  }, [sessionId]);

  const renderProse = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <p className="text-text-body text-sm leading-relaxed whitespace-pre-line font-['Inter',sans-serif]">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className="text-white font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </p>
    );
  };

  const handleCopy = (text: string): void => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] pt-12">
        <header className="px-6 py-4 flex flex-col items-center">
          <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse mb-2" />
          <div className="w-24 h-4 bg-white/5 rounded animate-pulse" />
        </header>
        <main className="flex-grow max-w-2xl mx-auto w-full px-6 pt-10 pb-12 space-y-6">
          <SkeletonCard />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-bg-primary text-text-body min-h-screen flex flex-col justify-center items-center font-['Inter',sans-serif] px-6">
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <img src="/logo.svg" alt="Klaivo" className="w-12 h-12" loading="lazy" />
          <span className="font-['Manrope'] font-bold text-text-primary text-sm tracking-tight">klaivo.app</span>
        </div>
        <div className="bg-surface-low border border-ghost-border rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <h2 className="text-lg font-bold text-text-primary">Shared Study Session Not Found</h2>
          <p className="text-sm text-text-secondary">
            This link is invalid or the author has not enabled public sharing for this session.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-gradient-primary text-text-primary rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Klaivo Home
          </button>
        </div>
      </div>
    );
  }

  const heroKey = MODE_HERO_KEYS[session.mode] || 'full_answer';
  const heroContent = session.result_json?.[heroKey] || '';

  return (
    <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white pt-12">
      {/* Monogram Top Header */}
      <header className="px-6 py-4 flex flex-col items-center select-none">
        <button 
          onClick={() => navigate('/')} 
          aria-label="Klaivo Home"
          className="flex flex-col items-center gap-1.5 cursor-pointer group bg-transparent border-none"
        >
          <img 
            src="/logo.svg" 
            alt="Klaivo" 
            className="w-10 h-10 group-hover:scale-105 transition-transform duration-300" 
            loading="lazy"
          />
          <span className="font-['Manrope'] font-bold text-text-primary text-sm tracking-tight group-hover:text-accent transition-colors">
            klaivo.app
          </span>
        </button>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-grow max-w-2xl mx-auto w-full px-6 pt-6 pb-20">
        {/* Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <span className="bg-surface-low border border-ghost-border text-text-body px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide max-w-[200px] truncate">
            {session.topic}
          </span>
          <span className="bg-primary/10 border border-primary/20 text-accent px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            {MODE_NAMES[session.mode] || session.mode}
          </span>
          {session.level && (
            <span className="bg-surface-low border border-ghost-border text-text-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              {session.level}
            </span>
          )}
        </div>

        {/* Hero Card */}
        <div className="bg-surface border border-accent/30 shadow-[0_0_24px_rgba(79,142,247,0.06)] rounded-2xl p-6 relative">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle/50 pb-3">
            <div>
              <h3 className="text-sm font-bold font-['Manrope',sans-serif] text-accent">
                Study Result
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">Concept explained fully</p>
            </div>
            {heroContent && (
              <button
                onClick={() => handleCopy(heroContent)}
                aria-label="Copy content"
                className="text-text-secondary hover:text-text-body p-1.5 hover:bg-white/5 rounded-full transition-all flex items-center justify-center"
                title="Copy content"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            )}
          </div>
          {heroContent ? renderProse(heroContent) : (
            <p className="text-sm text-text-secondary italic">No structured content available.</p>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-12 p-8 rounded-3xl border border-accent/20 bg-surface-container-low/40 backdrop-blur-md text-center relative overflow-hidden shadow-[0_0_40px_rgba(79,142,247,0.05)]">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="text-xs uppercase tracking-widest text-primary font-bold font-label">
              Studied on Klaivo
            </span>
            <h3 className="font-headline text-lg font-bold text-text-primary leading-snug">
              The AI for students who&apos;ve outgrown the old way.
            </h3>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center bg-gradient-primary text-text-primary px-8 py-3.5 rounded-full font-bold text-sm hover:opacity-90 transition-all duration-300 shadow-lg"
            >
              Try Klaivo free →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
