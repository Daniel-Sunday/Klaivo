import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getProfile } from '../lib/supabase';
import { generateAnswer } from '../lib/api';
import { buildStudyPrompt, analysePrompt } from '../lib/promptBuilder';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  selectedMode: 'understand' | 'write' | 'prepare' | 'revise' | any;
  uploadedFile: File | null;
}

interface Question {
  id: string;
  type: 'pills' | 'textarea';
  text: string;
  subtext: string;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
  options?: { id: string; label: string }[];
}

const QUESTIONS_BY_MODE: Record<string, Question[]> = {
  understand: [
    {
      id: 'depth',
      type: 'pills',
      text: "How deep do you want to go?",
      subtext: "Choose the level of depth for your explanation.",
      options: [
        { id: 'basics', label: 'Basics — just the essentials' },
        { id: 'solid', label: 'Solid — clean and clear' },
        { id: 'full', label: 'Full — deep comprehension' }
      ]
    },
    {
      id: 'emotional',
      type: 'pills',
      text: "How are you feeling about this topic?",
      subtext: "Klaivo will adapt its tone to your confidence level.",
      options: [
        { id: 'curious', label: 'Curious' },
        { id: 'anxious', label: 'Anxious' },
        { id: 'scared', label: 'Scared' },
        { id: 'just_pass', label: 'Just need to pass' }
      ]
    },
    {
      id: 'subjectType',
      type: 'pills',
      text: "Is this a math/formula-heavy topic?",
      subtext: "We will include worked examples if it's math-heavy.",
      options: [
        { id: 'conceptual', label: 'Conceptual' },
        { id: 'mathematical', label: 'Math/Formula-heavy' }
      ]
    }
  ],
  write: [
    {
      id: 'writing_type',
      type: 'pills',
      text: "What are you writing?",
      subtext: "Tell Klaivo what kind of draft you need.",
      options: [
        { id: 'essay', label: 'An Essay' },
        { id: 'assignment', label: 'An Assignment' },
        { id: 'report', label: 'A Report or Thesis' },
        { id: 'other', label: 'Other writing' }
      ]
    },
    // Write mode, Question 2 — TEXTAREA, not pills
    {
      id: 'essay_question',
      type: 'textarea',
      text: "What is the actual question or brief?",
      subtext: "Paste or type the exact assignment question. Klaivo will write directly to it.",
      placeholder: "e.g. Critically evaluate the impact of colonialism on African economic development...",
      maxLength: 1000,
      optional: true,
    },
    {
      id: 'stage',
      type: 'pills',
      text: "What is your current stage?",
      subtext: "Where are you in the writing process?",
      options: [
        { id: 'have_topic', label: 'I only have a topic' },
        { id: 'have_draft', label: 'I have a rough draft' }
      ]
    },
    {
      id: 'depth',
      type: 'pills',
      text: "How deep should this draft be?",
      subtext: "Choose the depth of the draft.",
      options: [
        { id: 'basics', label: 'Basics — quick skeleton' },
        { id: 'solid', label: 'Solid — normal length' },
        { id: 'full', label: 'Full — detailed and comprehensive' }
      ]
    },
    {
      id: 'emotional',
      type: 'pills',
      text: "How are you feeling about this?",
      subtext: "Klaivo will match your energy.",
      options: [
        { id: 'curious', label: 'Curious' },
        { id: 'anxious', label: 'Anxious' },
        { id: 'scared', label: 'Scared' },
        { id: 'just_pass', label: 'Just need to pass' }
      ]
    }
  ],
  prepare: [
    {
      id: 'examType',
      type: 'pills',
      text: "What type of exam is this?",
      subtext: "This helps Klaivo format the exam strategy.",
      options: [
        { id: 'Semester Exam', label: 'Semester Exam' },
        { id: 'Professional Cert', label: 'Professional Cert' },
        { id: 'WAEC/JAMB', label: 'WAEC/JAMB' },
        { id: 'Test/Quiz', label: 'Test/Quiz' }
      ]
    },
    {
      id: 'urgency',
      type: 'pills',
      text: "When is the exam?",
      subtext: "How much time do we have?",
      options: [
        { id: 'high', label: 'Very soon / Tomorrow' },
        { id: 'normal', label: 'In a few weeks / normal' }
      ]
    },
    {
      id: 'depth',
      type: 'pills',
      text: "How deep should the prep be?",
      subtext: "Choose the target prep detail.",
      options: [
        { id: 'basics', label: 'Quick review' },
        { id: 'solid', label: 'Thorough review' },
        { id: 'exam', label: 'Exam-focused model answers' }
      ]
    },
    {
      id: 'emotional',
      type: 'pills',
      text: "How are you feeling about it?",
      subtext: "Let's align the tone of support.",
      options: [
        { id: 'curious', label: 'Curious' },
        { id: 'anxious', label: 'Anxious' },
        { id: 'scared', label: 'Scared' },
        { id: 'just_pass', label: 'Just need to pass' }
      ]
    }
  ],
  revise: [
    {
      id: 'depth',
      type: 'pills',
      text: "How deep do you want the revision notes to be?",
      subtext: "Choose revision note depth.",
      options: [
        { id: 'basics', label: 'Basics — quick summary' },
        { id: 'solid', label: 'Solid — normal notes' },
        { id: 'full', label: 'Full — comprehensive notes' }
      ]
    },
    {
      id: 'emotional',
      type: 'pills',
      text: "How are you feeling about this revision?",
      subtext: "Let's calibrate the support style.",
      options: [
        { id: 'curious', label: 'Curious' },
        { id: 'anxious', label: 'Anxious' },
        { id: 'scared', label: 'Scared' },
        { id: 'just_pass', label: 'Just need to pass' }
      ]
    }
  ]
};

function getGeneratingMessages(topic: string, mode: string, level: string, emotional?: string): string[] {
  const base = [
    `Analyzing your topic: "${topic}"...`,
    `Calibrating to ${level} register...`,
    `Structuring output according to ${mode} rules...`,
    `Polishing analogy and worked examples...`,
    `Verifying JSON integrity & Klaivo standards...`,
  ];
  if (emotional === 'scared' || emotional === 'anxious') {
    base.unshift(`Taking a deep breath... we've got this.`);
  }
  return base;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export default function BottomSheet({ isOpen, onClose, topic, selectedMode, uploadedFile }: BottomSheetProps) {
  const navigate = useNavigate();
  const [sheetState, setSheetState] = useState<'questions' | 'generating' | 'error'>('questions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [essayQuestion, setEssayQuestion] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const answersRef = useRef<Record<string, any>>({});
  const [currentMessage, setCurrentMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [profile, setProfile] = useState<any>(null);

  const mode = selectedMode || 'understand';
  const currentQuestions = QUESTIONS_BY_MODE[mode] || QUESTIONS_BY_MODE.understand;

  // Reset when sheet opens
  useEffect(() => {
    if (isOpen) {
      setSheetState('questions');
      setCurrentQuestionIndex(0);
      setEssayQuestion('');
      setAnswers({});
      answersRef.current = {
        essayQuestion: '',
        examType: '',
        stage: '',
        emotional: '',
        urgency: '',
        depth: '',
        subjectType: ''
      };
      setErrorMsg('');
    }
  }, [isOpen]);

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await getProfile(user.id);
        setProfile(data);
      }
    }
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  // Looping generating messages hook
  useEffect(() => {
    if (sheetState !== 'generating') return;
    let index = 0;
    const detected = analysePrompt(topic);
    const emotional = answers.emotional || detected.level || 'curious';
    const finalLevel = answers.level || detected.level || (profile?.academic_level) || '100_200';
    const messages = getGeneratingMessages(topic, mode, finalLevel, emotional);
    
    // Set initial message
    setCurrentMessage(messages[0]);

    const interval = setInterval(() => {
      index = (index + 1) % messages.length; // loops forever
      setCurrentMessage(messages[index]);
    }, 2200);
    return () => clearInterval(interval);
  }, [sheetState]);

  const handlePillSelect = (optionId: string) => {
    const q = currentQuestions[currentQuestionIndex];
    const newAnswers = { ...answers, [q.id]: optionId };
    setAnswers(newAnswers);
    answersRef.current[q.id] = optionId;
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      startGenerating(newAnswers);
    }
  };

  const handleTextareaSubmit = () => {
    const q = currentQuestions[currentQuestionIndex];
    const newAnswers = { ...answers, [q.id]: essayQuestion };
    setAnswers(newAnswers);
    answersRef.current[q.id] = essayQuestion;

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      startGenerating(newAnswers);
    }
  };

  const handleTextareaSkip = () => {
    const q = currentQuestions[currentQuestionIndex];
    const newAnswers = { ...answers, [q.id]: '' };
    setAnswers(newAnswers);
    answersRef.current[q.id] = '';

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      startGenerating(newAnswers);
    }
  };

  const startGenerating = async (finalAnswers: Record<string, any>) => {
    setSheetState('generating');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const detected = analysePrompt(topic);
      const detectedUrgency = detected.urgency || null;
      const detectedSubjectType = detected.subjectType || 'conceptual';

      const finalLevel = finalAnswers.level || detected.level || profile?.academic_level || '100_200';
      const levelMap: Record<string, string> = {
        'Secondary School': 'secondary',
        '100 / 200 Level': '100_200',
        '300 / 400 Level': '300_400',
        '500 / 600 Level': '500_600',
        'Postgraduate': 'postgrad'
      };
      const mappedLevel = levelMap[finalLevel] || finalLevel || '100_200';

      const finalDepth = finalAnswers.depth || detected.depth || 'solid';

      let uploadedImageBase64: string | null = null;
      if (uploadedFile) {
        uploadedImageBase64 = await fileToBase64(uploadedFile);
      }

      // Constructed studyContext matching Step 5 exactly
      const studyContext = {
        topic: topic,
        mode: mode,
        level: mappedLevel,
        depth: finalDepth,
        examType: finalAnswers.examType || null,
        stage: finalAnswers.stage || null,
        emotionalContext: finalAnswers.emotional || null,
        urgency: finalAnswers.urgency || detectedUrgency,
        subjectType: finalAnswers.subjectType || detectedSubjectType,
        essayQuestion: finalAnswers.essay_question || null,
        uploadedImageBase64: uploadedImageBase64 || null,
        uploadedMediaType: uploadedFile ? uploadedFile.type : 'image/jpeg',
      };

      const { systemPrompt, userMessage } = buildStudyPrompt({
        topic: studyContext.topic,
        mode: studyContext.mode as any,
        level: studyContext.level as any,
        depth: studyContext.depth as any,
        examType: studyContext.examType,
        stage: studyContext.stage,
        emotionalContext: studyContext.emotionalContext as any,
        urgency: studyContext.urgency as any,
        subjectType: studyContext.subjectType as any,
        essayQuestion: studyContext.essayQuestion
      });

      const response = await generateAnswer({
        topic: studyContext.topic,
        mode: studyContext.mode,
        level: studyContext.level,
        depth: studyContext.depth,
        subjectType: studyContext.subjectType,
        systemPrompt,
        userMessage,
        imageBase64: studyContext.uploadedImageBase64,
        essayQuestion: studyContext.essayQuestion
      });

      if (!response || !response.result) {
        throw new Error('Invalid response from AI generator');
      }

      // Insert session
      const { data: sessionRecord, error: sessionError } = await supabase.from('sessions').insert({
        user_id: user.id,
        topic: studyContext.topic,
        mode: studyContext.mode,
        level: studyContext.level,
        depth: studyContext.depth,
        subject_type: studyContext.subjectType,
        emotional_context: studyContext.emotionalContext,
        result_json: response.result,
        essay_question: studyContext.essayQuestion,
        uploaded_file_url: null
      }).select().single();

      if (sessionError) {
        throw sessionError;
      }

      if (sessionRecord) {
        navigate(`/result/${sessionRecord.id}`);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong during generation');
      setSheetState('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer Body */}
      <div className="relative bg-[#131318] w-full max-w-lg rounded-t-3xl p-6 pb-8 pb-safe-bottom border-t border-white/10 z-10 transition-transform duration-300">
        <div className="w-12 h-1 bg-[#6B6B80] rounded-full mx-auto mb-6" />
        
        {/* Close Button */}
        {sheetState !== 'generating' && (
          <button onClick={onClose} className="absolute top-4 right-4 text-[#6B6B80] hover:text-[#F0F0F5] bg-transparent border-none outline-none cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}

        {sheetState === 'questions' && (() => {
          const q = currentQuestions[currentQuestionIndex];
          if (!q) return null;
          return (
            <div className="flex flex-col">
              <h2 className="text-xl font-headline font-bold text-[#F0F0F5] mb-2">{q.text}</h2>
              <p className="text-[#6B6B80] font-body text-sm mb-6">{q.subtext}</p>
              
              {q.type === 'pills' && (
                <div className="flex flex-col gap-3">
                  {q.options?.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handlePillSelect(opt.id)}
                      className="w-full text-left bg-[#1B1B20] border border-white/[0.06] hover:bg-[#252530] transition-colors rounded-xl px-5 py-3.5 text-sm font-medium text-[#CACAD5] active:scale-[0.99] font-body cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'textarea' && (
                <div className="flex flex-col">
                  <textarea
                    className="w-full bg-surface-container-low border border-white/[0.06] rounded-xl p-4 font-body text-sm text-[#CACAD5] focus:outline-none focus:border-[#4F8EF7] focus:ring-1 focus:ring-[#4F8EF7]/15 resize-none placeholder-[#6B6B80]"
                    placeholder={q.placeholder}
                    rows={4}
                    maxLength={q.maxLength}
                    value={essayQuestion}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEssayQuestion(val);
                      answersRef.current.essayQuestion = val;
                    }}
                  />
                  <span className="font-body text-xs text-[#6B6B80] mt-2 self-end">
                    {essayQuestion.length}/{q.maxLength || 1000}
                  </span>
                  
                  <button
                    onClick={handleTextareaSubmit}
                    disabled={essayQuestion.length < 10}
                    className="w-full bg-gradient-primary text-[#F0F0F5] py-3.5 rounded-full font-semibold mt-4 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-body cursor-pointer"
                  >
                    Continue →
                  </button>
                  
                  {q.optional && (
                    <button
                      onClick={handleTextareaSkip}
                      className="text-[#6B6B80] hover:text-[#CACAD5] text-sm font-medium mt-3 block text-center cursor-pointer hover:underline bg-transparent border-none outline-none font-body"
                    >
                      Skip →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {sheetState === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-[rgba(79,142,247,0.08)] rounded-full w-24 h-24 blur-[20px] glow-breathe" />
              <img src="/logo.svg" alt="Klaivo" className="relative w-12 h-12 k-breathe" />
            </div>
            <h3 className="text-lg font-headline font-bold text-[#F0F0F5] mb-2">Generating study resources</h3>
            <p className="text-[#CACAD5] font-body text-sm max-w-xs transition-all duration-300 min-h-[40px]">{currentMessage}</p>
          </div>
        )}

        {sheetState === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <h3 className="text-lg font-headline font-bold text-[#F0F0F5] mb-2">Generation Failed</h3>
            <p className="text-[#CACAD5] font-body text-sm max-w-xs mb-6">{errorMsg}</p>
            <button
              onClick={() => setSheetState('questions')}
              className="w-full bg-gradient-primary text-[#F0F0F5] py-3.5 rounded-full font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] text-sm font-body cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
