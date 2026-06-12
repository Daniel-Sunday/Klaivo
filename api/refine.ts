export const config = { runtime: 'edge' };

import { verifyAuth } from './_utils/auth';
import { checkAndIncrementRateLimit } from './_utils/rateLimit';
import { getCorsHeaders, handleCors } from './_utils/cors';

const SCHEMAS: Record<string, string> = {
  UNDERSTAND: `{
  "simple_version": "2-3 sentences. Plain language. Use an analogy here. The student should feel the fog lift.",
  "what_you_must_know": ["Point 1 — the most critical concept", "Point 2", "Point 3", "Point 4", "Point 5 — the most commonly confused"],
  "full_answer": "The simplified/expanded explanation. Use ## for section headers. Flowing academic prose. Thorough.",
  "common_misconceptions": "2-3 sentences. What most students get wrong and exactly why. Be specific."
}`,
  WRITE: `{
  "structure_outline": "Complete essay/assignment structure. Each section with 1-2 sentences describing its purpose and what to include. Format as numbered sections: 1. Introduction\\n2. [Section name]...",
  "what_markers_want": "3-5 specific things the marker is looking for. Practical and direct.",
  "full_draft": "The simplified/expanded complete draft. Fully written — not an outline. Introduction through conclusion.",
  "common_mistakes": "3-4 specific mistakes students make in this type of writing and how to avoid each."
}`,
  PREPARE: `{
  "key_definitions": ["Term: Definition", "Term: Definition", "Term: Definition", "Term: Definition", "Term: Definition"],
  "exam_strategy": "How to approach exam questions on this topic.",
  "full_answer": "A simplified/expanded model exam answer.",
  "likely_questions": [
    {"question": "Exam-style question?", "approach": "How to attack this question — 2-3 sentences on structure and key points to cover."},
    {"question": "Exam-style question?", "approach": "How to attack this question."},
    {"question": "Exam-style question?", "approach": "How to attack this question."}
  ]
}`,
  REVISE: `{
  "quick_summary": "The entire topic in 3-5 sentences. Maximum information density. No padding.",
  "core_points": ["The single most important concept", "Second most important", "Third", "Fourth", "Fifth"],
  "full_notes": "Simplified/expanded revision notes. Structured with ## headers.",
  "test_yourself": ["Question 1 to test understanding of the core concept?", "Question 2?", "Question 3?"]
}`
};

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

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }

    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: cors });
    }

    const { type, topic, mode, level, existingFullAnswer, mode_schema } = await req.json();

    const schemaDefinition = SCHEMAS[mode_schema] || SCHEMAS.UNDERSTAND;
    const systemPrompt = type === 'simplify'
      ? `You are Klaivo. Rewrite this answer more simply. Return valid JSON with exactly this schema:\n${schemaDefinition}\n\nMake simple_version/quick_summary even simpler. Make full_answer/full_draft/full_notes more accessible. No jargon. Same warmth. Return ONLY valid JSON.`
      : `You are Klaivo. Expand this answer significantly. Return valid JSON with exactly this schema:\n${schemaDefinition}\n\nThe full_answer/full_draft/full_notes should be more detailed — additional context, deeper analysis, more examples, broader implications. Return ONLY valid JSON.`;

    const userMessage = `Topic: ${topic}\nMode: ${mode}\nLevel: ${level}\nExisting answer:\n${existingFullAnswer}\n\n${type === 'simplify' ? 'Rewrite simpler.' : 'Go much deeper.'}`;

    const maxTokens = type === 'simplify' ? 1000 : 2200;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text().catch(() => '');
      throw new Error(`Gemini API error ${geminiResponse.status}: ${errBody}`);
    }

    const data = await geminiResponse.json();
    console.log('Gemini response data in refine:', JSON.stringify(data));

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Gemini returned an empty or blocked response');
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parsing failed. Raw Gemini response was:\n', rawText);
      throw parseErr;
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('API Error in refine function:', err);
    const cors = getCorsHeaders(req);
    const status = err.message === 'INVALID_INPUT' ? 400 : 500;
    return new Response(JSON.stringify({ error: err.message || 'Something went wrong' }), { status, headers: cors });
  }
}
