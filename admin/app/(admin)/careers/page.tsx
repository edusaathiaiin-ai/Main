import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { CareerActions } from './CareerActions'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ tab?: string }>

function statusChip(status: string) {
  const map: Record<string, string> = {
    open: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    filled: 'bg-blue-500/20 text-blue-400',
    expired: 'bg-slate-600/40 text-slate-400',
    removed: 'bg-red-500/20 text-red-400',
  }
  return map[status] ?? 'bg-slate-700 text-slate-400'
}

function planChip(plan: string) {
  const map: Record<string, string> = {
    basic: 'bg-slate-600/40 text-slate-400',
    featured: 'bg-amber-500/20 text-amber-400',
    corporate: 'bg-purple-500/20 text-purple-400',
  }
  return map[plan] ?? 'bg-slate-700 text-slate-400'
}

function appStatusChip(status: string) {
  const map: Record<string, string> = {
    applied: 'bg-amber-500/20 text-amber-400',
    shortlisted: 'bg-blue-500/20 text-blue-400',
    interviewing: 'bg-purple-500/20 text-purple-400',
    selected: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    withdrawn: 'bg-slate-600/40 text-slate-400',
    pending: 'bg-amber-500/20 text-amber-400',
    shortlisted2: 'bg-blue-500/20 text-blue-400',
    accepted: 'bg-emerald-500/20 text-emerald-400',
  }
  return map[status] ?? 'bg-slate-700 text-slate-400'
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default async function CareersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { tab = 'institution' } = await searchParams
  const admin = getAdminClient()

  // ── Stats ─────────────────────────────────────────────────────────────────

  const [
    { count: totalPostings },
    { count: openPostings },
    { count: filledPostings },
    { count: totalApps },
  ] = await Promise.all([
    admin
      .from('internship_postings')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('internship_postings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    admin
      .from('internship_postings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'filled'),
    admin
      .from('intern_applications')
      .select('*', { count: 'exact', head: true }),
  ])

  // Revenue this month (featured + corporate postings)
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const { data: paidPostings } = await admin
    .from('internship_postings')
    .select('listing_plan')
    .eq('listing_fee_paid', true)
    .gte('created_at', thisMonthStart.toISOString())

  const planRevenue: Record<string, number> = {
    basic: 999,
    featured: 2999,
    corporate: 4999,
  }
  const revenueThisMonth = (paidPostings ?? []).reduce(
    (sum, p) => sum + (planRevenue[p.listing_plan] ?? 0),
    0
  )

  // ── Tab data ──────────────────────────────────────────────────────────────

  let institutionPostings: Record<string, unknown>[] = []
  let researchPostings: Record<string, unknown>[] = []
  let allApplications: Record<string, unknown>[] = []

  if (tab === 'institution') {
    const { data } = await admin
      .from('internship_postings')
      .select(
        'id, title, vertical_id, total_seats, seats_filled, total_applications, status, listing_plan, listing_fee_paid, created_at, expires_at, company_name, posted_by, application_deadline'
      )
      .eq('posting_type', 'institution')
      .order('created_at', { ascending: false })
      .limit(100)
    institutionPostings = (data ?? []) as Record<string, unknown>[]
  }

  if (tab === 'research') {
    const { data } = await admin
      .from('internship_postings')
      .select(
        'id, title, project_title, research_area, vertical_id, min_depth, total_seats, seats_filled, total_applications, status, created_at, posted_by'
      )
      .eq('posting_type', 'research')
      .order('created_at', { ascending: false })
      .limit(100)
    researchPostings = (data ?? []) as Record<string, unknown>[]
  }

  if (tab === 'applications') {
    const { data } = await admin
      .from('intern_applications')
      .select(
        'id, posting_id, student_id, match_score, status, created_at, updated_at:created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200)
    allApplications = (data ?? []) as Record<string, unknown>[]
  }

  const TABS = [
    { id: 'institution', label: '🏢 Institution Postings' },
    { id: 'research', label: '🔬 Research Positions' },
    { id: 'applications', label: '📋 Applications' },
    { id: 'payments', label: '💳 Payments' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Careers</h1>
        <p className="text-sm text-slate-400 mt-1">
          Internship postings · research positions · applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total postings" value={String(totalPostings ?? 0)} />
        <StatCard label="Open" value={String(openPostings ?? 0)} />
        <StatCard label="Filled" value={String(filledPostings ?? 0)} />
        <StatCard label="Applications" value={String(totalApps ?? 0)} />
      </div>

      <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
        <p className="text-xs text-slate-400">
          Revenue this month (paid listings)
        </p>
        <p className="text-2xl font-bold text-amber-400 mt-1">
          ₹{revenueThisMonth.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Basic ₹999 · Featured ₹2,999 · Corporate ₹4,999
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`?tab=${t.id}`}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* ── Institution Postings ─────────────────────────────────────────── */}
      {tab === 'institution' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {[
                  'Company',
                  'Title',
                  'Saathi',
                  'Seats',
                  'Applied',
                  'Status',
                  'Plan',
                  'Expires',
                  'Flags',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {institutionPostings.map((p) => {
                const expiresDays = daysUntil(p.expires_at as string | null)
                const noAppsYet = (p.total_applications as number) === 0
                const expiringSoon =
                  expiresDays !== null && expiresDays < 7 && expiresDays >= 0
                const hasFlags = expiringSoon || noAppsYet
                return (
                  <tr
                    key={p.id as string}
                    className={`hover:bg-slate-800/40 ${hasFlags ? 'border-l-2 border-red-500/60' : ''}`}
                  >
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {(p.company_name as string) || '—'}
                    </td>
                    <td className="py-3 pr-4 text-white font-medium text-xs max-w-[160px] truncate">
                      {p.title as string}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {(p.vertical_id as string) || 'Any'}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {p.seats_filled as number}/{p.total_seats as number}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {p.total_applications as number}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusChip(p.status as string)}`}
                      >
                        {p.status as string}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${planChip(p.listing_plan as string)}`}
                      >
                        {p.listing_plan as string}
                      </span>
                    </td>
                    <td
                      className="py-3 pr-4 text-xs"
                      style={{
                        color: expiringSoon ? '#F87171' : 'rgb(148 163 184)',
                      }}
                    >
                      {expiresDays === null
                        ? '—'
                        : expiresDays < 0
                          ? 'Expired'
                          : `${expiresDays}d`}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {expiringSoon && (
                        <span className="text-red-400">⏰ Expiring</span>
                      )}
                      {noAppsYet && !expiringSoon && (
                        <span className="text-amber-400">⚠️ 0 apps</span>
                      )}
                      {!hasFlags && <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3">
                      <CareerActions
                        postingId={p.id as string}
                        postingType="institution"
                        currentStatus={p.status as string}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {institutionPostings.length === 0 && (
            <p className="text-center text-slate-600 py-12">
              No institution postings yet
            </p>
          )}
        </div>
      )}

      {/* ── Research Positions ───────────────────────────────────────────── */}
      {tab === 'research' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {[
                  'Posted by',
                  'Project',
                  'Saathi',
                  'Min depth',
                  'Seats',
                  'Applied',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {researchPostings.map((p) => (
                <tr key={p.id as string} className="hover:bg-slate-800/40">
                  <td className="py-3 pr-4 text-slate-400 text-xs font-mono">
                    {(p.posted_by as string).slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-4 text-white font-medium text-xs max-w-[180px]">
                    <p className="truncate">
                      {(p.project_title as string) || (p.title as string)}
                    </p>
                    {(p.research_area as string | null) && (
                      <p className="text-slate-500 text-[10px] truncate">
                        {p.research_area as string}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {(p.vertical_id as string) || 'Any'}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs">
                    {p.min_depth as number}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs">
                    {p.seats_filled as number}/{p.total_seats as number}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs">
                    {p.total_applications as number}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusChip(p.status as string)}`}
                    >
                      {p.status as string}
                    </span>
                  </td>
                  <td className="py-3">
                    <CareerActions
                      postingId={p.id as string}
                      postingType="research"
                      currentStatus={p.status as string}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {researchPostings.length === 0 && (
            <p className="text-center text-slate-600 py-12">
              No research postings yet
            </p>
          )}
        </div>
      )}

      {/* ── All Applications ─────────────────────────────────────────────── */}
      {tab === 'applications' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {[
                  'Student',
                  'Posting',
                  'Match',
                  'Status',
                  'Applied',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allApplications.map((a) => (
                <tr key={a.id as string} className="hover:bg-slate-800/40">
                  <td className="py-3 pr-4 text-slate-300 text-xs font-mono">
                    {(a.student_id as string).slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs font-mono">
                    {(a.posting_id as string).slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs font-bold ${
                        (a.match_score as number) >= 80
                          ? 'text-amber-400'
                          : (a.match_score as number) >= 60
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {a.match_score as number}%
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${appStatusChip(a.status as string)}`}
                    >
                      {a.status as string}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {new Date(a.created_at as string).toLocaleDateString(
                      'en-IN',
                      { day: 'numeric', month: 'short' }
                    )}
                  </td>
                  <td className="py-3">
                    <a
                      href={`/users/${a.student_id as string}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      View soul →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allApplications.length === 0 && (
            <p className="text-center text-slate-600 py-12">
              No applications yet
            </p>
          )}
        </div>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { plan: 'basic', price: 999, label: 'Basic' },
              { plan: 'featured', price: 2999, label: 'Featured' },
              { plan: 'corporate', price: 4999, label: 'Corporate' },
            ].map((plan) => {
              const count = (paidPostings ?? []).filter(
                (p) => p.listing_plan === plan.plan
              ).length
              return (
                <div
                  key={plan.plan}
                  className="rounded-xl p-4 bg-slate-800/60 border border-slate-700"
                >
                  <p className="text-xs text-slate-400">
                    {plan.label} listings this month
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">{count}</p>
                  <p className="text-xs text-amber-400 mt-0.5">
                    ₹{(count * plan.price).toLocaleString('en-IN')}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="rounded-xl p-4 bg-slate-800/60 border border-slate-700">
            <p className="text-sm font-semibold text-white mb-1">
              Total revenue this month
            </p>
            <p className="text-3xl font-bold text-amber-400">
              ₹{revenueThisMonth.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Payment integration via Razorpay. Check Razorpay dashboard for
              detailed transaction logs.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
