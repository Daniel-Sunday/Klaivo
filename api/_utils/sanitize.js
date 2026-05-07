const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|below)?\s*instructions/i,
  /you\s+are\s+now\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /disregard\s+(all\s+)?instructions/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /new\s+role\s*:/i,
  /forget\s+(all\s+)?previous/i,
]

export function sanitizeInput(text, maxLength = 500) {
  if (!text || typeof text !== 'string') throw new Error('INVALID_INPUT')
  const trimmed = text.trim().slice(0, maxLength)
  const hasInjection = INJECTION_PATTERNS.some(p => p.test(trimmed))
  if (hasInjection) throw new Error('INVALID_INPUT')
  return trimmed
}
