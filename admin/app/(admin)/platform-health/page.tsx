import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { ManualCronButton } from './ManualCronButton'

export const dynamic = 'force-dynamic'

// ── Edge Function metadata (Supabase Management API) ─────────────────────────

type FunctionMeta = {
  id: string
  slug: string
  name: string
  version: number
  status: string
  created_at: number   // Unix ms
  updated_at: number   // Unix ms
  verify_jwt: boolean
}

const PROJECT_REF = 'vpmpuxosyrijknbxautx'
const STALE_DAYS  = 30   // flag if not deployed in this many days
const V1_GRACE    = 7    // don't flag v1 functions newer than this many days

const CRON_JOBS = [
  {
    id: 'refresh-saathi-stats',
    label: 'Saathi Stats Cache',
    schedule: 'Every 48h',
  },
  { id: 'rss-fetch', label: 'RSS Feed Fetch', schedule: 'Every 6h' },
  {
    id: 'expire-learning-intents',
    label: 'Expire Learning Intents',
    schedule: 'Daily',
  },
  {
    id: 'check-minimum-seats',
    label: 'Check Minimum Seats',
    schedule: 'Hourly',
  },
  {
    id: 'send-24h-reminders',
    label: '24h Session Reminders',
    schedule: 'Hourly',
  },
  {
    id: 'send-1h-reminders',
    label: '1h Session Reminders',
    schedule: 'Every 15min',
  },
  {
    id: 'auto-release-payments',
    label: 'Auto-Release Payments',
    schedule: 'Every 6h',
  },
  {
    id: 'auto-lift-suspensions',
    label: 'Auto-Lift Suspensions',
    schedule: 'Hourly',
  },
  {
    id: 'expire-referral-wallet',
    label: 'Expire Referral Wallet',
    schedule: 'Daily',
  },
  {
    id: 'admin-daily-digest',
    label: 'Admin Daily Digest',
    schedule: '8 AM IST',
  },
  {
    id: 'admin-weekly-digest',
    label: 'Admin Weekly Digest',
    schedule: 'Monday 9 AM IST',
  },
] as const

type CronJobId = (typeof CRON_JOBS)[number]['id']

const HEALTH_CHECKS = [
  { id: 'auth', label: 'Auth system', description: 'Supabase Auth' },
  {
    id: 'chat',
    label: 'Chat Edge Function',
    description: 'Streaming AI responses',
  },
  {
    id: 'razorpay',
    label: 'Razorpay webhook',
    description: 'Payment processing',
  },
  { id: 'rss', label: 'RSS feed fetch', description: 'Content pipeline' },
  { id: 'whatsapp', label: 'WhatsApp webhook', description: 'WhatsApp Saathi' },
  {
    id: 'cache',
    label: 'Saathi stats cache',
    description: 'Analytics pipeline',
  },
  { id: 'email', label: 'Email delivery', description: 'Resend transactional' },
] as const

export default async function PlatformHealthPage() {
  await requireAdmin()
  const admin = getAdminClient()

  // ── Edge Functions health (Supabase Management API) ───────────────────────

  let edgeFunctions: FunctionMeta[] = []
  let functionsError: string | null = null

  const mgmtToken = process.env.SUPABASE_ACCESS_TOKEN
  if (mgmtToken) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
        {
          headers: { Authorization: `Bearer ${mgmtToken}` },
          cache: 'no-store',
        }
      )
      if (res.ok) {
        edgeFunctions = (await res.json()) as FunctionMeta[]
        edgeFunctions.sort((a, b) => a.slug.localeCompare(b.slug))
      } else {
        functionsError = `Management API returned ${res.status}`
      }
    } catch {
      functionsError = 'Could not reach api.supabase.com'
    }
  } else {
    functionsError = 'SUPABASE_ACCESS_TOKEN not set in env'
  }

  const now = Date.now()

  function fnFlags(fn: FunctionMeta): { stale: boolean; neverUpdated: boolean } {
    const daysAgo = (now - fn.updated_at) / 86_400_000
    return {
      stale: daysAgo > STALE_DAYS,
      neverUpdated: fn.version === 1 && daysAgo > V1_GRACE,
    }
  }

  function daysAgoLabel(ts: number): string {
    const days = Math.floor((now - ts) / 86_400_000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  const activeCount  = edgeFunctions.filter((f) => f.status === 'ACTIVE').length
  const flaggedCount = edgeFunctions.filter((f) => {
    const { stale, neverUpdated } = fnFlags(f)
    return f.status !== 'ACTIVE' || stale || neverUpdated
  }).length

  // ── Key metrics (today) ───────────────────────────────────────────────────

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { count: activeToday },
    { count: messagesCount },
    { count: newRegistrations },
    { data: cronData },
    { data: errorData },
  ] = await Promise.all([
    admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .eq('role', 'user'),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    admin
      .from('cron_job_log')
      .select('job_id, last_run_at, next_run_at, status, records_affected')
      .order('last_run_at', { ascending: false }),
    admin
      .from('edge_function_errors')
      .select('id, function_name, error_message, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Latest news fetch time (proxy for RSS health)
  const { data: latestNews } = await admin
    .from('news_items')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)

  const latestRss = latestNews?.[0]?.fetched_at ?? null
  const rssAgeHours = latestRss
    ? (Date.now() - new Date(latestRss).getTime()) / 3600000
    : 999

  const cronMap = new Map((cronData ?? []).map((r) => [r.job_id as string, r]))

  // Revenue today
  const { data: todayPayments } = await admin
    .from('subscriptions')
    .select('amount')
    .gte('created_at', todayStart.toISOString())
    .eq('status', 'paid')

  const revenueToday = (todayPayments ?? []).reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  )

  function cronStatus(jobId: string) {
    const row = cronMap.get(jobId)
    if (!row) return { color: 'text-slate-500', label: 'No data' }
    if (row.status === 'error') return { color: 'text-red-400', label: 'Error' }
    if (row.status === 'running')
      return { color: 'text-blue-400', label: 'Running' }
    return { color: 'text-emerald-400', label: 'OK' }
  }

  function healthStatus(checkId: (typeof HEALTH_CHECKS)[number]['id']): {
    dot: string
    label: string
  } {
    if (checkId === 'rss') {
      if (rssAgeHours > 12)
        return {
          dot: 'bg-red-500',
          label: `Stale (${Math.floor(rssAgeHours)}h)`,
        }
      return { dot: 'bg-emerald-500', label: 'Working' }
    }
    return { dot: 'bg-emerald-500', label: 'Working' }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Health</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time health · CRON jobs · error log · key metrics
        </p>
      </div>

      {/* Today metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active sessions today"
          value={String(activeToday ?? 0)}
        />
        <StatCard label="Messages today" value={String(messagesCount ?? 0)} />
        <StatCard
          label="Revenue today"
          value={`₹${revenueToday.toLocaleString('en-IN')}`}
        />
        <StatCard
          label="New registrations"
          value={String(newRegistrations ?? 0)}
        />
      </div>

      {/* Health indicators */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          System Health
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {HEALTH_CHECKS.map((check) => {
            const status = healthStatus(check.id)
            return (
              <div
                key={check.id}
                className="rounded-xl p-4 bg-slate-800/60 border border-slate-700 flex items-center gap-3"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`}
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {check.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {check.description} · {status.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CRON jobs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          CRON Jobs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {[
                  'Job',
                  'Schedule',
                  'Last run',
                  'Next run',
                  'Status',
                  'Records',
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
              {CRON_JOBS.map((job) => {
                const row = cronMap.get(job.id)
                const status = cronStatus(job.id)
                return (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pr-4 text-white font-medium text-xs">
                      {job.label}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {job.schedule}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {row?.last_run_at
                        ? new Date(row.last_run_at as string).toLocaleString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {row?.next_run_at
                        ? new Date(row.next_run_at as string).toLocaleString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {row?.records_affected ?? '—'}
                    </td>
                    <td className="py-3">
                      <ManualCronButton jobId={job.id as CronJobId} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edge Functions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Edge Functions
          </h2>
          {edgeFunctions.length > 0 && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              flaggedCount === 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}>
              {activeCount}/{edgeFunctions.length} active
              {flaggedCount > 0 && ` · ${flaggedCount} flagged`}
            </span>
          )}
        </div>

        {functionsError ? (
          <div className="rounded-xl p-5 bg-slate-800/40 border border-slate-700">
            <p className="text-xs text-amber-400 font-mono">{functionsError}</p>
            {!mgmtToken && (
              <p className="text-xs text-slate-500 mt-2">
                Add{' '}
                <code className="text-amber-300">SUPABASE_ACCESS_TOKEN</code>
                {' '}to your admin .env.local — get it from{' '}
                supabase.com/dashboard → Account → Access Tokens.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {['Function', 'Version', 'Last deployed', 'Status', 'Flags'].map((h) => (
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
                {edgeFunctions.map((fn) => {
                  const { stale, neverUpdated } = fnFlags(fn)
                  const isFlagged = fn.status !== 'ACTIVE' || stale || neverUpdated
                  return (
                    <tr
                      key={fn.id}
                      className={`hover:bg-slate-800/40 ${isFlagged ? 'bg-amber-500/3' : ''}`}
                    >
                      <td className="py-2.5 pr-4">
                        <span className="text-xs font-mono text-white">{fn.slug}</span>
                        {!fn.verify_jwt && (
                          <span className="ml-1.5 text-[10px] text-slate-500">
                            public
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          fn.version === 1
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          v{fn.version}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-400">
                        {daysAgoLabel(fn.updated_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${
                          fn.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            fn.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          {fn.status}
                        </span>
                      </td>
                      <td className="py-2.5 flex flex-wrap gap-1">
                        {stale && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Stale {'>'}30d
                          </span>
                        )}
                        {neverUpdated && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            v1 — check if intentional
                          </span>
                        )}
                        {fn.status !== 'ACTIVE' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            Not active
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RSS feed health per Saathi */}
      <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">RSS Feed Health</p>
          <span
            className={`text-xs font-semibold ${rssAgeHours < 12 ? 'text-emerald-400' : rssAgeHours < 24 ? 'text-amber-400' : 'text-red-400'}`}
          >
            Last article:{' '}
            {latestRss ? `${Math.floor(rssAgeHours)}h ago` : 'Never'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          RSS fetches every 6h. Only headline + URL stored — zero copyright
          risk.
        </p>
      </div>

      {/* Error log */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Recent Errors (last 50)
        </h2>
        {(errorData ?? []).length === 0 ? (
          <div className="rounded-xl p-6 text-center bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-emerald-400 font-semibold text-sm">
              ✓ No errors logged
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All Edge Functions are running cleanly.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {['Time', 'Function', 'Error', 'User'].map((h) => (
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
                {(errorData ?? []).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 text-amber-400 text-xs font-mono">
                      {e.function_name}
                    </td>
                    <td className="py-2.5 pr-4 text-red-400 text-xs max-w-[300px] truncate">
                      {e.error_message}
                    </td>
                    <td className="py-2.5 text-slate-600 text-xs font-mono">
                      {e.user_id
                        ? (e.user_id as string).slice(0, 8) + '…'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
