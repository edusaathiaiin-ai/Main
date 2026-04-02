import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import { RemoveButton } from './RequestActions';

export const dynamic = 'force-dynamic';

const STATUS_CHIP: Record<string, string> = {
  pending:      'bg-amber-500/20 text-amber-400',
  acknowledged: 'bg-blue-500/20 text-blue-400',
  accepted:     'bg-emerald-500/20 text-emerald-400',
  scheduled:    'bg-emerald-500/30 text-emerald-300',
  declined:     'bg-slate-700 text-slate-400',
  completed:    'bg-slate-600 text-slate-300',
};

export default async function RequestsPage() {
  await requireAdmin();
  const admin = getAdminClient();

  const { data: requests } = await admin
    .from('lecture_requests')
    .select(`
      id,
      subject,
      message,
      upvote_count,
      status,
      is_public,
      created_at,
      student:student_id ( full_name, email ),
      faculty:faculty_id ( full_name, email )
    `)
    .eq('is_public', true)
    .order('upvote_count', { ascending: false })
    .limit(200);

  const all       = requests ?? [];
  const pending   = all.filter((r) => (r.status as string) === 'pending');
  const converted = all.filter((r) =>
    ['accepted', 'scheduled', 'completed'].includes(r.status as string)
  );

  // Top topic by upvotes
  const topRequest = all[0];
  const topTopic   = topRequest
    ? `${(topRequest.subject as string).slice(0, 40)} — ${topRequest.upvote_count as number} upvotes`
    : '—';

  // Demand heatmap: aggregate by subject (top 10)
  const subjectVotes = new Map<string, number>();
  for (const r of all) {
    const sub = r.subject as string;
    subjectVotes.set(sub, (subjectVotes.get(sub) ?? 0) + ((r.upvote_count as number) ?? 1));
  }
  const heatmap = Array.from(subjectVotes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const maxVotes = heatmap[0]?.[1] ?? 1;

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <h1 className="text-xl font-bold text-white">Lecture Requests</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total requests"    value={all.length} />
        <StatCard label="Pending"           value={pending.length} dot={pending.length > 0 ? 'amber' : undefined} />
        <StatCard label="Converted"         value={converted.length} />
        <StatCard label="Top requested"     value="" sub={topTopic} />
      </div>

      {/* Requests table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">
            All Requests — sorted by upvotes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Topic</th>
                <th className="text-left px-4 py-3">Faculty</th>
                <th className="text-right px-4 py-3">Upvotes</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {all.map((r) => {
                const student = r.student as unknown as Record<string, unknown>;
                const faculty = r.faculty as unknown as Record<string, unknown>;
                const status  = r.status as string;
                return (
                  <tr key={r.id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <div className="text-sm text-white truncate">{r.subject as string}</div>
                      <div className="text-xs text-slate-500 truncate">{(r.message as string)?.slice(0, 60)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {(faculty?.full_name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-amber-400 font-bold text-sm">
                        ▲ {r.upvote_count as number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {(student?.full_name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {r.created_at
                        ? new Date(r.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[status] ?? STATUS_CHIP.pending}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {status !== 'declined' && (
                        <RemoveButton requestId={r.id as string} subject={r.subject as string} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {!all.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No requests yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demand Heatmap */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Demand Heatmap</h2>
        <p className="text-xs text-slate-500 mb-4">
          Topics by total upvotes — use for faculty recruitment signals
        </p>
        <div className="space-y-3">
          {heatmap.map(([topic, votes]) => {
            const pct = Math.round((votes / maxVotes) * 100);
            return (
              <div key={topic}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 max-w-[360px] truncate">{topic}</span>
                  <span className="text-amber-400 font-semibold shrink-0 ml-2">{votes} upvotes</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {heatmap.length === 0 && (
            <p className="text-slate-500 text-sm">No demand data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
