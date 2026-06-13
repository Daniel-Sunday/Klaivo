import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLevelSheetOpen, setIsLevelSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(() => {
      if (active) {
        console.warn('Profile fetch took too long, forcing loading to false');
        setLoading(false);
      }
    }, 2500);

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && active) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (active) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };
    fetchProfile();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Toast state and helper removed (now using useToast hook)

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
      showToast('Level updated — your results will now reflect this', 'success');
      setIsLevelSheetOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update level', 'error');
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

      setProfile((prev: any) => prev ? { ...prev, daily_count: 0 } : null);
      showToast('All your study data has been deleted.', 'success');
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete data', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-text-body font-['Inter',sans-serif]">
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe mb-4" loading="lazy" />
        <p className="text-xs text-text-secondary tracking-wide">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white page-transition">
      <header
        className="border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-50"
        style={{ paddingTop: 'calc(12px + var(--sat))' }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/welcome')}
              className="text-text-secondary hover:text-text-primary p-1.5 hover:bg-surface-low rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-['Manrope',sans-serif] text-sm font-bold text-text-primary tracking-tight">
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="main-content" className="flex-grow max-w-xl mx-auto w-full px-6 pt-24 pb-12">
        {/* Account Section */}
        <h2 className="text-[11px] text-text-secondary font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Account
        </h2>
        <div className="bg-bg-secondary border border-ghost-border rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle text-sm">
            <span className="text-text-secondary">Email</span>
            <span className="text-text-body font-medium">{profile?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle text-sm">
            <span className="text-text-secondary">First Name</span>
            <span className="text-text-body font-medium">{profile?.first_name || 'N/A'}</span>
          </div>
          <button 
            onClick={() => setIsLevelSheetOpen(true)}
            className="w-full text-left bg-transparent border-none flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity p-0"
          >
            <span className="text-text-secondary">Academic Level</span>
            <div className="flex items-center gap-1.5">
              <span className="text-accent font-semibold">{profile?.academic_level || 'Set level'}</span>
              <span className="material-symbols-outlined text-text-secondary text-[18px] group-hover:text-text-primary transition-colors">chevron_right</span>
            </div>
          </button>
        </div>

        {/* Notifications Section */}
        <h2 className="text-[11px] text-text-secondary font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Notifications
        </h2>
        <div className="bg-bg-secondary border border-ghost-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between opacity-50 text-sm">
            <span className="text-text-body">Daily Study Reminder</span>
            <span 
              style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
              className="text-[10px] border rounded-full px-2 py-0.5 font-bold uppercase tracking-wider"
            >
              Soon
            </span>
          </div>
        </div>

        {/* Appearance Section */}
        <h2 className="text-[11px] text-text-secondary font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Appearance
        </h2>
        <div className="bg-bg-secondary border border-ghost-border rounded-2xl p-5 mb-6 space-y-4">
          <span className="text-xs text-text-secondary block">App Theme</span>
          <div role="list" className="flex gap-2">
            {([
              { id: 'light', label: 'Light', icon: 'light_mode' },
              { id: 'dark', label: 'Dark', icon: 'dark_mode' },
              { id: 'system', label: 'System', icon: 'desktop_windows' }
            ] as const).map(t => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  role="listitem"
                  onClick={() => setTheme(t.id)}
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--ghost-border)',
                    background: isActive ? 'var(--accent-glow)' : 'var(--surface-low)',
                    color: isActive ? 'var(--accent)' : 'var(--text-body)'
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:bg-white/[0.02]"
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  <span className="text-xs font-medium font-body">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy & Legal */}
        <h2 className="text-[11px] text-text-secondary font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Legal
        </h2>
        <div role="list" className="bg-bg-secondary border border-ghost-border rounded-2xl p-5 mb-6 space-y-4">
          <button 
            onClick={() => navigate('/privacy')}
            role="listitem"
            className="w-full text-left bg-transparent border-none flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity pb-3 border-b border-border-subtle p-0"
          >
            <span className="text-text-body">Privacy Policy</span>
            <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
          </button>
          <button 
            onClick={() => navigate('/terms')}
            role="listitem"
            className="w-full text-left bg-transparent border-none flex items-center justify-between text-sm cursor-pointer group hover:opacity-80 transition-opacity p-0"
          >
            <span className="text-text-body">Terms of Service</span>
            <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
          </button>
        </div>

        {/* Danger Zone */}
        <h2 className="text-[11px] text-red-500 font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
          Danger Zone
        </h2>
        <div className="bg-bg-secondary border border-red-900/20 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-text-primary block">Delete My Data</span>
              <span className="text-xs text-text-secondary block">This will permanently delete all your sessions and learning history.</span>
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
          <div className="relative bg-surface w-full max-w-lg rounded-t-3xl p-6 pb-8 border-t border-white/10 z-10">
            <div className="w-12 h-1 bg-text-secondary rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-headline font-bold text-text-primary mb-2">Academic Level</h2>
            <p className="text-text-secondary font-body text-sm mb-6">Choose your academic level to calibrate study responses.</p>
            <div className="flex flex-col gap-3">
              {['Secondary School', '100 / 200 Level', '300 / 400 Level', '500 / 600 Level', 'Postgraduate'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => handleUpdateLevel(lvl)}
                  style={{
                    borderColor: profile?.academic_level === lvl ? 'var(--accent)' : 'var(--ghost-border)',
                    background: profile?.academic_level === lvl ? 'var(--accent-glow)' : 'var(--surface-low)',
                    color: profile?.academic_level === lvl ? 'var(--accent)' : 'var(--text-body)'
                  }}
                  className="w-full text-left border hover:bg-surface-mid transition-all rounded-xl px-5 py-3.5 text-sm font-medium font-body cursor-pointer"
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
          <div className="relative bg-bg-secondary border border-ghost-border w-full max-w-sm rounded-3xl p-6 shadow-2xl z-10 text-center space-y-4">
            <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
            <h3 className="text-lg font-headline font-bold text-text-primary">Delete all data?</h3>
            <p className="text-sm text-text-body font-body leading-relaxed">
              This will permanently delete all your study sessions and history. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 bg-surface-low hover:bg-surface text-xs font-semibold rounded-full border border-ghost-border transition-colors cursor-pointer text-text-body"
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
    </div>
  );
}
