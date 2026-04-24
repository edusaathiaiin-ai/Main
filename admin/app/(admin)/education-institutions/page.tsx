import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Status =
  | 'pending'
  | 'demo'
  | 'trial'
  | 'active'
  | 'suspended'
  | 'churned'

type SearchParams = Promise<{ status?: string; q?: string }>

type InstitutionRow = {
  id: string
  name: string
  city: string
  status: Status
  trial_ends_at: string | null
  created_at: string
}

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-slate-700 text-slate-300',
  demo: 'bg-blue-500/20 text-blue-300',
  trial: 'bg-amber-500/20 text-amber-300',
  active: 'bg-emerald-500/20 text-emerald-300',
  suspended: 'bg-red-500/20 text-red-300',
  churned: 'bg-slate-700 text-slate-500',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pending',
  demo: 'Demo Scheduled',
  trial: 'Trial',
  active: 'Active',
  suspended: 'Suspended',
  churned: 'Churned',
}

const STATUSES: Status[] = [
  'pending',
  'demo',
  'trial',
  'active',
  'suspended',
  'churned',
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function InstitutionsListPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { status, q } = await searchParams
  const admin = getAdminClient()

  // ── Summary panel counts ──────────────────────────────────────────────
  const nowIso = new Date().toISOString()
  const weekAhead = new Date()
  weekAhead.setUTCDate(weekAhead.getUTCDate() + 7)
  const weekAheadIso = weekAhead.toISOString()

  const [
    { count: pendingCount },
    { count: trialExpiringCount },
    { count: activeCount },
    { count: totalStudents },
  ] = await Promise.all([
    admin
      .from('education_institutions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('education_institutions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trial')
      .gte('trial_ends_at', nowIso)
      .lte('trial_ends_at', weekAheadIso),
    admin
      .from('education_institutions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('education_institution_id', 'is', null),
  ])

  // ── List query ─────────────────────────────────────────────────────────
  let query = admin
    .from('institutions')
    .select('id, name, city, status, trial_ends_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && STATUSES.includes(status as Status)) {
    query = query.eq('status', status)
  }
  if (q && q.trim()) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
  }

  const { data: institutions } = await query
  const rows = (institutions as InstitutionRow[] | null) ?? []

  // ── Per-status counts for filter pills ────────────────────────────────
  const { data: statusRows } = await admin
    .from('institutions')
    .select('status')

  const countByStatus: Record<Status, number> = {
    pending: 0,
    demo: 0,
    trial: 0,
    active: 0,
    suspended: 0,
    churned: 0,
  }
  for (const row of (statusRows as { status: Status }[] | null) ?? []) {
    if (row.status in countByStatus) countByStatus[row.status]++
  }

  // ── Student counts per institution (for table column) ─────────────────
  const { data: roster } = await admin
    .from('profiles')
    .select('education_institution_id')
    .not('education_institution_id', 'is', null)

  const studentsByInst: Record<string, number> = {}
  for (const r of (roster as { education_institution_id: string }[] | null) ?? []) {
    studentsByInst[r.education_institution_id] =
      (studentsByInst[r.education_institution_id] ?? 0) + 1
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-6">Education Institutions</h1>

      {/* ── Summary panel ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryTile
          label="Pending · needs action"
          value={pendingCount ?? 0}
          tone={pendingCount ? 'amber' : 'muted'}
          href="/education-institutions?status=pending"
        />
        <SummaryTile
          label="Trial expiring · 7 days"
          value={trialExpiringCount ?? 0}
          tone={trialExpiringCount ? 'amber' : 'muted'}
          href="/education-institutions?status=trial"
        />
        <SummaryTile
          label="Active"
          value={activeCount ?? 0}
          tone="emerald"
          href="/education-institutions?status=active"
        />
        <SummaryTile
          label="Students · under education institutions"
          value={totalStudents ?? 0}
          tone="slate"
        />
      </div>

      {/* ── Search + status pills ───────────────────────────────────── */}
      <form className="flex gap-3 mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search institution name or city…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl px-5 py-2 text-sm transition-colors"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={q ? `/education-institutions?q=${encodeURIComponent(q)}` : `/education-institutions`}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !status
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => {
          const active = status === s
          const params = new URLSearchParams({
            ...(q ? { q } : {}),
            status: s,
          })
          return (
            <Link
              key={s}
              href={`/education-institutions?${params.toString()}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {STATUS_LABEL[s]}
              <span
                className={`ml-1.5 ${active ? 'text-slate-800' : 'text-slate-600'}`}
              >
                {countByStatus[s]}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3.5">Name</th>
              <th className="text-left px-4 py-3.5">City</th>
              <th className="text-left px-4 py-3.5">Status</th>
              <th className="text-left px-4 py-3.5">Students</th>
              <th className="text-left px-4 py-3.5">Trial ends</th>
              <th className="text-left px-4 py-3.5">Created</th>
              <th className="px-4 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const trialDays = daysUntil(i.trial_ends_at)
              const trialExpiringSoon =
                i.status === 'trial' &&
                trialDays !== null &&
                trialDays <= 3 &&
                trialDays >= 0
              return (
                <tr
                  key={i.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-5 py-3.5 text-white font-medium">
                    {i.name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">{i.city}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[i.status]}`}
                    >
                      {STATUS_LABEL[i.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">
                    {studentsByInst[i.id] ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">
                    {i.status === 'trial' && i.trial_ends_at ? (
                      <span
                        className={
                          trialExpiringSoon
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {fmtDate(i.trial_ends_at)}
                        {trialDays !== null && trialDays >= 0 && (
                          <span className="ml-1.5 text-[10px] text-slate-500">
                            ({trialDays}d)
                          </span>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {fmtDate(i.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/education-institutions/${i.id}`}
                      className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-slate-500 text-sm"
                >
                  No education institutions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Summary tile ───────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  tone,
  href,
}: {
  label: string
  value: number
  tone: 'amber' | 'emerald' | 'slate' | 'muted'
  href?: string
}) {
  const toneColor: Record<typeof tone, string> = {
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    slate: 'text-white',
    muted: 'text-slate-500',
  }

  const content = (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 h-full hover:border-slate-700 transition-colors">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`font-bold text-3xl mt-1.5 ${toneColor[tone]}`}>{value}</p>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
