import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { AutoRefresh } from '@/components/AutoRefresh'

export const dynamic = 'force-dynamic'

// ── API cost config ──────────────────────────────────────────────────────────
// Input/output rates per 1M tokens (USD). Update when providers change pricing.
const RATES: Record<
  string,
  {
    input: number
    output: number
    budget: number
    label: string
    free_daily: number
  }
> = {
  groq: {
    input: 0.59,
    output: 0.79,
    budget: 20,
    label: 'Groq',
    free_daily: 100,
  },
  gemini: {
    input: 0.1,
    output: 0.4,
    budget: 10,
    label: 'Gemini Flash',
    free_daily: 1500,
  },
  claude: {
    input: 3.0,
    output: 15.0,
    budget: 60,
    label: 'Claude Sonnet',
    free_daily: 0,
  },
  grok: {
    input: 5.0,
    output: 25.0,
    budget: 10,
    label: 'xAI Grok',
    free_daily: 0,
  },
}
const TOTAL_BUDGET = Object.values(RATES).reduce((s, r) => s + r.budget, 0) // $100

function calcCost(
  provider: string,
  promptTok: number,
  outputTok: number
): number {
  const r = RATES[provider]
  if (!r) return 0
  return (promptTok * r.input + outputTok * r.output) / 1_000_000
}

type CostRow = {
  ai_provider: string | null
  prompt_tokens: number | null
  total_tokens: number | null
}

type ProviderStat = {
  provider: string
  label: string
  msgs7d: number
  msgsToday: number
  cost7d: number
  costToday: number
  budget: number
  free_daily: number
  dailyBurn: number // 7d avg daily cost
  daysLeft: number | null // null = infinite (within free tier)
  status: MetricStatus
}

async function fetchCostMetrics(): Promise<{
  stats: ProviderStat[]
  totalBurn: number
  projectedMonthly: number
}> {
  const admin = getAdminClient()
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const sinceToday = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()

  const [{ data: rows7d }, { data: rowsToday }] = await Promise.all([
    admin
      .from('traces')
      .select('ai_provider, prompt_tokens, total_tokens')
      .gte('created_at', since7d)
      .eq('action_type', 'chat')
      .eq('outcome', 'success')
      .limit(10000),
    admin
      .from('traces')
      .select('ai_provider, prompt_tokens, total_tokens')
      .gte('created_at', sinceToday)
      .eq('action_type', 'chat')
      .eq('outcome', 'success')
      .limit(2000),
  ])

  const aggregate = (rows: CostRow[]) => {
    const map: Record<string, { msgs: number; cost: number }> = {}
    for (const row of rows) {
      const p = row.ai_provider ?? 'groq'
      const prompt = row.prompt_tokens ?? 1880
      const total = row.total_tokens ?? 2180
      const output = Math.max(0, total - prompt)
      if (!map[p]) map[p] = { msgs: 0, cost: 0 }
      map[p].msgs++
      map[p].cost += calcCost(p, prompt, output)
    }
    return map
  }

  const data7d = aggregate((rows7d ?? []) as CostRow[])
  const dataToday = aggregate((rowsToday ?? []) as CostRow[])

  const stats: ProviderStat[] = Object.entries(RATES).map(([key, cfg]) => {
    const d7 = data7d[key] ?? { msgs: 0, cost: 0 }
    const dTod = dataToday[key] ?? { msgs: 0, cost: 0 }
    const dailyBurn = d7.cost / 7
    const freeBuffer = (cfg.free_daily / Math.max(d7.msgs / 7, 1)) * dailyBurn // cost savings from free tier
    const netBurn = Math.max(0, dailyBurn - freeBuffer)
    const daysLeft =
      cfg.budget <= 0
        ? null
        : netBurn <= 0
          ? null
          : Math.floor(cfg.budget / netBurn)

    let status: MetricStatus = 'good'
    if (daysLeft !== null) {
      if (daysLeft <= 3) status = 'bad'
      else if (daysLeft <= 10) status = 'warn'
    }
    if (dTod.cost > cfg.budget * 0.15) status = 'bad' // single day > 15% of budget

    return {
      provider: key,
      label: cfg.label,
      msgs7d: d7.msgs,
      msgsToday: dTod.msgs,
      cost7d: d7.cost,
      costToday: dTod.cost,
      budget: cfg.budget,
      free_daily: cfg.free_daily,
      dailyBurn,
      daysLeft,
      status,
    }
  })

  const totalBurn = stats.reduce((s, p) => s + p.dailyBurn, 0)
  const projectedMonthly = totalBurn * 30

  return { stats, totalBurn, projectedMonthly }
}

type MetricStatus = 'good' | 'warn' | 'bad' | 'neutral'
type MetricCard = {
  label: string
  value: string
  sub: string
  status: MetricStatus
  icon: string
}

function pct(num: number, denom: number) {
  if (denom === 0) return 0
  return Math.round((num / denom) * 100)
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * p)] ?? 0
}

function statusDot(s: MetricStatus) {
  return {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
    neutral: 'bg-slate-500',
  }[s]
}

function statusBorder(s: MetricStatus) {
  return {
    good: 'border-emerald-500/20',
    warn: 'border-amber-500/20',
    bad: 'border-red-500/20',
    neutral: 'border-slate-700',
  }[s]
}

async function fetchMetrics(): Promise<MetricCard[]> {
  const admin = getAdminClient()
  const now = Date.now()
  const since1h = new Date(now - 3_600_000).toISOString()
  const since24h = new Date(now - 86_400_000).toISOString()
  const since5m = new Date(now - 300_000).toISOString()

  type ChatTraceRow = {
    ttfb_ms: number | null
    soul_updated: boolean | null
    outcome: string | null
  }
  type UserIdRow = { user_id: string | null }

  const [{ data: traces1h }, { data: traces24h }, { data: active5m }] =
    await Promise.all([
      admin
        .from('traces')
        .select('ttfb_ms, soul_updated, outcome')
        .gte('created_at', since1h)
        .eq('action_type', 'chat')
        .limit(500),
      admin
        .from('traces')
        .select('outcome, soul_updated')
        .gte('created_at', since24h)
        .eq('action_type', 'chat')
        .limit(2000),
      admin
        .from('traces')
        .select('user_id')
        .gte('created_at', since5m)
        .eq('action_type', 'chat')
        .limit(500),
    ])

  // 1. TTFB P50/P95 (last 1h)
  const castTraces1h = (traces1h ?? []) as ChatTraceRow[]
  const ttfbs = castTraces1h
    .map((r) => r.ttfb_ms)
    .filter((v): v is number => v !== null)
  const p50 = percentile(ttfbs, 0.5)
  const p95 = percentile(ttfbs, 0.95)

  // 2. Session completion + soul update rate (24h)
  const castTraces24h = (traces24h ?? []) as ChatTraceRow[]
  const total24h = castTraces24h.length
  const soulUpdated24h = castTraces24h.filter((r) => r.soul_updated).length
  const completionPct = pct(soulUpdated24h, total24h)
  const soulSuccessPct = pct(soulUpdated24h, total24h)

  // 3. Active users (5 min)
  const castActive5m = (active5m ?? []) as UserIdRow[]
  const uniqueActiveUsers = new Set(castActive5m.map((r) => r.user_id)).size

  // 4. Error rate (1h)
  const errors1h = castTraces1h.filter((r) => r.outcome === 'error').length
  const errorRate = pct(errors1h, castTraces1h.length)

  // 5. Passion ignition rate (all-time)
  const [{ count: burning }, { count: eligible }] = await Promise.all([
    admin
      .from('student_soul')
      .select('*', { count: 'exact', head: true })
      .gte('session_count', 8)
      .lte('session_count', 12)
      .neq('flame_stage', 'cold'),
    admin
      .from('student_soul')
      .select('*', { count: 'exact', head: true })
      .gte('session_count', 8)
      .lte('session_count', 12),
  ])
  const ignitionPct = pct(burning ?? 0, eligible ?? 1)

  return [
    {
      label: 'TTFB P50 / P95',
      value: ttfbs.length > 0 ? `${p50}ms / ${p95}ms` : 'No data yet',
      sub: `Last hour · ${ttfbs.length} responses`,
      status:
        ttfbs.length === 0
          ? 'neutral'
          : p95 > 4000
            ? 'bad'
            : p95 > 2500
              ? 'warn'
              : 'good',
      icon: '⚡',
    },
    {
      label: 'Session completion rate',
      value: `${completionPct}%`,
      sub: `Last 24h · ${total24h} sessions`,
      status:
        total24h === 0
          ? 'neutral'
          : completionPct >= 70
            ? 'good'
            : completionPct >= 40
              ? 'warn'
              : 'bad',
      icon: '✅',
    },
    {
      label: 'Soul update success',
      value: `${soulSuccessPct}%`,
      sub: `Last 24h · ${soulUpdated24h}/${total24h} updated`,
      status:
        total24h === 0
          ? 'neutral'
          : soulSuccessPct >= 80
            ? 'good'
            : soulSuccessPct >= 50
              ? 'warn'
              : 'bad',
      icon: '🌟',
    },
    {
      label: 'Active right now',
      value: String(uniqueActiveUsers),
      sub: 'Unique users in last 5 min',
      status: uniqueActiveUsers > 0 ? 'good' : 'neutral',
      icon: '👤',
    },
    {
      label: 'Error rate',
      value: `${errorRate}%`,
      sub: `Last hour · ${errors1h} errors / ${castTraces1h.length} total`,
      status:
        castTraces1h.length === 0
          ? 'neutral'
          : errorRate === 0
            ? 'good'
            : errorRate < 5
              ? 'warn'
              : 'bad',
      icon: '🚨',
    },
    {
      label: 'Passion ignition rate',
      value: `${ignitionPct}%`,
      sub: `Students 8–12 sessions · ${burning ?? 0}/${eligible ?? 0}`,
      status:
        (eligible ?? 0) === 0
          ? 'neutral'
          : ignitionPct >= 60
            ? 'good'
            : ignitionPct >= 30
              ? 'warn'
              : 'bad',
      icon: '🔥',
    },
  ]
}

export default async function ObservabilityPage() {
  await requireAdmin()
  const [metrics, { stats, totalBurn, projectedMonthly }] = await Promise.all([
    fetchMetrics(),
    fetchCostMetrics(),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Observability</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Live health metrics · auto-refresh every 30s
          </p>
        </div>
        <AutoRefresh />
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className={`rounded-xl border bg-slate-900 p-5 ${statusBorder(metric.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm font-medium">
                {metric.label}
              </span>
              <span className="text-xl">{metric.icon}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {metric.value}
              </span>
              <span
                className={`w-2 h-2 rounded-full mb-1 ${statusDot(metric.status)}`}
              />
            </div>
            <p className="text-slate-600 text-xs mt-1">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* ── API Cost Monitor ─────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              API Cost Monitor
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              7-day avg burn · ${totalBurn.toFixed(2)}/day · projected $
              {projectedMonthly.toFixed(0)}/month
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total budget</p>
            <p className="text-sm font-mono font-bold text-white">
              ${TOTAL_BUDGET}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => {
            const budgetUsedPct =
              s.budget > 0 ? Math.min(100, (s.cost7d / s.budget) * 100) : 0
            const barColor =
              s.status === 'bad'
                ? 'bg-red-500'
                : s.status === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            const borderColor =
              s.status === 'bad'
                ? 'border-red-500/30'
                : s.status === 'warn'
                  ? 'border-amber-500/30'
                  : 'border-slate-700'

            return (
              <div
                key={s.provider}
                className={`rounded-xl border bg-slate-900 p-4 ${borderColor}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300 text-sm font-medium">
                    {s.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      s.status === 'bad'
                        ? 'bg-red-500/20 text-red-400'
                        : s.status === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {s.daysLeft === null ? '∞ free' : `${s.daysLeft}d left`}
                  </span>
                </div>

                {/* Cost today vs 7d */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-white font-mono">
                      ${s.costToday.toFixed(3)}
                    </p>
                    <p className="text-xs text-slate-500">
                      today ({s.msgsToday} msgs)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-slate-400">
                      ${s.cost7d.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600">
                      7d total ({s.msgs7d} msgs)
                    </p>
                  </div>
                </div>

                {/* Budget bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>${s.cost7d.toFixed(2)} used</span>
                    <span>budget ${s.budget}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(2, budgetUsedPct)}%` }}
                    />
                  </div>
                  {s.free_daily > 0 && (
                    <p className="text-xs text-slate-600">
                      {s.free_daily} free req/day
                    </p>
                  )}
                </div>

                {/* Daily burn */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    Avg burn:{' '}
                    <span className="text-slate-300 font-mono">
                      ${s.dailyBurn.toFixed(3)}/day
                    </span>
                    {' · '}
                    <span className="text-slate-300 font-mono">
                      ${(s.dailyBurn * 30).toFixed(1)}/mo
                    </span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Top-up warning */}
        {stats.some((s) => s.status !== 'good') && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-xs font-medium">
              ⚠️ Top-up needed:{' '}
              {stats
                .filter((s) => s.status !== 'good')
                .map(
                  (s) =>
                    `${s.label} (${s.daysLeft === null ? 'check balance' : s.daysLeft + 'd left'})`
                )
                .join(' · ')}
            </p>
          </div>
        )}
      </div>

      {/* Cron schedule reference */}
      <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Scheduled Jobs
        </h2>
        <div className="space-y-1.5 text-xs font-mono text-slate-500">
          <div className="grid grid-cols-3 gap-4">
            <span className="text-slate-400">health-monitor</span>
            <span>0 * * * *</span>
            <span>every hour</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <span className="text-slate-400">weekly-eval</span>
            <span>30 3 * * 0</span>
            <span>Sunday 9AM IST</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <span className="text-slate-400">cleanup_old_traces</span>
            <span>0 0 * * *</span>
            <span>daily midnight</span>
          </div>
        </div>
      </div>
    </div>
  )
}
