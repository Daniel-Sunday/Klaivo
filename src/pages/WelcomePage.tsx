import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { supabase, getProfile } from '../lib/supabase';
import { getGreeting } from '../lib/greeting';
import { useStudy } from '../context/StudyContext';
import BottomSheet from '../components/BottomSheet';
import SideDrawer from '../components/SideDrawer';

const MODES = [
  { id: 'understand', label: 'Understand', icon: 'psychology' },
  { id: 'write', label: 'Write', icon: 'edit_note' },
  { id: 'prepare', label: 'Prepare', icon: 'menu_book' },
  { id: 'revise', label: 'Revise', icon: 'history_edu' },
];

export default function WelcomePage() {
  const { setTopic, setSelectedMode, setUploadedFile } = useStudy();
  const [firstName, setFirstName] = useState<string>('');
  const [selectedMode, setSelectedModeLocal] = useState<string | null>(null);
  const [topic, setTopicLocal] = useState<string>('');
  const [uploadedFile, setUploadedFileLocal] = useState<File | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);
  const [showLimitMessage] = useState<boolean>(false);
  const [showSideDrawer, setShowSideDrawer] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await getProfile(user.id);
        setFirstName(profileData?.first_name || 'there');
      }
    };
    loadProfile();
  }, []);

  const greeting = getGreeting(firstName);

  const handleSend = async () => {
    if (topic.length < 10) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setTopic(topic);
    setSelectedMode(selectedMode);
    setUploadedFile(uploadedFile);
    setShowBottomSheet(true);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileLocal(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFileLocal(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-[#0A0A0F] text-[#e4e1e9] font-['Inter',sans-serif] antialiased min-h-screen flex flex-col selection:bg-[#508ff8] selection:text-white">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-[#0A0A0F]/60 backdrop-blur-xl border-b border-white/5 shadow-none pt-safe-top">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          {/* Left-aligned Hamburger and K Logo */}
          <div className="flex items-center gap-4">
            <button 
              className="text-[#c2c6d5] hover:text-[#e4e1e9] transition-colors active:scale-95 duration-200 flex items-center justify-center w-8 h-8"
              onClick={() => setShowSideDrawer(true)}
            >
              <svg fill="none" height="14" viewBox="0 0 20 14" width="20" xmlns="http://www.w3.org/2000/svg">
                <rect fill="currentColor" height="2" rx="1" width="20"></rect>
                <rect fill="currentColor" height="2" rx="1" width="20" y="6"></rect>
                <rect fill="currentColor" height="2" rx="1" width="12" y="12"></rect>
              </svg>
            </button>
            <span className="text-white font-['Manrope',sans-serif] font-bold text-xl leading-none">Klaivo</span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col px-6 pt-28 pb-8 max-w-2xl mx-auto w-full">
        <div className="my-auto flex flex-col items-center w-full">
          {/* Greeting - Bold and Heavy */}
          <div className="mb-8 w-full text-center">
            <h1 className="font-['Manrope',sans-serif] font-bold text-3xl md:text-4xl tracking-tight leading-tight mb-2 text-[#F0F0F5]">
              {greeting.main}{firstName}<br/>
              <span className="text-[#c2c6d5] font-medium text-2xl md:text-3xl">{greeting.sub}</span>
            </h1>
          </div>

          {/* Mode Selection - Stacked Vertically and Left-Aligned */}
          <div className="w-full flex flex-col gap-[12px]">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedModeLocal(selectedMode === mode.id ? null : mode.id)}
                className={`px-5 py-3 rounded-full border border-white/[0.06] hover:bg-[#35343a] transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-start gap-3 w-full ${
                  selectedMode === mode.id
                    ? 'bg-[rgba(79,142,247,0.10)] border-[rgba(79,142,247,0.30)]'
                    : 'bg-[#16161F]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{mode.icon}</span>
                <span className="font-['Inter',sans-serif] text-sm font-medium text-[#e4e1e9]">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Input Area at Bottom - Sticky */}
        <div className="w-full mt-8 relative sticky bottom-0 pb-safe-bottom">
          <div 
            className="bg-[#1b1b20] rounded-2xl transition-all duration-300 overflow-hidden flex flex-col relative focus-within:border-[#508ff8] focus-within:shadow-[0_0_0_4px_rgba(80,143,248,0.2)] focus-within:transform focus-within:-translate-y-2"
            style={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}
          >
            <textarea
              className="w-full min-h-[140px] bg-transparent border-none focus:ring-0 text-[#e4e1e9] p-5 pb-16 resize-none font-['Inter',sans-serif] text-base leading-relaxed placeholder:text-white/50"
              placeholder="e.g. I need help understanding Integration by Parts..."
              value={topic}
              onChange={(e) => setTopicLocal(e.target.value)}
            />
            {/* Input Toolbar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="w-10 h-10 flex items-center justify-center rounded-full text-[#8c909e] hover:text-[#e4e1e9] hover:bg-[#35343a] transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {/* Blue Circular Arrow Send Button */}
              <button
                onClick={handleSend}
                disabled={topic.length < 10}
                className={`w-10 h-10 rounded-full bg-[#4F8EF7] text-white shadow-[0_4px_14px_rgba(79,142,247,0.3)] hover:shadow-[0_6px_20px_rgba(79,142,247,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center group ${
                  topic.length < 10 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span className="material-symbols-outlined text-lg group-hover:-translate-y-0.5 transition-transform">arrow_upward</span>
              </button>
            </div>
          </div>

          {/* Uploaded File Chip */}
          {uploadedFile && (
            <div className="mt-3 inline-flex items-center gap-2 bg-[#1A1A24] border border-white/[0.06] rounded-full px-3 py-1.5">
              <span className="material-symbols-outlined text-sm text-[#4F8EF7]">image</span>
              <span className="text-xs text-[#F0F0F5]">{uploadedFile.name}</span>
              <button onClick={handleRemoveFile} className="text-[#6B6B80] hover:text-[#F0F0F5]">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* BottomSheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        topic={topic}
        selectedMode={selectedMode}
        uploadedFile={uploadedFile}
      />

      {/* SideDrawer */}
      <SideDrawer
        isOpen={showSideDrawer}
        onClose={() => setShowSideDrawer(false)}
      />

      {/* Daily Limit Toast */}
      {showLimitMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1b1b20] border border-white/[0.06] px-6 py-4 rounded-xl max-w-md z-50">
          <p className="text-[#CACAD5] text-sm text-center">
            You've used your 3 answers for today. Come back tomorrow — or go unlimited with Klaivo Pro.
          </p>
        </div>
      )}
    </div>
  );
}
