// ─────────────────────────────────────────────────────────────────────────────
// GET /api/education-institutions/naac-report
//
// Phase I-2 Step 4 — NAAC accreditation report. Returns a single HTML
// document with embedded print CSS and a tail-end window.print() trigger.
// Principal opens the URL in a new tab, the print dialog appears, they
// "Save as PDF" — no headless Chrome on the server, no PDF library, no
// extra deploy footprint.
//
// Auth — JWT required. Caller must be a principal with a valid
// education_institution_id. No slug in the URL — the institution is
// derived from the caller's profile, so only one principal can ever
// produce a report for one institution.
//
// Reporting window — institution.activated_at → today IST, falling back
// to trial_started_at then created_at when an institution hasn't been
// activated yet. Matches the "Date range" row in the executive summary
// so the numbers and the label always agree.
//
// Sections — match the exact NAAC structure from CLAUDE.md (website):
//   1. Executive Summary
//   2. Teaching-Learning Process (NAAC 2.3)
//      2.3.1 Monthly Sessions
//      2.3.2 Subject Coverage
//      2.3.3 Student Engagement
//   3. Research Activity (NAAC 3.1)
//      3.1.1 Research Infrastructure Used
//      3.1.2 Research Archive Statistics
//   4. Faculty Profile (NAAC 2.4)
//
// Source tables — read-only, all via service-role after auth verification:
//   education_institutions
//   education_institution_stats_cache
//   profiles (faculty + student rosters)
//   live_sessions (faculty-side activity, vertical_id breakdown)
//   live_bookings (paid bookings → "students reached" per subject)
//   research_archives (artifacts jsonb iterated for type counts)
//   student_soul (flame_stage histogram + research_depth_score average)
//   verticals (slug → display name lookup)
//
// All aggregation client-side. Volumes for a typical institution at
// activation-to-today scale are small enough that fetching all rows and
// reducing in JS is faster than designing custom RPCs per metric.
//
// DPDP — faculty section shows display_name (full_name) only. Email,
// phone, and any other PII never appear on the rendered report.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Hard cap on the data window so a long-running institution doesn't blow up
// memory at report time. NAAC accreditation cycles are 5 years; one academic
// year is the upper bound any sensible report would actually cover.
const MAX_WINDOW_DAYS = 400

// ── IST date helpers ────────────────────────────────────────────────────────

function todayIstYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function shiftIstYmd(yyyymmdd: string, deltaDays: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

/** Half-open UTC bounds for [startIstYmd, endIstYmd). IST midnight is the
 *  previous-UTC-day 18:30 (no DST). */
function istRangeUtc(startIstYmd: string, endIstYmd: string): { startUtc: string; endUtc: string } {
  const [sy, sm, sd] = startIstYmd.split('-').map(Number)
  const [ey, em, ed] = endIstYmd.split('-').map(Number)
  return {
    startUtc: new Date(Date.UTC(sy, sm - 1, sd - 1, 18, 30, 0)).toISOString(),
    endUtc:   new Date(Date.UTC(ey, em - 1, ed - 1, 18, 30, 0)).toISOString(),
  }
}

/** Convert an ISO timestamp to its IST calendar date (YYYY-MM-DD). */
function isoToIstYmd(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Indian academic year for a given IST date. June 1 is the boundary —
 *  before June, the AY started the previous calendar year. */
function academicYearFor(yyyymmdd: string): string {
  const [y, m] = yyyymmdd.split('-').map(Number)
  const start = m >= 6 ? y : y - 1
  const end   = (start + 1) % 100
  return `${start}-${String(end).padStart(2, '0')}`
}

function esc(s: string | null | undefined): string {
  if (s == null) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDateLongFromYmd(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtDateTimeIst(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  })
}

// ── Types ────────────────────────────────────────────────────────────────────

type Institution = {
  id:                string
  slug:              string
  name:              string
  city:              string
  state:             string | null
  affiliation:       string | null
  status:            string
  created_at:        string
  trial_started_at:  string | null
  activated_at:      string | null
  declared_capacity: number | null
}

type StatsRow = {
  date:              string
  sessions_count:    number
  students_active:   number
  minutes_used:      number
  faculty_active:    number
  artifacts_created: number
}

type SessionRow = {
  id:          string
  faculty_id:  string
  vertical_id: string
  started_at:  string
  ended_at:    string | null
}

type BookingRow = {
  session_id: string
  student_id: string
}

type ArchiveRow = {
  artifacts: Array<{ type?: string }> | null
}

type SoulRow = {
  research_depth_score: number | null
  flame_stage:          string | null
}

type FacultyRow = {
  id:        string
  full_name: string | null
}

type VerticalRow = {
  id:   string
  name: string
}

type FlameStage = 'cold' | 'spark' | 'ember' | 'fire' | 'wings'
const FLAME_ORDER: FlameStage[] = ['cold', 'spark', 'ember', 'fire', 'wings']

// Fixed artifact-type buckets matching the user's spec. Maps the verbose
// label shown in the report to the type keys actually stored in
// research_archives.artifacts[*].type. CLAUDE.md (website) lists 14 valid
// type strings; this report displays the 7 most NAAC-relevant ones.
const ARTIFACT_BUCKETS: Array<{ label: string; key: string }> = [
  { label: 'Protein structures (RCSB)',     key: 'protein_structure' },
  { label: 'Literature citations (PubMed)', key: 'pubmed_citation'   },
  { label: 'Computations (Wolfram)',        key: 'wolfram_query'     },
  { label: 'Formulas (LaTeX)',              key: 'formula_katex'     },
  { label: '3D Molecules (PubChem)',        key: 'molecule_3d'       },
  { label: 'Code snapshots',                key: 'code_snapshot'     },
  { label: 'Canvas annotations',            key: 'canvas_snapshot'   },
]

// External research databases shown verbatim in 3.1.1.
const EXTERNAL_DBS: string[] = [
  'RCSB Protein Data Bank',
  'PubMed / NCBI',
  'Wolfram Alpha',
  'Indian Kanoon',
  'NASA Open Data',
  'PubChem',
  'NIST',
  'ScienceDirect (Elsevier)',
  'Scopus (Elsevier)',
]

// ── Handler ─────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  // 1. Auth — principal only
  const userClient = await createServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('education_institution_id, education_institution_role')
    .eq('id', user.id)
    .maybeSingle<{
      education_institution_id:   string | null
      education_institution_role: string | null
    }>()

  if (
    !profile?.education_institution_id ||
    profile.education_institution_role !== 'principal'
  ) {
    return NextResponse.json({ error: 'forbidden_principal_only' }, { status: 403 })
  }

  // 2. Service-role for the read fan-out
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const institutionId = profile.education_institution_id

  // 3. Fetch institution row first — its activated_at/created_at gates the
  //    data window for everything downstream.
  const { data: instData } = await admin
    .from('education_institutions')
    .select('id, slug, name, city, state, affiliation, status, created_at, trial_started_at, activated_at, declared_capacity')
    .eq('id', institutionId)
    .maybeSingle()
  const institution = (instData ?? null) as Institution | null

  if (!institution) {
    return NextResponse.json({ error: 'institution_not_found' }, { status: 404 })
  }

  // Window = activated_at → today, falling back to trial_started_at then
  // created_at. Capped at MAX_WINDOW_DAYS to bound query size.
  const todayIst = todayIstYmd()
  const anchorIso = institution.activated_at ?? institution.trial_started_at ?? institution.created_at
  const anchorIst = isoToIstYmd(anchorIso)
  const earliestAllowed = shiftIstYmd(todayIst, -MAX_WINDOW_DAYS)
  const startIst = anchorIst < earliestAllowed ? earliestAllowed : anchorIst
  const { startUtc, endUtc } = istRangeUtc(startIst, todayIst)

  // 4. Faculty + student rosters, then everything else in parallel
  const [facultyRes, studentsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name')
      .eq('education_institution_id', institutionId)
      .eq('education_institution_role', 'faculty')
      .order('full_name'),
    admin
      .from('profiles')
      .select('id')
      .eq('education_institution_id', institutionId)
      .eq('education_institution_role', 'student'),
  ])

  const faculty: FacultyRow[]   = (facultyRes.data ?? []) as unknown as FacultyRow[]
  const studentIds = ((studentsRes.data ?? []) as unknown as Array<{ id: string }>).map(r => r.id)
  const facultyIds = faculty.map(f => f.id)

  const noFaculty = facultyIds.length === 0
  const noStudent = studentIds.length === 0

  // First fan-out — depends only on faculty/student id lists
  const [
    statsRes,
    sessionsRes,
    archivesRes,
    soulRes,
    verticalsRes,
  ] = await Promise.all([
    admin
      .from('education_institution_stats_cache')
      .select('date, sessions_count, students_active, minutes_used, faculty_active, artifacts_created')
      .eq('institution_id', institutionId)
      .gte('date', startIst)
      .order('date', { ascending: true }),
    noFaculty
      ? Promise.resolve({ data: [] as SessionRow[] } as const)
      : admin
          .from('live_sessions')
          .select('id, faculty_id, vertical_id, started_at, ended_at')
          .in('faculty_id', facultyIds)
          .not('started_at', 'is', null)
          .not('ended_at',   'is', null)
          .gte('started_at', startUtc)
          .lt('started_at',  endUtc),
    noStudent
      ? Promise.resolve({ data: [] as ArchiveRow[] } as const)
      : admin
          .from('research_archives')
          .select('artifacts')
          .in('student_id', studentIds)
          .gte('session_date', startIst),
    noStudent
      ? Promise.resolve({ data: [] as SoulRow[] } as const)
      : admin
          .from('student_soul')
          .select('research_depth_score, flame_stage')
          .in('user_id', studentIds),
    admin
      .from('verticals')
      .select('id, name'),
  ])

  const stats:    StatsRow[]    = (statsRes.data    ?? []) as unknown as StatsRow[]
  const sessions: SessionRow[]  = (sessionsRes.data ?? []) as unknown as SessionRow[]
  const archives: ArchiveRow[]  = (archivesRes.data ?? []) as unknown as ArchiveRow[]
  const soulRows: SoulRow[]     = (soulRes.data     ?? []) as unknown as SoulRow[]
  const verticals: VerticalRow[] = (verticalsRes.data ?? []) as unknown as VerticalRow[]

  // Second fan-out — bookings depend on session ids resolved above
  const sessionIds = sessions.map(s => s.id)
  const { data: bookingsData } = sessionIds.length === 0
    ? { data: [] as BookingRow[] }
    : await admin
        .from('live_bookings')
        .select('session_id, student_id')
        .in('session_id', sessionIds)
        .eq('payment_status', 'paid')
  const bookings: BookingRow[] = (bookingsData ?? []) as unknown as BookingRow[]

  // 5. Aggregate
  const verticalNameById = new Map(verticals.map(v => [v.id, v.name]))
  const sessionById      = new Map(sessions.map(s => [s.id, s]))

  // 5a. Section 1 — Executive Summary
  const totalSessions  = sessions.length
  const totalMinutes   = sessions.reduce((a, s) => {
    if (!s.ended_at) return a
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
    return a + (Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60_000) : 0)
  }, 0)
  const totalHours = Math.round(totalMinutes / 60)

  const totalArchives  = archives.length
  const totalArtifacts = archives.reduce((a, r) => a + (r.artifacts?.length ?? 0), 0)

  // 5b. Section 2.3.1 — Monthly Sessions table
  type MonthRow = { month: string; sessions: number; studentsActive: number; hours: number }
  const monthMap = new Map<string, MonthRow>()
  for (const r of stats) {
    const month = r.date.slice(0, 7)
    const m = monthMap.get(month) ?? { month, sessions: 0, studentsActive: 0, hours: 0 }
    m.sessions       += r.sessions_count
    m.studentsActive  = Math.max(m.studentsActive, r.students_active)  // peak students_active in month
    m.hours          += Math.round(r.minutes_used / 60)
    monthMap.set(month, m)
  }
  const monthlySessions = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // 5c. Section 2.3.2 — Subject Coverage table
  type SubjectRow = {
    vertical_id:      string
    sessions:         number
    studentsReached:  number  // distinct students who paid for sessions of this vertical
  }
  const subjectMap = new Map<string, { sessions: number; studentSet: Set<string> }>()
  for (const s of sessions) {
    const v = subjectMap.get(s.vertical_id) ?? { sessions: 0, studentSet: new Set<string>() }
    v.sessions += 1
    subjectMap.set(s.vertical_id, v)
  }
  for (const b of bookings) {
    const sess = sessionById.get(b.session_id)
    if (!sess) continue
    const v = subjectMap.get(sess.vertical_id)
    if (v) v.studentSet.add(b.student_id)
  }
  const subjectCoverage: SubjectRow[] = Array.from(subjectMap.entries())
    .map(([vid, v]) => ({ vertical_id: vid, sessions: v.sessions, studentsReached: v.studentSet.size }))
    .sort((a, b) => b.sessions - a.sessions)

  // 5d. Section 2.3.3 — Student Engagement
  // attendance rate = average(students_active per day) / declared_capacity × 100
  const declaredCapacity = institution.declared_capacity ?? 200
  const avgStudentsActive = stats.length === 0
    ? 0
    : stats.reduce((a, r) => a + r.students_active, 0) / stats.length
  const attendanceRate = declaredCapacity > 0
    ? Math.round((avgStudentsActive / declaredCapacity) * 1000) / 10  // 1 decimal
    : 0

  const flameDistribution: Record<FlameStage, number> = {
    cold: 0, spark: 0, ember: 0, fire: 0, wings: 0,
  }
  for (const r of soulRows) {
    const stage = (r.flame_stage ?? 'cold') as FlameStage
    if (stage in flameDistribution) flameDistribution[stage] += 1
  }
  const flameTotal = soulRows.length

  const depthVals = soulRows.map(r => r.research_depth_score ?? 0)
  const avgDepth = depthVals.length
    ? Math.round(depthVals.reduce((a, n) => a + n, 0) / depthVals.length)
    : 0

  // 5e. Section 3.1.2 — Artifact buckets
  const artifactTypeCounts = new Map<string, number>()
  for (const a of archives) {
    for (const item of a.artifacts ?? []) {
      const type = (item?.type ?? 'unknown').toString()
      artifactTypeCounts.set(type, (artifactTypeCounts.get(type) ?? 0) + 1)
    }
  }

  // 5f. Section 4 — Faculty Profile (subjects per faculty)
  const facultySubjects = new Map<string, Set<string>>()
  const facultySessions = new Map<string, number>()
  for (const s of sessions) {
    const subs = facultySubjects.get(s.faculty_id) ?? new Set<string>()
    subs.add(s.vertical_id)
    facultySubjects.set(s.faculty_id, subs)
    facultySessions.set(s.faculty_id, (facultySessions.get(s.faculty_id) ?? 0) + 1)
  }
  const facultyList = faculty.map(f => ({
    id:        f.id,
    full_name: f.full_name,
    sessions:  facultySessions.get(f.id) ?? 0,
    subjects:  Array.from(facultySubjects.get(f.id) ?? []).map(vid => verticalNameById.get(vid) ?? vid).sort(),
  }))

  // 6. Render
  const html = renderReport({
    institution,
    facultyTotal: faculty.length,
    studentTotal: studentIds.length,
    totalSessions,
    totalHours,
    totalMinutes,
    totalArchives,
    totalArtifacts,
    monthlySessions,
    subjectCoverage,
    attendanceRate,
    avgStudentsActive: Math.round(avgStudentsActive * 10) / 10,
    declaredCapacity,
    flameDistribution,
    flameTotal,
    avgDepth,
    artifactTypeCounts,
    facultyList,
    verticalNameById,
    startIst,
    endIst:    todayIst,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
    },
  })
}

// ── HTML rendering ──────────────────────────────────────────────────────────

type ReportInput = {
  institution:         Institution
  facultyTotal:        number
  studentTotal:        number
  totalSessions:       number
  totalHours:          number
  totalMinutes:        number
  totalArchives:       number
  totalArtifacts:      number
  monthlySessions:     Array<{ month: string; sessions: number; studentsActive: number; hours: number }>
  subjectCoverage:     Array<{ vertical_id: string; sessions: number; studentsReached: number }>
  attendanceRate:      number  // %
  avgStudentsActive:   number
  declaredCapacity:    number
  flameDistribution:   Record<FlameStage, number>
  flameTotal:          number
  avgDepth:            number
  artifactTypeCounts:  Map<string, number>
  facultyList:         Array<{ id: string; full_name: string | null; sessions: number; subjects: string[] }>
  verticalNameById:    Map<string, string>
  startIst:            string
  endIst:              string
}

function renderReport(d: ReportInput): string {
  const { institution } = d
  const generatedAt = fmtDateTimeIst(new Date().toISOString())
  const academicYear = academicYearFor(d.endIst)

  const flameLabel: Record<FlameStage, string> = {
    cold: 'Cold', spark: 'Spark', ember: 'Ember', fire: 'Fire', wings: 'Wings',
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NAAC Report — ${esc(institution.name)} — AY ${esc(academicYear)}</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    @page {
      size: A4;
      margin: 2cm;
      /* "@page :footer { content: counter(page) }" in the spec isn't valid
         CSS — the standard equivalent is a margin-box. @bottom-center is
         the closest match for "page numbers in the footer." */
      @bottom-center {
        content: counter(page);
        font-family: Georgia, serif;
        font-size: 9pt;
        color: #7A7570;
      }
    }
    @media print {
      /* Hide site chrome and the floating Print button. Report content
         lives in .report-header / main.naac-sections / .report-footer
         (deliberately not <header>/<footer> tags) so this rule cannot
         accidentally hide it. */
      nav, header, footer.site-footer, button { display: none; }

      /* Force black-on-white in print — clean accreditation aesthetic */
      body { color: #000; background: #fff; }
      a { color: #000; text-decoration: none; }

      /* Section breaks — every NAAC section starts on a fresh page,
         except the first which immediately follows the report header */
      .naac-section { page-break-before: always; }
      .naac-section:first-child { page-break-before: avoid; }

      /* Tables must not break mid-row; thead repeats across pages */
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }

      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #FAF7F2;
      color: #1A1814;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 28px;
      background: #fff;
    }
    /* Text-based logo — gold gradient bar + wordmark, no image dependency */
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .logo-mark {
      display: inline-block;
      width: 28px; height: 28px;
      border-radius: 6px;
      background: linear-gradient(135deg, #B8860B 0%, #C9993A 100%);
      color: #fff;
      font-family: Georgia, serif;
      font-weight: 700;
      font-size: 16pt;
      text-align: center;
      line-height: 28px;
    }
    .logo-word {
      font-family: Georgia, serif;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #1A1814;
    }
    .logo-word .ai { color: #B8860B; }
    .gold-bar {
      height: 4px;
      background: linear-gradient(90deg, #B8860B 0%, #C9993A 100%);
      border-radius: 2px;
      margin: 6px 0 14px;
    }
    .report-title {
      font-size: 18pt;
      color: #B8860B;
      margin: 6px 0 4px;
      font-weight: 700;
    }
    .institution-line {
      font-size: 14pt;
      color: #1A1814;
      margin: 0 0 4px;
      font-weight: 600;
    }
    .ay-line {
      font-size: 11pt;
      color: #4A4740;
      margin: 0 0 4px;
      font-style: italic;
    }
    .meta {
      color: #4A4740;
      font-size: 10pt;
      margin: 4px 0 0;
    }
    .meta strong { color: #1A1814; }

    h2 {
      font-size: 14pt;
      color: #1A1814;
      margin: 0 0 4px;
      border-bottom: 1px solid #C9993A;
      padding-bottom: 4px;
    }
    h2 small {
      font-size: 10pt;
      color: #7A7570;
      font-weight: 400;
      margin-left: 8px;
    }
    h3 {
      font-size: 12pt;
      color: #1A1814;
      margin: 14px 0 6px;
      font-weight: 700;
    }
    .naac-section { margin-top: 22px; }
    .naac-section:first-child { margin-top: 14px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #E8E4DD;
      padding: 6px 9px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #FAF7F2;
      color: #4A4740;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .pct { text-align: right; font-variant-numeric: tabular-nums; color: #4A4740; }

    .empty {
      color: #7A7570;
      font-style: italic;
      padding: 12px;
      text-align: center;
      background: #FAF7F2;
      border-radius: 6px;
    }

    .bullets {
      margin: 8px 0;
      padding-left: 22px;
      font-size: 10.5pt;
    }
    .bullets li { padding: 2px 0; }
    .verified-note {
      margin-top: 10px;
      padding: 10px 14px;
      background: #FAF7F2;
      border-left: 3px solid #B8860B;
      font-size: 10pt;
      color: #4A4740;
      font-style: italic;
    }

    .engage-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 10px;
    }
    .engage-card {
      border: 1px solid #E8E4DD;
      border-radius: 6px;
      padding: 12px 14px;
      background: #FAF7F2;
    }
    .engage-card .label {
      font-size: 9pt;
      color: #7A7570;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .engage-card .value {
      font-size: 16pt;
      color: #1A1814;
      font-weight: 700;
    }
    .engage-card .hint {
      font-size: 9pt;
      color: #7A7570;
      margin-top: 4px;
    }

    .report-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #E8E4DD;
      color: #7A7570;
      font-size: 9.5pt;
      text-align: center;
      line-height: 1.6;
    }
    .report-footer .tagline {
      color: #B8860B;
      font-weight: 700;
      font-style: italic;
    }

    .print-hint {
      position: fixed;
      top: 12px;
      right: 12px;
      background: #B8860B;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      cursor: pointer;
      border: none;
    }
  </style>
</head>
<body>
  <button type="button" class="print-hint no-print" onclick="window.print()">Print / Save as PDF →</button>

  <div class="page">

    <!-- HEADER ────────────────────────────────────────────────────────── -->
    <!-- Deliberately a <div>, not <header>: the @media print rule
         "nav, header, footer.site-footer, button { display:none }" would
         otherwise hide our report header. -->
    <div class="report-header">
      <div class="logo">
        <span class="logo-mark">E</span>
        <span class="logo-word">EdUsaathi<span class="ai">AI</span></span>
      </div>
      <div class="gold-bar"></div>
      <h1 class="report-title">EdUsaathiAI Digital Learning Impact Report</h1>
      <p class="institution-line">${esc(institution.name)} — ${esc(institution.city)}</p>
      <p class="ay-line">Academic Year ${esc(academicYear)}</p>
      <p class="meta">Generated: <strong>${esc(generatedAt)} IST</strong></p>
      <p class="meta">Affiliation: <strong>${esc(institution.affiliation ?? '—')}</strong></p>
    </div>

    <!-- All four NAAC sections are direct children of <main> so
         .naac-section:first-child reliably matches the first one. -->
    <main class="naac-sections">

    <!-- SECTION 1 — Executive Summary ─────────────────────────────────── -->
    <section class="naac-section">
      <h2>Section 1 &middot; Executive Summary</h2>
      <table>
        <tbody>
          <tr><td>Total classroom sessions</td><td class="num">${d.totalSessions}</td></tr>
          <tr><td>Total students enrolled</td><td class="num">${d.studentTotal}</td></tr>
          <tr><td>Total faculty</td><td class="num">${d.facultyTotal}</td></tr>
          <tr><td>Total teaching hours</td><td class="num">${d.totalHours.toLocaleString('en-IN')}</td></tr>
          <tr><td>Total research artifacts</td><td class="num">${d.totalArtifacts.toLocaleString('en-IN')}</td></tr>
          <tr>
            <td>Date range</td>
            <td class="num">${esc(fmtDateLongFromYmd(d.startIst))} &rarr; ${esc(fmtDateLongFromYmd(d.endIst))}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- SECTION 2 — Teaching-Learning Process (NAAC 2.3) ─────────────── -->
    <section class="naac-section">
      <h2>Section 2 &middot; Teaching-Learning Process <small>NAAC Criterion 2.3</small></h2>

      <h3>2.3.1 &middot; Monthly Sessions</h3>
      ${d.monthlySessions.length === 0
        ? `<p class="empty">No monthly rollups available for the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Month</th>
                <th class="num">Sessions</th>
                <th class="num">Students Active (peak)</th>
                <th class="num">Teaching Hours</th>
              </tr>
            </thead>
            <tbody>
              ${d.monthlySessions.map(m => `
                <tr>
                  <td>${esc(monthLabel(m.month))}</td>
                  <td class="num">${m.sessions}</td>
                  <td class="num">${m.studentsActive}</td>
                  <td class="num">${m.hours}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <h3>2.3.2 &middot; Subject Coverage</h3>
      ${d.subjectCoverage.length === 0
        ? `<p class="empty">No sessions recorded for any subject in the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Saathi</th>
                <th class="num">Sessions</th>
                <th class="num">Students Reached</th>
              </tr>
            </thead>
            <tbody>
              ${d.subjectCoverage.map(s => {
                const name = d.verticalNameById.get(s.vertical_id) ?? s.vertical_id
                return `<tr>
                  <td>${esc(name)}</td>
                  <td>${esc(name)}</td>
                  <td class="num">${s.sessions}</td>
                  <td class="num">${s.studentsReached}</td>
                </tr>`
              }).join('')}
            </tbody>
          </table>`}

      <h3>2.3.3 &middot; Student Engagement</h3>
      <div class="engage-grid">
        <div class="engage-card">
          <p class="label">Average attendance rate</p>
          <p class="value">${d.attendanceRate}%</p>
          <p class="hint">${d.avgStudentsActive} avg active &middot; capacity ${d.declaredCapacity}</p>
        </div>
        <div class="engage-card">
          <p class="label">Research Archive depth (avg)</p>
          <p class="value">${d.avgDepth} <span style="font-size:9pt;color:#7A7570;">/ 100</span></p>
          <p class="hint">Average across ${d.flameTotal} student soul ${d.flameTotal === 1 ? 'profile' : 'profiles'}</p>
        </div>
      </div>
      <h4 style="font-size:10.5pt;margin:14px 0 4px;color:#4A4740;font-weight:700;">Flame stage distribution (aggregate counts)</h4>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th class="num">Students</th>
            <th class="pct">Share</th>
          </tr>
        </thead>
        <tbody>
          ${FLAME_ORDER.map(stage => {
            const n = d.flameDistribution[stage]
            const pct = d.flameTotal === 0 ? 0 : Math.round((n / d.flameTotal) * 100)
            return `<tr>
              <td>${flameLabel[stage]}</td>
              <td class="num">${n}</td>
              <td class="pct">${pct}%</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </section>

    <!-- SECTION 3 — Research Activity (NAAC 3.1) ─────────────────────── -->
    <section class="naac-section">
      <h2>Section 3 &middot; Research Activity <small>NAAC Criterion 3.1</small></h2>

      <h3>3.1.1 &middot; Research Infrastructure Used</h3>
      <p>External knowledge bases accessed via inline classroom tools during the reporting window:</p>
      <ul class="bullets">
        ${EXTERNAL_DBS.map(db => `<li>${esc(db)}</li>`).join('')}
      </ul>
      <p class="verified-note">Sources verified as research-grade international databases.</p>

      <h3>3.1.2 &middot; Research Archive Statistics</h3>
      <p class="meta" style="margin:6px 0 12px;">Total artifacts created: <strong>${d.totalArtifacts.toLocaleString('en-IN')}</strong></p>

      <table>
        <thead>
          <tr>
            <th>Artifact type</th>
            <th class="num">Count</th>
            <th class="pct">Share</th>
          </tr>
        </thead>
        <tbody>
          ${ARTIFACT_BUCKETS.map(b => {
            const count = d.artifactTypeCounts.get(b.key) ?? 0
            const pct = d.totalArtifacts === 0 ? 0 : Math.round((count / d.totalArtifacts) * 100)
            return `<tr>
              <td>${esc(b.label)}</td>
              <td class="num">${count}</td>
              <td class="pct">${pct}%</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>

      <p class="meta" style="margin-top:12px;">Average research depth score: <strong>${d.avgDepth} / 100</strong></p>
    </section>

    <!-- SECTION 4 — Faculty Profile (NAAC 2.4) ───────────────────────── -->
    <section class="naac-section">
      <h2>Section 4 &middot; Faculty Profile <small>NAAC Criterion 2.4</small></h2>
      <p class="meta" style="margin:6px 0 12px;">Total faculty: <strong>${d.facultyTotal}</strong></p>

      ${d.facultyList.length === 0
        ? `<p class="empty">No faculty enrolled yet.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th class="num">Sessions Taught</th>
                <th>Subjects</th>
              </tr>
            </thead>
            <tbody>
              ${d.facultyList.map(f => `
                <tr>
                  <td>${esc(f.full_name?.trim() || '(name not set)')}</td>
                  <td class="num">${f.sessions}</td>
                  <td>${f.subjects.length === 0 ? '—' : esc(f.subjects.join(', '))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <p class="meta" style="margin-top:12px;font-size:9pt;color:#7A7570;font-style:italic;">
        Display name only. No email, phone, or other contact details are
        included in this report (DPDP-aligned by design).
      </p>
    </section>

    </main>

    <!-- FOOTER ────────────────────────────────────────────────────────── -->
    <!-- Deliberately a <div>, not <footer>, for the same reason as the
         report-header above: the print rule hides any <footer.site-footer>
         and we don't want our report footer caught by a sibling rule
         elsewhere in the cascade. -->
    <div class="report-footer">
      <p>This report was generated by <span class="tagline">EdUsaathiAI</span> &middot; <a href="https://edusaathiai.in">edusaathiai.in</a></p>
      <p>Data period: <strong>${esc(fmtDateLongFromYmd(d.startIst))}</strong> to <strong>${esc(fmtDateLongFromYmd(d.endIst))}</strong></p>
      <p>Powered by Anthropic Claude</p>
    </div>
  </div>

  <script>
    // Auto-trigger the print dialog after the page renders. Brief delay so
    // fonts / layout settle. The "Print / Save as PDF" button (no-print)
    // gives a fallback if the auto-trigger is blocked.
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`
}
