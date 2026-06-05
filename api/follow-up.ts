export const config = { runtime: 'edge' };

import { verifyAuth } from './_utils/auth';
import { sanitizeInput } from './_utils/sanitize';
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
    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user || !supabase) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const { question, originalFullAnswer, originalTopic, conversationHistory = [] } = await req.json();
    const cleanQuestion = sanitizeInput(question, 500);

    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: cors });
    }

    // Build conversation messages with history
    const messages = [
      ...conversationHistory.map((h: any) => ([
        { role: 'user', content: h.question },
        { role: 'assistant', content: h.answer }
      ])).flat(),
      { role: 'user', content: cleanQuestion }
    ];

    const systemPrompt = `You are Klaivo. A student is asking a follow-up question about a topic you already explained.

Original topic: ${originalTopic}
Your previous answer summary: ${originalFullAnswer.slice(0, 800)}

Rules:
- Answer concisely and directly. This is a follow-up, not a new full explanation.
- Warm, direct, precise. No filler.
- Plain text response — no JSON.
- Never start with Certainly/Sure/Great question/Of course.
- If this is a new tangent, answer it briefly then suggest starting a new topic.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    const answer = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ result: answer }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const cors = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), { status: 500, headers: cors });
  }
}
