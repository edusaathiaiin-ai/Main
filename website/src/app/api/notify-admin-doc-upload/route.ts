import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/notify-admin-doc-upload
// Called when a retired faculty uploads their verification document.
// Logs the event so admin sees it in the faculty verification queue.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { userId?: string; docType?: string }
  const { userId, docType } = body

  if (!userId || userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Log to moderation_flags so admin sees it in their dashboard
  await supabase.from('moderation_flags').insert({
    flag_type: 'faculty_doc_uploaded',
    content: `Emeritus document uploaded by ${userId} — type: ${docType ?? 'unknown'}. Review in Faculty → Emeritus tab.`,
    reported_by: userId,
    resolved: false,
  })

  return NextResponse.json({ ok: true })
}
