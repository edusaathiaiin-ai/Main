// ─────────────────────────────────────────────────────────────────────────────
// POST /api/education-institutions/join
//
// Authenticated. Body: { education_institution_id }. Requires the target
// education institution to be in 'trial' or 'active' status. Links the
// student's profile and sets education_institution_role='student',
// education_institution_joined_at=now.
//
// Principals and faculty join via a different (admin-only) flow — this
// endpoint only self-assigns the student role.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Body = { education_institution_id?: string }

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const eduInstId = body.education_institution_id?.trim()
  if (!eduInstId) {
    return NextResponse.json({ error: 'education_institution_id_required' }, { status: 400 })
  }

  // Verify target institution exists and is in an acceptable state.
  const { data: inst } = await supabase
    .from('education_institutions')
    .select('id, name, status')
    .eq('id', eduInstId)
    .maybeSingle()
  if (!inst) {
    return NextResponse.json({ error: 'education_institution_not_found' }, { status: 404 })
  }
  if (inst.status !== 'trial' && inst.status !== 'active') {
    return NextResponse.json({ error: 'education_institution_not_open', detail: inst.status }, { status: 403 })
  }

  // Use service role to write — profiles RLS may not let the user self-mutate
  // education_institution_* fields.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      education_institution_id:                eduInstId,
      education_institution_role:              'student',
      education_institution_joined_at:         new Date().toISOString(),
      education_institution_drop_requested_at: null,
    })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json({ error: 'join_failed', detail: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
