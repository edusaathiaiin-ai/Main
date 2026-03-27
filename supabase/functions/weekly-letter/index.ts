/**
 * supabase/functions/weekly-letter/index.ts
 *
 * Weekly Saathi Letter — sent every Sunday at 8:00 AM IST (2:30 AM UTC).
 * Generates a personalized letter for each active user via Groq,
 * then delivers via Resend from noreply@edusaathiai.in.
 *
 * Cron: Set up in Supabase Dashboard → Edge Functions → weekly-letter → Schedule
 * Expression: 30 2 * * 0
 *
 * Auth: Accepts SUPABASE_SERVICE_ROLE_KEY as Bearer token (cron trigger).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GROQ_API_KEY              = Deno.env.get('GROQ_API_KEY') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM               = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in';

const GROQ_MODEL  = 'llama-3.3-70b-versatile';
const BATCH_SIZE  = 5;       // parallel Groq calls per batch
const MIN_SESSIONS = 1;      // only send to users who have chatted at least once
const RESEND_DAYS  = 6;      // don't re-send within 6 days

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ────────────────────────────────────────────────────────────────────

type UserWithSoul = {
  userId:             string;
  email:              string;
  fullName:           string | null;
  planId:             string;
  displayName:        string;
  saathiName:         string;
  saathiEmoji:        string;
  ambitionLevel:      string;
  topTopics:          string[];
  struggleTopics:     string[];
  lastSessionSummary: string | null;
  sessionCount:       number;
  futureResearchArea: string | null;
  flameStage:         string | null;
};

type SendResult = {
  userId: string;
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
};

// ── Letter generation via Groq ───────────────────────────────────────────────

async function generateLetter(user: UserWithSoul): Promise<string> {
  const name      = user.displayName || user.fullName || 'friend';
  const topics    = user.topTopics.slice(0, 5).join(', ') || 'various topics in your field';
  const struggles = user.struggleTopics.slice(0, 3).join(', ');

  const systemPrompt = `You are ${user.saathiName}, writing a personal weekly letter to ${name}.

You know them deeply:
- Sessions completed together: ${user.sessionCount}
- Ambition level: ${user.ambitionLevel}
- Topics they have explored: ${topics}
${struggles ? `- Topics they find challenging: ${struggles}` : ''}
${user.futureResearchArea ? `- Their declared dream: ${user.futureResearchArea}` : ''}
${user.lastSessionSummary ? `- What happened last session: ${user.lastSessionSummary}` : ''}
${user.flameStage ? `- Their passion stage: ${user.flameStage}` : ''}

Write a warm, personal letter in 4 short paragraphs (150–200 words total).

Paragraph 1: Open with their name. Reference their journey with you — specific, not generic.
Paragraph 2: Acknowledge what they have been exploring. Name actual topics. Be specific.
Paragraph 3: Gently acknowledge a challenge OR celebrate a moment of growth. Be human.
Paragraph 4: Connect to their dream. Give one concrete thing to explore next week.

Rules — never break these:
- Write entirely as ${user.saathiName}. Never say "AI", "language model", or "algorithm".
- Warm but never saccharine. Specific, not generic.
- Short paragraphs. This is a letter, not a report.
- You are not just answering questions. You are shaping a future.

End the letter with exactly these two lines on their own:
Until next Sunday,
${user.saathiName} ✦`;

  type GroqResponse = { choices: Array<{ message: { content: string } }> };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 420,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: 'Write the letter now.' },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as GroqResponse;
  return data.choices[0]?.message?.content?.trim() ?? '';
}

// ── HTML email builder ───────────────────────────────────────────────────────

function buildEmail(user: UserWithSoul, letterText: string): string {
  const paragraphsHtml = letterText
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0)
    .map((p) =>
      `<p style="margin:0 0 18px;font-size:15px;line-height:1.85;color:rgba(255,255,255,0.82);font-family:Georgia,'Times New Roman',serif;">${p.trim().replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  const upgradeCta = user.planId === 'free'
    ? `
      <tr><td style="padding:20px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:rgba(201,153,58,0.08);border:0.5px solid rgba(201,153,58,0.28);border-radius:14px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#C9993A;font-family:Arial,sans-serif;">
              Ready to go deeper? ✦
            </p>
            <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.45);font-family:Arial,sans-serif;line-height:1.65;">
              Plus gives you 20 chats daily, all 5 bot slots, and no cooling period.
              Your Saathi — fully yours, every day.
            </p>
            <a href="https://www.edusaathiai.in/pricing?trigger=weekly_letter"
              style="display:inline-block;padding:10px 22px;background:#C9993A;color:#060F1D;font-size:12px;font-weight:700;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;">
              Upgrade to Plus · ₹199/month →
            </a>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your weekly letter from ${user.saathiName}</title>
</head>
<body style="margin:0;padding:0;background:#060F1D;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060F1D;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Logo -->
      <tr><td style="padding:0 0 28px;text-align:center;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;font-family:Georgia,serif;letter-spacing:-0.5px;">
          EdU<span style="color:#C9993A;">saathi</span>AI
        </p>
        <p style="margin:5px 0 0;font-size:9px;color:#C9993A;letter-spacing:2.5px;text-transform:uppercase;font-family:Arial,sans-serif;">
          Unified Soul Partnership
        </p>
      </td></tr>

      <!-- Saathi header -->
      <tr><td style="padding:0 0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#0B1F3A;border:1px solid rgba(201,153,58,0.2);border-radius:14px;">
          <tr><td style="padding:18px 24px;text-align:center;">
            <p style="margin:0;font-size:34px;">${user.saathiEmoji}</p>
            <p style="margin:7px 0 0;font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;font-family:Arial,sans-serif;">
              Your weekly letter from ${user.saathiName}
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Letter body -->
      <tr><td style="background:#0B1F3A;border:0.5px solid rgba(255,255,255,0.07);border-radius:20px;padding:34px 38px;">
        ${paragraphsHtml}
      </td></tr>

      <!-- Upgrade CTA (free only) -->
      ${upgradeCta}

      <!-- Footer -->
      <tr><td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);font-family:Arial,sans-serif;line-height:1.75;">
          EdUsaathiAI · Indo American Education Society, Ahmedabad<br>
          You receive this because you have an active Saathi companion.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Send via Resend ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `EdUsaathiAI <${RESEND_FROM}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ── Process one user ─────────────────────────────────────────────────────────

async function processUser(
  admin: ReturnType<typeof createClient>,
  user: UserWithSoul
): Promise<SendResult> {
  try {
    const letter = await generateLetter(user);
    if (!letter) throw new Error('Empty letter returned from Groq');

    const html    = buildEmail(user, letter);
    const subject = `Your week with ${user.saathiName} ✦`;

    await sendEmail(user.email, subject, html);

    await admin
      .from('profiles')
      .update({ last_letter_sent_at: new Date().toISOString() })
      .eq('id', user.userId);

    return { userId: user.userId, status: 'sent' };
  } catch (err) {
    return {
      userId: user.userId,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Accept service role key as auth (cron trigger passes it as Bearer)
  const authHeader = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (authHeader !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Fetch eligible users ──────────────────────────────────────────────────
  type RawRow = {
    user_id:              string;
    display_name:         string;
    ambition_level:       string;
    top_topics:           string[];
    struggle_topics:      string[];
    last_session_summary: string | null;
    session_count:        number;
    future_research_area: string | null;
    flame_stage:          string | null;
    profiles: {
      id:                 string;
      email:              string;
      full_name:          string | null;
      plan_id:            string;
      is_active:          boolean;
      last_letter_sent_at: string | null;
    };
    verticals: {
      name:  string;
      emoji: string;
    };
  };

  const { data: rows, error: fetchError } = await admin
    .from('student_soul')
    .select(`
      user_id,
      display_name,
      ambition_level,
      top_topics,
      struggle_topics,
      last_session_summary,
      session_count,
      future_research_area,
      flame_stage,
      profiles!inner (
        id, email, full_name, plan_id, is_active, last_letter_sent_at
      ),
      verticals!inner (
        name, emoji
      )
    `)
    .gte('session_count', MIN_SESSIONS);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── Filter: active, has email, not sent recently ──────────────────────────
  const cutoff = new Date(Date.now() - RESEND_DAYS * 24 * 60 * 60 * 1000);

  const eligible: UserWithSoul[] = ((rows ?? []) as unknown as RawRow[])
    .filter((r) => {
      if (!r.profiles.is_active || !r.profiles.email) return false;
      if (r.profiles.last_letter_sent_at) {
        if (new Date(r.profiles.last_letter_sent_at) > cutoff) return false;
      }
      return true;
    })
    .map((r) => ({
      userId:             r.user_id,
      email:              r.profiles.email,
      fullName:           r.profiles.full_name,
      planId:             r.profiles.plan_id ?? 'free',
      displayName:        r.display_name,
      saathiName:         r.verticals.name,
      saathiEmoji:        r.verticals.emoji,
      ambitionLevel:      r.ambition_level ?? 'medium',
      topTopics:          (r.top_topics as string[]) ?? [],
      struggleTopics:     (r.struggle_topics as string[]) ?? [],
      lastSessionSummary: r.last_session_summary,
      sessionCount:       r.session_count ?? 0,
      futureResearchArea: r.future_research_area,
      flameStage:         r.flame_stage,
    }));

  // ── Process in batches of BATCH_SIZE ─────────────────────────────────────
  const results: SendResult[] = [];

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((user) => processUser(admin, user))
    );
    results.push(...batchResults);
  }

  const sent   = results.filter((r) => r.status === 'sent').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return new Response(
    JSON.stringify({
      success: true,
      eligible: eligible.length,
      sent,
      failed,
      failures: results
        .filter((r) => r.status === 'failed')
        .map((r) => ({ userId: r.userId, error: r.error })),
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
