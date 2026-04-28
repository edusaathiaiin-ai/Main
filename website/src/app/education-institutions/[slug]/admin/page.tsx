// ─────────────────────────────────────────────────────────────────────────────
// /education-institutions/[slug]/admin — Principal Dashboard (Phase I-2 Step 2)
//
// Server component. Authenticated principals get a single-page view of their
// institution: status, headline metrics, last-30-days activity, top Saathis,
// flame-stage distribution (aggregate only), faculty + student rosters, and
// a billing panel. NAAC report wires up in Step 4.
//
// Auth — three-step verification before any data renders:
//   1. user-context Supabase client → user must be logged in
//   2. .from('education_institutions').eq('slug', slug) — RLS policy
//      `principal_read_own_education_institution` (migration 144) lets the
//      principal read their own row across all statuses; if the row is not
//      visible to this user, profile/institution mismatch and we 403
//   3. profile.education_institution_id === institution.id AND
//      profile.education_institution_role === 'principal' — explicit check
//
// After verification, the page switches to the service-role client for the
// privileged aggregate fetches (roster, faculty, flame distribution, active
// users). This is the standard auth-then-admin pattern used elsewhere in the
// codebase — we've already proven the principal owns this institution.
//
// DPDP rules — never relax these:
//   • Roster shows full_name + joined_at + active_this_week boolean only
//   • Flame distribution is aggregate counts, never per-student
//   • No chat content, no soul fields beyond flame_stage histogram, no
//     research-archive content reaches this page
// ─────────────────────────────────────────────────────────────────────────────

import { notFound, redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { SAATHIS } from '@/constants/saathis'
import Link from 'next/link'

export const metadata = {
  title: 'Principal Dashboard — EdUsaathiAI',
  description: 'Institution analytics and roster',
}

// ── Types ────────────────────────────────────────────────────────────────────

type InstitutionRow = {
  id: string
  slug: string
  name: string
  city: string
  state: string | null
  affiliation: string | null
  status: 'pending' | 'demo' | 'trial' | 'active' | 'suspended' | 'churned'
  trial_started_at: string | null
  trial_ends_at: string | null
  activated_at: string | null
  declared_capacity: number | null
  daily_minutes_budget: number | null
  approximate_strength: string | null
  principal_name: string | null
  principal_email: string
  contact_phone: string | null
  website: string | null
}

type StatsRow = {
  institution_id: string
  date: string
  sessions_count: number
  students_active: number
  minutes_used: number
  faculty_active: number
  artifacts_created: number
  top_saathis: Array<{ slug: string; sessions: number }> | null
  updated_at: string
}

type Member = {
  id: string
  full_name: string | null
  education_institution_joined_at: string | null
}

type FlameStage = 'cold' | 'spark' | 'ember' | 'fire' | 'wings'

const FLAME_ORDER: FlameStage[] = ['cold', 'spark', 'ember', 'fire', 'wings']

const FLAME_LABEL: Record<FlameStage, string> = {
  cold:  'Cold',
  spark: 'Spark',
  ember: 'Ember',
  fire:  'Fire',
  wings: 'Wings',
}

const STATUS_COPY: Record<InstitutionRow['status'], { label: string; tone: string }> = {
  pending:   { label: 'Pending verification', tone: '#B8860B' },  // gold
  demo:      { label: 'Demo',                  tone: '#7C3AED' },  // violet
  trial:     { label: 'Trial',                 tone: '#0EA5E9' },  // sky
  active:    { label: 'Active',                tone: '#16A34A' },  // emerald
  suspended: { label: 'Suspended',             tone: '#DC2626' },  // red
  churned:   { label: 'Churned',               tone: '#64748B' },  // slate
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayIstYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function shiftIstYmd(yyyymmdd: string, deltaDays: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function saathiNameForSlug(slug: string): string {
  return SAATHIS.find(s => s.id === slug)?.name ?? slug
}

// ₹89 per student per month, with a 200-student floor for tier minimum.
const PRICE_PER_STUDENT = 89
function estimateMonthlyBill(registeredStudents: number): number {
  return PRICE_PER_STUDENT * Math.max(registeredStudents, 200)
}

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PrincipalDashboard({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 1. Auth — must be logged in
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=/education-institutions/${encodeURIComponent(slug)}/admin`)
  }

  // 2. Fetch institution row via user-context client. RLS will surface only
  //    rows this user is authorised to read — if the slug exists but the
  //    user isn't its principal, the query returns null and we 404.
  const { data: institution } = await supabase
    .from('education_institutions')
    .select(
      'id, slug, name, city, state, affiliation, status, ' +
      'trial_started_at, trial_ends_at, activated_at, ' +
      'declared_capacity, daily_minutes_budget, approximate_strength, ' +
      'principal_name, principal_email, contact_phone, website'
    )
    .eq('slug', slug)
    .maybeSingle<InstitutionRow>()

  if (!institution) notFound()

  // 3. Verify this user is the principal OF this specific institution
  const { data: profile } = await supabase
    .from('profiles')
    .select('education_institution_id, education_institution_role, full_name')
    .eq('id', user.id)
    .maybeSingle<{
      education_institution_id: string | null
      education_institution_role: 'principal' | 'faculty' | 'student' | null
      full_name: string | null
    }>()

  const isPrincipal =
    profile?.education_institution_id === institution.id &&
    profile?.education_institution_role === 'principal'

  if (!isPrincipal) {
    return <Forbidden />
  }

  // 4. Privileged fetches via service-role — principal already authorised.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const todayIst = todayIstYmd()
  const thirtyDaysAgo = shiftIstYmd(todayIst, -30)
  const sevenDaysAgo  = shiftIstYmd(todayIst, -7)

  const [
    statsRes,
    studentsRes,
    facultyRes,
  ] = await Promise.all([
    admin
      .from('education_institution_stats_cache')
      .select(
        'institution_id, date, sessions_count, students_active, minutes_used, ' +
        'faculty_active, artifacts_created, top_saathis, updated_at'
      )
      .eq('institution_id', institution.id)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true }),
    admin
      .from('profiles')
      .select('id, full_name, education_institution_joined_at')
      .eq('education_institution_id', institution.id)
      .eq('education_institution_role', 'student')
      .order('education_institution_joined_at', { ascending: false }),
    admin
      .from('profiles')
      .select('id, full_name, education_institution_joined_at')
      .eq('education_institution_id', institution.id)
      .eq('education_institution_role', 'faculty')
      .order('education_institution_joined_at', { ascending: false }),
  ])

  // Supabase's generated types don't cover education_institution_stats_cache
  // yet (added in migration 143), so the inferred .select() type is wider
  // than our row shape. Cast via unknown to bypass the strict-overlap check.
  const stats:    StatsRow[] = (statsRes.data    ?? []) as unknown as StatsRow[]
  const students: Member[]   = (studentsRes.data ?? []) as unknown as Member[]
  const faculty:  Member[]   = (facultyRes.data  ?? []) as unknown as Member[]

  // Active-this-week + flame distribution — only when there are students to query
  const studentIds = students.map(s => s.id)

  const [activeRes, flameRes] = studentIds.length === 0
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([
        admin
          .from('chat_sessions')
          .select('user_id')
          .in('user_id', studentIds)
          .gte('quota_date_ist', sevenDaysAgo),
        admin
          .from('student_soul')
          .select('user_id, flame_stage')
          .in('user_id', studentIds),
      ])

  const activeUserIds = new Set(
    ((activeRes.data ?? []) as Array<{ user_id: string }>).map(r => r.user_id)
  )

  const flameDistribution: Record<FlameStage, number> = {
    cold: 0, spark: 0, ember: 0, fire: 0, wings: 0,
  }
  for (const r of (flameRes.data ?? []) as Array<{ flame_stage: string | null }>) {
    const stage = (r.flame_stage ?? 'cold') as FlameStage
    if (stage in flameDistribution) flameDistribution[stage] += 1
  }

  // ── Derived display values ─────────────────────────────────────────────────

  const yesterdayRow = stats[stats.length - 1] ?? null
  const yesterdayDateMatchesYesterday =
    yesterdayRow?.date === shiftIstYmd(todayIst, -1)

  const sessionsYesterday    = yesterdayDateMatchesYesterday ? yesterdayRow!.sessions_count    : 0
  const studentsActiveYday   = yesterdayDateMatchesYesterday ? yesterdayRow!.students_active   : 0
  const minutesUsedYesterday = yesterdayDateMatchesYesterday ? yesterdayRow!.minutes_used      : 0
  const facultyActiveYday    = yesterdayDateMatchesYesterday ? yesterdayRow!.faculty_active    : 0
  const topSaathisYesterday  = yesterdayDateMatchesYesterday ? (yesterdayRow!.top_saathis ?? []) : []

  const last7Sessions   = stats.slice(-7).reduce((a, r) => a + r.sessions_count,    0)
  const last7Minutes    = stats.slice(-7).reduce((a, r) => a + r.minutes_used,      0)
  const last7Artifacts  = stats.slice(-7).reduce((a, r) => a + r.artifacts_created, 0)

  const monthlyBill = estimateMonthlyBill(students.length)

  const isTrial = institution.status === 'trial'
  const isPending = institution.status === 'pending' || institution.status === 'demo'

  const status = STATUS_COPY[institution.status]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
            >
              Principal Dashboard
            </p>
            <h1
              className="mt-1 text-3xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {institution.name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {institution.city}{institution.state ? `, ${institution.state}` : ''}
              {institution.affiliation ? ` · ${institution.affiliation}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: `${status.tone}1A`,  // ~10% alpha
                color: status.tone,
                border: `0.5px solid ${status.tone}40`,
              }}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Pending verification banner */}
        {isPending && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#78350F',
            }}
          >
            <p className="text-sm font-semibold">Your institution is pending verification</p>
            <p className="mt-1 text-sm" style={{ color: '#92400E' }}>
              We review every institution personally to protect trust across the
              EdUsaathiAI network. This usually takes under 48 hours. Until then
              you can explore the dashboard, but faculty cannot log in yet and
              your public page is hidden from search. Questions? <a
                href="mailto:admin@edusaathiai.in"
                style={{ color: '#78350F', textDecoration: 'underline' }}
              >
                admin@edusaathiai.in
              </a>
            </p>
          </div>
        )}

        {/* Headline cards — yesterday's snapshot */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card label="Sessions yesterday"     value={sessionsYesterday} />
          <Card label="Students active yest."  value={studentsActiveYday} />
          <Card label="Minutes taught yest."   value={minutesUsedYesterday} />
          <Card label="Faculty active yest."   value={facultyActiveYday} />
        </section>

        {/* Last-30-days activity */}
        <section
          className="mb-8 rounded-2xl p-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Last 30 days
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stats.length} {stats.length === 1 ? 'day' : 'days'} of data
            </p>
          </div>

          {stats.length === 0 ? (
            <EmptyState
              text="No activity recorded yet. Once faculty start running classroom sessions, daily rollups appear here."
            />
          ) : (
            <>
              <SparkBars
                values={stats.map(s => s.sessions_count)}
                labels={stats.map(s => s.date)}
                tone="#B8860B"
              />
              <div
                className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>Last 7 days · <strong>{last7Sessions}</strong> sessions</span>
                <span>Last 7 days · <strong>{last7Minutes}</strong> minutes</span>
                <span>Last 7 days · <strong>{last7Artifacts}</strong> research artifacts</span>
              </div>
            </>
          )}
        </section>

        {/* Top Saathis chips + flame distribution side by side */}
        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Top Saathis (yesterday)">
            {topSaathisYesterday.length === 0 ? (
              <EmptyState text="No sessions yesterday." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {topSaathisYesterday.map(({ slug: vSlug, sessions }) => (
                  <span
                    key={vSlug}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: '#F5E6C8',  // gold-light
                      color: '#78350F',
                      border: '0.5px solid #E8C77E',
                    }}
                  >
                    {saathiNameForSlug(vSlug)} — {sessions} {sessions === 1 ? 'session' : 'sessions'}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Flame stage distribution">
            <FlameBars dist={flameDistribution} total={students.length} />
          </Panel>
        </section>

        {/* Roster + Faculty */}
        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={`Students (${students.length})`}>
            {students.length === 0 ? (
              <EmptyState text="No students yet. They'll appear here as they join via your institution slug." />
            ) : (
              <Roster members={students} activeIds={activeUserIds} maxRows={12} />
            )}
          </Panel>

          <Panel title={`Faculty (${faculty.length})`}>
            {faculty.length === 0 ? (
              <EmptyState text="No faculty onboarded yet. CSV bulk-onboard wires up in Step 3." />
            ) : (
              <Roster members={faculty} activeIds={null} maxRows={12} />
            )}
          </Panel>
        </section>

        {/* Billing panel */}
        <section
          className="mb-8 rounded-2xl p-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Billing
            </h2>
            {isTrial && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: '#DBEAFE', color: '#1E40AF' }}
              >
                Trial — billing inactive
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <BillingCell
              label="Estimated monthly bill"
              value={inr(monthlyBill)}
              hint={`${inr(PRICE_PER_STUDENT)} × max(${students.length} students, 200)`}
            />
            <BillingCell
              label="Trial ends"
              value={formatDateShort(institution.trial_ends_at)}
              hint={institution.trial_started_at ? `started ${formatDateShort(institution.trial_started_at)}` : '—'}
            />
            <BillingCell
              label="Status"
              value={status.label}
              hint={institution.activated_at ? `activated ${formatDateShort(institution.activated_at)}` : 'awaiting activation'}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl px-4 py-2 text-sm font-semibold opacity-60"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
              title={isTrial ? 'Billing activates after trial' : 'Invoice download wires up in Step 6'}
            >
              Download invoice
            </button>
            <a
              href="/api/education-institutions/naac-report"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: 'var(--gold)',
                color: 'var(--bg-surface)',
                border: '1px solid var(--gold)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
              title="Opens the report in a new tab; the browser print dialog appears automatically"
            >
              Download NAAC report →
            </a>
          </div>

          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-ghost)' }}>
            {isTrial
              ? 'Billing activates after your trial ends. We will reach out before any charges go through.'
              : 'Invoices are emailed to your accounts contact when billing activates.'}
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--text-ghost)' }}>
          <span>EdUsaathiAI · Principal Dashboard · Phase I-2</span>
          <Link
            href="/chat"
            style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
          >
            Back to your Saathi →
          </Link>
        </footer>
      </div>
    </main>
  )
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-3xl font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <h2
        className="mb-3 text-lg font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p
      className="text-sm leading-relaxed"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {text}
    </p>
  )
}

function SparkBars({
  values, labels, tone,
}: {
  values: number[]; labels: string[]; tone: string
}) {
  const max = Math.max(1, ...values)
  return (
    <div
      className="flex h-24 items-end gap-1 rounded-lg p-2"
      style={{ background: 'var(--bg-elevated)' }}
      aria-label="Daily session counts for the last 30 days"
    >
      {values.map((v, i) => {
        const heightPct = Math.round((v / max) * 100)
        return (
          <div
            key={`${labels[i]}-${i}`}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(heightPct, 2)}%`,
              background: v === 0 ? 'var(--border-subtle)' : tone,
              minWidth: '3px',
            }}
            title={`${labels[i]} · ${v} ${v === 1 ? 'session' : 'sessions'}`}
          />
        )
      })}
    </div>
  )
}

function FlameBars({
  dist, total,
}: {
  dist: Record<FlameStage, number>; total: number
}) {
  if (total === 0) return <EmptyState text="No students enrolled yet." />

  const colors: Record<FlameStage, string> = {
    cold:  '#94A3B8',  // slate-400
    spark: '#FCD34D',  // amber-300
    ember: '#FB923C',  // orange-400
    fire:  '#EF4444',  // red-500
    wings: '#A855F7',  // violet-500 (rare achievement)
  }

  return (
    <div className="space-y-2">
      {FLAME_ORDER.map(stage => {
        const n = dist[stage]
        const pct = total === 0 ? 0 : Math.round((n / total) * 100)
        return (
          <div key={stage} className="flex items-center gap-3">
            <span
              className="w-16 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {FLAME_LABEL[stage]}
            </span>
            <div
              className="relative h-5 flex-1 overflow-hidden rounded-md"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="h-full rounded-md transition-all"
                style={{
                  width: `${pct}%`,
                  background: colors[stage],
                  minWidth: n > 0 ? '4px' : '0',
                }}
              />
            </div>
            <span
              className="w-14 text-right text-xs tabular-nums"
              style={{ color: 'var(--text-secondary)' }}
            >
              {n} ({pct}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Roster({
  members, activeIds, maxRows,
}: {
  members: Member[]
  activeIds: Set<string> | null
  maxRows: number
}) {
  const visible = members.slice(0, maxRows)
  const hidden  = members.length - visible.length

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
      {visible.map(m => {
        const active = activeIds ? activeIds.has(m.id) : null
        return (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p
                className="truncate text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {m.full_name?.trim() || '(name not set)'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Joined {formatDateShort(m.education_institution_joined_at)}
              </p>
            </div>
            {active !== null && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: active ? '#DCFCE7' : 'var(--bg-elevated)',
                  color:      active ? '#166534' : 'var(--text-ghost)',
                }}
              >
                {active ? 'active this week' : 'idle'}
              </span>
            )}
          </li>
        )
      })}
      {hidden > 0 && (
        <li className="pt-2 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          + {hidden} more
        </li>
      )}
    </ul>
  )
}

function BillingCell({
  label, value, hint,
}: {
  label: string; value: string; hint: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-xl font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        {hint}
      </p>
    </div>
  )
}

function Forbidden() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-md p-8 text-center">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          You don&apos;t have access to this dashboard
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          The principal dashboard is restricted to the verified principal of
          this institution. If you believe this is a mistake, contact{' '}
          <a
            href="mailto:admin@edusaathiai.in"
            style={{ color: 'var(--gold)', textDecoration: 'underline' }}
          >
            admin@edusaathiai.in
          </a>.
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Back to your Saathi →
        </Link>
      </div>
    </main>
  )
}
