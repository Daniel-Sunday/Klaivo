export const config = { runtime: 'edge' };

import { getCorsHeaders, handleCors } from './_utils/cors';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  const cors = getCorsHeaders(req);

  // Method check
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...cors, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // 1. Verify user's Supabase JWT from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { 
        status: 401, 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }
    const token = authHeader.substring(7);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Database environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing on the server.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Authentication failed' }), { 
        status: 401, 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Parse request JSON body
    const body = await req.json();
    const { systemPrompt, userMessage, imageBase64 } = body;

    if (!systemPrompt || !userMessage) {
      return new Response(JSON.stringify({ error: 'systemPrompt and userMessage are required fields' }), { 
        status: 400, 
        headers: { ...cors, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Read GEMINI_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }

    // 4. Build parts and call Gemini API
    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }
    parts.push({ text: userMessage });

    const geminiBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API error (Status ${geminiResponse.status}): ${errorText}`);
    }

    const data = await geminiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini API returned an empty response or candidate was blocked.');
    }

    // 5. Clean up response string if it's formatted as markdown JSON
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result;
    try {
      result = JSON.parse(clean);
    } catch (e) {
      result = rawText;
    }

    // 6. Return response
    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('API Error in generate function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
