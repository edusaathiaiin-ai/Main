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
// Reporting window — last 90 days IST (sliding). Standard for NAAC
// internal-quality assessment cycles, long enough to smooth daily noise.
//
// Sections — match CLAUDE.md website spec exactly:
//   1. Executive Summary
//   2. Teaching-Learning Process (NAAC Criterion 2.3)
//   3. Research Activity (NAAC Criterion 3.1)
//   4. Faculty Profile (NAAC Criterion 2.4)
//
// Source tables — read-only, all via service-role after auth verification:
//   education_institutions
//   education_institution_stats_cache (90 days)
//   profiles (faculty + student rosters)
//   research_archives (artifacts jsonb iterated for type counts)
//   student_soul (research_depth_score average)
//   live_sessions (faculty-side activity, vertical_id breakdown)
//   verticals (slug → display name lookup)
//
// All aggregation client-side in this handler. Volumes for a typical
// institution at 90 days are small enough that fetching all rows and
// reducing in JS is faster than designing a custom RPC per metric.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const REPORT_WINDOW_DAYS = 90

// ── IST date helpers (mirror the principal dashboard's logic) ────────────────

function todayIstYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function shiftIstYmd(yyyymmdd: string, deltaDays: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

/** Half-open UTC bounds for [startIstYmd, endIstYmd) — IST midnight is
 *  previous-UTC-day 18:30 (no DST). Used to filter live_sessions.started_at. */
function istRangeUtc(startIstYmd: string, endIstYmd: string): { startUtc: string; endUtc: string } {
  const [sy, sm, sd] = startIstYmd.split('-').map(Number)
  const [ey, em, ed] = endIstYmd.split('-').map(Number)
  return {
    startUtc: new Date(Date.UTC(sy, sm - 1, sd - 1, 18, 30, 0)).toISOString(),
    endUtc:   new Date(Date.UTC(ey, em - 1, ed - 1, 18, 30, 0)).toISOString(),
  }
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

function fmtDateLong(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

function fmtDateTimeIst(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
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
  faculty_id:  string
  vertical_id: string
  started_at:  string
  ended_at:    string | null
}

type ArchiveRow = {
  artifacts: Array<{ type?: string }> | null
}

type FacultyRow = {
  id:        string
  full_name: string | null
}

type VerticalRow = {
  id:   string
  name: string
}

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

  // 2. Service-role for the privileged read fan-out
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const todayIst    = todayIstYmd()
  const startIst    = shiftIstYmd(todayIst, -REPORT_WINDOW_DAYS)
  const { startUtc, endUtc } = istRangeUtc(startIst, todayIst)

  // 3. Institution row + faculty + student rosters in parallel
  const institutionId = profile.education_institution_id

  const [
    instRes,
    facultyRes,
    studentsRes,
  ] = await Promise.all([
    admin
      .from('education_institutions')
      .select('id, slug, name, city, state, affiliation, status, activated_at, declared_capacity')
      .eq('id', institutionId)
      .maybeSingle(),
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

  const institution = (instRes.data ?? null) as Institution | null
  if (!institution) {
    return NextResponse.json({ error: 'institution_not_found' }, { status: 404 })
  }

  const faculty: FacultyRow[] = (facultyRes.data ?? []) as unknown as FacultyRow[]
  const studentIds = ((studentsRes.data ?? []) as unknown as Array<{ id: string }>).map(r => r.id)
  const facultyIds = faculty.map(f => f.id)

  // 4. Stats cache, sessions, archives, soul, verticals — all in parallel
  const noFaculty = facultyIds.length === 0
  const noStudent = studentIds.length === 0

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
          .select('faculty_id, vertical_id, started_at, ended_at')
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
      ? Promise.resolve({ data: [] as Array<{ research_depth_score: number | null }> } as const)
      : admin
          .from('student_soul')
          .select('research_depth_score')
          .in('user_id', studentIds),
    admin
      .from('verticals')
      .select('id, name'),
  ])

  const stats:    StatsRow[]    = (statsRes.data    ?? []) as unknown as StatsRow[]
  const sessions: SessionRow[]  = (sessionsRes.data ?? []) as unknown as SessionRow[]
  const archives: ArchiveRow[]  = (archivesRes.data ?? []) as unknown as ArchiveRow[]
  const soulRows                = (soulRes.data     ?? []) as unknown as Array<{ research_depth_score: number | null }>
  const verticals: VerticalRow[] = (verticalsRes.data ?? []) as unknown as VerticalRow[]

  // 5. Aggregate
  const verticalNameById = new Map(verticals.map(v => [v.id, v.name]))

  // 5a. Executive summary totals
  const totalSessions  = stats.reduce((a, r) => a + r.sessions_count,    0)
  const totalMinutes   = stats.reduce((a, r) => a + r.minutes_used,      0)
  const totalArtifacts = stats.reduce((a, r) => a + r.artifacts_created, 0)
  const totalHours     = Math.round(totalMinutes / 60)

  const peakStudentsActive = stats.reduce((a, r) => Math.max(a, r.students_active), 0)
  const peakFacultyActive  = stats.reduce((a, r) => Math.max(a, r.faculty_active),  0)

  // 5b. Monthly rollup of stats_cache
  type MonthRow = {
    month: string  // 'YYYY-MM'
    sessions: number
    minutes:  number
    artifacts: number
  }
  const monthMap = new Map<string, MonthRow>()
  for (const r of stats) {
    const month = r.date.slice(0, 7)
    const m = monthMap.get(month) ?? { month, sessions: 0, minutes: 0, artifacts: 0 }
    m.sessions  += r.sessions_count
    m.minutes   += r.minutes_used
    m.artifacts += r.artifacts_created
    monthMap.set(month, m)
  }
  const monthlyRollup = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // 5c. Subject breakdown (sessions per vertical) + sessions per (vertical × month)
  type SubjectRow = { vertical_id: string; sessions: number; minutes: number }
  const subjectMap = new Map<string, SubjectRow>()
  type SubjectMonthKey = string  // 'vertical_id|month'
  const subjectMonthMap = new Map<SubjectMonthKey, number>()

  // Sessions per faculty
  const facultySessionCounts = new Map<string, number>()

  for (const s of sessions) {
    const subj = subjectMap.get(s.vertical_id) ?? { vertical_id: s.vertical_id, sessions: 0, minutes: 0 }
    subj.sessions += 1
    if (s.ended_at) {
      const dur = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000
      if (Number.isFinite(dur) && dur > 0) subj.minutes += Math.round(dur)
    }
    subjectMap.set(s.vertical_id, subj)

    const monthKey = s.started_at.slice(0, 7)  // ISO is UTC; close enough for monthly bucket
    const k: SubjectMonthKey = `${s.vertical_id}|${monthKey}`
    subjectMonthMap.set(k, (subjectMonthMap.get(k) ?? 0) + 1)

    facultySessionCounts.set(s.faculty_id, (facultySessionCounts.get(s.faculty_id) ?? 0) + 1)
  }
  const subjectBreakdown = Array.from(subjectMap.values()).sort((a, b) => b.sessions - a.sessions)

  // 5d. Artifact type histogram across all archives in window
  const artifactTypeCounts = new Map<string, number>()
  let totalArtifactObjects = 0
  for (const a of archives) {
    const arr = a.artifacts ?? []
    for (const item of arr) {
      const type = (item?.type ?? 'unknown').toString()
      artifactTypeCounts.set(type, (artifactTypeCounts.get(type) ?? 0) + 1)
      totalArtifactObjects += 1
    }
  }
  const artifactByType = Array.from(artifactTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // 5e. Average research depth (across all student_soul rows in scope)
  const depthVals = soulRows.map(r => r.research_depth_score ?? 0)
  const avgDepth = depthVals.length
    ? Math.round(depthVals.reduce((a, n) => a + n, 0) / depthVals.length)
    : 0

  // 6. Render the HTML report
  const html = renderReport({
    institution,
    facultyTotal:  faculty.length,
    studentTotal:  studentIds.length,
    totalSessions,
    totalHours,
    totalMinutes,
    totalArtifacts,
    totalArtifactObjects,
    peakStudentsActive,
    peakFacultyActive,
    avgDepth,
    monthlyRollup,
    subjectBreakdown,
    subjectMonthMap,
    artifactByType,
    facultyList: faculty.map(f => ({
      id:        f.id,
      full_name: f.full_name,
      sessions:  facultySessionCounts.get(f.id) ?? 0,
    })),
    verticalNameById,
    startIst,
    endIst:    todayIst,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Don't cache — every load reflects fresh data.
      'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
    },
  })
}

// ── HTML rendering ──────────────────────────────────────────────────────────

type ReportInput = {
  institution:           Institution
  facultyTotal:          number
  studentTotal:          number
  totalSessions:         number
  totalHours:            number
  totalMinutes:          number
  totalArtifacts:        number
  totalArtifactObjects:  number
  peakStudentsActive:    number
  peakFacultyActive:     number
  avgDepth:              number
  monthlyRollup:         Array<{ month: string; sessions: number; minutes: number; artifacts: number }>
  subjectBreakdown:      Array<{ vertical_id: string; sessions: number; minutes: number }>
  subjectMonthMap:       Map<string, number>
  artifactByType:        Array<{ type: string; count: number }>
  facultyList:           Array<{ id: string; full_name: string | null; sessions: number }>
  verticalNameById:      Map<string, string>
  startIst:              string
  endIst:                string
}

function renderReport(d: ReportInput): string {
  const { institution } = d

  // Months involved (for column headers in subject × month table)
  const allMonths = Array.from(new Set(d.monthlyRollup.map(m => m.month))).sort()
  const monthLabel = (yyyymm: string) => {
    const [y, m] = yyyymm.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  const generatedAt = fmtDateTimeIst(new Date().toISOString())

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NAAC Report — ${esc(institution.name)}</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm;
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .section { page-break-before: always; }
      .section.first { page-break-before: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
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
    .gold-bar {
      height: 4px;
      background: linear-gradient(90deg, #B8860B 0%, #C9993A 100%);
      border-radius: 2px;
      margin-bottom: 14px;
    }
    .report-title {
      font-size: 18pt;
      color: #B8860B;
      margin: 0 0 4px;
      font-weight: 700;
    }
    .report-subtitle {
      font-size: 13pt;
      color: #1A1814;
      margin: 0 0 6px;
      font-weight: 600;
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
    .section {
      margin-top: 22px;
    }
    .section.first { margin-top: 18px; }
    .lede {
      color: #4A4740;
      font-size: 10pt;
      margin: 8px 0 12px;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
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
    .totals {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 14px 0 18px;
    }
    .totals .cell {
      border: 1px solid #E8E4DD;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FAF7F2;
    }
    .totals .label {
      font-size: 8pt;
      color: #7A7570;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 700;
    }
    .totals .value {
      font-size: 16pt;
      color: #1A1814;
      font-weight: 700;
      margin-top: 2px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #E8E4DD;
      color: #7A7570;
      font-size: 9pt;
      text-align: center;
    }
    .footer .tagline {
      color: #B8860B;
      font-weight: 700;
      font-style: italic;
    }
    .empty {
      color: #7A7570;
      font-style: italic;
      padding: 12px;
      text-align: center;
      background: #FAF7F2;
      border-radius: 6px;
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

    <header>
      <div class="gold-bar"></div>
      <h1 class="report-title">EdUsaathiAI Digital Learning Impact Report</h1>
      <p class="report-subtitle">${esc(institution.name)} — Reporting Period ${esc(d.startIst)} to ${esc(d.endIst)}</p>
      <p class="meta">
        <strong>${esc(institution.city)}</strong>${institution.state ? ', ' + esc(institution.state) : ''}${institution.affiliation ? ' &middot; ' + esc(institution.affiliation) : ''}
      </p>
      <p class="meta">
        Activated: <strong>${esc(fmtDateLong(institution.activated_at))}</strong>
        &middot; Status: <strong>${esc(institution.status)}</strong>
        ${institution.declared_capacity != null ? `&middot; Declared capacity: <strong>${institution.declared_capacity}</strong>` : ''}
      </p>
      <p class="meta">Generated: <strong>${esc(generatedAt)} IST</strong></p>
    </header>

    <!-- Section 1 — Executive Summary -->
    <section class="section first">
      <h2>1. Executive Summary</h2>
      <p class="lede">Aggregate teaching, learning, and research activity over the past ${REPORT_WINDOW_DAYS} days.</p>

      <div class="totals">
        <div class="cell">
          <div class="label">Total Sessions</div>
          <div class="value">${d.totalSessions}</div>
        </div>
        <div class="cell">
          <div class="label">Total Hours Taught</div>
          <div class="value">${d.totalHours}</div>
        </div>
        <div class="cell">
          <div class="label">Students Enrolled</div>
          <div class="value">${d.studentTotal}</div>
        </div>
        <div class="cell">
          <div class="label">Faculty Active on Platform</div>
          <div class="value">${d.facultyTotal}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Metric</th><th class="num">Last ${REPORT_WINDOW_DAYS} Days</th></tr>
        </thead>
        <tbody>
          <tr><td>Total faculty-led sessions</td><td class="num">${d.totalSessions}</td></tr>
          <tr><td>Total minutes of teaching</td><td class="num">${d.totalMinutes.toLocaleString('en-IN')}</td></tr>
          <tr><td>Peak students active in a single day</td><td class="num">${d.peakStudentsActive}</td></tr>
          <tr><td>Peak faculty active in a single day</td><td class="num">${d.peakFacultyActive}</td></tr>
          <tr><td>Research artifacts created</td><td class="num">${d.totalArtifactObjects.toLocaleString('en-IN')}</td></tr>
          <tr><td>Research archives (sessions captured)</td><td class="num">${d.totalArtifacts}</td></tr>
        </tbody>
      </table>
    </section>

    <!-- Section 2 — Teaching-Learning Process (NAAC 2.3) -->
    <section class="section">
      <h2>2. Teaching-Learning Process <small>NAAC Criterion 2.3</small></h2>
      <p class="lede">Pedagogic activity broken down by subject and month, with engagement signals.</p>

      <h3 style="font-size:11pt;margin:14px 0 4px;">2.1 Sessions per subject</h3>
      ${d.subjectBreakdown.length === 0
        ? `<p class="empty">No sessions recorded in the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Subject (Saathi)</th>
                <th class="num">Sessions</th>
                <th class="num">Minutes</th>
                <th class="num">Avg. session length</th>
              </tr>
            </thead>
            <tbody>
              ${d.subjectBreakdown.map(s => `
                <tr>
                  <td>${esc(d.verticalNameById.get(s.vertical_id) ?? s.vertical_id)}</td>
                  <td class="num">${s.sessions}</td>
                  <td class="num">${s.minutes.toLocaleString('en-IN')}</td>
                  <td class="num">${s.sessions ? Math.round(s.minutes / s.sessions) : 0} min</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <h3 style="font-size:11pt;margin:18px 0 4px;">2.2 Sessions per subject per month</h3>
      ${(d.subjectBreakdown.length === 0 || allMonths.length === 0)
        ? `<p class="empty">No sessions recorded in the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Subject</th>
                ${allMonths.map(m => `<th class="num">${esc(monthLabel(m))}</th>`).join('')}
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              ${d.subjectBreakdown.map(s => {
                const cells = allMonths.map(m => d.subjectMonthMap.get(`${s.vertical_id}|${m}`) ?? 0)
                const total = cells.reduce((a, n) => a + n, 0)
                return `<tr>
                  <td>${esc(d.verticalNameById.get(s.vertical_id) ?? s.vertical_id)}</td>
                  ${cells.map(n => `<td class="num">${n}</td>`).join('')}
                  <td class="num"><strong>${total}</strong></td>
                </tr>`
              }).join('')}
            </tbody>
          </table>`}

      <h3 style="font-size:11pt;margin:18px 0 4px;">2.3 Monthly activity rollup</h3>
      ${d.monthlyRollup.length === 0
        ? `<p class="empty">No daily rollups available for the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Month</th>
                <th class="num">Sessions</th>
                <th class="num">Minutes</th>
                <th class="num">Research Artifacts</th>
              </tr>
            </thead>
            <tbody>
              ${d.monthlyRollup.map(m => `
                <tr>
                  <td>${esc(monthLabel(m.month))}</td>
                  <td class="num">${m.sessions}</td>
                  <td class="num">${m.minutes.toLocaleString('en-IN')}</td>
                  <td class="num">${m.artifacts}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
    </section>

    <!-- Section 3 — Research Activity (NAAC 3.1) -->
    <section class="section">
      <h2>3. Research Activity <small>NAAC Criterion 3.1</small></h2>
      <p class="lede">Permanent research artifacts created during teaching sessions, plus aggregate engagement depth.</p>

      <div class="totals">
        <div class="cell">
          <div class="label">Research Archives</div>
          <div class="value">${d.totalArtifacts}</div>
        </div>
        <div class="cell">
          <div class="label">Total Artifacts Captured</div>
          <div class="value">${d.totalArtifactObjects}</div>
        </div>
        <div class="cell">
          <div class="label">Avg. Research Depth</div>
          <div class="value">${d.avgDepth}<span style="font-size:9pt;color:#7A7570;"> / 100</span></div>
        </div>
        <div class="cell">
          <div class="label">Distinct Artifact Types</div>
          <div class="value">${d.artifactByType.length}</div>
        </div>
      </div>

      <h3 style="font-size:11pt;margin:14px 0 4px;">3.1 Artifacts captured by source / type</h3>
      ${d.artifactByType.length === 0
        ? `<p class="empty">No artifacts captured in the reporting window.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Artifact type</th>
                <th class="num">Count</th>
                <th class="num">Share</th>
              </tr>
            </thead>
            <tbody>
              ${d.artifactByType.map(a => `
                <tr>
                  <td>${esc(a.type)}</td>
                  <td class="num">${a.count}</td>
                  <td class="num">${d.totalArtifactObjects ? Math.round((a.count / d.totalArtifactObjects) * 100) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <p class="meta" style="margin-top:14px;">
        External knowledge bases accessed via inline tools: PubMed, RCSB Protein Data Bank, Wolfram Alpha,
        Indian Kanoon, NASA, PubChem, NIST, ChemSpider, ScienceDirect, Scopus, Bhuvan (ISRO).
      </p>
    </section>

    <!-- Section 4 — Faculty Profile (NAAC 2.4) -->
    <section class="section">
      <h2>4. Faculty Profile <small>NAAC Criterion 2.4</small></h2>
      <p class="lede">Faculty active on the platform during the reporting window with their session counts.</p>

      <div class="totals">
        <div class="cell">
          <div class="label">Faculty enrolled</div>
          <div class="value">${d.facultyTotal}</div>
        </div>
        <div class="cell">
          <div class="label">Faculty active in window</div>
          <div class="value">${d.facultyList.filter(f => f.sessions > 0).length}</div>
        </div>
        <div class="cell">
          <div class="label">Subjects covered</div>
          <div class="value">${d.subjectBreakdown.length}</div>
        </div>
        <div class="cell">
          <div class="label">Sessions per active faculty</div>
          <div class="value">${(() => {
            const active = d.facultyList.filter(f => f.sessions > 0)
            return active.length ? Math.round(d.totalSessions / active.length) : 0
          })()}</div>
        </div>
      </div>

      ${d.facultyList.length === 0
        ? `<p class="empty">No faculty enrolled yet.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th class="num">Sessions taught (last ${REPORT_WINDOW_DAYS}d)</th>
              </tr>
            </thead>
            <tbody>
              ${d.facultyList.map(f => `
                <tr>
                  <td>${esc(f.full_name?.trim() || '(name not set)')}</td>
                  <td class="num">${f.sessions}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
    </section>

    <footer class="footer">
      <p>Data generated by <span class="tagline">EdUsaathiAI</span> &middot; <a href="https://edusaathiai.in" style="color:#7A7570;text-decoration:none;">edusaathiai.in</a> &middot; Powered by Anthropic Claude</p>
      <p>This is an automated report. Numbers are computed from authoritative platform data; aggregate-only, never individual student behaviour.</p>
    </footer>
  </div>

  <script>
    // Auto-trigger the print dialog once the page loads. Brief delay so
    // the rendering settles. The "Print / Save as PDF" button (no-print)
    // gives a fallback if the auto-trigger is blocked.
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`
}
