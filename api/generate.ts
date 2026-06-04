export const config = { runtime: 'edge' };

import { verifyAuth } from './_utils/auth';
import { sanitizeInput } from './_utils/sanitize';
import { checkAndIncrementRateLimit } from './_utils/rateLimit';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://klaivo.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ModelSelection {
  model: string;
  provider: 'anthropic' | 'gemini';
  maxTokens: number;
}

function selectModel(mode: string, level: string, depth: string, subjectType: string): ModelSelection {
  const needsSonnet =
    mode === 'write' ||
    level === 'postgrad' ||
    level === '500_600' ||
    depth === 'full' ||
    depth === 'exam' ||
    subjectType === 'mathematical';

  return needsSonnet
    ? { model: 'claude-3-5-sonnet-latest', provider: 'anthropic', maxTokens: 2000 }
    : { model: 'gemini-2.5-flash', provider: 'gemini', maxTokens: 1500 };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json();
  if (body.mode === 'flashcards' || body.mode === 'quiz') {
    return new Response(JSON.stringify({ error: 'Use /api/flashcards-quiz for Pro features' }), { status: 400, headers: CORS_HEADERS });
  }

  try {
    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user || !supabase) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const { systemPrompt, userMessage, mode, level, topic, depth, subjectType, imageBase64 } = body;

    // Sanitize
    const cleanTopic = sanitizeInput(topic || '', 600);

    // Server-side rate limit
    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: CORS_HEADERS });
    }

    // Server-side free limit check — 2 uses per 8-day window (rolling)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_pro, is_trial, pro_expires_at, total_uses_used, free_window_start')
      .eq('id', user.id)
      .single();

    const isActive = profileData?.is_pro && profileData?.pro_expires_at && new Date(profileData.pro_expires_at) > new Date();

    if (!isActive && profileData) {
      const windowStart = profileData.free_window_start ? new Date(profileData.free_window_start) : null;
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const inWindow = windowStart && windowStart > eightDaysAgo;

      if (inWindow && (profileData.total_uses_used || 0) >= 2) {
        return new Response(JSON.stringify({ error: 'FREE_LIMIT_REACHED' }), { status: 402, headers: CORS_HEADERS });
      }

      // Reset window if expired
      if (!inWindow) {
        await supabase.from('profiles')
          .update({ total_uses_used: 0, free_window_start: new Date().toISOString() })
          .eq('id', user.id);
        profileData.total_uses_used = 0;
      }
    }

    // Check cache (skip for image queries)
    if (!imageBase64) {
      const normalized = cleanTopic.toLowerCase().replace(/\s+/g, ' ').trim();
      const cacheKey = `${normalized}|${mode}|${level}|${depth || 'solid'}|${subjectType || 'conceptual'}`; 
      const { data: cached } = await supabase
        .from('answer_cache')
        .select('result_json, hit_count')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        await supabase.from('answer_cache')
          .update({ hit_count: (cached.hit_count || 0) + 1 })
          .eq('cache_key', cacheKey);

        if (!isActive) {
          await supabase.from('profiles')
            .update({ total_uses_used: (profileData?.total_uses_used || 0) + 1 })
            .eq('id', user.id);
        }

        return new Response(
          JSON.stringify({ result: cached.result_json, fromCache: true }),
          { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Select model based on task complexity
    const { model, provider, maxTokens } = selectModel(mode, level, depth, subjectType);

    // Build message content
    const content = imageBase64
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } }, { type: 'text', text: userMessage }]
      : userMessage;

    // Call the appropriate model
    let rawText: string;
    if (provider === 'gemini') {
      const geminiParts = imageBase64
        ? [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }, { text: userMessage }]
        : [{ text: userMessage }];
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: geminiParts }],
            generationConfig: { maxOutputTokens: maxTokens }
          })
        }
      );
      if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status}`);
      const geminiData = await geminiResponse.json();
      rawText = geminiData.candidates[0].content.parts[0].text;
    } else {
      // Anthropic (Claude Sonnet)
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content }] })
      });
      if (!claudeResponse.ok) throw new Error(`Claude API error: ${claudeResponse.status}`);
      const claudeData = await claudeResponse.json();
      rawText = claudeData.content[0].text;
    }
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);

    // Single serviceSupabase declaration — used for both cache and count
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Database environment variables are missing');
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Save to cache (not for image queries)
    if (!imageBase64) {
      const normalized = cleanTopic.toLowerCase().replace(/\s+/g, ' ').trim();
      const cacheKey = `${normalized}|${mode}|${level}|${depth || 'solid'}|${subjectType || 'conceptual'}`; 
      await serviceSupabase.from('answer_cache').upsert({
        cache_key: cacheKey,
        topic_normalized: normalized,
        mode, level,
        depth: depth || 'solid',
        subject_type: subjectType || 'conceptual',
        result_json: result,
        hit_count: 0,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'cache_key' });
    }

    // Increment total_uses_used for free users
    if (!isActive) {
      await serviceSupabase.from('profiles')
        .update({ total_uses_used: (profileData?.total_uses_used || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify({ result, fromCache: false, modelUsed: model }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    const status = err.message === 'INVALID_INPUT' ? 400 : 500;
    return new Response(JSON.stringify({ error: err.message }), { status, headers: CORS_HEADERS });
  }
}
