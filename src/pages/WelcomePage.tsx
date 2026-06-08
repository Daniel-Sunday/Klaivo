import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getProfile } from '../lib/supabase';
import { getGreeting } from '../lib/greeting';
import { useStudy } from '../context/StudyContext';
import BottomSheet from '../components/BottomSheet';
import SideDrawer from '../components/SideDrawer';
import { compressImage } from '../lib/api';
import { analytics } from '../lib/analytics';

const MODES = [
  { id: 'understand', label: 'Understand', icon: 'psychology' },
  { id: 'write', label: 'Write', icon: 'edit_note' },
  { id: 'prepare', label: 'Prepare', icon: 'menu_book' },
  { id: 'revise', label: 'Revise', icon: 'history_edu' },
];



export default function WelcomePage() {
  const navigate = useNavigate();
  const { setTopic, setSelectedMode, setUploadedFile } = useStudy();
  const [firstName, setFirstName] = useState<string>('');
  const [selectedMode, setSelectedModeLocal] = useState<string | null>(null);
  const [topic, setTopicLocal] = useState<string>('');
  const [uploadedFile, setUploadedFileLocal] = useState<File | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);
  const [showLimitMessage, setShowLimitMessage] = useState<boolean>(false);
  const [showSideDrawer, setShowSideDrawer] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Overhauled upload states
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await getProfile(user.id);
        setFirstName(profileData?.first_name || 'there');
        if (profileData && !profileData.is_pro && profileData.daily_count >= 3) {
          setShowLimitMessage(true);
          analytics.dailyLimitHit();
        }
      }
    };
    loadProfile();
  }, []);

  // Check for upgraded subscription success URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      analytics.paymentCompleted('stripe', 'pro');
      setToastMessage('◆ Welcome to Pro. No more limits.');
      window.history.replaceState({}, '', '/home');
    }
  }, []);

  // Toast automatic dismiss effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const greeting = getGreeting(firstName);

  const handleSend = async () => {
    console.log("handleSend clicked | topic:", topic, "length:", topic.length, "isUploading:", isUploading);
    if (topic.length < 10 || isUploading) {
      console.log("handleSend returning early: topic too short or still uploading");
      return;
    }
    
    try {
      console.log("Fetching authenticated user...");
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("User fetch result | user:", user, "error:", error);
      if (error) {
        console.error("supabase.auth.getUser error:", error);
      }
      if (!user) {
        console.warn("No user session found, exiting handleSend");
        return;
      }

      console.log("Opening bottom sheet...");
      setTopic(topic);
      setSelectedMode(selectedMode);
      setUploadedFile(uploadedFile);
      setShowBottomSheet(true);
    } catch (err) {
      console.error("handleSend exception:", err);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max file size check: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setToastMessage("Image too large — maximum 10MB");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadedFileLocal(file);
    setUploadedFile(file);
    analytics.imageUploaded();

    // Read as base64 and compress for API call
    console.log("Starting image compression...");
    setIsUploading(true);
    compressImage(file)
      .then(base64String => {
        console.log("Image compressed successfully, base64 length:", base64String.length);
        setUploadedImageBase64(base64String);
      })
      .catch(err => {
        console.error("Compression failed, falling back to original:", err);
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            console.log("Fallback read completed, base64 length:", base64.length);
            setUploadedImageBase64(base64);
          }
        };
        reader.readAsDataURL(file);
      })
      .finally(() => {
        console.log("Setting isUploading to false");
        setIsUploading(false);
      });

    // Create local object URL for preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleRemoveFile = () => {
    setUploadedFileLocal(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setUploadedImageBase64(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-bg-primary text-text-body font-['Inter',sans-serif] antialiased min-h-screen flex flex-col selection:bg-accent selection:text-white">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-bg-primary/60 backdrop-blur-xl border-b border-border-subtle shadow-none pt-safe-top">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          {/* Left-aligned Hamburger and K Logo */}
          <div className="flex items-center gap-4">
            <button 
              className="text-text-secondary hover:text-text-primary transition-colors active:scale-95 duration-200 flex items-center justify-center w-8 h-8"
              onClick={() => setShowSideDrawer(true)}
              aria-label="Menu"
            >
              <svg fill="none" height="14" viewBox="0 0 20 14" width="20" xmlns="http://www.w3.org/2000/svg">
                <rect fill="currentColor" height="2" rx="1" width="20"></rect>
                <rect fill="currentColor" height="2" rx="1" width="20" y="6"></rect>
                <rect fill="currentColor" height="2" rx="1" width="12" y="12"></rect>
              </svg>
            </button>
            <span className="text-white font-['Manrope',sans-serif] font-bold text-xl leading-none">Klaivo</span>
          </div>

          {/* Right-aligned Settings Icon */}
          <button
            onClick={() => navigate('/settings')}
            className="text-text-secondary hover:text-text-primary transition-colors active:scale-95 duration-200 flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col px-6 pt-28 pb-8 max-w-2xl mx-auto w-full">
        <div className="my-auto flex flex-col items-center w-full">
          {/* Greeting - Bold and Heavy */}
          <div className="mb-8 w-full text-center">
            <h1 className="font-['Manrope',sans-serif] font-bold text-3xl md:text-4xl tracking-tight leading-tight mb-2 text-text-primary">
              {greeting.main}{firstName}<br/>
              <span className="text-text-secondary font-medium text-2xl md:text-3xl">{greeting.sub}</span>
            </h1>
          </div>

          {/* Mode Selection - Stacked Vertically and Left-Aligned */}
          <div className="w-full flex flex-col gap-[12px]">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedModeLocal(selectedMode === mode.id ? null : mode.id)}
                style={{
                  background: selectedMode === mode.id ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  borderColor: selectedMode === mode.id ? 'var(--accent-border)' : 'var(--ghost-border)'
                }}
                className="px-5 py-3 rounded-full border hover:bg-surface-low transition-all duration-200 ease-out active:scale-[0.98] flex items-center justify-start gap-3 w-full"
              >
                <span className="material-symbols-outlined text-[20px]">{mode.icon}</span>
                <span className="font-['Inter',sans-serif] text-sm font-medium text-text-body">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Input Area at Bottom - Sticky */}
        <div className="w-full mt-8 relative sticky bottom-0 pb-safe-bottom">
          <div 
            className="bg-surface-low rounded-2xl transition-all duration-300 overflow-hidden flex flex-col relative focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-glow)] focus-within:transform focus-within:-translate-y-2"
            style={{ border: '1px solid var(--ghost-border)' }}
          >
            {/* Uploaded File Chip rendered above textarea input */}
            {uploadedFile && (
              <div className="mx-5 mt-4 inline-flex items-center gap-2.5 bg-surface-mid border border-ghost-border rounded-xl px-3 py-1.5 self-start shadow-sm">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-6 h-6 object-cover rounded-md border border-white/10" />
                ) : (
                  <span className="material-symbols-outlined text-sm text-accent">image</span>
                )}
                <span className="text-xs text-text-body font-medium font-['Inter',sans-serif]">
                  {uploadedFile.name.length > 20 ? uploadedFile.name.slice(0, 17) + '...' : uploadedFile.name}
                </span>
                {isUploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin ml-1" />
                ) : (
                  <button 
                    onClick={handleRemoveFile} 
                    className="text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center p-0.5 rounded-full hover:bg-white/5 active:scale-95"
                    aria-label="Remove image"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            )}

            <textarea
              className="w-full min-h-[140px] bg-transparent border-none focus:ring-0 text-text-body p-5 pb-16 resize-none font-['Inter',sans-serif] text-base leading-relaxed placeholder:text-white/50"
              placeholder="e.g. I need help understanding Integration by Parts..."
              value={topic}
              onChange={(e) => setTopicLocal(e.target.value)}
              maxLength={500}
            />
            {/* Input Toolbar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                className="w-10 h-10 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-mid transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.heic"
                className="hidden"
                onChange={handleFileUpload}
              />
              {/* Blue Circular Arrow Send Button */}
              <button
                onClick={handleSend}
                disabled={topic.length < 10 || isUploading}
                style={{
                  boxShadow: '0 4px 14px var(--accent-glow)'
                }}
                className={`w-10 h-10 rounded-full bg-accent text-white hover:shadow-[0_6px_20px_var(--accent-glow)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center group ${
                  topic.length < 10 || isUploading ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span className="material-symbols-outlined text-lg group-hover:-translate-y-0.5 transition-transform">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* BottomSheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        topic={topic}
        selectedMode={selectedMode}
        uploadedFile={uploadedFile}
        uploadedFileUrl={uploadedFileUrl}
        uploadedImageBase64={uploadedImageBase64}
      />

      {/* SideDrawer */}
      <SideDrawer
        isOpen={showSideDrawer}
        onClose={() => setShowSideDrawer(false)}
      />

      {/* Daily Limit Toast */}
      {showLimitMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-low border border-ghost-border px-6 py-4 rounded-xl max-w-md z-50">
          <p className="text-text-body text-sm text-center">
            You've used your 3 answers for today. Come back tomorrow — or go unlimited with Klaivo Pro.
          </p>
        </div>
      )}

      {/* Custom Alert/Error/Success Toast */}
      {toastMessage && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-low/90 backdrop-blur-md text-text-primary px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 transition-all duration-300 font-medium text-sm border ${
          toastMessage.startsWith('◆') ? 'border-primary/30' : 'border-danger/30'
        }`}>
          {toastMessage.startsWith('◆') ? (
            <span className="material-symbols-outlined text-primary text-[20px]">workspace_premium</span>
          ) : (
            <span className="material-symbols-outlined text-danger text-[20px]">error</span>
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
