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

    const { imageBase64, mediaType = 'image/jpeg' } = await req.json();

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: `You are Klaivo. A student uploaded a photo of study material. Return ONLY valid JSON: {"topic": "main topic", "subject_area": "academic discipline", "key_concepts": ["concept1", "concept2", "concept3"], "confidence": "high" or "low"}. If unclear, confidence = "low" and best guess.` }] },
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: mediaType, data: imageBase64 } },
              { text: 'Identify this study material.' }
            ]
          }],
          generationConfig: { maxOutputTokens: 300 }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    const clean = data.candidates[0].content.parts[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const cors = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), { status: 500, headers: cors });
  }
}
