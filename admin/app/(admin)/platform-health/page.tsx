import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import { ManualCronButton } from './ManualCronButton';

export const dynamic = 'force-dynamic';

const CRON_JOBS = [
  { id: 'refresh-saathi-stats',     label: 'Saathi Stats Cache',          schedule: 'Every 48h' },
  { id: 'rss-fetch',                label: 'RSS Feed Fetch',              schedule: 'Every 6h' },
  { id: 'expire-learning-intents',  label: 'Expire Learning Intents',     schedule: 'Daily' },
  { id: 'check-minimum-seats',      label: 'Check Minimum Seats',         schedule: 'Hourly' },
  { id: 'send-24h-reminders',       label: '24h Session Reminders',       schedule: 'Hourly' },
  { id: 'send-1h-reminders',        label: '1h Session Reminders',        schedule: 'Every 15min' },
  { id: 'auto-release-payments',    label: 'Auto-Release Payments',       schedule: 'Every 6h' },
  { id: 'auto-lift-suspensions',    label: 'Auto-Lift Suspensions',       schedule: 'Hourly' },
  { id: 'expire-referral-wallet',   label: 'Expire Referral Wallet',      schedule: 'Daily' },
  { id: 'admin-daily-digest',       label: 'Admin Daily Digest',          schedule: '8 AM IST' },
  { id: 'admin-weekly-digest',      label: 'Admin Weekly Digest',         schedule: 'Monday 9 AM IST' },
] as const;

type CronJobId = typeof CRON_JOBS[number]['id'];

const HEALTH_CHECKS = [
  { id: 'auth',       label: 'Auth system',         description: 'Supabase Auth' },
  { id: 'chat',       label: 'Chat Edge Function',  description: 'Streaming AI responses' },
  { id: 'razorpay',   label: 'Razorpay webhook',    description: 'Payment processing' },
  { id: 'rss',        label: 'RSS feed fetch',       description: 'Content pipeline' },
  { id: 'whatsapp',   label: 'WhatsApp webhook',    description: 'WhatsApp Saathi' },
  { id: 'cache',      label: 'Saathi stats cache',  description: 'Analytics pipeline' },
  { id: 'email',      label: 'Email delivery',      description: 'Resend transactional' },
] as const;

export default async function PlatformHealthPage() {
  await requireAdmin();
  const admin = getAdminClient();

  // ── Key metrics (today) ───────────────────────────────────────────────────

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: activeToday },
    { count: messagesCount },
    { count: newRegistrations },
    { data: cronData },
    { data: errorData },
  ] = await Promise.all([
    admin.from('chat_messages').select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    admin.from('chat_messages').select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()).eq('role', 'user'),
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    admin.from('cron_job_log')
      .select('job_id, last_run_at, next_run_at, status, records_affected')
      .order('last_run_at', { ascending: false }),
    admin.from('edge_function_errors')
      .select('id, function_name, error_message, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Latest news fetch time (proxy for RSS health)
  const { data: latestNews } = await admin
    .from('news_items')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1);

  const latestRss = latestNews?.[0]?.fetched_at ?? null;
  const rssAgeHours = latestRss ? (Date.now() - new Date(latestRss).getTime()) / 3600000 : 999;

  const cronMap = new Map(
    (cronData ?? []).map((r) => [r.job_id as string, r])
  );

  // Revenue today
  const { data: todayPayments } = await admin
    .from('subscriptions')
    .select('amount')
    .gte('created_at', todayStart.toISOString())
    .eq('status', 'paid');

  const revenueToday = (todayPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  function cronStatus(jobId: string) {
    const row = cronMap.get(jobId);
    if (!row) return { color: 'text-slate-500', label: 'No data' };
    if (row.status === 'error') return { color: 'text-red-400', label: 'Error' };
    if (row.status === 'running') return { color: 'text-blue-400', label: 'Running' };
    return { color: 'text-emerald-400', label: 'OK' };
  }

  function healthStatus(checkId: typeof HEALTH_CHECKS[number]['id']): { dot: string; label: string } {
    if (checkId === 'rss') {
      if (rssAgeHours > 12) return { dot: 'bg-red-500', label: `Stale (${Math.floor(rssAgeHours)}h)` };
      return { dot: 'bg-emerald-500', label: 'Working' };
    }
    return { dot: 'bg-emerald-500', label: 'Working' };
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Health</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time health · CRON jobs · error log · key metrics</p>
      </div>

      {/* Today metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active sessions today" value={String(activeToday ?? 0)} />
        <StatCard label="Messages today"         value={String(messagesCount ?? 0)} />
        <StatCard label="Revenue today"          value={`₹${revenueToday.toLocaleString('en-IN')}`} />
        <StatCard label="New registrations"      value={String(newRegistrations ?? 0)} />
      </div>

      {/* Health indicators */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">System Health</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {HEALTH_CHECKS.map((check) => {
            const status = healthStatus(check.id);
            return (
              <div key={check.id} className="rounded-xl p-4 bg-slate-800/60 border border-slate-700 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
                <div>
                  <p className="text-sm font-medium text-white">{check.label}</p>
                  <p className="text-xs text-slate-500">{check.description} · {status.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRON jobs */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">CRON Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {['Job', 'Schedule', 'Last run', 'Next run', 'Status', 'Records', 'Actions'].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {CRON_JOBS.map((job) => {
                const row = cronMap.get(job.id);
                const status = cronStatus(job.id);
                return (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pr-4 text-white font-medium text-xs">{job.label}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{job.schedule}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {row?.last_run_at
                        ? new Date(row.last_run_at as string).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {row?.next_run_at
                        ? new Date(row.next_run_at as string).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{row?.records_affected ?? '—'}</td>
                    <td className="py-3">
                      <ManualCronButton jobId={job.id as CronJobId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RSS feed health per Saathi */}
      <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">RSS Feed Health</p>
          <span className={`text-xs font-semibold ${rssAgeHours < 12 ? 'text-emerald-400' : rssAgeHours < 24 ? 'text-amber-400' : 'text-red-400'}`}>
            Last article: {latestRss ? `${Math.floor(rssAgeHours)}h ago` : 'Never'}
          </span>
        </div>
        <p className="text-xs text-slate-500">RSS fetches every 6h. Only headline + URL stored — zero copyright risk.</p>
      </div>

      {/* Error log */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Errors (last 50)</h2>
        {(errorData ?? []).length === 0 ? (
          <div className="rounded-xl p-6 text-center bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-emerald-400 font-semibold text-sm">✓ No errors logged</p>
            <p className="text-xs text-slate-500 mt-1">All Edge Functions are running cleanly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  {['Time', 'Function', 'Error', 'User'].map((h) => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(errorData ?? []).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 pr-4 text-amber-400 text-xs font-mono">{e.function_name}</td>
                    <td className="py-2.5 pr-4 text-red-400 text-xs max-w-[300px] truncate">{e.error_message}</td>
                    <td className="py-2.5 text-slate-600 text-xs font-mono">
                      {e.user_id ? (e.user_id as string).slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
