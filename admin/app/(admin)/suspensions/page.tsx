import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { LiftButton, EscalateButton, BanButton } from './SuspensionActions'

export const dynamic = 'force-dynamic'

const TIER_LABELS: Record<number, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-slate-600 text-slate-300',
  2: 'bg-amber-500/20 text-amber-400',
  3: 'bg-orange-500/20 text-orange-400',
  4: 'bg-red-500/20 text-red-400',
}

const VIOLATION_TYPES = [
  { key: 'abuse', label: 'Abuse', threshold: 3 },
  { key: 'injection', label: 'Injection', threshold: 1 },
  { key: 'politics', label: 'Politics', threshold: 5 },
  { key: 'inappropriate_content', label: 'Inappropriate', threshold: 2 },
  { key: 'academic_dishonesty', label: 'Dishonesty', threshold: 3 },
  { key: 'harassment', label: 'Harassment', threshold: 2 },
  { key: 'spam', label: 'Spam', threshold: 5 },
]

export default async function SuspensionsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  // Active suspensions
  const { data: suspended } = await admin
    .from('profiles')
    .select(
      'id, full_name, email, suspension_status, suspension_tier, suspended_until, suspension_reason, last_suspended_at, is_banned'
    )
    .not('suspension_status', 'is', null)
    .order('last_suspended_at', { ascending: false })

  const active = (suspended ?? []).filter((u) => !(u.is_banned as boolean))
  const tier2Count = active.filter(
    (u) => (u.suspension_tier as number) === 2
  ).length
  const tier3Count = active.filter(
    (u) => (u.suspension_tier as number) === 3
  ).length
  const tier4Count = (suspended ?? []).filter(
    (u) => u.is_banned as boolean
  ).length

  // Appeals pending
  const { count: appealsCount } = await admin
    .from('suspension_log')
    .select('id', { count: 'exact', head: true })
    .eq('student_appealed', true)
    .is('appeal_resolved_at', null)

  // Violation analytics from moderation_flags
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString()
  const { data: flags } = await admin
    .from('moderation_flags')
    .select('flag_type, created_at')
    .gte('created_at', thirtyDaysAgo)
    .not('flag_type', 'in', '("admin_broadcast","threshold_update")')

  const violationCounts = new Map<string, number>()
  for (const f of flags ?? []) {
    const type = f.flag_type as string
    violationCounts.set(type, (violationCounts.get(type) ?? 0) + 1)
  }
  const maxViolation = Math.max(...Array.from(violationCounts.values()), 1)

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <h1 className="text-xl font-bold text-white">Suspensions</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Active suspensions" value={active.length} />
        <StatCard label="Tier 2 (auto)" value={tier2Count} />
        <StatCard label="Tier 3 (admin)" value={tier3Count} />
        <StatCard label="Tier 4 (banned)" value={tier4Count} accent />
        <StatCard
          label="Appeals pending"
          value={appealsCount ?? 0}
          dot={appealsCount ? 'amber' : undefined}
        />
      </div>

      {/* Active suspensions table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">
            Active Suspensions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Violated at</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(suspended ?? []).map((u) => {
                const tier = (u.suspension_tier as number) ?? 0
                const isBanned = u.is_banned as boolean
                const expires = u.suspended_until
                  ? new Date(u.suspended_until as string)
                  : null
                const expired = expires && expires < new Date()

                return (
                  <tr
                    key={u.id as string}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${
                      isBanned ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-white">
                        {(u.full_name as string) ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {u.email as string}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[tier] ?? TIER_COLORS[1]}`}
                      >
                        {isBanned
                          ? 'BANNED'
                          : (TIER_LABELS[tier] ?? `T${tier}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 max-w-xs truncate">
                      {(u.suspension_reason as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {u.last_suspended_at
                        ? new Date(
                            u.last_suspended_at as string
                          ).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {isBanned ? (
                        <span className="text-red-400 font-semibold">
                          Permanent
                        </span>
                      ) : expires ? (
                        <span
                          className={
                            expired
                              ? 'text-slate-500 line-through'
                              : 'text-slate-300'
                          }
                        >
                          {expires.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-3 justify-end">
                        {!isBanned && (
                          <LiftButton
                            userId={u.id as string}
                            name={(u.full_name as string) ?? 'User'}
                          />
                        )}
                        {!isBanned && tier < 3 && (
                          <EscalateButton
                            userId={u.id as string}
                            name={(u.full_name as string) ?? 'User'}
                          />
                        )}
                        {!isBanned && (
                          <BanButton
                            userId={u.id as string}
                            name={(u.full_name as string) ?? 'User'}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!suspended?.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500 text-sm"
                  >
                    No active suspensions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violation Analytics */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Violations by Type — last 30 days
          </h2>
          <div className="space-y-3">
            {VIOLATION_TYPES.map(({ key, label }) => {
              const count = violationCounts.get(key) ?? 0
              const pct = Math.round((count / maxViolation) * 100)
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-amber-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {violationCounts.size === 0 && (
              <p className="text-slate-500 text-sm">No violations this month</p>
            )}
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Violation Thresholds
          </h2>
          <form
            action={async (fd: FormData) => {
              'use server'
              const { saveViolationThresholds } = await import('./actions')
              await saveViolationThresholds(fd)
            }}
            className="space-y-2"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {VIOLATION_TYPES.map(({ key, label, threshold }) => (
                  <tr key={key} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300 text-xs">{label}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        name={key}
                        defaultValue={threshold}
                        min={1}
                        max={20}
                        className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="submit"
              className="mt-3 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
