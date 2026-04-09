// supabase/functions/send-session-digest/index.ts
//
// Sends a per-Saathi session digest email to the user.
// Called by:
//   1. Cron at 10 PM IST daily (auto)
//   2. Manual button click from sidebar (anytime)
//
// Input (manual): { verticalId: string, date?: string }
// Input (cron):   { date?: string } + x-cron-secret header

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const GROQ_KEY     = Deno.env.get('GROQ_API_KEY')!
const CRON_SECRET  = Deno.env.get('CRON_SECRET')!

const resend = new Resend(RESEND_KEY)

// ─── IST helpers ──────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function fmtDateIST(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTimeIST(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ─── Groq digest generation ───────────────────────────────────────────────────

type Digest = { summary: string; key_concepts: string[]; homework: string[] }

async function generateDigest(
  transcript: string,
  saathiName: string,
  studentName: string,
): Promise<Digest> {
  const prompt = `Summarise this study session between ${studentName} and ${saathiName}.

TRANSCRIPT:
${transcript}

Return ONLY this JSON (no markdown, no backticks):
{
  "summary": "2-3 sentences. What ${studentName} explored today. Specific, warm, second person (You explored...).",
  "key_concepts": ["Concept — brief explanation", "Concept — brief explanation", "Concept — brief explanation"],
  "homework": [
    "Actionable study task for tomorrow",
    "Something to review from today's session",
    "A follow-up question to ask ${saathiName} next time"
  ]
}

Rules: summary must reference actual topics from transcript. key_concepts: 3-5 items. homework: exactly 3 items. Third homework item must be a suggested question for the next session.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700, temperature: 0.3,
      }),
    })
    const json = await res.json()
    const text = (json.choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '').trim()
    return JSON.parse(text) as Digest
  } catch {
    return {
      summary: 'You had a productive study session today. Review the topics and continue tomorrow.',
      key_concepts: ['Review your notes from today\'s session'],
      homework: [
        'Review the topics discussed today',
        'Note any questions that came up',
        `Ask ${saathiName} to continue from where you left off`,
      ],
    }
  }
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(p: {
  studentName: string; saathiName: string; saathiEmoji: string
  dateLabel: string; timeRange: string; sessionCount: number
  digest: Digest; chatUrl: string; isManual: boolean
}): string {
  const concepts = p.digest.key_concepts.map((c, i) => `
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;
        width:20px;height:20px;border-radius:50%;background:rgba(201,153,58,0.2);
        color:#C9993A;font-size:10px;font-weight:700;flex-shrink:0;margin-top:2px;">
        ${i + 1}
      </span>
      <p style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6;margin:0;">
        ${c}
      </p>
    </div>`).join('')

  const hw = p.digest.homework.map((h, i) => `
    <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">
      <span style="font-size:16px;flex-shrink:0;">${['📖','✍️','💬'][i] ?? '→'}</span>
      <p style="font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6;margin:0;">${h}</p>
    </div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#060F1D;
    font-family:'DM Sans',Arial,sans-serif;color:#fff;">
  <div style="max-width:580px;margin:0 auto;padding:32px 20px;">

    <div style="margin-bottom:24px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:800;
        color:#C9993A;margin:0 0 4px;">EdUsaathiAI</h1>
      <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:0;">
        ${p.isManual ? 'Session digest — sent on your request' : 'Your nightly session digest'}</p>
    </div>

    <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:700;
      color:#fff;margin:0 0 6px;">
      ${p.saathiEmoji} Your ${p.saathiName} session
    </h2>
    <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0 0 24px;">
      ${p.dateLabel} · ${p.timeRange} ·
      ${p.sessionCount} ${p.sessionCount === 1 ? 'session' : 'sessions'}
    </p>

    <div style="padding:20px;border-radius:14px;margin-bottom:18px;
      background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);">
      <p style="font-size:10px;font-weight:600;letter-spacing:0.08em;
        text-transform:uppercase;color:rgba(255,255,255,0.3);margin:0 0 10px;">
        What you covered</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.8;margin:0;">
        ${p.digest.summary}</p>
    </div>

    <div style="padding:20px;border-radius:14px;margin-bottom:18px;
      background:rgba(201,153,58,0.06);border:0.5px solid rgba(201,153,58,0.2);">
      <p style="font-size:10px;font-weight:600;letter-spacing:0.08em;
        text-transform:uppercase;color:#C9993A;margin:0 0 14px;">
        Key concepts to remember</p>
      ${concepts}
    </div>

    <div style="padding:20px;border-radius:14px;margin-bottom:28px;
      background:rgba(74,222,128,0.05);border:0.5px solid rgba(74,222,128,0.2);">
      <p style="font-size:10px;font-weight:600;letter-spacing:0.08em;
        text-transform:uppercase;color:#4ADE80;margin:0 0 14px;">
        Your homework for tomorrow</p>
      ${hw}
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${p.chatUrl}"
        style="display:inline-block;padding:14px 32px;border-radius:12px;
          background:#C9993A;color:#060F1D;font-size:14px;font-weight:700;
          text-decoration:none;">
        Continue with ${p.saathiName} →
      </a>
      <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:10px 0 0;">
        Your Saathi remembers where you left off.</p>
    </div>

    <div style="border-top:0.5px solid rgba(255,255,255,0.08);
      padding-top:18px;text-align:center;">
      <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0 0 4px;">
        EdUsaathiAI · Ahmedabad, Gujarat, India</p>
      <p style="font-size:10px;color:rgba(255,255,255,0.12);margin:0;">
        To stop nightly digests, go to Settings → Notifications.</p>
    </div>

  </div></body></html>`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const admin      = createClient(SUPABASE_URL, SERVICE_KEY)
    const cronHeader = req.headers.get('x-cron-secret')
    const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '')
    const isCron     = cronHeader === CRON_SECRET
                    || authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isManual   = !isCron

    const body = await req.json().catch(() => ({}))
    const date = body.date ?? todayIST()

    // ── Auth for manual calls ──────────────────────────────────────
    let manualUserId:     string | null = null
    let manualVerticalId: string | null = null

    if (isManual) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      const uc = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error } = await uc.auth.getUser()
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      manualUserId     = user.id
      manualVerticalId = body.verticalId ?? null
      if (!manualVerticalId) {
        return new Response(JSON.stringify({ error: 'verticalId required' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── Find sessions ──────────────────────────────────────────────
    type Row = { id: string; user_id: string; vertical_id: string; started_at: string; ended_at: string | null }

    let rows: Row[] = []

    if (isManual) {
      const { data } = await admin
        .from('chat_sessions')
        .select('id, user_id, vertical_id, started_at, ended_at')
        .eq('user_id',     manualUserId!)
        .eq('vertical_id', manualVerticalId!)
        .eq('date_ist',    date)
        .order('started_at')
      rows = (data ?? []) as Row[]
    } else {
      const { data } = await admin
        .from('chat_sessions')
        .select('id, user_id, vertical_id, started_at, ended_at')
        .eq('date_ist', date)
        .order('started_at')
      rows = (data ?? []) as Row[]
    }

    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'No sessions today' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Group by user+vertical
    const groups = new Map<string, { user_id: string; vertical_id: string; sessions: Row[] }>()
    for (const r of rows) {
      const k = `${r.user_id}::${r.vertical_id}`
      if (!groups.has(k)) groups.set(k, { user_id: r.user_id, vertical_id: r.vertical_id, sessions: [] })
      groups.get(k)!.sessions.push(r)
    }

    let sent   = 0
    const errs: string[] = []

    for (const g of groups.values()) {
      try {
        // Skip duplicates on cron
        if (isCron) {
          const { data: dup } = await admin
            .from('digest_sent_log')
            .select('id')
            .eq('user_id',     g.user_id)
            .eq('vertical_id', g.vertical_id)
            .eq('date_ist',    date)
            .maybeSingle()
          if (dup) continue
        }

        // Profile
        const { data: prof } = await admin
          .from('profiles')
          .select('full_name, email, nudge_preference')
          .eq('id', g.user_id)
          .maybeSingle()
        if (!prof?.email) continue
        if (isCron && prof.nudge_preference === false) continue

        // Vertical
        const { data: vert } = await admin
          .from('verticals')
          .select('name, emoji, slug')
          .eq('id', g.vertical_id)
          .maybeSingle()
        if (!vert) continue

        // Messages
        const { data: msgs } = await admin
          .from('session_messages')
          .select('role, content, created_at')
          .in('session_id', g.sessions.map(s => s.id))
          .in('role', ['user', 'assistant'])
          .order('created_at')
        if (!msgs?.length) continue

        const transcript = msgs
          .map(m => `${m.role === 'user' ? (prof.full_name ?? 'Student') : vert.name}: ${m.content}`)
          .join('\n')
          .slice(0, 6000)

        const digest   = await generateDigest(transcript, vert.name, prof.full_name ?? 'Student')
        const first    = g.sessions[0]
        const last     = g.sessions[g.sessions.length - 1]
        const timeRange = g.sessions.length > 1
          ? `${fmtTimeIST(first.started_at)} – ${fmtTimeIST(last.ended_at ?? last.started_at)}`
          : fmtTimeIST(first.started_at)

        const html = buildEmail({
          studentName:  prof.full_name ?? 'Student',
          saathiName:   vert.name,
          saathiEmoji:  vert.emoji,
          dateLabel:    fmtDateIST(first.started_at),
          timeRange,
          sessionCount: g.sessions.length,
          digest,
          chatUrl:      `https://edusaathiai.in/chat?saathi=${vert.slug}`,
          isManual,
        })

        await resend.emails.send({
          from:    `${vert.name} <noreply@edusaathiai.in>`,
          to:      prof.email,
          subject: `${vert.emoji} Your ${vert.name} session — ${fmtDateIST(first.started_at)}`,
          html,
        })

        await admin.from('digest_sent_log').upsert({
          user_id:     g.user_id,
          vertical_id: g.vertical_id,
          date_ist:    date,
          sent_at:     new Date().toISOString(),
          is_manual:   isManual,
        }, { onConflict: 'user_id,vertical_id,date_ist' })

        sent++
      } catch (e) {
        errs.push(`${g.user_id}::${g.vertical_id}: ${e instanceof Error ? e.message : 'error'}`)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, ...(errs.length ? { errors: errs } : {}) }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
