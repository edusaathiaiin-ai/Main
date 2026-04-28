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
import { sendAdminWhatsAppText } from '@/lib/whatsapp-admin'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Phase I-2 Step 7 — capacity caps. Hard cap is 10% over the
// declared_capacity an institution self-reported. Between 100% and 110%
// the join still succeeds but the founder is notified so capacity can
// be re-negotiated; at 110% new joins are rejected outright.
const CAPACITY_BUFFER_RATIO  = 1.1
const DEFAULT_CAPACITY       = 200

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
    .select('id, name, status, declared_capacity')
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

  // ── Phase I-2 Step 7: capacity caps ────────────────────────────────────
  // Count current students linked to this institution. Service-role for
  // the count because faculty/student RLS on profiles wouldn't surface
  // peers — only admin can see the full roster.
  const { count: currentStudentsRaw } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('education_institution_id', eduInstId)
    .eq('education_institution_role', 'student')

  const currentStudents  = currentStudentsRaw ?? 0
  const declaredCapacity = inst.declared_capacity ?? DEFAULT_CAPACITY
  const hardCap          = Math.floor(declaredCapacity * CAPACITY_BUFFER_RATIO)

  // Hard cap (110%) — block.
  if (currentStudents >= hardCap) {
    return NextResponse.json(
      {
        error:   'institution_at_capacity',
        message: 'This institution has reached its student capacity. Contact your college admin.',
        contact: 'admin@edusaathiai.in',
      },
      { status: 409 },
    )
  }

  // Declared capacity (100%) — allow but notify the founder so plan
  // capacity can be re-negotiated. Fire-and-forget; a notification
  // failure must never block a student's join. The .catch swallows any
  // rejected promise that could otherwise crash the route handler.
  if (currentStudents >= declaredCapacity) {
    void sendAdminWhatsAppText(
      `⚠️ Capacity reached: ${inst.name} — ${currentStudents} of ${declaredCapacity} ` +
      `declared (joins still allowed up to ${hardCap}). Time to re-negotiate.`,
      'education-institutions/join/capacity-reached',
    ).catch(() => {})
  }

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
