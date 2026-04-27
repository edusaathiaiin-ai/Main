/**
 * supabase/functions/refresh-institution-stats/index.ts
 *
 * Daily cron writer for education_institution_stats_cache.
 *
 * For each education_institution with status IN ('trial', 'active'), aggregates
 * yesterday's (IST) activity into a single row keyed (institution_id, date).
 * Idempotent — safe to re-run for the same date; UPSERT on (institution_id, date).
 *
 * Metrics — all anchored on live_sessions.started_at (IST yesterday) so they
 * stay internally consistent. The principal-dashboard view of "yesterday" is
 * teaching activity, not commerce; seat-booking volume belongs in the billing
 * panel and is intentionally not aggregated here.
 *
 *   sessions_count    — completed sessions (started_at + ended_at both set)
 *                       run by faculty of this institution, yesterday IST
 *   students_active   — DISTINCT chat_sessions.user_id where quota_date_ist =
 *                       yesterday IST AND user is a student of this institution
 *   minutes_used      — Σ (ended_at - started_at) for the same session set
 *   faculty_active    — DISTINCT faculty_id from the same session set
 *   artifacts_created — research_archives rows authored yesterday IST by
 *                       students of this institution
 *   top_saathis       — top 5 vertical_id values from the session set, as
 *                       jsonb [{slug, sessions}] sorted desc
 *
 * Auth: x-cron-secret header matching CRON_SECRET, OR Authorization: Bearer
 * <SUPABASE_SERVICE_ROLE_KEY>. Same pattern as education-institution-trial-check
 * and weekly-eval.
 *
 * Per-institution try/catch — one failing aggregation does not stop the rest;
 * the response body lists which institutions failed and why.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/* ── IST date helpers ─────────────────────────────────────────────────────── */

/** YYYY-MM-DD for "yesterday" in IST. Cron typically fires at 1 AM IST so this
 *  resolves to the previous calendar day in IST. */
function yesterdayIST(): string {
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [y, m, d] = todayIST.split('-').map(Number);
  const yest = new Date(Date.UTC(y, m - 1, d));
  yest.setUTCDate(yest.getUTCDate() - 1);
  return yest.toISOString().slice(0, 10);
}

/** Translate "YYYY-MM-DD in IST" into half-open UTC bounds [startUtc, endUtc).
 *  IST is UTC+5:30 with no DST, so IST midnight = previous-UTC-day 18:30. */
function istDayBoundsUtc(yyyymmdd: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d - 1, 18, 30, 0)).toISOString();
  const endUtc   = new Date(Date.UTC(y, m - 1, d,     18, 30, 0)).toISOString();
  return { startUtc, endUtc };
}

/* ── Types ────────────────────────────────────────────────────────────────── */

type EducationInstitutionRow = { id: string; name: string };

type Stats = {
  sessions_count:    number;
  students_active:   number;
  minutes_used:      number;
  faculty_active:    number;
  artifacts_created: number;
  top_saathis:       Array<{ slug: string; sessions: number }>;
};

type AdminClient = ReturnType<typeof createClient>;

/* ── Per-institution aggregation ──────────────────────────────────────────── */

async function computeStatsForInstitution(
  admin:          AdminClient,
  institutionId:  string,
  yesterdayIst:   string,
  startUtc:       string,
  endUtc:         string,
): Promise<Stats> {
  // 1. Resolve institution membership in one query, split client-side.
  const { data: members, error: memberErr } = await admin
    .from('profiles')
    .select('id, education_institution_role')
    .eq('education_institution_id', institutionId)
    .in('education_institution_role', ['faculty', 'student']);

  if (memberErr) throw new Error(`fetch members: ${memberErr.message}`);

  type MemberRow = { id: string; education_institution_role: 'faculty' | 'student' };
  const facultyIds: string[] = [];
  const studentIds: string[] = [];
  for (const row of (members ?? []) as MemberRow[]) {
    if (row.education_institution_role === 'faculty') facultyIds.push(row.id);
    else if (row.education_institution_role === 'student') studentIds.push(row.id);
  }

  // 2. Fan out the 6 metric queries in parallel. Empty member arrays short-circuit
  //    to zero-valued results without hitting PostgREST (which rejects empty IN()).
  const noFaculty = facultyIds.length === 0;
  const noStudent = studentIds.length === 0;

  const sessionsBaseFilter = (
    q: ReturnType<AdminClient['from']>['select'] extends never ? never : ReturnType<ReturnType<AdminClient['from']>['select']>
  ) => q
    // @ts-ignore — PostgREST builder chaining is loose-typed
    .in('faculty_id', facultyIds)
    .not('started_at', 'is', null)
    .not('ended_at',   'is', null)
    .gte('started_at', startUtc)
    .lt('started_at',  endUtc);

  const [
    sessionsCountResult,
    studentsActiveResult,
    sessionsForMinutes,
    sessionsForFaculty,
    artifactsResult,
    sessionsForTopSaathis,
  ] = await Promise.all([
    // (1) sessions_count — completed sessions only
    noFaculty
      ? Promise.resolve({ count: 0, error: null } as const)
      : sessionsBaseFilter(
          admin.from('live_sessions').select('*', { count: 'exact', head: true })
        ),

    // (2) students_active — DISTINCT user_id over chat_sessions yesterday
    noStudent
      ? Promise.resolve({ data: [] as Array<{ user_id: string }>, error: null } as const)
      : admin.from('chat_sessions')
          .select('user_id')
          .in('user_id', studentIds)
          .eq('quota_date_ist', yesterdayIst),

    // (3) sessions for minutes_used — fetch start/end times to sum durations
    noFaculty
      ? Promise.resolve({ data: [] as Array<{ started_at: string; ended_at: string }>, error: null } as const)
      : sessionsBaseFilter(
          admin.from('live_sessions').select('started_at, ended_at')
        ),

    // (4) faculty_active — DISTINCT faculty_id over the session set
    noFaculty
      ? Promise.resolve({ data: [] as Array<{ faculty_id: string }>, error: null } as const)
      : sessionsBaseFilter(
          admin.from('live_sessions').select('faculty_id')
        ),

    // (5) artifacts_created — research_archives by institution students
    noStudent
      ? Promise.resolve({ count: 0, error: null } as const)
      : admin.from('research_archives')
          .select('*', { count: 'exact', head: true })
          .in('student_id', studentIds)
          .eq('session_date', yesterdayIst),

    // (6) top_saathis — vertical_id (holds the slug) for ranking
    noFaculty
      ? Promise.resolve({ data: [] as Array<{ vertical_id: string }>, error: null } as const)
      : sessionsBaseFilter(
          admin.from('live_sessions').select('vertical_id')
        ),
  ]);

  // Surface the first error encountered — caller wraps in try/catch per institution.
  for (const r of [
    sessionsCountResult, studentsActiveResult, sessionsForMinutes,
    sessionsForFaculty, artifactsResult, sessionsForTopSaathis,
  ]) {
    if (r.error) throw new Error(`metric query: ${r.error.message}`);
  }

  // Reduce raw rows → metric values
  const sessions_count = sessionsCountResult.count ?? 0;

  const students_active = new Set(
    (studentsActiveResult.data ?? []).map((r) => r.user_id),
  ).size;

  let minutes_used = 0;
  for (const row of (sessionsForMinutes.data ?? [])) {
    const start = new Date(row.started_at).getTime();
    const end   = new Date(row.ended_at).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      minutes_used += Math.round((end - start) / 60_000);
    }
  }

  const faculty_active = new Set(
    (sessionsForFaculty.data ?? []).map((r) => r.faculty_id),
  ).size;

  const artifacts_created = artifactsResult.count ?? 0;

  const slugCounts: Record<string, number> = {};
  for (const r of (sessionsForTopSaathis.data ?? [])) {
    if (!r.vertical_id) continue;
    slugCounts[r.vertical_id] = (slugCounts[r.vertical_id] ?? 0) + 1;
  }
  const top_saathis = Object.entries(slugCounts)
    .map(([slug, sessions]) => ({ slug, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  return {
    sessions_count,
    students_active,
    minutes_used,
    faculty_active,
    artifacts_created,
    top_saathis,
  };
}

/* ── Handler ──────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '');
  const isAuthed   = (CRON_SECRET && cronSecret === CRON_SECRET)
                  || (authBearer === SUPABASE_SERVICE_ROLE_KEY);
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const yesterdayIst = yesterdayIST();
    const { startUtc, endUtc } = istDayBoundsUtc(yesterdayIst);

    const { data: institutions, error: instErr } = await admin
      .from('education_institutions')
      .select('id, name')
      .in('status', ['trial', 'active']);

    if (instErr) throw new Error(`fetch institutions: ${instErr.message}`);

    type Result = { institution_id: string; name: string; ok: boolean; error?: string };
    const results: Result[] = [];

    // Sequential per-institution loop — keeps logs readable and avoids
    // stampeding the DB on a daily cron with rare (non-blocking) failures.
    for (const inst of (institutions ?? []) as EducationInstitutionRow[]) {
      try {
        const stats = await computeStatsForInstitution(
          admin, inst.id, yesterdayIst, startUtc, endUtc,
        );

        const { error: upsertErr } = await admin
          .from('education_institution_stats_cache')
          .upsert(
            {
              institution_id: inst.id,
              date:           yesterdayIst,
              ...stats,
              updated_at:     new Date().toISOString(),
            },
            { onConflict: 'institution_id,date' },
          );

        if (upsertErr) throw new Error(`upsert: ${upsertErr.message}`);

        results.push({ institution_id: inst.id, name: inst.name, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.warn(`[refresh-institution-stats] ${inst.name} (${inst.id}) failed:`, msg);
        results.push({ institution_id: inst.id, name: inst.name, ok: false, error: msg });
      }
    }

    const okCount   = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;

    return new Response(
      JSON.stringify({
        success:             true,
        date:                yesterdayIst,
        institutions_total:  results.length,
        institutions_ok:     okCount,
        institutions_failed: failCount,
        // Surface per-row detail only when something failed — clean log on success.
        results: failCount > 0 ? results : undefined,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[refresh-institution-stats] Fatal:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
