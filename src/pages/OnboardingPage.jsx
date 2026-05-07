import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getProfile, incrementSession } from '../lib/supabase'

const ACADEMIC_LEVELS = [
  'Secondary School',
  '100 / 200 Level',
  '300 / 400 Level',
  '500 / 600 Level',
  'Postgraduate'
]

const HEADINGS = {
  'Secondary School': 'Every concept. Every exam. Every subject. I\'ve got you.',
  '100 / 200 Level': 'University just got a brilliant study partner.',
  '300 / 400 Level': 'You\'ve come this far. Let\'s make sure you finish strong.',
  '500 / 600 Level': 'The hardest years deserve the sharpest thinking.',
  'Postgraduate': 'Deep research. Complex concepts. I work at your level.'
}

export default function OnboardingPage({ session }) {
  const navigate = useNavigate()
  const [screen, setScreen] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('')
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!session?.user) return

      console.log('Checking onboarding status for user:', session.user.id)
      const { data: profile, error } = await getProfile(session.user.id)
      console.log('Profile check result:', { profile, error })
      
      if (profile?.onboarding_complete) {
        console.log('Onboarding already complete, navigating to /home')
        navigate('/home')
      } else {
        console.log('Onboarding not complete, setting first name')
        setFirstName(profile?.first_name || 'there')
      }
    }

    checkOnboarding()
  }, [session, navigate])

  const handleLevelSelect = async (level) => {
    setSelectedLevel(level)

    await supabase
      .from('profiles')
      .update({ academic_level: level })
      .eq('id', session.user.id)

    setScreen(3)
  }

  const handleCompleteOnboarding = async () => {
    if (!session?.user) return

    setLoading(true)
    console.log('Starting onboarding completion for user:', session.user.id)
    
    try {
      // Use upsert to handle both create and update cases
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          onboarding_complete: true
        }, { onConflict: 'id' })
        .select()
        .maybeSingle()

      console.log('Onboarding upsert result:', { data, error, userId: session.user.id })

      if (!error && data && data.onboarding_complete) {
        console.log('Upsert successful, navigating to /home')
        
        await incrementSession(session.user.id)
        console.log('Incremented session, navigating to /home')
        
        // Force navigation with window.location as fallback
        setTimeout(() => {
          console.log('Using window.location fallback')
          window.location.href = '/home'
        }, 1000)
        
        navigate('/home')
      } else {
        console.error('Upsert failed:', { data, error })
        setLoading(false)
        alert(`Failed to complete onboarding: ${error?.message || 'Profile not updated correctly'}`)
      }
    } catch (err) {
      console.error('Unexpected error in onboarding completion:', err)
      setLoading(false)
      alert('Unexpected error occurred. Please try again.')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#F0F0F5]">
        Please sign in to continue
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F0F0F5] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {screen === 1 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[rgba(79,142,247,0.08)] rounded-full w-40 h-40 blur-[40px] glow-breathe" />
            <span className="relative text-[72px] font-extrabold text-[#4F8EF7] k-breathe font-['Manrope']">
              K
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-[32px] font-bold text-[#F0F0F5] font-['Manrope']" style={{ animationDelay: '800ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}>
              Hey {firstName}.
            </p>
            <p className="text-[16px] text-[#6B6B80] font-['Inter'] max-w-xs" style={{ animationDelay: '1400ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}>
              I'm Klaivo. I've been waiting for someone like you.
            </p>
          </div>

          <button
            className="w-full max-w-sm bg-gradient-primary text-white py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
            style={{ animationDelay: '2000ms', animation: 'fadeIn 0.5s ease-out forwards', opacity: 0 }}
            onClick={() => setScreen(2)}
          >
            Let's get started
          </button>
        </div>
      )}

      {screen === 2 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-sm w-full">
          <div className="space-y-4">
            <span className="text-[32px] font-extrabold text-[#4F8EF7] font-['Manrope']">
              K
            </span>
            <p className="text-[24px] font-bold text-[#F0F0F5] font-['Manrope']">
              One quick thing.
            </p>
            <p className="text-[15px] text-[#6B6B80] font-['Inter']">
              I want to make sure everything I build for you is at exactly the right level.
            </p>
          </div>

          <div className="w-full space-y-3">
            {ACADEMIC_LEVELS.map((level) => (
              <button
                key={level}
                className={`w-full h-[52px] rounded-full ghost-border font-['Inter'] text-[15px] font-medium transition-all ${
                  selectedLevel === level
                    ? 'border-[rgba(79,142,247,0.30)] bg-[rgba(79,142,247,0.10)] text-[#4F8EF7]'
                    : 'bg-[#1A1A24] text-[#F0F0F5] hover:bg-[#252530]'
                }`}
                onClick={() => handleLevelSelect(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === 3 && (
        <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-sm w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-[rgba(79,142,247,0.08)] rounded-full w-32 h-32 blur-[40px] glow-breathe" />
            <span className="relative text-[48px] font-extrabold text-[#4F8EF7] k-breathe font-['Manrope']">
              K
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-[22px] font-bold text-[#F0F0F5] font-['Manrope'] max-w-xs">
              {HEADINGS[selectedLevel] || "Let's study together."}
            </p>
            <p className="text-[28px] font-extrabold text-[#F0F0F5] font-['Manrope']">
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
      `}</style>
    </div>
  )
}
