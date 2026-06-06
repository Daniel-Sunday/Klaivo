import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLevelSheetOpen, setIsLevelSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleUpdateLevel = async (newLevel: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ academic_level: newLevel })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev: any) => ({ ...prev, academic_level: newLevel }));
      showToast('Level updated — your results will now reflect this');
      setIsLevelSheetOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update level');
    }
  };

  const handleDeleteData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      showToast('All your study data has been deleted.');
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-[#e4e1e9] font-['Inter',sans-serif]">
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe mb-4" />
        <p className="text-xs text-[#6B6B80] tracking-wide">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0F] text-[#e4e1e9] min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-[#508ff8] selection:text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50 pt-safe-top">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/welcome')}
              className="text-[#6B6B80] hover:text-[#e4e1e9] p-1.5 hover:bg-[#1C1C24] rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-['Manrope',sans-serif] text-sm font-bold text-[#F0F0F5] tracking-tight">
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-xl mx-auto w-full px-6 pt-24 pb-12">
        {/* Account Section */}
        <h2 className="text-[11px] text-[#6B6B80] font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Account
        </h2>
        <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 text-sm">
            <span className="text-[#6B6B80]">Email</span>
            <span className="text-[#CACAD5] font-medium">{profile?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-white/5 text-sm">
            <span className="text-[#6B6B80]">First Name</span>
            <span className="text-[#CACAD5] font-medium">{profile?.first_name || 'N/A'}</span>
          </div>
          <div 
            onClick={() => setIsLevelSheetOpen(true)}
            className="flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity"
          >
            <span className="text-[#6B6B80]">Academic Level</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#4F8EF7] font-semibold">{profile?.academic_level || 'Set level'}</span>
              <span className="material-symbols-outlined text-[#6B6B80] text-[18px] group-hover:text-[#F0F0F5] transition-colors">chevron_right</span>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <h2 className="text-[11px] text-[#6B6B80] font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Notifications
        </h2>
        <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between opacity-50 text-sm">
            <span className="text-[#CACAD5]">Daily Study Reminder</span>
            <span className="text-[10px] bg-[rgba(79,142,247,0.10)] border border-[rgba(79,142,247,0.30)] text-[#4F8EF7] rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Soon</span>
          </div>
        </div>

        {/* Appearance Section */}
        <h2 className="text-[11px] text-[#6B6B80] font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Appearance
        </h2>
        <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-5 mb-6 space-y-4">
          <span className="text-xs text-[#6B6B80] block">App Theme</span>
          <div className="flex gap-2">
            {([
              { id: 'light', label: 'Light', icon: 'light_mode' },
              { id: 'dark', label: 'Dark', icon: 'dark_mode' },
              { id: 'system', label: 'System', icon: 'desktop_windows' }
            ] as const).map(t => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#4F8EF7] bg-[#4F8EF7]/5 text-[#4F8EF7]'
                      : 'border-white/[0.06] bg-[#1B1B20] text-[#CACAD5] hover:bg-white/[0.02] hover:border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  <span className="text-xs font-medium font-body">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy & Legal */}
        <h2 className="text-[11px] text-[#6B6B80] font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Legal
        </h2>
        <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-5 mb-6 space-y-4">
          <div 
            onClick={() => navigate('/privacy')}
            className="flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity pb-3 border-b border-white/5"
          >
            <span className="text-[#CACAD5]">Privacy Policy</span>
            <span className="material-symbols-outlined text-[#6B6B80] text-[18px]">chevron_right</span>
          </div>
          <div 
            onClick={() => navigate('/terms')}
            className="flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity"
          >
            <span className="text-[#CACAD5]">Terms of Service</span>
            <span className="material-symbols-outlined text-[#6B6B80] text-[18px]">chevron_right</span>
          </div>
        </div>

        {/* Danger Zone */}
        <h2 className="text-[11px] text-red-500 font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Danger Zone
        </h2>
        <div className="bg-[#16161F] border border-red-900/20 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-[#F0F0F5] block">Delete My Data</span>
              <span className="text-xs text-[#6B6B80] block">This will permanently delete all your sessions and learning history.</span>
            </div>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="py-2.5 px-5 bg-red-600/10 border border-red-600/20 hover:bg-red-600 hover:text-white transition-all text-xs font-semibold rounded-full text-red-500 cursor-pointer self-start sm:self-center"
            >
              Delete All Data
            </button>
          </div>
        </div>
      </main>

      {/* Level Bottom Sheet */}
      {isLevelSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLevelSheetOpen(false)} />
          <div className="relative bg-[#131318] w-full max-w-lg rounded-t-3xl p-6 pb-8 border-t border-white/10 z-10">
            <div className="w-12 h-1 bg-[#6B6B80] rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-headline font-bold text-[#F0F0F5] mb-2">Academic Level</h2>
            <p className="text-[#6B6B80] font-body text-sm mb-6">Choose your academic level to calibrate study responses.</p>
            <div className="flex flex-col gap-3">
              {['Secondary School', '100 / 200 Level', '300 / 400 Level', '500 / 600 Level', 'Postgraduate'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => handleUpdateLevel(lvl)}
                  className={`w-full text-left bg-[#1B1B20] border hover:bg-[#252530] transition-all rounded-xl px-5 py-3.5 text-sm font-medium font-body cursor-pointer ${
                    profile?.academic_level === lvl
                      ? 'border-[#4F8EF7] bg-[#4F8EF7]/5 text-[#F0F0F5]'
                      : 'border-white/[0.06] text-[#CACAD5]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-[#16161F] border border-white/[0.06] w-full max-w-sm rounded-3xl p-6 shadow-2xl z-10 text-center space-y-4">
            <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
            <h3 className="text-lg font-headline font-bold text-[#F0F0F5]">Delete all data?</h3>
            <p className="text-sm text-[#CACAD5] font-body leading-relaxed">
              This will permanently delete all your study sessions and history. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 bg-[#1D1D26] hover:bg-[#252530] text-xs font-semibold rounded-full border border-white/[0.08] transition-colors cursor-pointer text-[#CACAD5]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-xs font-semibold text-white rounded-full transition-colors cursor-pointer border-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Error Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1B1B22]/90 backdrop-blur-md border border-[#4F8EF7]/30 text-[#F0F0F5] px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 transition-all duration-300 font-medium text-sm font-body">
          <span className="material-symbols-outlined text-[#4F8EF7] text-[20px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
