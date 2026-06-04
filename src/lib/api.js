import { getAuthToken } from './supabase'

export async function callAI({
  systemPrompt,
  userMessage,
  mode = 'understand',
  level = '100_200',
  topic = 'General Study',
  depth = 'solid',
  subjectType = 'conceptual',
  imageBase64 = null
}) {
  const token = await getAuthToken()
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      mode,
      level,
      topic,
      depth,
      subjectType,
      imageBase64
    })
  })

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`
    try {
      const errData = await response.json()
      if (errData?.error) {
        errorMessage = errData.error
      }
    } catch (_) {
      // Ignore JSON parse errors from non-JSON error pages
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data.result
}
