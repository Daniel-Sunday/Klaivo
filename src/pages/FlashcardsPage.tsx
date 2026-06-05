import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateFlashcards } from '../lib/api';
import { buildFlashcardsPrompt } from '../lib/promptBuilder';

interface Flashcard {
  question: string;
  answer: string;
}

export default function FlashcardsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    async function loadAndGenerate() {
      try {
        const { data: s, error: loadErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (loadErr || !s) {
          setError('Session not found');
          setLoading(false);
          setGenerating(false);
          return;
        }

        setSession(s);
        setLoading(false);

        // Generate flashcards from result based on depth
        const heroKey = s.mode === 'write' ? 'full_draft' : s.mode === 'revise' ? 'full_notes' : 'full_answer';
        const resultSummary = s.result_json[heroKey] || '';
        const { systemPrompt, userMessage } = buildFlashcardsPrompt({
          topic: s.topic,
          level: s.level,
          mode: s.mode,
          resultSummary,
          depth: s.depth
        });

        const response = await generateFlashcards({ systemPrompt, userMessage });
        if (response && response.result && Array.isArray(response.result)) {
          setFlashcards(response.result);
        } else {
          throw new Error('Invalid response from flashcards generator');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to generate flashcards');
      } finally {
        setGenerating(false);
      }
    }

    if (sessionId) {
      loadAndGenerate();
    }
  }, [sessionId]);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-[#e4e1e9] font-['Inter',sans-serif]">
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe mb-4" />
        <p className="text-xs text-[#6B6B80] tracking-wide">Loading study session...</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-[#e4e1e9] font-['Inter',sans-serif]">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[rgba(79,142,247,0.08)] rounded-full w-24 h-24 blur-[20px] glow-breathe" />
          <img src="/logo.svg" alt="Klaivo" className="relative w-16 h-16 k-breathe" />
        </div>
        <h3 className="text-lg font-['Manrope',sans-serif] font-bold text-[#F0F0F5] mb-1">Creating your study deck</h3>
        <p className="text-xs text-[#6B6B80] tracking-wide">Distilling core points into flashcards...</p>
      </div>
    );
  }

  if (error || flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-[#e4e1e9] font-['Inter',sans-serif] p-6 text-center">
        <span className="material-symbols-outlined text-[#FF453A] text-5xl mb-4">error</span>
        <h3 className="text-lg font-['Manrope',sans-serif] font-bold text-[#F0F0F5] mb-2">Generation Failed</h3>
        <p className="text-sm text-[#CACAD5] max-w-xs mb-6">{error || 'Could not generate flashcards.'}</p>
        <button 
          onClick={() => navigate(`/result/${sessionId}`)} 
          className="px-6 py-2.5 bg-[#16161F] border border-white/10 rounded-full text-xs font-semibold hover:bg-white/5 transition-colors"
        >
          Back to Results
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;

  if (isCompleted) {
    return (
      <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-[#508ff8] selection:text-white">
        <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B6B80] font-['Manrope',sans-serif]">Deck Finished</span>
            <span className="text-xs font-bold text-[#4F8EF7] font-['Manrope',sans-serif]">{totalCards} / {totalCards}</span>
          </div>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center p-6 pt-20">
          <div className="max-w-md w-full bg-[#16161F] border border-[#4F8EF7]/30 shadow-[0_0_24px_rgba(79,142,247,0.06)] rounded-3xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-[rgba(79,142,247,0.1)] border border-[#4F8EF7]/20 rounded-full flex items-center justify-center mx-auto text-[#4F8EF7] shadow-lg animate-bounce">
              <span className="material-symbols-outlined text-3xl">done_all</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-['Manrope',sans-serif] text-xl font-bold text-[#F0F0F5]">Mastery achieved!</h2>
              <p className="text-sm text-[#CACAD5] leading-relaxed">
                You've reviewed all {totalCards} cards for <strong className="text-white">"{session.topic}"</strong>. Take a moment to reflect before moving to the next task.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={() => {
                  setIsCompleted(false);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }} 
                className="w-full py-3 bg-[#1D1D26] hover:bg-[#252530] text-xs font-semibold rounded-full border border-white/[0.08] transition-colors"
              >
                Restart Review
              </button>
              <button 
                onClick={() => navigate(`/result/${sessionId}`)} 
                className="w-full py-3 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-xs font-semibold text-white rounded-full transition-all shadow-[0_4px_12px_rgba(79,142,247,0.2)]"
              >
                Back to Results
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Card perspective and flipping style configs
  const containerStyle: React.CSSProperties = {
    perspective: '1000px',
  };

  const innerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    transformStyle: 'preserve-3d',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const commonFaceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    borderRadius: '24px',
  };

  const frontStyle: React.CSSProperties = {
    ...commonFaceStyle,
    background: '#16161F',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  const backStyle: React.CSSProperties = {
    ...commonFaceStyle,
    background: '#13131F',
    border: '1px solid rgba(79, 142, 247, 0.3)',
    boxShadow: '0 0 24px rgba(79, 142, 247, 0.06)',
    transform: 'rotateY(180deg)',
  };

  return (
    <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-[#508ff8] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/result/${sessionId}`)}
              className="text-[#6B6B80] hover:text-[#e4e1e9] p-1.5 hover:bg-[#1C1C24] rounded-full transition-colors flex items-center justify-center"
              aria-label="Back to results"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-['Manrope',sans-serif] text-sm font-bold text-[#F0F0F5] tracking-tight truncate max-w-[150px] sm:max-w-xs">
              {session.topic}
            </h1>
          </div>
          <span className="text-xs font-bold text-[#4F8EF7] font-['Manrope',sans-serif]">
            {currentIndex + 1} / {totalCards}
          </span>
        </div>
      </header>

      {/* Main Flashcard Container */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 pt-20 pb-8 max-w-md w-full mx-auto">
        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1 rounded-full mb-8 overflow-hidden">
          <div 
            className="bg-[#4F8EF7] h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>

        {/* 3D Flashcard element */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-80 sm:h-96 cursor-pointer select-none"
          style={containerStyle}
        >
          <div style={innerStyle}>
            {/* Front Side */}
            <div style={frontStyle} className="text-center space-y-4">
              <span className="text-[10px] text-[#6B6B80] font-bold uppercase tracking-widest font-['Manrope',sans-serif]">Question</span>
              <p className="text-base font-medium font-['Inter',sans-serif] text-[#F0F0F5] px-4 leading-relaxed whitespace-pre-line">
                {currentCard.question}
              </p>
              <span className="text-xs text-[#4F8EF7]/70 font-semibold absolute bottom-6 font-['Manrope',sans-serif] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm animate-pulse">flip</span> Tap card to reveal answer
              </span>
            </div>

            {/* Back Side */}
            <div style={backStyle} className="text-center space-y-4">
              <span className="text-[10px] text-[#4F8EF7] font-bold uppercase tracking-widest font-['Manrope',sans-serif]">Explanation</span>
              <p className="text-sm font-['Inter',sans-serif] text-[#CACAD5] px-4 leading-relaxed whitespace-pre-line">
                {currentCard.answer}
              </p>
              <span className="text-xs text-[#6B6B80] absolute bottom-6 font-['Manrope',sans-serif] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">flip</span> Tap card to flip back
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="w-full mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-5 py-3 rounded-full text-xs font-semibold bg-[#16161F] hover:bg-[#1C1C26] border border-white/[0.06] text-[#CACAD5] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            ← Previous
          </button>
          
          <button
            onClick={handleNext}
            className="px-6 py-3 rounded-full text-xs font-semibold bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white transition-all shadow-[0_4px_12px_rgba(79,142,247,0.2)] active:scale-[0.98]"
          >
            {currentIndex === totalCards - 1 ? 'Complete deck ✓' : 'Next Card →'}
          </button>
        </div>
      </main>
    </div>
  );
}
