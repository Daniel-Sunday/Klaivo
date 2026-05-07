export const config = { runtime: 'edge' }
import { verifyAuth } from './_utils/auth.js'
import { sanitizeInput } from './_utils/sanitize.js'
import { checkAndIncrementRateLimit } from './_utils/rateLimit.js'

const CORS_HEADERS = { 'Access-Control-Allow-Origin': 'https://klaivo.app', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  const { user, error: authError, supabase } = await verifyAuth(req)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })

  try {
    const { question, sessionId, originalFullAnswer, originalTopic, conversationHistory = [] } = await req.json()
    const cleanQuestion = sanitizeInput(question, 500)

    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id)
    if (!allowed) return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: CORS_HEADERS })

    // Build conversation messages with history
    const messages = [
      ...conversationHistory.map(h => ([
        { role: 'user', content: h.question },
        { role: 'assistant', content: h.answer }
      ])).flat(),
      { role: 'user', content: cleanQuestion }
    ]

    const systemPrompt = `You are Klaivo. A student is asking a follow-up question about a topic you already explained.

Original topic: ${originalTopic}
Your previous answer summary: ${originalFullAnswer.slice(0, 800)}

Rules:
- Answer concisely and directly. This is a follow-up, not a new full explanation.
- Warm, direct, precise. No filler.
- Plain text response — no JSON.
- Never start with Certainly/Sure/Great question/Of course.
- If this is a new tangent, answer it briefly then suggest starting a new topic.`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    )

    const data = await geminiResponse.json()
    const answer = data.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({ answer }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Something went wrong' }), { status: 500, headers: CORS_HEADERS })
  }
}
