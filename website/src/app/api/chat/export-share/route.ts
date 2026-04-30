// ─────────────────────────────────────────────────────────────────────────────
// /api/chat/export-share — uploads the chat PDF to Supabase storage and
// returns a 30-day signed URL for WhatsApp / generic-link sharing.
//
// Body: { base64Pdf: string, saathiName: string, saathiSlug: string,
//         messageCount: number, exportType: 'whatsapp' | 'pdf' }
//
// Auth: Bearer JWT.
// Bucket: 'chat-exports' — must exist + be PRIVATE. The 30-day signed URL
// is what we return; underlying file stays private. Storage RLS keeps
// listing scoped to the file's owner.
//
// Logs to exports_log for DPDP. The exportType param distinguishes a
// "share to WhatsApp" call (where the URL goes into a wa.me link) from
// a plain PDF download that also wants a hosted copy (rare; mostly the
// download path is local-only).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY         = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const BUCKET            = 'chat-exports'
const SIGNED_TTL_SEC    = 60 * 60 * 24 * 30 // 30 days
const MAX_PDF_BYTES     = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(SUPABASE_URL, ANON_KEY)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const base64Pdf    = String(body.base64Pdf    ?? '')
    const saathiName   = String(body.saathiName   ?? 'Saathi')
    const saathiSlug   = String(body.saathiSlug   ?? 'unknown')
    const messageCount = Number(body.messageCount ?? 0)
    const exportType   = body.exportType === 'whatsapp' ? 'whatsapp' : 'pdf'

    if (!base64Pdf || base64Pdf.length < 200) {
      return NextResponse.json({ error: 'pdf_missing' }, { status: 400 })
    }
    const approxBytes = (base64Pdf.length * 3) / 4
    if (approxBytes > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'pdf_too_large' }, { status: 400 })
    }

    // Decode base64 → Uint8Array for upload
    const binary = Buffer.from(base64Pdf, 'base64')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const ts    = new Date().toISOString().replace(/[:.]/g, '-')
    const path  = `${user.id}/${saathiSlug}-${ts}.pdf`

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, binary, {
        contentType: 'application/pdf',
        upsert:      false,
      })

    if (uploadErr) {
      console.error('[export-share] upload failed:', uploadErr.message)
      // Bucket missing is the common first-deploy failure; surface clearly.
      const hint = /not found|bucket/i.test(uploadErr.message)
        ? 'storage_bucket_missing'
        : 'upload_failed'
      return NextResponse.json({ error: hint }, { status: 500 })
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL_SEC)

    if (signErr || !signed?.signedUrl) {
      console.error('[export-share] sign failed:', signErr?.message)
      return NextResponse.json({ error: 'sign_failed' }, { status: 500 })
    }

    // Audit log
    await admin.from('exports_log').insert({
      user_id:       user.id,
      saathi_slug:   saathiSlug,
      export_type:   exportType,
      message_count: messageCount,
      share_url:     signed.signedUrl,
    })

    return NextResponse.json({
      success:    true,
      shareUrl:   signed.signedUrl,
      saathiName,
    })
  } catch (err) {
    console.error('[export-share] error:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
