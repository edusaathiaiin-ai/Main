/**
 * supabase/functions/backfill-exam-targets/index.ts
 *
 * One-shot LLM backfill. For each profile where exam_target is set but
 * exam_target_id is NULL, asks Claude Haiku to map the free-text to one of
 * the canonical EXAM_REGISTRY ids.
 *
 * Contract (per-row):
 *   model returns { "id": string | null, "confidence": 0..1 }
 *   confidence < 0.70 → treat as null, student picks on next login.
 *   confidence >= 0.70 → write exam_target_id + exam_target_year
 *                        (year auto-derived from registry.next_date).
 *
 * Idempotent. Re-invoking the function only touches still-NULL rows.
 * Stops after BATCH_SIZE per call — admin runs it until `remaining === 0`.
 *
 * Admin-only (profiles.role === 'admin' gate).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { EXAM_REGISTRY, inferExamYear, inferExamDate } from '../_shared/examRegistry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const CONFIDENCE_THRESHOLD = 0.70;
const BATCH_SIZE = 50;

type Classification = { id: string | null; confidence: number };

function buildSystemPrompt(): string {
  const examList = EXAM_REGISTRY
    .map((e) => `  - ${e.id}: ${e.name} (${e.full_name})`)
    .join('\n');

  return `You map free-text exam target strings written by Indian students to canonical exam IDs.

CANONICAL EXAMS:
${examList}

Rules:
- "UPSC" with no other context → upsc_prelims (most students prep prelims first).
- "NEET" with no other context → neet_ug.
- "JEE" with no other context → jee_main.
- "CA" with no other context → ca_foundation.
- "engineering entrance" → jee_main.
- "medical entrance" → neet_ug.
- "civil services" → upsc_prelims.
- "None" / empty / "no" / "not preparing" / "nothing" → id null, confidence 1.0.
- If you genuinely can't decide, return id null and confidence below 0.7.

Return STRICT JSON only: {"id": string | null, "confidence": number}.
No prose, no markdown, no code fences.`;
}

async function classifyOne(rawText: string): Promise<Classification> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 100,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: `Classify this student's free-text exam target: "${rawText.replace(/"/g, "'")}"`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text}`);
  }

  const json = await res.json() as { content?: Array<{ type?: string; text?: string }> };
  const text = json.content?.find((c) => c.type === 'text')?.text ?? '';

  // Extract JSON from the model's response. Haiku should return pure JSON,
  // but defend against a stray sentence wrapping it.
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return { id: null, confidence: 0 };

  try {
    const parsed = JSON.parse(match[0]) as { id?: unknown; confidence?: unknown };
    const validIds = new Set(EXAM_REGISTRY.map((e) => e.id));
    const id = typeof parsed.id === 'string' && validIds.has(parsed.id) ? parsed.id : null;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    return { id, confidence };
  } catch {
    return { id: null, confidence: 0 };
  }
}

serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // Admin-only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, CORS);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401, CORS);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403, CORS);

    if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500, CORS);

    // Count remaining so the admin knows how many more runs are needed.
    const { count: remainingBefore } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('exam_target', 'is', null)
      .neq('exam_target', '')
      .neq('exam_target', 'None')
      .is('exam_target_id', null);

    const { data: profiles, error: fetchError } = await admin
      .from('profiles')
      .select('id, exam_target')
      .not('exam_target', 'is', null)
      .neq('exam_target', '')
      .neq('exam_target', 'None')
      .is('exam_target_id', null)
      .limit(BATCH_SIZE);

    if (fetchError) return json({ error: fetchError.message }, 500, CORS);
    if (!profiles || profiles.length === 0) {
      return json({ ok: true, processed: 0, classified: 0, low_confidence: 0, remaining: 0 }, 200, CORS);
    }

    let classified = 0;
    let lowConfidence = 0;
    const errors: Array<{ user_id: string; error: string }> = [];

    for (const row of profiles) {
      const userId = String(row.id);
      const raw = String(row.exam_target ?? '').trim();
      if (!raw) continue;

      try {
        const result = await classifyOne(raw);
        if (!result.id || result.confidence < CONFIDENCE_THRESHOLD) {
          lowConfidence++;
          continue;
        }
        const year = inferExamYear(result.id);
        const date = inferExamDate(result.id);
        const { error: updateError } = await admin
          .from('profiles')
          .update({
            exam_target_id:   result.id,
            exam_target_year: year,
            exam_target_date: date,
          })
          .eq('id', userId);
        if (updateError) {
          errors.push({ user_id: userId, error: updateError.message });
        } else {
          classified++;
        }
      } catch (err) {
        errors.push({
          user_id: userId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const processed = profiles.length;
    const remaining = Math.max(0, (remainingBefore ?? 0) - processed);

    return json(
      {
        ok: true,
        processed,
        classified,
        low_confidence: lowConfidence,
        remaining,
        threshold: CONFIDENCE_THRESHOLD,
        errors: errors.length > 0 ? errors : undefined,
      },
      200,
      CORS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: msg }, 500, corsHeaders(req));
  }
});

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
