import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Session {
  id: string;
  topic: string;
  mode: string;
  level: string;
  created_at: string;
  uploaded_file_url?: string | null;
}

const PAGE_SIZE = 20;

const LEVEL_MAP: Record<string, string> = {
  'secondary': 'Secondary',
  '100_200': '100/200 Lvl',
  '300_400': '300/400 Lvl',
  '500_600': '500/600 Lvl',
  'postgrad': 'Postgrad'
};

const MODE_MAP: Record<string, string> = {
  'understand': 'Understand',
  'write': 'Write',
  'prepare': 'Prepare',
  'revise': 'Revise'
};

function groupSessionsByDate(sessions: Session[]) {
  const groups: Record<string, Session[]> = {
    'Today': [],
    'Yesterday': [],
    'Earlier this week': [],
    'Older': []
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  sessions.forEach(s => {
    const date = new Date(s.created_at);
    if (date >= today) {
      groups['Today'].push(s);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(s);
    } else if (date >= oneWeekAgo) {
      groups['Earlier this week'].push(s);
    } else {
      groups['Older'].push(s);
    }
  });

  return Object.keys(groups).reduce((acc: Record<string, Session[]>, key) => {
    if (groups[key].length > 0) acc[key] = groups[key];
    return acc;
  }, {});
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchedServer, setSearchedServer] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load sessions from Supabase
  const loadSessions = async (pageNum: number, append = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('id, topic, mode, level, created_at, uploaded_file_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const newSessions = data || [];
      if (append) {
        setSessions(prev => [...prev, ...newSessions]);
      } else {
        setSessions(newSessions);
      }

      setHasMore(newSessions.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // When searchQuery is cleared, reset to first page
  useEffect(() => {
    if (searchQuery === '') {
      setPage(0);
      setLoading(true);
      setSearchedServer(false);
      loadSessions(0, false);
    }
  }, [searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadSessions(nextPage, true);
  };

  const handleSearchAll = async () => {
    setSearchingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sessions')
        .select('id, topic, mode, level, created_at')
        .eq('user_id', user.id)
        .ilike('topic', `%${debouncedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      setSessions(data || []);
      setHasMore(false);
      setSearchedServer(true);
    } catch (err) {
      console.error('Error searching all sessions:', err);
    } finally {
      setSearchingAll(false);
    }
  };

  // Filter loaded sessions client-side
  const filteredSessions = debouncedQuery && !searchedServer
    ? sessions.filter(s => s.topic.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : sessions;

  const grouped = groupSessionsByDate(filteredSessions);

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
              Study History
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-xl mx-auto w-full px-6 pt-24 pb-12 flex flex-col">
        {/* Search Bar Container */}
        <div className="relative mb-6 flex items-center">
          <span className="material-symbols-outlined text-[#6B6B80] absolute left-3.5 select-none pointer-events-none text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search your sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#16161F] border border-white/[0.06] hover:border-white/10 focus:border-[#4F8EF7] focus:ring-1 focus:ring-[#4F8EF7]/15 rounded-xl h-[44px] pl-[40px] pr-[16px] text-sm text-[#F0F0F5] placeholder-[#6B6B80] outline-none font-body transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 bg-transparent border-none text-[#6B6B80] hover:text-[#F0F0F5] cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <HistorySkeleton />
        ) : (
          <div className="flex-grow flex flex-col">
            {/* Grouped sessions */}
            {Object.keys(grouped).length > 0 ? (
              <div className="space-y-6 flex-grow">
                {Object.entries(grouped).map(([groupName, groupSessions]) => (
                  <div key={groupName} className="flex flex-col">
                    <h3 className="text-[11px] text-[#6B6B80] font-bold uppercase tracking-wider font-['Manrope',sans-serif] mb-3">
                      {groupName}
                    </h3>
                    <div className="space-y-3">
                      {groupSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => navigate(`/result/${session.id}`)}
                          className="bg-[#16161F] border border-white/[0.06] hover:border-white/10 hover:bg-[#1E1E28] transition-all rounded-2xl p-4 flex items-center justify-between cursor-pointer group"
                        >
                          <div className="space-y-1.5 pr-4 truncate flex-grow">
                            <h4 className="font-semibold text-[#F0F0F5] text-sm font-body truncate">
                              {session.topic}
                            </h4>
                            <div className="text-xs text-[#6B6B80] font-medium flex items-center gap-2 font-body flex-wrap">
                              <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded-md text-[#CACAD5]">
                                {MODE_MAP[session.mode] || session.mode}
                              </span>
                              <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded-md text-[#CACAD5]">
                                {LEVEL_MAP[session.level] || session.level}
                              </span>
                              {session.uploaded_file_url && (
                                <span className="material-symbols-outlined text-[14px] text-[#4F8EF7]" title="Has uploaded material">
                                  image
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(session.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[#6B6B80] group-hover:text-[#F0F0F5] transition-colors shrink-0">
                            chevron_right
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty search state */
              <div className="flex-grow flex flex-col items-center justify-center py-12 text-center my-auto">
                <span className="material-symbols-outlined text-[#6B6B80] text-5xl mb-4 select-none">history</span>
                {debouncedQuery ? (
                  <div className="space-y-4">
                    <p className="text-sm text-[#CACAD5] font-body max-w-xs">
                      No matching sessions found in recently loaded history.
                    </p>
                    {!searchedServer && (
                      <button
                        onClick={handleSearchAll}
                        disabled={searchingAll}
                        className="px-5 py-2.5 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white text-xs font-semibold rounded-full shadow-[0_4px_12px_rgba(79,142,247,0.2)] transition-all flex items-center gap-1.5 mx-auto cursor-pointer border-none"
                      >
                        {searchingAll ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
                        ) : null}
                        <span>Search all sessions →</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#CACAD5] font-body">No study history found.</p>
                )}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !debouncedQuery && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-[#16161F] hover:bg-[#1E1E28] border border-white/[0.06] hover:border-white/10 text-xs font-semibold rounded-full text-[#CACAD5] hover:text-[#F0F0F5] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Load more →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2].map(g => (
        <div key={g} className="space-y-3">
          <div className="h-3 bg-white/10 rounded w-16 mb-2" />
          {[1, 2].map(i => (
            <div key={i} className="bg-[#16161F] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="h-3 bg-white/5 rounded w-1/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
