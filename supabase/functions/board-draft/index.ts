/**
 * supabase/functions/board-draft/index.ts
 *
 * AI-assisted board answer drafting for faculty.
 * Faculty clicks "Answer" → this generates a Claude draft they can edit.
 * JWT protected. Faculty role required.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureError } from '../_shared/sentry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Verify faculty role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'faculty') {
      return new Response(JSON.stringify({ error: 'Faculty only' }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { questionText, saathiSlug } = await req.json();
    if (!questionText || typeof questionText !== 'string') {
      return new Response(JSON.stringify({ error: 'questionText required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Get Saathi name for context
    const saathiName = saathiSlug
      ? saathiSlug.replace('saathi', ' Saathi').replace(/^\w/, (c: string) => c.toUpperCase())
      : 'the subject';

    // Call Claude to generate draft
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are helping a verified faculty member draft an answer to a student question on EdUsaathiAI — an Indian education platform. Write a comprehensive, accurate answer that the faculty can review and edit. Write in a clear teaching style appropriate for Indian university students. Subject area: ${saathiName}.`,
        messages: [{
          role: 'user',
          content: `Student question: "${questionText}"

Draft a thorough answer that covers:
1. Direct answer to the question
2. Explanation with examples relevant to Indian context
3. Common misconceptions to address
4. How this connects to broader concepts in the subject

Keep it under 500 words. Use simple, clear language. Do not use markdown headers — just plain paragraphs with bold for key terms.`,
        }],
      }),
    });

    const aiData = await aiRes.json();
    const draft = aiData.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ draft }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { function: 'board-draft' },
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
