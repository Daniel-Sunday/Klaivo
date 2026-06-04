export const config = { runtime: 'edge' };
import { verifyAuth } from './_utils/auth';
import { checkAndIncrementRateLimit } from './_utils/rateLimit';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://klaivo.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  const { user, error, supabase } = await verifyAuth(req);
  if (error || !user || !supabase) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
  }

  const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: CORS_HEADERS });
  }

  const { type, topic, mode, level, existingFullAnswer, mode_schema } = await req.json();

  const systemPrompt = type === 'simplify'
    ? `You are Klaivo. Rewrite this answer more simply. Return valid JSON with exactly the same schema as the original (${mode_schema}). Make simple_version/quick_summary even simpler. Make full_answer/full_draft/full_notes more accessible. No jargon. Same warmth. Return ONLY valid JSON.` 
    : `You are Klaivo. Expand this answer significantly. Return valid JSON with the same schema (${mode_schema}). The full_answer/full_draft/full_notes should be more detailed — additional context, deeper analysis, more examples, broader implications. Return ONLY valid JSON.`; 

  const userMessage = `Topic: ${topic}\nMode: ${mode}\nLevel: ${level}\nExisting answer:\n${existingFullAnswer}\n\n${type === 'simplify' ? 'Rewrite simpler.' : 'Go much deeper.'}`; 

  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: type === 'simplify' ? 1000 : 2200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!claudeResponse.ok) {
    throw new Error(`Claude API error: ${claudeResponse.status}`);
  }

  const data = await claudeResponse.json();
  const clean = data.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return new Response(clean, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}
