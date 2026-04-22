import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import {
  renderSessionBundleHtml,
  renderSessionBundleWhatsAppText,
  resolveSaathiBrand,
} from '@/lib/faculty-solo/artifactRenderer'
import type { SavedArtifact } from '@/lib/faculty-solo/artifactClient'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/faculty-solo/export/session
// Body: { channel: 'email' | 'whatsapp', saathi_slug?: string }
//
// Bundles all artifacts saved today (IST) for the authenticated faculty and
// delivers them via the chosen channel. Same shared renderer as per-artifact
// exports so branding stays uniform. Writes a `scope='session'` row to
// faculty_solo_exports with the synthetic session_bucket_id = today IST date
// (YYYY-MM-DD) so the receipt reads well in the admin view.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY     = process.env.RESEND_API_KEY
const FROM_ADDRESS       = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'
const WHATSAPP_TOKEN     = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID

// Synthetic bucket id tag for session-scope exports. Stable string, not a
// UUID — keeps it readable in the DB ("session-2026-04-22") without needing
// the artifact_id column set (RLS check still enforces per-faculty scope).
function dayTagIST(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Convert today's IST midnight to an ISO timestamp suitable for DB compare.
function todayIstStartIso(): string {
  const nowIst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  nowIst.setHours(0, 0, 0, 0)
  return new Date(nowIst.getTime() - (nowIst.getTimezoneOffset() - new Date().getTimezoneOffset()) * 60_000).toISOString()
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { channel?: 'email' | 'whatsapp'; saathi_slug?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (body.channel !== 'email' && body.channel !== 'whatsapp') {
    return NextResponse.json({ error: 'invalid_channel' }, { status: 400 })
  }

  // Gather today's artifacts — optionally scoped to one Saathi so the bundle
  // stays thematically tight (matches the dock's per-Saathi basket UX).
  let q = supabase
    .from('faculty_solo_artifacts')
    .select('id, saathi_slug, tool_id, title, source_url, payload_json, session_bucket_id, created_at')
    .eq('faculty_user_id', user.id)
    .gte('created_at', todayIstStartIso())
    .order('created_at', { ascending: false })
    .limit(100)
  if (body.saathi_slug) q = q.eq('saathi_slug', body.saathi_slug)
  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed', detail: error.message }, { status: 500 })

  const artifacts = (rows ?? []) as SavedArtifact[]
  if (artifacts.length === 0) {
    return NextResponse.json({ error: 'no_artifacts_today' }, { status: 404 })
  }

  const saathiSlug = body.saathi_slug ?? artifacts[0].saathi_slug
  const bucketTag  = `session-${dayTagIST()}${body.saathi_slug ? `-${body.saathi_slug}` : ''}`

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const writeReceipt = (status: 'sent' | 'pending' | 'failed', channel: 'email' | 'whatsapp', errorText: string | null) =>
    admin.from('faculty_solo_exports').insert({
      faculty_user_id:   user.id,
      scope:             'session',
      session_bucket_id: bucketTag,
      channel,
      status,
      error:             errorText,
    })

  // ── Email delivery ──────────────────────────────────────────────────────
  if (body.channel === 'email') {
    const toEmail = user.email
    if (!toEmail)            return NextResponse.json({ error: 'no_verified_email' }, { status: 400 })
    if (!RESEND_API_KEY)     return NextResponse.json({ error: 'email_not_configured' }, { status: 500 })

    const blurb = `You saved ${artifacts.length} item${artifacts.length === 1 ? '' : 's'} to your research basket today. Here's the full set.`
    const html  = renderSessionBundleHtml(artifacts, saathiSlug, blurb)
    const { emoji, name } = resolveSaathiBrand(saathiSlug)
    const dateHuman = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const subject = `${emoji} ${name} · Today's research · ${dateHuman}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [toEmail], subject, html }),
    })

    const delivered = res.ok
    const errText   = delivered ? null : (await res.text().catch(() => '')).slice(0, 300)
    await writeReceipt(delivered ? 'sent' : 'failed', 'email', errText)

    if (!delivered) return NextResponse.json({ error: 'send_failed', detail: errText }, { status: 502 })
    return NextResponse.json({ status: 'sent', count: artifacts.length, to: toEmail })
  }

  // ── WhatsApp delivery ───────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('wa_phone, wa_linked')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.wa_phone || !profile.wa_linked) {
    return NextResponse.json({ error: 'whatsapp_not_linked' }, { status: 400 })
  }

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    await writeReceipt('pending', 'whatsapp', 'WhatsApp Cloud API not configured in this environment')
    return NextResponse.json({ status: 'pending', reason: 'not_configured', count: artifacts.length })
  }

  const text  = renderSessionBundleWhatsAppText(artifacts, saathiSlug)
  const phone = profile.wa_phone.replace(/^\+/, '')

  let sent = false
  let errorDetail: string | null = null
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:                phone,
        type:              'text',
        text:              { body: text, preview_url: true },
      }),
    })
    sent = r.ok
    if (!r.ok) {
      errorDetail = (await r.text().catch(() => '')).slice(0, 300)
    }
  } catch (e) {
    errorDetail = e instanceof Error ? e.message : 'unknown'
  }

  const isOutsideWindow = errorDetail?.includes('131047') || errorDetail?.toLowerCase().includes('re-engagement')

  if (sent) {
    await writeReceipt('sent', 'whatsapp', null)
    return NextResponse.json({ status: 'sent', count: artifacts.length })
  }
  if (isOutsideWindow) {
    await writeReceipt('pending', 'whatsapp', errorDetail)
    return NextResponse.json({ status: 'pending', reason: 'outside_24h_window', count: artifacts.length })
  }
  await writeReceipt('failed', 'whatsapp', errorDetail)
  return NextResponse.json({ status: 'failed', detail: errorDetail, count: artifacts.length }, { status: 502 })
}
