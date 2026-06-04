import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FlashcardsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (data) setSessionData(data);
      setLoading(false);
    }
    load();
  }, [sessionId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}><img src="/logo.svg" alt="Klaivo" className="w-16 h-16 k-breathe" /></div>;
  if (!sessionData) return <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-[#F0F0F5]">Session not found</div>;

  return <div className="min-h-screen bg-[#0A0A0F] text-[#F0F0F5]">Flashcards Page - Session: {sessionData.topic}</div>;
}
