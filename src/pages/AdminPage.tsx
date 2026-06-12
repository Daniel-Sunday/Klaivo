import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MODE_NAMES: Record<string, string> = {
  understand: 'Explain Topic',
  write: 'Write Essay/Draft',
  prepare: 'Exam Prep',
  revise: 'Revision Notes',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // States for View Data
  const [conversion, setConversion] = useState<{ free_users: number; pro_users: number } | null>(null);
  const [dau, setDau] = useState<{ date: string; dau: number }[]>([]);
  const [modes, setModes] = useState<{ mode: string; count: number }[]>([]);
  const [levels, setLevels] = useState<{ level: string; count: number }[]>([]);
  const [topTopics, setTopTopics] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);

  useEffect(() => {
    async function loadAdminDashboard() {
      try {
        setLoading(true);

        // 1. Conversion
        const { data: conv } = await supabase.from('admin_conversion').select('*');
        if (conv && conv.length > 0) {
          setConversion(conv[0]);
        }

        // 2. Daily Active Users (limit 14)
        const { data: dauData } = await supabase
          .from('admin_daily_active_users')
          .select('*')
          .order('date', { ascending: false })
          .limit(14);
        if (dauData) {
          setDau([...dauData].reverse());
        }

        // 3. Mode Distribution
        const { data: modeData } = await supabase.from('admin_mode_distribution').select('*').order('count', { ascending: false });
        if (modeData) setModes(modeData);

        // 4. Level Distribution
        const { data: levelData } = await supabase.from('admin_level_distribution').select('*').order('count', { ascending: false });
        if (levelData) setLevels(levelData);

        // 5. Top 20 Topics (limit 20)
        const { data: topicsData } = await supabase.from('admin_top_topics').select('*').limit(20);
        if (topicsData) setTopTopics(topicsData);

        // 6. Recent 30 Questions/Sessions
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, topic, mode, level, result_json, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        if (sessionsData) setRecentSessions(sessionsData);

        // 7. Recent 20 Uploads
        const { data: uploadsData } = await supabase.from('admin_uploads').select('*').limit(20);
        if (uploadsData) setUploads(uploadsData);

        // 8. Recent 30 Follow-up Questions
        const { data: followUpsData } = await supabase.from('admin_follow_up_questions').select('*').limit(30);
        if (followUpsData) setFollowUps(followUpsData);

      } catch (err) {
        console.error('Error loading admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminDashboard();
  }, []);

  const handleCSVExport = () => {
    if (topTopics.length === 0) return;
    const csv = topTopics.map(r => `"${r.topic || ''}","${r.mode || ''}","${r.level || ''}","${r.count || 0}"`).join('\n');
    const blob = new Blob([`topic,mode,level,count\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'klaivo-topics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const calculateConversionRate = () => {
    if (!conversion) return '0.0%';
    const total = Number(conversion.free_users) + Number(conversion.pro_users);
    if (total === 0) return '0.0%';
    return `${((conversion.pro_users / total) * 100).toFixed(1)}%`;
  };

  const getDauMax = () => {
    if (dau.length === 0) return 1;
    return Math.max(...dau.map(d => Number(d.dau)), 1);
  };

  const getModesTotal = () => {
    return modes.reduce((acc, curr) => acc + Number(curr.count), 0);
  };

  if (loading) {
    return (
      <div className="bg-bg-primary text-text-body min-h-screen flex items-center justify-center font-['Inter',sans-serif]">
        <img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" loading="lazy" />
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-bg-primary text-text-body min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-accent selection:text-white pb-20">
      <header
        className="border-b border-border-subtle bg-bg-primary/80 backdrop-blur-xl px-6 py-4 fixed top-0 w-full z-45"
        style={{ paddingTop: 'calc(12px + var(--sat))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              aria-label="Return Home"
              className="text-text-secondary hover:text-text-primary p-1 rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
              title="Return Home"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <span className="text-xl font-bold tracking-tight text-text-primary font-headline">
              K <span className="text-xs font-normal text-text-secondary">· Admin</span>
            </span>
          </div>
          <span className="text-xs text-text-secondary font-semibold font-mono uppercase tracking-wider">
            {currentDate}
          </span>
        </div>
      </header>

      {/* Main dashboard content */}
      <main id="main-content" className="max-w-7xl mx-auto w-full px-6 pt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Section: Conversion */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent text-lg">trending_up</span>
              Conversion
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-bg-secondary border border-ghost-border p-4 rounded-xl">
                <span className="text-xs text-text-secondary font-medium">Free Users</span>
                <p className="text-2xl font-bold text-text-primary mt-1 font-headline">
                  {conversion?.free_users ?? 0}
                </p>
              </div>
              <div className="bg-bg-secondary border border-ghost-border p-4 rounded-xl">
                <span className="text-xs text-text-secondary font-medium">Pro Users</span>
                <p className="text-2xl font-bold text-accent mt-1 font-headline">
                  {conversion?.pro_users ?? 0}
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-border-subtle/50 pt-4 flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Conversion Rate</span>
            <span className="text-xl font-extrabold text-white font-headline">
              {calculateConversionRate()}
            </span>
          </div>
        </section>

        {/* Section: Daily Active Users */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 md:col-span-1 lg:col-span-2">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">bar_chart</span>
            Daily Active Users (Last 14 days)
          </h2>
          {dau.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No activity logged yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2">
              {dau.map((d) => {
                const maxDau = getDauMax();
                const percentage = ((Number(d.dau) / maxDau) * 100).toFixed(0);
                return (
                  <div key={d.date} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-20 shrink-0 text-text-secondary">{d.date}</span>
                    <div className="flex-grow bg-white/5 rounded-full h-4 overflow-hidden relative border border-ghost-border">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-bold text-text-primary">{d.dau}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section: Mode Distribution */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">pie_chart</span>
            Mode Distribution
          </h2>
          {modes.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No sessions recorded.</p>
          ) : (
            <div className="space-y-1">
              {modes.map((m) => {
                const total = getModesTotal();
                const percent = total > 0 ? ((Number(m.count) / total) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={m.mode}
                    className="flex justify-between items-center text-sm border-b border-border-subtle/50 py-2.5 last:border-b-0"
                  >
                    <span className="text-text-body capitalize font-medium">
                      {MODE_NAMES[m.mode] || m.mode}
                    </span>
                    <span className="font-bold text-text-primary">
                      {m.count}{' '}
                      <span className="text-xs font-normal text-text-secondary ml-1">
                        ({percent}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section: Level Distribution */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">school</span>
            Level Distribution
          </h2>
          {levels.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No level data available.</p>
          ) : (
            <div className="space-y-1">
              {levels.map((l) => (
                <div
                  key={l.level}
                  className="flex justify-between items-center text-sm border-b border-border-subtle/50 py-2.5 last:border-b-0"
                >
                  <span className="text-text-body font-medium">{l.level || 'Unspecified'}</span>
                  <span className="font-bold text-text-primary">{l.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Top 20 Topics */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline font-bold text-text-primary text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-accent text-lg">stars</span>
                Top Topics (Weekly)
              </h2>
              <button
                onClick={handleCSVExport}
                aria-label="Export CSV"
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-accent/30 text-accent hover:bg-accent/10 rounded-full transition-colors flex items-center gap-1 bg-transparent cursor-pointer"
                title="Export CSV"
              >
                <span className="material-symbols-outlined text-[12px]">download</span>
                CSV
              </button>
            </div>
            {topTopics.length === 0 ? (
              <p className="text-sm text-text-secondary italic text-center py-10">No top topics recorded.</p>
            ) : (
              <ol className="space-y-2 max-h-[250px] overflow-y-auto pr-1 text-sm list-decimal list-inside">
                {topTopics.map((t, idx) => (
                  <li key={idx} className="text-text-body border-b border-border-subtle/35 pb-1.5 last:border-0 truncate">
                    <span className="font-semibold text-text-primary ml-1">{t.topic}</span>
                    <span className="text-xs text-text-secondary font-medium ml-2">
                      ({t.count}x · {t.mode})
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Section: Recent Uploads */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 md:col-span-1 lg:col-span-2">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">attachment</span>
            Recent Uploaded Notes & Materials
          </h2>
          {uploads.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No recent file uploads.</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {uploads.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-bg-secondary border border-ghost-border rounded-xl p-3.5 flex gap-4 items-center"
                >
                  <a
                    href={item.uploaded_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 group relative"
                  >
                    <img
                      src={item.uploaded_file_url}
                      alt="Thumbnail preview"
                      className="w-14 h-14 object-cover rounded-lg border border-ghost-border group-hover:opacity-85 transition-opacity"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                      <span className="material-symbols-outlined text-white text-base">open_in_new</span>
                    </div>
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {item.topic}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1.5 text-xs text-text-secondary">
                      <span className="px-2 py-0.5 bg-surface-low border border-ghost-border rounded text-[10px] uppercase font-bold tracking-wider">
                        {item.academic_level || 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Recent Questions (Live Feed) */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 md:col-span-1 lg:col-span-2">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">feed</span>
            Recent Questions (Live Feed)
          </h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No sessions logged.</p>
          ) : (
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  aria-label="View session details"
                  className="w-full text-left bg-bg-secondary hover:bg-surface border border-ghost-border hover:border-accent/20 rounded-xl p-3.5 flex justify-between items-center cursor-pointer transition-all duration-200"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-semibold text-text-primary truncate">{s.topic}</p>
                    <div className="flex items-center gap-2.5 mt-1.5 text-xs text-text-secondary">
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-accent rounded text-[10px] uppercase font-bold tracking-wider">
                        {MODE_NAMES[s.mode] || s.mode}
                      </span>
                      {s.level && (
                        <>
                          <span>•</span>
                          <span>{s.level}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary font-medium shrink-0">
                    {formatTimeAgo(s.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Section: Recent Follow-up Questions */}
        <section className="bg-surface-low border border-ghost-border rounded-2xl p-6 md:col-span-1 lg:col-span-1">
          <h2 className="font-headline font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-lg">forum</span>
            Recent Follow-up Threads
          </h2>
          {followUps.length === 0 ? (
            <p className="text-sm text-text-secondary italic text-center py-10">No follow-ups recorded.</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {followUps.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-bg-secondary border border-ghost-border rounded-xl p-3.5 space-y-1.5"
                >
                  <p className="text-sm text-text-primary font-medium leading-relaxed italic">
                    &ldquo;{item.question}&rdquo;
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-secondary border-t border-border-subtle/30 pt-1.5">
                    <span className="truncate max-w-[150px] font-semibold">
                      {item.topic}
                    </span>
                    <span className="shrink-0">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Raw JSON modal view */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-surface border border-ghost-border rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col relative shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h3 className="font-headline text-lg font-bold text-text-primary">
                Raw Result JSON
              </h3>
              <button
                onClick={() => setSelectedSession(null)}
                aria-label="Close"
                className="text-text-secondary hover:text-text-primary p-1 rounded-full transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-text-body bg-bg-primary/50 rounded-b-2xl">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(selectedSession.result_json, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
