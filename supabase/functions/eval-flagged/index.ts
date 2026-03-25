/**
 * supabase/functions/eval-flagged/index.ts
 *
 * Automatically triages moderation_flags using Claude API.
 * Processes up to 20 unreviewed flags per run.
 * Stores Claude's evaluation in moderation_flags.details.
 *
 * Security: requires x-cron-secret header or admin Authorization.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_API_KEY         = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type EvalCategory =
  | 'appropriate_and_helpful'
  | 'wrong_depth'
  | 'guardrail_violation'
  | 'soul_mismatch'
  | 'factually_incorrect';

type ClaudeEval = {
  category: EvalCategory;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
};

type FlagRow = {
  id: string;
  target_id: string;
  reason: string;
  details: string | null;
};

async function evaluateFlag(flag: FlagRow): Promise<ClaudeEval | null> {
  if (!ANTHROPIC_API_KEY) return null;

  let details: Record<string, unknown> = {};
  try {
    details = flag.details ? (JSON.parse(flag.details) as Record<string, unknown>) : {};
  } catch { /* non-JSON details */ }

  const botMessage   = typeof details.bot_message   === 'string' ? details.bot_message   : '[not available]';
  const userMessage  = typeof details.user_message  === 'string' ? details.user_message  : '[not available]';
  const academicLevel= typeof details.academic_level=== 'string' ? details.academic_level: 'unknown';
  const saathiId     = typeof details.saathi_id     === 'string' ? details.saathi_id     : 'unknown';

  const prompt = `You are evaluating a student-flagged AI chatbot response from an Indian educational platform (EdUsaathiAI).

Student context:
- Academic level: ${academicLevel}
- Saathi (subject): ${saathiId}
- Student message: "${userMessage}"

Bot response being evaluated:
"${botMessage}"

Evaluate this bot response. Return ONLY valid JSON in this exact format:
{
  "category": one of ["appropriate_and_helpful", "wrong_depth", "guardrail_violation", "soul_mismatch", "factually_incorrect"],
  "severity": one of ["low", "medium", "high"],
  "explanation": "1-2 sentences explaining your evaluation"
}

Category definitions:
- appropriate_and_helpful: The response is correct and well-calibrated for the student
- wrong_depth: The response is too advanced or too basic for the student's level
- guardrail_violation: The response violates safety rules (medical advice, political opinion, etc.)
- soul_mismatch: Wrong tone, didn't use student's name, or ignored soul profile data
- factually_incorrect: The response contains factual errors`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-20250514',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.[0]?.text ?? '';
    return JSON.parse(text) as ClaudeEval;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Auth: cron secret OR valid admin JWT
  const cronSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization');
  const isAuthorized =
    (CRON_SECRET && cronSecret === CRON_SECRET) ||
    (authHeader && authHeader.startsWith('Bearer '));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Optionally verify admin JWT
  if (authHeader && !cronSecret) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch up to 20 unreviewed user-flagged messages
    const { data: flags, error: fetchError } = await admin
      .from('moderation_flags')
      .select('id, target_id, reason, details')
      .eq('reason', 'user_flag')
      .eq('status', 'pending')
      .limit(20);

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!flags || flags.length === 0) {
      return new Response(
        JSON.stringify({ success: true, evaluated: 0, message: 'No pending flags' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    let evaluated = 0;
    let skipped = 0;

    for (const flag of flags as FlagRow[]) {
      const evalResult = await evaluateFlag(flag);

      if (!evalResult) {
        skipped++;
        continue;
      }

      // Merge Claude's evaluation into the existing details
      let existingDetails: Record<string, unknown> = {};
      try {
        existingDetails = flag.details ? (JSON.parse(flag.details) as Record<string, unknown>) : {};
      } catch { /* non-JSON */ }

      const updatedDetails = JSON.stringify({
        ...existingDetails,
        claude_eval: evalResult,
        eval_at: new Date().toISOString(),
        eval_model: 'claude-haiku-4-20250514',
      });

      // Update the flag with evaluation + new status
      await admin
        .from('moderation_flags')
        .update({
          details: updatedDetails,
          status: evalResult.severity === 'high' ? 'flagged' : 'reviewed',
          reason: evalResult.category === 'guardrail_violation'
            ? 'guardrail_violation'
            : flag.reason,
        })
        .eq('id', flag.id);

      evaluated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: (flags as FlagRow[]).length,
        evaluated,
        skipped,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[eval-flagged] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
