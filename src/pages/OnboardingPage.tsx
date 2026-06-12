import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ACADEMIC_LEVELS = [
  'Secondary School',
  '100 / 200 Level',
  '300 / 400 Level',
  '500 / 600 Level',
  'Postgraduate'
] as const;

type AcademicLevel = typeof ACADEMIC_LEVELS[number];

const HEADINGS: Record<AcademicLevel, string> = {
  'Secondary School': 'Every concept. Every exam. Every subject. I\'ve got you.',
  '100 / 200 Level': 'University just got a brilliant study partner.',
  '300 / 400 Level': 'You\'ve come this far. Let\'s make sure you finish strong.',
  '500 / 600 Level': 'The hardest years deserve the sharpest thinking.',
  'Postgraduate': 'Deep research. Complex concepts. I work at your level.'
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();
  const [screen, setScreen] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  
  const hasResumed = useRef(false);

  useEffect(() => {
    if (profile && !hasResumed.current) {
      if (profile.academic_level) {
        setSelectedLevel(profile.academic_level);
      }
      if (profile.institution_type) {
        setSelectedInstitution(profile.institution_type);
      }
      if (profile.onboarding_step === 1) setScreen(1);
      if (profile.onboarding_step === 2) setScreen(2);
      if (profile.onboarding_step === 3) setScreen(3);
      hasResumed.current = true;
    }
  }, [profile]);

  useEffect(() => {
    // Only redirect if profile is loaded and onboarding is complete
    // Don't block render while auth is loading
    if (profile?.onboarding_complete) {
      console.log('Onboarding already complete, navigating to /welcome');
      navigate('/welcome');
    }
  }, [profile, navigate]);

  const handleStartOnboarding = async () => {
    if (!session?.user) return;
    setScreen(2);
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: 2 })
        .eq('id', session.user.id);
    } catch (err) {
      console.error('Failed to update onboarding step to 2:', err);
    }
  };

  const handleLevelSelect = async (level: string) => {
    setSelectedLevel(level);

    if (session?.user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ academic_level: level })
          .eq('id', session.user.id);
        if (error) console.error('Failed to save academic level:', error);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleInstitutionSelect = async (type: string) => {
    setSelectedInstitution(type);
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          institution_type: type,
          onboarding_step: 3
        })
        .eq('id', session.user.id);
      if (error) console.error('Failed to save institution type:', error);
    } catch (err) {
      console.error('Failed to save institution type:', err);
    }

    setTimeout(() => {
      setScreen(3);
    }, 500);
  };

  const handleSkipInstitution = async () => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 3
        })
        .eq('id', session.user.id);
      if (error) console.error('Failed to skip institution type:', error);
    } catch (err) {
      console.error('Failed to skip institution type:', err);
    }
    setScreen(3);
  };

  const handleCompleteOnboarding = async () => {
    if (!session?.user) return;

    setLoading(true);
    console.log('Starting onboarding completion for user:', session.user.id);
    
    try {
      // Use upsert to handle both create and update cases
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          onboarding_complete: true,
          onboarding_step: 0
        }, { onConflict: 'id' })
        .select()
        .maybeSingle();

      console.log('Onboarding upsert result:', { data, error, userId: session.user.id });

      if (!error && data && data.onboarding_complete) {
        console.log('Upsert successful, navigating to /welcome');
        refreshProfile(); // Profile will refresh naturally through onAuthStateChange - no await
        setLoading(false);
        
        // Force navigation with window.location as fallback
        setTimeout(() => {
          console.log('Using window.location fallback');
          window.location.href = '/welcome';
        }, 1000);
        
        navigate('/welcome');
      } else {
        console.error('Upsert failed:', { data, error });
        setLoading(false);
        alert(`Failed to complete onboarding: ${error?.message || 'Profile not updated correctly'}`);
      }
    } catch (err) {
      console.error('Unexpected error in onboarding completion:', err);
      setLoading(false);
      alert('Unexpected error occurred. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" loading="lazy" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center text-text-primary">
        Please sign in to continue
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {screen === 1 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full w-40 h-40 blur-[40px] glow-breathe" style={{ background: 'var(--accent-glow)' }} />
            <img src="/logo.svg" alt="Klaivo" className="relative w-20 h-20 k-breathe" loading="lazy" />
          </div>

          <div className="space-y-4">
            <p className="text-[32px] font-bold text-text-primary font-['Manrope']" style={{ animationDelay: '800ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}>
              Hey {profile?.first_name || 'there'}.
            </p>
            <p className="text-[16px] text-text-secondary font-['Inter'] max-w-xs" style={{ animationDelay: '1400ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}>
              I'm Klaivo. I've been waiting for someone like you.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3 w-full">
            <button
              className="w-full max-w-sm bg-gradient-primary text-white py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
              style={{ animationDelay: '2000ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}
              onClick={handleStartOnboarding}
            >
              Let's get started →
            </button>
            <p
              className="text-[12px] text-[#3D3D52] font-['Inter'] text-center max-w-xs leading-normal"
              style={{ animationDelay: '2200ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}
            >
              By continuing, you confirm you're 13 or older and agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}

      {screen === 2 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-sm w-full">
          <div className="space-y-4">
            <img src="/logo.svg" alt="Klaivo" className="w-12 h-12" loading="lazy" />
            <p className="text-[24px] font-bold text-text-primary font-['Manrope']">
              One quick thing.
            </p>
            <p className="text-[15px] text-text-secondary font-['Inter']">
              I want to make sure everything I build for you is at exactly the right level.
            </p>
          </div>

          <div className="w-full space-y-3">
            {ACADEMIC_LEVELS.map((level) => (
              <button
                key={level}
                style={{
                  borderColor: selectedLevel === level ? 'var(--accent-border)' : 'var(--ghost-border)',
                  background: selectedLevel === level ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  color: selectedLevel === level ? 'var(--accent)' : 'var(--text-body)'
                }}
                className="w-full h-[52px] rounded-full border font-['Inter'] text-[15px] font-medium transition-all hover:bg-surface-low"
                onClick={() => handleLevelSelect(level)}
              >
                {level}
              </button>
            ))}
          </div>

          {selectedLevel && (
            <div className="w-full mt-6 space-y-4 animate-fade-in">
              <p className="text-[13px] text-text-secondary font-['Inter'] font-medium">
                What kind of institution are you at?
              </p>
              <div className="w-full space-y-2.5">
                {[
                  'University',
                  'Polytechnic',
                  'College of Education',
                  'Secondary School',
                  'Self-study'
                ].map((type) => (
                  <button
                    key={type}
                    style={{
                      borderColor: selectedInstitution === type ? 'var(--accent-border)' : 'var(--ghost-border)',
                      background: selectedInstitution === type ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      color: selectedInstitution === type ? 'var(--accent)' : 'var(--text-body)'
                    }}
                    className="w-full h-[46px] rounded-full border font-['Inter'] text-[14px] font-medium transition-all hover:bg-surface-low"
                    onClick={() => handleInstitutionSelect(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div>
                <button
                  onClick={handleSkipInstitution}
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors underline bg-transparent border-none outline-none cursor-pointer mt-1"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 3 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-sm w-full">
          <div className="relative">
            <div className="absolute inset-0 rounded-full w-32 h-32 blur-[40px] glow-breathe" style={{ background: 'var(--accent-glow)' }} />
            <img src="/logo.svg" alt="Klaivo" className="relative w-16 h-16 k-breathe" loading="lazy" />
          </div>

          <div className="space-y-4">
            <p className="text-[22px] font-bold text-text-primary font-['Manrope'] max-w-xs">
              {HEADINGS[selectedLevel as AcademicLevel] || "Let's study together."}
            </p>
            <p className="text-[28px] font-extrabold text-text-primary font-['Manrope']">
              Let's study.
            </p>
          </div>

          <button
            className="w-full max-w-sm bg-gradient-primary text-white py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
            onClick={handleCompleteOnboarding}
            disabled={loading}
          >
            {loading ? 'Completing...' : 'Take me in'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
