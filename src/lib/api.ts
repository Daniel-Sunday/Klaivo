import { getAuthToken } from './supabase'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://klaivo.app'

async function callAPI<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('NOT_AUTHENTICATED')

  const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  })

  if (response.status === 401) throw new Error('NOT_AUTHENTICATED')
  if (response.status === 402) throw new Error('FREE_LIMIT_REACHED')
  if (response.status === 429) throw new Error('RATE_LIMIT_EXCEEDED')
  if (!response.ok) throw new Error(`API_ERROR_${response.status}`)

  return response.json()
}

interface GenerateAnswerOptions {
  topic: string
  mode: string
  level: string
  depth?: string
  subjectType?: string
  systemPrompt: string
  userMessage: string
  imageBase64?: string | null
  essayQuestion?: string | null
}

export async function generateAnswer(options: GenerateAnswerOptions) {
  return callAPI('generate', options)
}

interface PromptMessageOptions {
  systemPrompt: string
  userMessage: string
}

export async function generateFlashcards(options: PromptMessageOptions) {
  return callAPI('generate', { ...options, maxTokens: 600, topic: 'flashcards', mode: 'flashcards', level: 'na' })
}

export async function generateQuiz(options: PromptMessageOptions) {
  return callAPI('generate', { ...options, maxTokens: 800, topic: 'quiz', mode: 'quiz', level: 'na' })
}

interface FollowUpOptions {
  question: string
  sessionId: string
  originalFullAnswer: string
  originalTopic: string
  conversationHistory: { question: string; answer: string }[]
}

export async function generateFollowUp(options: FollowUpOptions) {
  return callAPI('follow-up', options)
}

interface RefineOptions {
  type: string
  topic: string
  mode: string
  level: string
  existingFullAnswer: string
  modeSchema: string
}

export async function refineAnswer({ type, topic, mode, level, existingFullAnswer, modeSchema }: RefineOptions) {
  return callAPI('refine', { type, topic, mode, level, existingFullAnswer, mode_schema: modeSchema })
}

interface ReadImageOptions {
  imageBase64: string
  mediaType: string
}

export async function readImage(options: ReadImageOptions) {
  return callAPI('image-read', options)
}

// Utility: strip markdown for clipboard
export function stripMarkdownForCopy(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .trim()
}
