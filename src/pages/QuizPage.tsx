import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateQuiz } from '../lib/api';
import { buildQuizPrompt } from '../lib/promptBuilder';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface AnsweredQuestion {
  selectedIndex: number;
  isCorrect: boolean;
}

export default function QuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const totalQuestions = 5;

  // Load session and generate quiz
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

        // Build quiz prompt using session data
        const heroKey = s.mode === 'write' ? 'full_draft' : s.mode === 'revise' ? 'full_notes' : 'full_answer';
        const fullAnswer = s.result_json?.[heroKey] || '';
        const { systemPrompt, userMessage } = buildQuizPrompt({
          topic: s.topic,
          level: s.level,
          fullAnswer
        });

        const response = await generateQuiz({ systemPrompt, userMessage });
        if (response && response.result && Array.isArray(response.result)) {
          const rawQuestions = response.result;
          const parsedQuestions = rawQuestions.map((q: any) => {
            const questionText = q.question || q.text || '';
            const opts = q.options || q.choices || q.answers || [];
            const correctIndex = typeof q.correct_index === 'number' 
              ? q.correct_index 
              : (typeof q.correctIndex === 'number' ? q.correctIndex : 0);
            const exp = q.explanation || q.reason || '';
            return {
              question: questionText,
              options: Array.isArray(opts) ? opts : [],
              correct_index: correctIndex,
              explanation: exp
            };
          }).filter((q: any) => q.question && q.options.length > 0);

          if (parsedQuestions.length > 0) {
            setQuestions(parsedQuestions.slice(0, totalQuestions));
          } else {
            throw new Error('No valid quiz questions could be parsed from the generator response.');
          }
        } else {
          throw new Error('Invalid response from quiz generator');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to generate quiz');
      } finally {
        setGenerating(false);
      }
    }

    if (sessionId) {
      loadAndGenerate();
    }
  }, [sessionId]);

  // Save quiz score when completed
  useEffect(() => {
    async function saveScore() {
      if (!isCompleted || scoreSaved || !sessionId) return;
      const score = answered.filter(a => a.isCorrect).length;
      try {
        await supabase.from('sessions').update({
          quiz_score: `${score}/${questions.length}`,
        }).eq('id', sessionId);
        setScoreSaved(true);
      } catch (err) {
        console.error('Failed to save quiz score:', err);
      }
    }
    saveScore();
  }, [isCompleted, scoreSaved, sessionId, answered, questions.length]);

  const handleSelectAnswer = (optionIndex: number) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === questions[currentIndex].correct_index;
    setAnswered(prev => [...prev, { selectedIndex: optionIndex, isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setSelectedAnswer(null);
      setShowExplanation(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const score = answered.filter(a => a.isCorrect).length;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-text-body font-['Inter',sans-serif]">
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe mb-4" />
        <p className="text-xs text-text-secondary tracking-wide">Loading study session...</p>
      </div>
    );
  }

  // ── Generating state ──
  if (generating) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-text-body font-['Inter',sans-serif]">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full w-24 h-24 blur-[20px] glow-breathe" style={{ background: 'var(--accent-glow)' }} />
          <img src="/logo.svg" alt="Klaivo" className="relative w-16 h-16 k-breathe" />
        </div>
        <h3 className="text-lg font-['Manrope',sans-serif] font-bold text-text-primary mb-1">Preparing your quiz</h3>
        <p className="text-xs text-text-secondary tracking-wide">Building questions from your study session...</p>
      </div>
    );
  }

  // ── Error state ──
  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-text-body font-['Inter',sans-serif] p-6 text-center">
        <span className="material-symbols-outlined text-danger text-5xl mb-4">error</span>
        <h3 className="text-lg font-['Manrope',sans-serif] font-bold text-text-primary mb-2">Quiz Generation Failed</h3>
        <p className="text-sm text-text-body max-w-xs mb-6">{error || 'Could not generate quiz questions.'}</p>
        <button
          onClick={() => navigate(`/result/${sessionId}`)}
          className="px-6 py-2.5 bg-bg-secondary border border-white/10 rounded-full text-xs font-semibold hover:bg-white/5 transition-colors"
        >
          Back to Results
        </button>
      </div>
    );
  }

  // ── Completed state ──
  if (isCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    const emoji = percentage >= 80 ? '🎯' : percentage >= 60 ? '💪' : percentage >= 40 ? '📚' : '🔄';
    const message = percentage >= 80
      ? 'Outstanding! You really know this material.'
      : percentage >= 60
        ? 'Solid understanding — a quick review will lock it in.'
        : percentage >= 40
          ? 'Getting there. Revisit the key points and try again.'
          : 'Time to review the material more carefully. You\'ve got this.';

    return (
      <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white">
        <header className="border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary font-['Manrope',sans-serif]">Quiz Complete</span>
            <span className="text-xs font-bold text-accent font-['Manrope',sans-serif]">{score} / {questions.length}</span>
          </div>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center p-6 pt-20">
          <div className="max-w-md w-full bg-bg-secondary border border-accent/30 shadow-[0_0_24px_rgba(79,142,247,0.06)] rounded-3xl p-8 text-center space-y-6">
            <div className="text-5xl mb-2">{emoji}</div>
            <div className="space-y-2">
              <h2 className="font-['Manrope',sans-serif] text-xl font-bold text-text-primary">
                {score} / {questions.length} correct
              </h2>
              <p className="text-sm text-text-body leading-relaxed">{message}</p>
              {session && (
                <p className="text-xs text-text-secondary mt-1">
                  Topic: <strong className="text-white">"{session.topic}"</strong>
                </p>
              )}
            </div>

            {/* Score segments */}
            <div className="flex gap-1.5 justify-center pt-2">
              {answered.map((a, i) => (
                <div
                  key={i}
                  className={`w-8 h-1.5 rounded-full transition-all ${a.isCorrect ? 'bg-success' : 'bg-danger'}`}
                />
              ))}
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsCompleted(false);
                  setCurrentIndex(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  setAnswered([]);
                  setScoreSaved(false);
                }}
                className="w-full py-3 bg-surface-low hover:bg-surface-mid text-xs font-semibold rounded-full border border-ghost-border transition-colors"
              >
                Retry Quiz
              </button>
              <button
                onClick={() => navigate(`/result/${sessionId}`)}
                className="w-full py-3 bg-accent hover:bg-accent/90 text-xs font-semibold text-white rounded-full transition-all shadow-[0_4px_12px_rgba(79,142,247,0.2)]"
              >
                Back to Results
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Active quiz state ──
  const currentQ = questions[currentIndex];
  if (!currentQ || !Array.isArray(currentQ.options) || currentQ.options.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-text-body font-['Inter',sans-serif] p-6 text-center">
        <span className="material-symbols-outlined text-danger text-5xl mb-4">error</span>
        <h3 className="text-lg font-['Manrope',sans-serif] font-bold text-text-primary mb-2">Quiz Format Error</h3>
        <p className="text-sm text-text-body max-w-xs mb-6">The generated quiz questions are not in the correct format.</p>
        <button
          onClick={() => navigate(`/result/${sessionId}`)}
          className="px-6 py-2.5 bg-bg-secondary border border-white/10 rounded-full text-xs font-semibold hover:bg-white/5 transition-colors"
        >
          Back to Results
        </button>
      </div>
    );
  }
  const hasAnswered = selectedAnswer !== null;

  return (
    <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/result/${sessionId}`)}
              className="text-text-secondary hover:text-text-primary p-1.5 hover:bg-surface-low rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
              aria-label="Back to results"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-['Manrope',sans-serif] text-sm font-bold text-text-primary tracking-tight truncate max-w-[150px] sm:max-w-xs">
              {session?.topic}
            </h1>
          </div>
          <span className="text-xs font-bold text-accent font-['Manrope',sans-serif]">
            Question {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </header>

      {/* Main Quiz Area */}
      <main className="flex-grow flex flex-col p-6 pt-24 pb-8 max-w-md w-full mx-auto">
        {/* Segmented progress bar — 5 segments */}
        <div className="w-full flex gap-1.5 mb-8">
          {Array.from({ length: questions.length }).map((_, i) => {
            let bgColor = 'bg-white/[0.06]'; // unanswered
            if (i < answered.length) {
              bgColor = answered[i].isCorrect ? 'bg-success' : 'bg-danger';
            } else if (i === currentIndex) {
              bgColor = 'bg-accent';
            }
            return (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${bgColor}`}
              />
            );
          })}
        </div>

        {/* Question Card */}
        <div className="bg-bg-secondary border border-ghost-border rounded-3xl p-6 mb-6">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest font-['Manrope',sans-serif] block mb-4">
            Question {currentIndex + 1}
          </span>
          <p className="text-base font-medium text-text-primary leading-relaxed whitespace-pre-line">
            {currentQ.question}
          </p>
        </div>

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {currentQ.options.map((option, i) => {
            let optionStyle = 'bg-bg-secondary border-ghost-border text-text-body hover:bg-surface-low hover:border-ghost-border';

            if (hasAnswered) {
              if (i === currentQ.correct_index) {
                optionStyle = 'bg-success/10 border-success/40 text-success';
              } else if (i === selectedAnswer && i !== currentQ.correct_index) {
                optionStyle = 'bg-danger/10 border-danger/40 text-danger';
              } else {
                optionStyle = 'bg-bg-secondary border-ghost-border text-text-secondary opacity-50';
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelectAnswer(i)}
                disabled={hasAnswered}
                className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-200 ${optionStyle} ${hasAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Explanation area — only shown when student taps "See why" */}
        {hasAnswered && !showExplanation && (
          <button
            onClick={() => setShowExplanation(true)}
            className="w-full py-3 mb-4 rounded-full text-xs font-semibold bg-surface-low hover:bg-surface-mid border border-ghost-border text-text-body transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            See why →
          </button>
        )}

        {hasAnswered && showExplanation && (
          <div className="bg-surface border border-accent/20 rounded-2xl p-5 mb-4 animate-[fadeIn_0.3s_ease-out]">
            <span className="text-[10px] text-accent font-bold uppercase tracking-widest font-['Manrope',sans-serif] block mb-2">
              Explanation
            </span>
            <p className="text-sm text-text-body leading-relaxed whitespace-pre-line">
              {currentQ.explanation}
            </p>
          </div>
        )}

        {/* Next / Complete button — only after answering */}
        {hasAnswered && (
          <button
            onClick={handleNextQuestion}
            className="w-full py-3.5 rounded-full text-xs font-semibold bg-accent hover:bg-accent/90 text-white transition-all shadow-[0_4px_12px_rgba(79,142,247,0.2)] active:scale-[0.98] mt-2"
          >
            {currentIndex === questions.length - 1 ? 'See Results ✓' : 'Next Question →'}
          </button>
        )}
      </main>
    </div>
  );
}
