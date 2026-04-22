import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { renderArtifactWhatsAppText } from '@/lib/faculty-solo/artifactRenderer'
import type { SavedArtifact } from '@/lib/faculty-solo/artifactClient'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/faculty-solo/export/whatsapp
// Body: { artifact_id: string }
// Sends a plain-text WhatsApp message to the faculty's own linked wa_phone.
// WhatsApp Cloud API only permits free-form text inside a 24h "customer
// service window" — i.e. if the faculty has messaged our number recently.
// Outside that window we queue the receipt as "pending" so the UI can show
// a clear status; once T19 is approved we can upgrade to template delivery.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WHATSAPP_TOKEN     = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { artifact_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.artifact_id) return NextResponse.json({ error: 'missing_artifact_id' }, { status: 400 })

  // Fetch artifact + faculty wa_phone in parallel.
  const [artifactRes, profileRes] = await Promise.all([
    supabase
      .from('faculty_solo_artifacts')
      .select('id, faculty_user_id, saathi_slug, tool_id, title, source_url, payload_json, session_bucket_id, created_at')
      .eq('id', body.artifact_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('wa_phone, wa_linked')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!artifactRes.data) return NextResponse.json({ error: 'artifact_not_found' }, { status: 404 })
  if (!profileRes.data?.wa_phone || !profileRes.data.wa_linked) {
    return NextResponse.json({ error: 'whatsapp_not_linked' }, { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const writeReceipt = (status: 'sent' | 'pending' | 'failed', errorText: string | null) =>
    admin.from('faculty_solo_exports').insert({
      faculty_user_id: user.id,
      artifact_id:     artifactRes.data!.id,
      scope:           'artifact',
      channel:         'whatsapp',
      status,
      error:           errorText,
    })

  // If the Cloud API credentials aren't configured on this env, queue as pending.
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    await writeReceipt('pending', 'WhatsApp Cloud API not configured in this environment')
    return NextResponse.json({ status: 'pending', reason: 'not_configured' })
  }

  const text  = renderArtifactWhatsAppText(artifactRes.data as SavedArtifact)
  const phone = profileRes.data.wa_phone.replace(/^\+/, '')

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
      console.error('[faculty-solo whatsapp]', r.status, errorDetail)
    }
  } catch (e) {
    errorDetail = e instanceof Error ? e.message : 'unknown'
  }

  // Outside the 24h customer-service window, Meta returns error 131047.
  // We treat that as "pending" rather than "failed" so the UI can reassure
  // the faculty the message is queued for when T19 is approved.
  const isOutsideWindow = errorDetail?.includes('131047') || errorDetail?.toLowerCase().includes('re-engagement')

  if (sent) {
    await writeReceipt('sent', null)
    return NextResponse.json({ status: 'sent' })
  }
  if (isOutsideWindow) {
    await writeReceipt('pending', errorDetail)
    return NextResponse.json({ status: 'pending', reason: 'outside_24h_window' })
  }
  await writeReceipt('failed', errorDetail)
  return NextResponse.json({ status: 'failed', detail: errorDetail }, { status: 502 })
}
