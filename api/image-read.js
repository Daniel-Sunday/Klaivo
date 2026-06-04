export const config = { runtime: 'edge' }
import { verifyAuth } from './_utils/auth.js'

const CORS_HEADERS = { 'Access-Control-Allow-Origin': 'https://klaivo.app', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  const { user, error } = await verifyAuth(req)
  if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })

  const { imageBase64, mediaType = 'image/jpeg' } = await req.json()

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
  )

  if (!geminiResponse.ok) {
    throw new Error(`Gemini API error: ${geminiResponse.status}`)
  }

  const data = await geminiResponse.json()
  const clean = data.candidates[0].content.parts[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return new Response(clean, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}
