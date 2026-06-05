export const config = { runtime: 'edge' };

import { verifyAuth } from './_utils/auth';
import { checkAndIncrementRateLimit } from './_utils/rateLimit';
import { getCorsHeaders, handleCors } from './_utils/cors';

export default async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const cors = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  try {
    const { user, error, supabase } = await verifyAuth(req);
    if (error || !user || !supabase) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: cors });
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
    const result = JSON.parse(clean);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const cors = getCorsHeaders(req);
    const status = err.message === 'INVALID_INPUT' ? 400 : 500;
    return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), { status, headers: cors });
  }
}
