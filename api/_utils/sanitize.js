const INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget)\s+all\s+(?:previous|prior|system|above|below)?\s*instructions/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:system|assistant|bot|helper|gpt|claude|gemini|new\s+role|developer|admin|moderator)/i,
  /pretend\s+to\s+be\s+(?:a\s+)?(?:system|developer|admin|moderator|ai\s+assistant|bot|helper)/i,
  /(?:^|\n)system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /new\s+role\s*:/i,
  /forget\s+all\s+previous/i,
]

export function sanitizeInput(text, maxLength = 500) {
  if (!text || typeof text !== 'string') throw new Error('INVALID_INPUT')
  const trimmed = text.trim().slice(0, maxLength)
  const hasInjection = INJECTION_PATTERNS.some(p => p.test(trimmed))
  if (hasInjection) throw new Error('INVALID_INPUT')
  return trimmed
}
