const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function callAI({ systemPrompt, userMessage, maxTokens = 1500 }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { 
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json"
        }
      })
    }
  )
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}
