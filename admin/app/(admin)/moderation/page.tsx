import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  await requireAdmin();
  const admin = getAdminClient();

  const { data: flags } = await admin
    .from('moderation_flags')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-white mb-6">Moderation</h1>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3.5">Date</th>
              <th className="text-left px-4 py-3.5">Type</th>
              <th className="text-left px-4 py-3.5">Content</th>
              <th className="text-left px-4 py-3.5">User</th>
              <th className="text-left px-4 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {(flags ?? []).map((f: Record<string, unknown>) => (
              <tr key={f.id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="px-5 py-3 text-slate-400 text-xs">
                  {new Date(f.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-4 py-3 text-xs text-slate-300 capitalize">{f.flag_type as string ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{f.content as string ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{(f.reported_by as string)?.slice(0, 8) ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.resolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {f.resolved ? 'Resolved' : 'Open'}
                  </span>
                </td>
              </tr>
            ))}
            {!flags?.length && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No flagged content</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
