import { getAuthToken } from './supabase'

const BASE_URL = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'https://klaivo.app');

async function callAPI<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('NOT_AUTHENTICATED')

  const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  })

  const raw = await response.text().catch(() => '');
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (response.status === 401) throw new Error(json?.message || 'NOT_AUTHENTICATED');
  if (response.status === 402) throw new Error(json?.message || 'FREE_LIMIT_REACHED');
  if (response.status === 429) throw new Error(json?.message || 'RATE_LIMIT_EXCEEDED');
  if (!response.ok) {
    const message = json?.message || `API_ERROR_${response.status}`;
    throw new Error(message);
  }
  return json;
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

// Utility: Compress image to JPEG base64 string
export function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read file'));
          }
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64String = dataUrl.split(',')[1];
          resolve(base64String);
        } catch (e) {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read file'));
          }
        }
      };
      img.onerror = () => {
        const r = new FileReader();
        r.onload = () => {
          if (typeof r.result === 'string') {
            resolve(r.result.split(',')[1]);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        r.onerror = error => reject(error);
        r.readAsDataURL(file);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

