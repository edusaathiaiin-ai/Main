import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { RefreshButton } from './RefreshButton'

export const dynamic = 'force-dynamic'

const SAATHIS = [
  'kanoonsaathi',
  'maathsaathi',
  'chemsaathi',
  'biosaathi',
  'pharmasaathi',
  'medicosaathi',
  'nursingsaathi',
  'psychsaathi',
  'mechsaathi',
  'civilsaathi',
  'elecsaathi',
  'compsaathi',
  'envirosathi',
  'bizsaathi',
  'finsaathi',
  'mktsaathi',
  'hrsaathi',
  'archsaathi',
  'historysaathi',
  'econsaathi',
] as const

type SaathiId = (typeof SAATHIS)[number]

type CacheRow = {
  vertical_id: SaathiId
  total_students: number
  active_students_30d: number
  paying_students: number
  avg_depth: number
  top_topics: string[]
  last_refreshed_at: string | null
  next_refresh_at: string | null
}

function freshnessStatus(lastRefreshed: string | null) {
  if (!lastRefreshed)
    return { label: 'Never', color: 'text-red-400', dot: 'bg-red-500' }
  const ageHours = (Date.now() - new Date(lastRefreshed).getTime()) / 3600000
  if (ageHours < 12)
    return { label: 'Fresh', color: 'text-emerald-400', dot: 'bg-emerald-500' }
  if (ageHours < 48)
    return { label: 'Stale', color: 'text-amber-400', dot: 'bg-amber-500' }
  return { label: 'Very stale', color: 'text-red-400', dot: 'bg-red-500' }
}

export default async function SaathiStatsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  // Fetch cache table (may not exist yet — graceful fallback)
  const { data: cacheRows } = await admin
    .from('saathi_stats_cache')
    .select(
      'vertical_id, total_students, active_students_30d, paying_students, avg_depth, top_topics, last_refreshed_at, next_refresh_at'
    )
    .order('total_students', { ascending: false })

  // Platform totals from profiles directly
  const [
    { count: totalStudents },
    { count: totalFaculty },
    { count: paidStudents },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student'),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'faculty'),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .neq('plan_id', 'free'),
  ])

  const cacheMap = new Map<string, CacheRow>(
    (cacheRows ?? []).map((r) => [r.vertical_id, r as CacheRow])
  )

  // Identify zero-activity Saathis
  const zeroSaathis = SAATHIS.filter((id) => {
    const row = cacheMap.get(id)
    return !row || row.active_students_30d === 0
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Saathi Stats</h1>
          <p className="text-sm text-slate-400 mt-1">
            Per-Saathi metrics · cache freshness · growth signals
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total students" value={String(totalStudents ?? 0)} />
        <StatCard label="Faculty" value={String(totalFaculty ?? 0)} />
        <StatCard label="Paying students" value={String(paidStudents ?? 0)} />
      </div>

      {/* Zero-activity alert */}
      {zeroSaathis.length > 0 && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30">
          <p className="text-sm font-semibold text-red-400 mb-2">
            ⚠️ Saathis with no active students (30d)
          </p>
          <div className="flex flex-wrap gap-2">
            {zeroSaathis.map((id) => (
              <span
                key={id}
                className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-300"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cache table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Cache Status — All Saathis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {[
                  'Saathi',
                  'Students',
                  'Active 30d',
                  'Paying',
                  'Avg depth',
                  'Top topics',
                  'Freshness',
                  'Last refresh',
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
              {SAATHIS.map((saathiId) => {
                const row = cacheMap.get(saathiId)
                const fresh = freshnessStatus(row?.last_refreshed_at ?? null)
                return (
                  <tr
                    key={saathiId}
                    className={`hover:bg-slate-800/40 ${!row || row.active_students_30d === 0 ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 pr-4 text-white text-xs font-medium">
                      {saathiId}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {row?.total_students ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs font-semibold ${(row?.active_students_30d ?? 0) === 0 ? 'text-red-400' : 'text-emerald-400'}`}
                      >
                        {row?.active_students_30d ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {row?.paying_students ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-300 text-xs">
                      {row?.avg_depth ? row.avg_depth.toFixed(0) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs max-w-[160px]">
                      {row?.top_topics?.slice(0, 3).join(', ') ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${fresh.dot}`} />
                        <span className={`text-xs font-medium ${fresh.color}`}>
                          {fresh.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">
                      {row?.last_refreshed_at
                        ? new Date(row.last_refreshed_at).toLocaleString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : 'Never'}
                    </td>
                    <td className="py-3">
                      <RefreshButton saathiId={saathiId} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700">
        <p className="text-xs text-slate-500">
          Cache refreshes automatically every 48 hours via CRON job{' '}
          <code className="text-slate-400">refresh-saathi-stats</code>. Use the
          Force refresh buttons above to trigger an immediate update for any
          Saathi. Stats are read from the{' '}
          <code className="text-slate-400">saathi_stats_cache</code> table.
        </p>
      </div>
    </div>
  )
}
