import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { renderArtifactEmailHtml, resolveSaathiBrand } from '@/lib/faculty-solo/artifactRenderer'
import type { SavedArtifact } from '@/lib/faculty-solo/artifactClient'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/faculty-solo/export/email
// Body: { artifact_id: string }
// Fetches the artifact (ownership enforced by RLS), renders a Saathi-branded
// HTML email, and delivers to the faculty's own verified address via Resend.
// Writes a row to faculty_solo_exports so the UI can show "✓ Sent".
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY
const FROM_ADDRESS     = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { artifact_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.artifact_id) return NextResponse.json({ error: 'missing_artifact_id' }, { status: 400 })

  // Fetch artifact — RLS ensures faculty can only read their own rows.
  const { data: artifact, error: fetchErr } = await supabase
    .from('faculty_solo_artifacts')
    .select('id, faculty_user_id, saathi_slug, tool_id, title, source_url, payload_json, session_bucket_id, created_at')
    .eq('id', body.artifact_id)
    .maybeSingle()
  if (fetchErr || !artifact) {
    return NextResponse.json({ error: 'artifact_not_found' }, { status: 404 })
  }

  // Faculty's own email — from auth.user (it's the verified primary).
  const toEmail = user.email
  if (!toEmail) {
    return NextResponse.json({ error: 'no_verified_email' }, { status: 400 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'email_not_configured' }, { status: 500 })
  }

  const html = renderArtifactEmailHtml(artifact as SavedArtifact, 'You saved this to your research basket.')
  const { emoji, name } = resolveSaathiBrand(artifact.saathi_slug)
  const subject = `${emoji} ${name} · ${artifact.title ?? artifact.tool_id}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_ADDRESS,
      to:      [toEmail],
      subject,
      html,
    }),
  })

  const delivered = res.ok
  let errorText: string | null = null
  if (!delivered) {
    errorText = (await res.text().catch(() => '')).slice(0, 300)
    console.error('[faculty-solo email] Resend error', res.status, errorText)
  }

  // Write export receipt regardless — pending status lets us retry later.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await admin.from('faculty_solo_exports').insert({
    faculty_user_id: user.id,
    artifact_id:     artifact.id,
    scope:           'artifact',
    channel:         'email',
    status:          delivered ? 'sent' : 'failed',
    error:           errorText,
  })

  if (!delivered) {
    return NextResponse.json({ error: 'send_failed', detail: errorText }, { status: 502 })
  }

  return NextResponse.json({ status: 'sent', to: toEmail })
}
