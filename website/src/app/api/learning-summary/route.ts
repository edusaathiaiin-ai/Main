import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Yesterday's Learning Summary — returns digest for logged-in user.
 * Reads from digest_sent_log (already written by send-session-digest cron).
 * Falls back to generating from student_soul.last_session_summary if no digest.
 *
 * GET /api/learning-summary
 * Returns: { found, summary, key_concepts[], homework[], saathiName, date }
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Yesterday's date in IST
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istNow = new Date(now.getTime() + istOffset)
  const yesterday = new Date(istNow.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Check digest_sent_log for yesterday's digest
  const { data: digestLog } = await admin
    .from('digest_sent_log')
    .select('id, user_id, vertical_id, digest_json, sent_at')
    .eq('user_id', user.id)
    .gte('sent_at', `${yesterdayStr}T00:00:00`)
    .lte('sent_at', `${yesterdayStr}T23:59:59`)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (digestLog?.digest_json) {
    const digest = digestLog.digest_json as Record<string, unknown>

    // Get Saathi name
    const { data: vertical } = await admin
      .from('verticals')
      .select('name, slug')
      .eq('id', digestLog.vertical_id)
      .single()

    return NextResponse.json({
      found: true,
      summary: digest.summary ?? '',
      key_concepts: digest.key_concepts ?? [],
      homework: digest.homework ?? [],
      saathiName: vertical?.name ?? '',
      saathiSlug: vertical?.slug ?? '',
      date: yesterdayStr,
    })
  }

  // Fallback: read from student_soul.last_session_summary
  const { data: profile } = await admin
    .from('profiles')
    .select('primary_saathi_id')
    .eq('id', user.id)
    .single()

  if (profile?.primary_saathi_id) {
    const { data: soul } = await admin
      .from('student_soul')
      .select('last_session_summary, top_topics, session_count')
      .eq('user_id', user.id)
      .eq('vertical_id', profile.primary_saathi_id)
      .maybeSingle()

    if (soul?.last_session_summary) {
      const { data: vertical } = await admin
        .from('verticals')
        .select('name, slug')
        .eq('id', profile.primary_saathi_id)
        .single()

      return NextResponse.json({
        found: true,
        summary: soul.last_session_summary,
        key_concepts: (soul.top_topics as string[])?.slice(0, 3) ?? [],
        homework: [],
        saathiName: vertical?.name ?? '',
        saathiSlug: vertical?.slug ?? '',
        date: yesterdayStr,
      })
    }
  }

  return NextResponse.json({ found: false })
}
