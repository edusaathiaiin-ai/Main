import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { AutoRefresh } from '@/components/AutoRefresh';

export const dynamic = 'force-dynamic';

type MetricStatus = 'good' | 'warn' | 'bad' | 'neutral';
type MetricCard = {
  label: string;
  value: string;
  sub: string;
  status: MetricStatus;
  icon: string;
};

function pct(num: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p)] ?? 0;
}

function statusDot(s: MetricStatus) {
  return { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500', neutral: 'bg-slate-500' }[s];
}

function statusBorder(s: MetricStatus) {
  return { good: 'border-emerald-500/20', warn: 'border-amber-500/20', bad: 'border-red-500/20', neutral: 'border-slate-700' }[s];
}

async function fetchMetrics(): Promise<MetricCard[]> {
  const admin = getAdminClient();
  const now = Date.now();
  const since1h = new Date(now - 3_600_000).toISOString();
  const since24h = new Date(now - 86_400_000).toISOString();
  const since5m = new Date(now - 300_000).toISOString();

  type ChatTraceRow = { ttfb_ms: number | null; soul_updated: boolean | null; outcome: string | null };
  type UserIdRow = { user_id: string | null };

  const [
    { data: traces1h },
    { data: traces24h },
    { data: active5m },
  ] = await Promise.all([
    admin.from('traces').select('ttfb_ms, soul_updated, outcome').gte('created_at', since1h).eq('action_type', 'chat').limit(500),
    admin.from('traces').select('outcome, soul_updated').gte('created_at', since24h).eq('action_type', 'chat').limit(2000),
    admin.from('traces').select('user_id').gte('created_at', since5m).eq('action_type', 'chat').limit(500),
  ]);

  // 1. TTFB P50/P95 (last 1h)
  const castTraces1h = (traces1h ?? []) as ChatTraceRow[];
  const ttfbs = castTraces1h.map(r => r.ttfb_ms).filter((v): v is number => v !== null);
  const p50 = percentile(ttfbs, 0.5);
  const p95 = percentile(ttfbs, 0.95);

  // 2. Session completion + soul update rate (24h)
  const castTraces24h = (traces24h ?? []) as ChatTraceRow[];
  const total24h = castTraces24h.length;
  const soulUpdated24h = castTraces24h.filter(r => r.soul_updated).length;
  const completionPct = pct(soulUpdated24h, total24h);
  const soulSuccessPct = pct(soulUpdated24h, total24h);

  // 3. Active users (5 min)
  const castActive5m = (active5m ?? []) as UserIdRow[];
  const uniqueActiveUsers = new Set(castActive5m.map(r => r.user_id)).size;

  // 4. Error rate (1h)
  const errors1h = castTraces1h.filter(r => r.outcome === 'error').length;
  const errorRate = pct(errors1h, castTraces1h.length);

  // 5. Passion ignition rate (all-time)
  const [{ count: burning }, { count: eligible }] = await Promise.all([
    admin.from('student_soul').select('*', { count: 'exact', head: true }).gte('session_count', 8).lte('session_count', 12).neq('flame_stage', 'cold'),
    admin.from('student_soul').select('*', { count: 'exact', head: true }).gte('session_count', 8).lte('session_count', 12),
  ]);
  const ignitionPct = pct(burning ?? 0, eligible ?? 1);

  return [
    {
      label: 'TTFB P50 / P95',
      value: ttfbs.length > 0 ? `${p50}ms / ${p95}ms` : 'No data yet',
      sub: `Last hour · ${ttfbs.length} responses`,
      status: ttfbs.length === 0 ? 'neutral' : p95 > 4000 ? 'bad' : p95 > 2500 ? 'warn' : 'good',
      icon: '⚡',
    },
    {
      label: 'Session completion rate',
      value: `${completionPct}%`,
      sub: `Last 24h · ${total24h} sessions`,
      status: total24h === 0 ? 'neutral' : completionPct >= 70 ? 'good' : completionPct >= 40 ? 'warn' : 'bad',
      icon: '✅',
    },
    {
      label: 'Soul update success',
      value: `${soulSuccessPct}%`,
      sub: `Last 24h · ${soulUpdated24h}/${total24h} updated`,
      status: total24h === 0 ? 'neutral' : soulSuccessPct >= 80 ? 'good' : soulSuccessPct >= 50 ? 'warn' : 'bad',
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
      status: castTraces1h.length === 0 ? 'neutral' : errorRate === 0 ? 'good' : errorRate < 5 ? 'warn' : 'bad',
      icon: '🚨',
    },
    {
      label: 'Passion ignition rate',
      value: `${ignitionPct}%`,
      sub: `Students 8–12 sessions · ${burning ?? 0}/${eligible ?? 0}`,
      status: (eligible ?? 0) === 0 ? 'neutral' : ignitionPct >= 60 ? 'good' : ignitionPct >= 30 ? 'warn' : 'bad',
      icon: '🔥',
    },
  ];
}

export default async function ObservabilityPage() {
  await requireAdmin();
  const metrics = await fetchMetrics();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Observability</h1>
          <p className="text-slate-500 text-sm mt-0.5">Live health metrics · auto-refresh every 30s</p>
        </div>
        <AutoRefresh />
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className={`rounded-xl border bg-slate-900 p-5 ${statusBorder(metric.status)}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm font-medium">{metric.label}</span>
              <span className="text-xl">{metric.icon}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white font-mono">{metric.value}</span>
              <span className={`w-2 h-2 rounded-full mb-1 ${statusDot(metric.status)}`} />
            </div>
            <p className="text-slate-600 text-xs mt-1">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Cron schedule reference */}
      <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Scheduled Jobs</h2>
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
  );
}
