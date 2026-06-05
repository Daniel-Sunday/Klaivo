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

    const maxTokens = type === 'simplify' ? 1000 : 2200;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: maxTokens }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text().catch(() => '');
      throw new Error(`Gemini API error ${geminiResponse.status}: ${errBody}`);
    }

    const data = await geminiResponse.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Gemini returned an empty or blocked response');
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
