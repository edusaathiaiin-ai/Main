// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classroom/check-institution-window
//
// Phase I-2 Step 5 — pre-join gate for institution faculty classroom
// sessions. The lobby calls this once when faculty land on a session and
// renders gating UI when the response says { allowed: false }.
//
// Three response shapes:
//
//   { allowed: true }                                — caller has no
//                                                       education_institution_id
//                                                       (independent faculty,
//                                                       student, or staff
//                                                       outside the institution
//                                                       layer); no gating
//                                                       applies.
//
//   { allowed: true, minutes_remaining: N,           — caller is institution
//     minutes_used: U, minutes_budget: B }             faculty within today's
//                                                       window. UI shows the
//                                                       remaining-minutes
//                                                       hint below the Join
//                                                       button.
//
//   { allowed: false, reason: 'weekend',             — Saturday or Sunday IST.
//     message: '...' }                                 No classroom for
//                                                       institution faculty
//                                                       on weekends.
//
//   { allowed: false, reason: 'window_exhausted',    — daily budget consumed.
//     message: '...', minutes_used, minutes_budget }   UI shows the progress
//                                                       bar and "opens again
//                                                       at midnight IST".
//
// Self-healing — if the institution's daily_reset_date isn't today IST,
// reset daily_minutes_used to 0 + advance the date in a single UPDATE
// before evaluating the budget. The midnight cron is just a backup;
// reads correct themselves.
//
// Auth — requireAuth gives us the user-context client (for the profile
// read, which RLS scopes to auth.uid). The institution read + the
// self-healing UPDATE go through the service-role client because faculty
// have SELECT but not UPDATE on education_institutions.
//
// Body — { session_id?: string } accepted but not consumed today;
// reserved for future audit logging.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/requireAuth'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEFAULT_BUDGET_MINUTES = 180

function todayIstYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function dayOfWeekIst(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(new Date())
}

type ProfileRow = {
  education_institution_id:   string | null
  education_institution_role: 'principal' | 'faculty' | 'student' | null
}

type InstitutionRow = {
  id:                   string
  name:                 string
  status:               string
  daily_minutes_budget: number | null
  daily_minutes_used:   number | null
  daily_reset_date:     string | null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // Body parsing — session_id is optional and not currently used. Reserved
  // for future audit logging. Tolerate any body shape.
  try { await req.json() } catch { /* empty body is fine */ }

  // 1. Caller profile via user-context client
  const { data: profile } = await supabase
    .from('profiles')
    .select('education_institution_id, education_institution_role')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  // 2. No institution → no gating (independent faculty, students, etc.)
  if (!profile?.education_institution_id) {
    return NextResponse.json({ allowed: true })
  }

  // 3. Weekend check (IST). Saturday + Sunday → no classroom.
  const dayName = dayOfWeekIst()
  if (dayName === 'Saturday' || dayName === 'Sunday') {
    return NextResponse.json({
      allowed: false,
      reason:  'weekend',
      message: 'Classroom sessions are available on weekdays only.',
    })
  }

  // 4. Institution row + self-healing reset via service role
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: institution } = await admin
    .from('education_institutions')
    .select('id, name, status, daily_minutes_budget, daily_minutes_used, daily_reset_date')
    .eq('id', profile.education_institution_id)
    .maybeSingle<InstitutionRow>()

  if (!institution) {
    return NextResponse.json({ error: 'institution_not_found' }, { status: 404 })
  }

  // 5. Self-healing reset
  const todayIst = todayIstYmd()
  let minutesUsed = institution.daily_minutes_used ?? 0
  if (institution.daily_reset_date !== todayIst) {
    await admin
      .from('education_institutions')
      .update({
        daily_minutes_used: 0,
        daily_reset_date:   todayIst,
      })
      .eq('id', institution.id)
    minutesUsed = 0
  }

  // 6. Budget evaluation
  const minutesBudget = institution.daily_minutes_budget ?? DEFAULT_BUDGET_MINUTES

  if (minutesUsed >= minutesBudget) {
    return NextResponse.json({
      allowed:        false,
      reason:         'window_exhausted',
      message:        `Your institution's daily classroom window is full. Opens again tomorrow at midnight IST.`,
      minutes_used:   minutesUsed,
      minutes_budget: minutesBudget,
    })
  }

  return NextResponse.json({
    allowed:           true,
    minutes_remaining: Math.max(0, minutesBudget - minutesUsed),
    minutes_used:      minutesUsed,
    minutes_budget:    minutesBudget,
  })
}
