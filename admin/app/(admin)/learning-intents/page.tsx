import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import { IntentActions } from './IntentActions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ tab?: string }>;

function statusChip(status: string) {
  const map: Record<string, string> = {
    open:      'bg-emerald-500/20 text-emerald-400',
    fulfilled: 'bg-blue-500/20 text-blue-400',
    expired:   'bg-slate-600/40 text-slate-400',
    removed:   'bg-red-500/20 text-red-400',
  };
  return map[status] ?? 'bg-slate-700 text-slate-400';
}

export default async function LearningIntentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { tab = 'open' } = await searchParams;
  const admin = getAdminClient();

  // ── Stats ─────────────────────────────────────────────────────────────────

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    { count: openCount },
    { count: fulfilledWeek },
    { count: expiringCount },
  ] = await Promise.all([
    admin.from('learning_intents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('learning_intents').select('*', { count: 'exact', head: true }).eq('status', 'fulfilled')
      .gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    admin.from('learning_intents').select('*', { count: 'exact', head: true }).eq('status', 'open')
      .lte('expires_at', in7Days.toISOString()),
  ]);

  // Most wanted topic
  const { data: topicData } = await admin
    .from('learning_intents')
    .select('topic, joiner_count')
    .eq('status', 'open')
    .order('joiner_count', { ascending: false })
    .limit(1);
  const mostWanted = topicData?.[0]?.topic ?? '—';

  // ── Tab data ──────────────────────────────────────────────────────────────

  let intents: Record<string, unknown>[] = [];

  if (tab === 'open' || tab === 'heatmap') {
    const { data } = await admin
      .from('learning_intents')
      .select('id, topic, description, vertical_id, status, joiner_count, format_preference, depth_preference, urgency, expires_at, created_at, user_id')
      .eq('status', 'open')
      .order('joiner_count', { ascending: false })
      .limit(100);
    intents = (data ?? []) as Record<string, unknown>[];
  }

  if (tab === 'fulfilled') {
    const { data } = await admin
      .from('learning_intents')
      .select('id, topic, vertical_id, status, joiner_count, updated_at, created_at, user_id')
      .eq('status', 'fulfilled')
      .order('updated_at', { ascending: false })
      .limit(100);
    intents = (data ?? []) as Record<string, unknown>[];
  }

  if (tab === 'expired') {
    const { data } = await admin
      .from('learning_intents')
      .select('id, topic, vertical_id, status, joiner_count, expires_at, created_at, user_id')
      .eq('status', 'expired')
      .order('expires_at', { ascending: false })
      .limit(100);
    intents = (data ?? []) as Record<string, unknown>[];
  }

  const TABS = [
    { id: 'open',      label: '🟢 Open Intents' },
    { id: 'heatmap',   label: '🔥 Demand Heatmap' },
    { id: 'fulfilled', label: '✅ Fulfilled' },
    { id: 'expired',   label: '⏰ Expired' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Learning Intents</h1>
        <p className="text-sm text-slate-400 mt-1">What students want to learn · demand signals for content strategy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open intents"          value={String(openCount ?? 0)} />
        <StatCard label="Fulfilled this week"    value={String(fulfilledWeek ?? 0)} />
        <StatCard label="Expiring in 7 days"     value={String(expiringCount ?? 0)} />
        <StatCard label="Most wanted topic"      value={mostWanted} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <a key={t.id} href={`?tab=${t.id}`}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </a>
        ))}
      </div>

      {/* ── Demand Heatmap ─────────────────────────────────────────────────── */}
      {tab === 'heatmap' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sorted by demand · use this for content strategy</p>
          {intents.map((intent) => {
            const joiners = intent.joiner_count as number;
            const pct = Math.min((joiners / Math.max(...intents.map((i) => i.joiner_count as number), 1)) * 100, 100);
            return (
              <div key={intent.id as string} className="rounded-xl p-4 bg-slate-800/60 border border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="font-semibold text-white">{intent.topic as string}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(intent.vertical_id as string) || 'Any'} · {joiners} joined
                      {' · '}Open since {new Date(intent.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-amber-400">{joiners}</p>
                    <p className="text-[10px] text-slate-500">students</p>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-700">
                  <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <IntentActions intentId={intent.id as string} currentStatus={intent.status as string} topic={intent.topic as string} verticalId={(intent.vertical_id as string) ?? ''} />
                </div>
              </div>
            );
          })}
          {intents.length === 0 && <p className="text-center text-slate-600 py-12">No open intents</p>}
        </div>
      )}

      {/* ── Open Intents Table ─────────────────────────────────────────────── */}
      {tab === 'open' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {['Topic', 'Saathi', 'Joiners', 'Format', 'Depth', 'Urgency', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {intents.map((intent) => {
                const expiresDate = intent.expires_at ? new Date(intent.expires_at as string) : null;
                const daysLeft = expiresDate ? Math.ceil((expiresDate.getTime() - Date.now()) / 86400000) : null;
                return (
                  <tr key={intent.id as string} className="hover:bg-slate-800/40">
                    <td className="py-3 pr-4 text-white font-medium text-xs max-w-[200px]">
                      <p className="truncate">{intent.topic as string}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{(intent.vertical_id as string) || 'Any'}</td>
                    <td className="py-3 pr-4">
                      <span className="text-amber-400 font-bold text-sm">{intent.joiner_count as number}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs capitalize">{(intent.format_preference as string) || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs capitalize">{(intent.depth_preference as string) || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs capitalize">{(intent.urgency as string)?.replace(/_/g, ' ') || '—'}</td>
                    <td className="py-3 pr-4 text-xs" style={{ color: daysLeft !== null && daysLeft < 7 ? '#F87171' : 'rgb(148 163 184)' }}>
                      {daysLeft === null ? '—' : daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                    </td>
                    <td className="py-3">
                      <IntentActions intentId={intent.id as string} currentStatus={intent.status as string} topic={intent.topic as string} verticalId={(intent.vertical_id as string) ?? ''} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {intents.length === 0 && <p className="text-center text-slate-600 py-12">No open intents</p>}
        </div>
      )}

      {/* ── Fulfilled ────────────────────────────────────────────────────── */}
      {tab === 'fulfilled' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {['Topic', 'Saathi', 'Joiners', 'Fulfilled', 'Status'].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {intents.map((intent) => (
                <tr key={intent.id as string} className="hover:bg-slate-800/40">
                  <td className="py-3 pr-4 text-white font-medium text-xs">{intent.topic as string}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{(intent.vertical_id as string) || 'Any'}</td>
                  <td className="py-3 pr-4 text-amber-400 font-bold text-sm">{intent.joiner_count as number}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {intent.updated_at ? new Date(intent.updated_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusChip(intent.status as string)}`}>
                      {intent.status as string}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {intents.length === 0 && <p className="text-center text-slate-600 py-12">No fulfilled intents</p>}
        </div>
      )}

      {/* ── Expired ──────────────────────────────────────────────────────── */}
      {tab === 'expired' && (
        <div className="space-y-3">
          {intents.map((intent) => (
            <div key={intent.id as string} className="rounded-xl p-4 bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white text-sm">{intent.topic as string}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(intent.vertical_id as string) || 'Any'} · {intent.joiner_count as number} joined
                  · Expired {intent.expires_at ? new Date(intent.expires_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </p>
              </div>
              <IntentActions intentId={intent.id as string} currentStatus={intent.status as string} topic={intent.topic as string} verticalId={(intent.vertical_id as string) ?? ''} expired />
            </div>
          ))}
          {intents.length === 0 && <p className="text-center text-slate-600 py-12">No expired intents</p>}
        </div>
      )}
    </div>
  );
}
