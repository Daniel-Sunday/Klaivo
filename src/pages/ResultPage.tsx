import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { refineAnswer, generateFollowUp, stripMarkdownForCopy } from '../lib/api';
import { getModeSchema } from '../lib/promptBuilder';

interface CollapsibleItem {
  question: string;
  approach: string;
}

const CARD_CONFIG: Record<string, { key: string; label: string; color: string; type: 'prose' | 'bullets' | 'hero' | 'questions' | 'test_questions'; subheader?: string }[]> = {
  understand: [
    { key: 'simple_version', label: '✦ The Simple Version', color: 'var(--accent)', type: 'prose' },
    { key: 'what_you_must_know', label: '◆ What You Must Know', color: 'var(--text-secondary)', type: 'bullets' },
    { key: 'full_answer', label: '◆ Your Full Answer', color: 'var(--accent)', type: 'hero', subheader: 'Concept explained fully' },
    { key: 'common_misconceptions', label: '◆ Common Misconceptions', color: 'var(--text-secondary)', type: 'prose' },
  ],
  write: [
    { key: 'structure_outline', label: '✦ Structure & Outline', color: 'var(--accent)', type: 'prose' },
    { key: 'what_markers_want', label: '◆ What Your Marker Wants', color: 'var(--text-secondary)', type: 'prose' },
    { key: 'full_draft', label: '◆ Your Full Draft', color: 'var(--accent)', type: 'hero', subheader: 'Assignment-ready writing' },
    { key: 'common_mistakes', label: '◆ Common Mistakes to Avoid', color: 'var(--text-secondary)', type: 'prose' },
  ],
  prepare: [
    { key: 'key_definitions', label: '✦ Key Definitions', color: 'var(--accent)', type: 'bullets' },
    { key: 'exam_strategy', label: '◆ Exam Strategy', color: 'var(--text-secondary)', type: 'prose' },
    { key: 'full_answer', label: '◆ The Complete Answer', color: 'var(--accent)', type: 'hero', subheader: 'Written to score marks' },
    { key: 'likely_questions', label: '◆ Questions You\'ll Likely Face', color: 'var(--text-secondary)', type: 'questions' },
  ],
  revise: [
    { key: 'quick_summary', label: '✦ Quick Summary', color: 'var(--accent)', type: 'prose' },
    { key: 'core_points', label: '◆ Core Points', color: 'var(--text-secondary)', type: 'bullets' },
    { key: 'full_notes', label: '◆ Full Revision Notes', color: 'var(--accent)', type: 'hero', subheader: 'Condensed and complete' },
    { key: 'test_yourself', label: '◆ Test Yourself', color: 'var(--text-secondary)', type: 'test_questions' },
  ],
};

function SkeletonCard() {
  return (
    <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-5/6" />
        <div className="h-3 bg-white/5 rounded w-4/5" />
      </div>
    </div>
  );
}

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isPro = profile?.is_pro || false;

  const [session, setSession] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState<string | null>(null);

  // Follow-up state
  const [followUpText, setFollowUpText] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Copy states
  const [copiedCardKey, setCopiedCardKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Feedback/Report states
  const [reportOpen, setReportOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [reporting, setReporting] = useState(false);

  // Collapsible state for test questions
  const [revealedTestQuestions, setRevealedTestQuestions] = useState<Record<number, boolean>>({});
  // Space to think text state for test questions
  const [testQuestionThoughts, setTestQuestionThoughts] = useState<Record<number, string>>({});

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
        const { data: fu } = await supabase.from('follow_ups').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
        setSession(s);
        setFollowUps(fu || []);
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) loadSession();
  }, [sessionId]);

  // Toast automatic dismiss effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleCopy = (text: string, key: string): void => {
    navigator.clipboard.writeText(stripMarkdownForCopy(text));
    setCopiedCardKey(key);
    showToast('Copied to clipboard ✓');
    setTimeout(() => setCopiedCardKey(null), 3000);
  };

  const handleShare = async () => {
    try {
      await supabase.from('sessions').update({ is_shared: true }).eq('id', sessionId);
      const shareUrl = `https://klaivo.app/s/${sessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied — share it with anyone ✓');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to copy link');
    }
  };

  const handleRefine = async (type: string) => {
    if (!session) return;
    setRefining(type === 'simplify' ? 'Simplify' : 'Go Deeper');
    try {
      const heroKey = session.mode === 'write' ? 'full_draft' : session.mode === 'revise' ? 'full_notes' : 'full_answer';
      const existingFullAnswer = session.result_json[heroKey] || '';
      const modeSchema = getModeSchema(session.mode);

      const response = await refineAnswer({
        type,
        topic: session.topic,
        mode: session.mode,
        level: session.level,
        existingFullAnswer,
        modeSchema
      });

      if (response && response.result) {
        const { error: updateError } = await supabase
          .from('sessions')
          .update({ result_json: response.result })
          .eq('id', sessionId);

        if (updateError) throw updateError;
        setSession((prev: any) => ({ ...prev, result_json: response.result }));
        showToast(`Refinement complete!`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to refine answer');
    } finally {
      setRefining(null);
    }
  };

  const sendFollowUp = async (question: string): Promise<void> => {
    if (!question.trim() || followUps.length >= 3 || !session) return;
    setFollowUpLoading(true);
    const result = session.result_json;
    const heroKey = session.mode === 'write' ? 'full_draft' : session.mode === 'revise' ? 'full_notes' : 'full_answer';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { answer } = await generateFollowUp({
        question,
        sessionId: sessionId!,
        originalFullAnswer: result[heroKey] || '',
        originalTopic: session.topic,
        conversationHistory: followUps.map(f => ({ question: f.question, answer: f.answer }))
      });

      const { error: insertError } = await supabase.from('follow_ups').insert({
        session_id: sessionId,
        user_id: user.id,
        question,
        answer
      });
      if (insertError) throw insertError;

      setFollowUps(prev => [...prev, { question, answer, created_at: new Date().toISOString() }]);
      setFollowUpText('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send follow up');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleSendReport = async () => {
    if (issueText.trim().length < 5) return;
    setReporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('feedback').insert({
        session_id: sessionId,
        user_id: user?.id || null,
        issue: issueText,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      showToast('Problem reported successfully ✓');
      setReportOpen(false);
      setIssueText('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send report');
    } finally {
      setReporting(false);
    }
  };

  const renderProse = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <p className="text-[#CACAD5] text-sm leading-relaxed whitespace-pre-line font-['Inter',sans-serif]">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  };

  const renderBullets = (bullets: string[]) => {
    if (!bullets || !Array.isArray(bullets)) return null;
    return (
      <ul className="space-y-3 font-['Inter',sans-serif]">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex items-start gap-2.5 text-sm text-[#CACAD5] leading-relaxed">
            <span className="text-[#4F8EF7] mt-1.5 shrink-0 select-none">•</span>
            <span>
              {bullet.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col font-['Inter',sans-serif]">
        <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="w-24 h-5 bg-white/5 rounded animate-pulse" />
            <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse" />
          </div>
        </header>
        <main className="flex-grow max-w-3xl mx-auto w-full px-6 pt-24 pb-12 space-y-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col justify-center items-center font-['Inter',sans-serif]">
        <p className="text-lg font-bold text-[#F0F0F5] mb-4">Study session not found</p>
        <button onClick={() => navigate('/welcome')} className="px-5 py-2.5 bg-[#1B1B20] border border-white/10 rounded-full text-sm hover:bg-white/5 transition-colors">
          Go Home
        </button>
      </div>
    );
  }

  const mode = session.mode || 'understand';
  const cards = CARD_CONFIG[mode] || CARD_CONFIG.understand;
  const result = session.result_json || {};

  return (
    <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-[#508ff8] selection:text-white">
      {/* Dynamic Header */}
      <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/welcome')}
              className="text-[#6B6B80] hover:text-[#e4e1e9] p-1.5 hover:bg-[#1C1C24] rounded-full transition-colors flex items-center justify-center"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-['Manrope',sans-serif] text-sm font-bold text-[#F0F0F5] tracking-tight max-w-[200px] sm:max-w-sm truncate">
              {session.topic}
            </h1>
          </div>
          <button 
            onClick={handleShare}
            className="text-[#6B6B80] hover:text-[#e4e1e9] p-2 hover:bg-[#1C1C24] rounded-full transition-colors flex items-center justify-center"
            aria-label="Share"
          >
            <span className="material-symbols-outlined text-[20px]">share</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-6 pt-24 pb-16">
        <div 
          className="space-y-6 transition-all duration-500 ease-in-out" 
          style={{ opacity: refining ? 0.4 : 1 }}
        >
          {/* Loop over CARD_CONFIG mapping */}
          {cards.map((card) => {
            const content = result[card.key];
            if (!content) return null;

            const isHero = card.type === 'hero';

            return (
              <div 
                key={card.key}
                className={`rounded-2xl p-6 transition-all duration-300 ${
                  isHero 
                    ? 'bg-[#13131F] border border-[#4F8EF7]/30 shadow-[0_0_24px_rgba(79,142,247,0.06)]' 
                    : 'bg-[#16161F] border border-white/[0.06]'
                }`}
              >
                {/* Card Title Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm font-bold font-['Manrope',sans-serif] ${isHero ? 'text-[#4F8EF7]' : 'text-[#CACAD5]'}`}>
                      {card.label}
                    </h3>
                    {isHero && card.subheader && (
                      <p className="text-xs text-[#6B6B80] mt-0.5">{card.subheader}</p>
                    )}
                  </div>
                  {isHero && (
                    <button
                      onClick={() => handleCopy(content, card.key)}
                      className="text-[#6B6B80] hover:text-[#e4e1e9] p-1.5 hover:bg-white/5 rounded-full transition-all flex items-center justify-center"
                      title="Copy full content"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedCardKey === card.key ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Render depending on type */}
                {card.type === 'prose' && renderProse(content)}

                {card.type === 'bullets' && renderBullets(content)}

                {card.type === 'hero' && (
                  <div className="space-y-4">
                    {renderProse(content)}
                    
                    {/* Ghost Report Answer Button & Form */}
                    <div className="pt-2 border-t border-white/5">
                      {reportOpen ? (
                        <div className="mt-2 p-4 bg-[#1B1B22] border border-white/[0.06] rounded-xl space-y-3">
                          <textarea
                            placeholder="What is wrong with this answer? Be specific..."
                            value={issueText}
                            onChange={(e) => setIssueText(e.target.value)}
                            rows={3}
                            className="w-full bg-transparent border-none text-sm text-[#CACAD5] focus:ring-0 p-0 resize-none placeholder-[#6B6B80] font-['Inter',sans-serif]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setReportOpen(false)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6B6B80] hover:text-[#CACAD5] hover:bg-white/5 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={issueText.trim().length < 5 || reporting}
                              onClick={handleSendReport}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#4F8EF7] text-white hover:bg-[#4F8EF7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {reporting ? 'Sending...' : 'Send Report'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReportOpen(true)}
                          className="text-xs text-[#6B6B80] hover:text-[#CACAD5] transition-colors hover:underline flex items-center gap-1 bg-transparent border-none outline-none cursor-pointer"
                        >
                          Report a problem with this answer →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {card.type === 'questions' && Array.isArray(content) && (
                  <div className="space-y-3">
                    {content.map((item: CollapsibleItem, idx: number) => (
                      <details 
                        key={idx} 
                        className="group bg-[#1D1D26] border border-white/[0.04] rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                      >
                        <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none font-['Inter',sans-serif]">
                          <span className="text-sm font-medium text-[#F0F0F5] pr-6">{item.question}</span>
                          <span className="material-symbols-outlined text-[#6B6B80] group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div className="p-4 pt-0 border-t border-white/[0.03] text-sm leading-relaxed">
                          {renderProse(item.approach)}
                        </div>
                      </details>
                    ))}
                  </div>
                )}

                {card.type === 'test_questions' && Array.isArray(content) && (
                  <div className="space-y-4">
                    {content.map((qText: string, idx: number) => {
                      const isRevealed = revealedTestQuestions[idx] || false;
                      return (
                        <div key={idx} className="bg-[#1D1D26] border border-white/[0.04] rounded-xl p-4 space-y-3 font-['Inter',sans-serif]">
                          <p className="text-sm font-semibold text-[#F0F0F5]">
                            {idx + 1}. {qText}
                          </p>
                          
                          {/* Space to think (interactive text area) */}
                          <textarea
                            placeholder="Write your brief thoughts here to formulate an answer..."
                            value={testQuestionThoughts[idx] || ''}
                            onChange={(e) => setTestQuestionThoughts(prev => ({ ...prev, [idx]: e.target.value }))}
                            rows={2}
                            disabled={isRevealed}
                            className="w-full bg-[#16161F] border border-white/[0.06] focus:border-[#4F8EF7]/50 rounded-lg p-2.5 text-xs text-[#CACAD5] focus:outline-none focus:ring-0 resize-none placeholder-[#6B6B80]"
                          />
                          
                          {/* Reveal Toggle */}
                          {!isRevealed ? (
                            <button
                              onClick={() => setRevealedTestQuestions(prev => ({ ...prev, [idx]: true }))}
                              className="w-full py-2 bg-[#252530] hover:bg-[#353440] text-xs font-semibold text-[#4F8EF7] rounded-lg transition-colors border border-white/[0.06]"
                            >
                              Tap to reveal answer guidelines
                            </button>
                          ) : (
                            <div className="p-3 bg-[#16161F]/60 border border-[#4F8EF7]/10 rounded-lg space-y-2">
                              <p className="text-xs font-bold text-[#4F8EF7]">✦ Suggested Guidelines:</p>
                              <ul className="text-xs text-[#CACAD5] list-disc list-inside space-y-1">
                                <li>Ensure you defined all key theoretical concepts.</li>
                                <li>Review if your reasoning matches the core analogy.</li>
                                <li>Check if you included appropriate examples or applications.</li>
                              </ul>
                              <button
                                onClick={() => setRevealedTestQuestions(prev => ({ ...prev, [idx]: false }))}
                                className="text-[10px] text-[#6B6B80] hover:text-[#CACAD5] mt-2 block underline"
                              >
                                Hide guidelines
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Inline Refinement and Navigation Bar */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between">
            {/* Free refinements — left */}
            <div className="flex gap-2">
              {['Simplify', 'Go Deeper'].map(type => (
                <button
                  key={type}
                  onClick={() => handleRefine(type.toLowerCase().replace(' ', '_'))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium ghost-border text-[#6B6B80] hover:text-[#CACAD5] hover:border-white/15 transition-all flex items-center gap-1.5"
                  disabled={refining !== null}
                >
                  {refining === (type === 'Simplify' ? 'Simplify' : 'Go Deeper') ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#4F8EF7] rounded-full animate-spin inline-block" />
                  ) : null}
                  <span>{type}</span>
                </button>
              ))}
            </div>
            {/* Pro features — right */}
            <div className="flex gap-2">
              {[
                { label: 'Flashcards', route: 'flashcards' },
                { label: 'Test Me', route: 'quiz' }
              ].map(f => (
                <button
                  key={f.label}
                  onClick={() => {
                    if (isPro) {
                      navigate(`/${f.route}/${sessionId}`);
                    } else {
                      navigate(`/upgrade?from=${f.route}`);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium ghost-border text-[#6B6B80] hover:text-[#CACAD5] hover:border-white/15 transition-all flex items-center gap-1"
                >
                  <span>◆</span>
                  <span>{f.label}</span>
                  {!isPro && <span className="text-[10px] text-[#4F8EF7] ml-0.5">Pro</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Refining visual feedback */}
          {refining && (
            <p className="text-center text-xs text-[#4F8EF7] mt-4 animate-pulse font-medium">
              Klaivo is rebuilding this...
            </p>
          )}
        </div>

        {/* Threaded Follow-up Section */}
        <div className="mt-10 space-y-6">
          <h2 className="font-['Manrope',sans-serif] text-sm font-bold text-[#F0F0F5] tracking-tight">
            Follow-up Questions
          </h2>

          {/* Follow-up history listing */}
          <div className="space-y-6">
            {followUps.map((fu, idx) => (
              <div key={idx} className="space-y-4 pt-4 border-t border-white/[0.04]">
                {/* Student Question */}
                <div className="flex justify-end">
                  <div className="bg-[#252530] border border-white/[0.06] rounded-2xl px-5 py-3 max-w-[85%] sm:max-w-md shadow-sm">
                    <p className="text-sm text-[#F0F0F5] font-['Inter',sans-serif]">{fu.question}</p>
                  </div>
                </div>
                
                {/* Klaivo Answer */}
                <div className="flex justify-start">
                  <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl px-5 py-4 max-w-[95%] sm:max-w-xl shadow-sm space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <img src="/logo.svg" alt="Klaivo" className="w-5 h-5" />
                      <span className="text-xs font-bold text-[#4F8EF7] font-['Manrope',sans-serif]">Klaivo</span>
                    </div>
                    {renderProse(fu.answer)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          {followUpLoading && (
            <div className="flex justify-start pt-4 border-t border-white/[0.04]">
              <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-2">
                <img src="/logo.svg" alt="Klaivo" className="w-5 h-5 k-breathe" />
                <div className="flex items-center gap-1 font-['Inter',sans-serif] text-[20px] text-[#4F8EF7] font-bold leading-none select-none">
                  <span className="animate-[pulse_1.4s_infinite] [animation-delay:0s]">.</span>
                  <span className="animate-[pulse_1.4s_infinite] [animation-delay:0.2s]">.</span>
                  <span className="animate-[pulse_1.4s_infinite] [animation-delay:0.4s]">.</span>
                </div>
              </div>
            </div>
          )}

          {/* Follow-up input form */}
          {followUps.length >= 3 ? (
            <div className="bg-[#16161F]/40 border border-dashed border-white/5 rounded-2xl p-6 text-center">
              <p className="text-xs text-[#6B6B80] italic">
                Thread complete — you've reached the 3 follow-up limit for this session result.
              </p>
            </div>
          ) : (
            <div 
              className="bg-[#1b1b20] rounded-2xl border border-white/10 overflow-hidden flex flex-col relative focus-within:border-[#508ff8] focus-within:shadow-[0_0_0_4px_rgba(80,143,248,0.2)] transition-all duration-300"
            >
              <textarea
                className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-[#e4e1e9] p-4 pb-14 resize-none font-['Inter',sans-serif] text-sm leading-relaxed placeholder:text-white/40"
                placeholder="Ask a follow-up question about this explanation..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                maxLength={400}
                disabled={followUpLoading}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className="text-[10px] text-[#6B6B80]">
                  {followUps.length}/3 follow-ups
                </span>
                <button
                  onClick={() => sendFollowUp(followUpText)}
                  disabled={!followUpText.trim() || followUpLoading}
                  className="w-8 h-8 rounded-full bg-[#4F8EF7] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all duration-200 active:scale-[0.95]"
                  aria-label="Send"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Custom Alert/Error Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1B1B22]/90 backdrop-blur-md border border-[#4F8EF7]/30 text-[#F0F0F5] px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 transition-all duration-300 font-medium text-sm">
          <span className="material-symbols-outlined text-[#4F8EF7] text-[20px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
