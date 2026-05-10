import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveVerticalId } from '@/lib/resolveVerticalId'

const ROLE_TYPE = ['tech', 'non_tech', 'hybrid'] as const
const ROLE_SENIORITY = ['fresher_campus', 'fresher_offcampus', 'lateral'] as const
type RoleType = typeof ROLE_TYPE[number]
type RoleSeniority = typeof ROLE_SENIORITY[number]

type Body = {
  saathi_slug: string
  role_type: RoleType
  role_seniority: RoleSeniority
  companies: string[]
  expected_interview_date: string | null
  share_with_faculty: boolean
}

function buildSummary(b: Body): string {
  const roleLabel =
    b.role_type === 'tech' ? 'tech role' :
    b.role_type === 'non_tech' ? 'non-tech role' : 'hybrid role'
  const seniorityLabel =
    b.role_seniority === 'fresher_campus' ? 'campus fresher' :
    b.role_seniority === 'fresher_offcampus' ? 'off-campus fresher' : 'lateral'
  const companies = b.companies.length > 0 ? ` at ${b.companies.slice(0, 3).join(', ')}${b.companies.length > 3 ? ` (+${b.companies.length - 3})` : ''}` : ''
  let dateLabel = ''
  if (b.expected_interview_date) {
    const target = new Date(b.expected_interview_date)
    const days = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000))
    dateLabel = ` — interview ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`
  }
  return `${seniorityLabel} prepping for ${roleLabel}${companies}${dateLabel}`
}

function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.saathi_slug || typeof body.saathi_slug !== 'string') {
    return NextResponse.json({ error: 'missing_saathi_slug' }, { status: 400 })
  }
  if (!ROLE_TYPE.includes(body.role_type)) {
    return NextResponse.json({ error: 'invalid_role_type' }, { status: 400 })
  }
  if (!ROLE_SENIORITY.includes(body.role_seniority)) {
    return NextResponse.json({ error: 'invalid_role_seniority' }, { status: 400 })
  }

  // Sanitise companies — cap to 8, strip whitespace, drop empties, max 60 chars each.
  const companies = (Array.isArray(body.companies) ? body.companies : [])
    .map((c) => String(c).trim().slice(0, 60))
    .filter((c) => c.length > 0)
    .slice(0, 8)

  let expectedDate: string | null = null
  if (body.expected_interview_date) {
    if (!isValidDateString(body.expected_interview_date)) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    }
    expectedDate = body.expected_interview_date
  }

  const verticalId = await resolveVerticalId(body.saathi_slug, supabase)
  if (!verticalId) {
    return NextResponse.json({ error: 'unknown_saathi' }, { status: 400 })
  }

  // expires_at: 7 days after expected interview date, or 30 days from now if no date.
  const expiresAt = expectedDate
    ? new Date(new Date(expectedDate).getTime() + 7 * 86_400_000).toISOString()
    : new Date(Date.now() + 30 * 86_400_000).toISOString()

  const summary = buildSummary({ ...body, companies, expected_interview_date: expectedDate })
  const shareWithFaculty = body.share_with_faculty === true

  const { data: inserted, error: insErr } = await supabase
    .from('placement_intent')
    .insert({
      user_id: user.id,
      vertical_id: verticalId,
      role_type: body.role_type,
      role_seniority: body.role_seniority,
      companies,
      expected_interview_date: expectedDate,
      context_summary: summary,
      share_with_faculty: shareWithFaculty,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    console.error('[placement-intent] insert failed', insErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // DPDP: log every consent decision (both true and false) for audit trail.
  // Failure to log consent is non-blocking — student already got their intent.
  await supabase.from('consent_log').insert({
    user_id: user.id,
    consent_type: 'placement_context_sharing',
    consent_version: 'v1',
    accepted: shareWithFaculty,
    metadata: { placement_intent_id: inserted.id, saathi_slug: body.saathi_slug },
  })

  return NextResponse.json({ id: inserted.id, summary })
}
