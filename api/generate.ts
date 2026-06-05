export const config = { runtime: 'edge' };

import { verifyAuth } from './_utils/auth';
import { sanitizeInput } from './_utils/sanitize';
import { checkAndIncrementRateLimit } from './_utils/rateLimit';
import { getCorsHeaders, handleCors } from './_utils/cors';
import { createClient } from '@supabase/supabase-js';

interface ModelSelection {
  model: string;
  provider: 'anthropic' | 'gemini';
  maxTokens: number;
}

function selectModel(mode: string, level: string, depth: string, subjectType: string): ModelSelection {
  // Flashcards and quizzes are lightweight — always use Gemini Flash
  if (mode === 'flashcards' || mode === 'quiz') {
    return { model: 'gemini-2.5-flash', provider: 'gemini', maxTokens: 1000 };
  }

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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const cors = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  try {
    const { user, error: authError, supabase } = await verifyAuth(req);
    if (authError || !user || !supabase) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const body = await req.json();
    const { systemPrompt, userMessage, mode, level, topic, depth, subjectType, imageBase64, maxTokens: clientMaxTokens } = body;

    // Sanitize
    const cleanTopic = sanitizeInput(topic || '', 600);

    // Server-side rate limit
    const { allowed } = await checkAndIncrementRateLimit(supabase, user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), { status: 429, headers: cors });
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
        return new Response(JSON.stringify({ error: 'FREE_LIMIT_REACHED' }), { status: 402, headers: cors });
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
          { headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Select model based on task complexity
    const selected = selectModel(mode, level, depth, subjectType);
    const maxTokens = clientMaxTokens || selected.maxTokens;
    const { model, provider } = selected;

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
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    const cors = getCorsHeaders(req);
    const status = err.message === 'INVALID_INPUT' ? 400 : 500;
    return new Response(JSON.stringify({ error: err.message }), { status, headers: cors });
  }
}
