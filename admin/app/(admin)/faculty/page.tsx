import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import { VerifyButton, RejectButton, EmeritusButton, RevokeButton } from './FacultyActions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ tab?: string }>;

const STATUS_CHIP: Record<string, string> = {
  verified:  'bg-emerald-500/20 text-emerald-400',
  pending:   'bg-amber-500/20 text-amber-400',
  rejected:  'bg-red-500/20 text-red-400',
};

export default async function FacultyPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { tab = 'pending' } = await searchParams;
  const admin = getAdminClient();

  // Base: join faculty_profiles ← profiles
  const { data: allFaculty } = await admin
    .from('faculty_profiles')
    .select(`
      user_id,
      institution,
      department,
      designation,
      verification_status,
      is_emeritus,
      total_sessions_completed,
      total_earned_paise,
      session_active,
      created_at,
      profiles!inner ( full_name, email, plan_id, primary_saathi_id )
    `)
    .order('created_at', { ascending: false });

  const pending  = (allFaculty ?? []).filter((f) => (f.verification_status as string) === 'pending' && !(f.is_emeritus as boolean));
  const all      = (allFaculty ?? []).filter((f) => !(f.is_emeritus as boolean));
  const emeritus = (allFaculty ?? []).filter((f) => f.is_emeritus as boolean);

  // Payouts: faculty with earned but not yet paid
  const { data: pendingPayouts } = await admin
    .from('faculty_sessions')
    .select('faculty_id, faculty_payout_paise, fee_paise, status, payout_status, completed_at')
    .eq('payout_status', 'pending')
    .eq('status', 'completed');

  const payoutByFaculty = new Map<string, number>();
  for (const s of pendingPayouts ?? []) {
    const fid = s.faculty_id as string;
    payoutByFaculty.set(fid, (payoutByFaculty.get(fid) ?? 0) + (s.faculty_payout_paise as number));
  }

  // Faculty UPI IDs
  const { data: facultyExtras } = await admin
    .from('faculty_profiles')
    .select('user_id, upi_id, profiles!inner(full_name, email)')
    .in('user_id', Array.from(payoutByFaculty.keys()).length ? Array.from(payoutByFaculty.keys()) : ['__none__']);

  const TAB_ITEMS = tab === 'all' ? all : tab === 'emeritus' ? emeritus : tab === 'payouts' ? [] : pending;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Faculty</h1>
      </div>

      {/* Counts row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending verification" value={pending.length}  dot={pending.length > 0 ? 'amber' : undefined} />
        <StatCard label="All faculty"          value={all.length} />
        <StatCard label="Emeritus"             value={emeritus.length} />
        <StatCard label="Payouts pending"      value={payoutByFaculty.size} dot={payoutByFaculty.size > 0 ? 'amber' : undefined} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
        {[
          { key: 'pending',  label: `Pending (${pending.length})` },
          { key: 'all',      label: 'All Faculty' },
          { key: 'emeritus', label: 'Emeritus' },
          { key: 'payouts',  label: 'Payouts' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={`/faculty?tab=${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Pending tab */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pending.length === 0 && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">
              No pending applications
            </div>
          )}
          {pending.map((f) => {
            const profile = f.profiles as unknown as Record<string, unknown>;
            return (
              <div
                key={f.user_id as string}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="text-white font-semibold">{(profile?.full_name as string) ?? '—'}</div>
                    <div className="text-slate-400 text-sm">{profile?.email as string}</div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      <span>🏛️ {(f.institution as string) ?? '—'}</span>
                      <span>🎓 {(f.department as string) ?? '—'}</span>
                      <span>🪙 {(f.designation as string) ?? '—'}</span>
                      <span>📅 {f.created_at ? new Date(f.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <VerifyButton
                      userId={f.user_id as string}
                      name={(profile?.full_name as string) ?? 'Faculty'}
                      institution={(f.institution as string) ?? ''}
                    />
                    <RejectButton
                      userId={f.user_id as string}
                      name={(profile?.full_name as string) ?? 'Faculty'}
                    />
                    <EmeritusButton
                      userId={f.user_id as string}
                      name={(profile?.full_name as string) ?? 'Faculty'}
                      institution={(f.institution as string) ?? ''}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Faculty tab */}
      {tab === 'all' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-4 py-3">Institution</th>
                  <th className="text-left px-4 py-3">Saathi</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Sessions</th>
                  <th className="text-left px-4 py-3">Earned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {TAB_ITEMS.map((f) => {
                  const profile = f.profiles as unknown as Record<string, unknown>;
                  const status = f.verification_status as string;
                  return (
                    <tr key={f.user_id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-white">{(profile?.full_name as string) ?? '—'}</div>
                        <div className="text-xs text-slate-500">{profile?.email as string}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{(f.institution as string) ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{(profile?.primary_saathi_id as string) ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[status] ?? STATUS_CHIP.pending}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 capitalize">
                        {((profile?.plan_id as string) ?? 'free').replace(/-/g, ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {(f.total_sessions_completed as number) ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        ₹{(((f.total_earned_paise as number) ?? 0) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5">
                        {status === 'verified' && (
                          <RevokeButton
                            userId={f.user_id as string}
                            name={(profile?.full_name as string) ?? 'Faculty'}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!TAB_ITEMS.length && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 text-sm">No faculty found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emeritus tab */}
      {tab === 'emeritus' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-4 py-3">Former Institution</th>
                  <th className="text-left px-4 py-3">Sessions</th>
                  <th className="text-left px-4 py-3">Earned</th>
                </tr>
              </thead>
              <tbody>
                {emeritus.map((f) => {
                  const profile = f.profiles as unknown as Record<string, unknown>;
                  return (
                    <tr key={f.user_id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-xs font-bold px-2 py-0.5 bg-amber-500/10 rounded-full">Emeritus</span>
                          <span className="text-white text-sm">{(profile?.full_name as string) ?? '—'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{profile?.email as string}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{(f.institution as string) ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">{(f.total_sessions_completed as number) ?? 0}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        ₹{(((f.total_earned_paise as number) ?? 0) / 100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
                {!emeritus.length && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-sm">No emeritus faculty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts tab */}
      {tab === 'payouts' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Pending Faculty Payouts</h2>
            <div className="text-xs text-slate-400">
              Total: ₹{(Array.from(payoutByFaculty.values()).reduce((a, b) => a + b, 0) / 100).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Faculty</th>
                  <th className="text-left px-4 py-3">Amount owed</th>
                  <th className="text-left px-4 py-3">Sessions</th>
                  <th className="text-left px-4 py-3">UPI ID</th>
                </tr>
              </thead>
              <tbody>
                {(facultyExtras ?? []).map((fe) => {
                  const profile = fe.profiles as unknown as Record<string, unknown>;
                  const owed = payoutByFaculty.get(fe.user_id as string) ?? 0;
                  const sessionCount = (pendingPayouts ?? []).filter(
                    (s) => s.faculty_id === fe.user_id
                  ).length;
                  return (
                    <tr key={fe.user_id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-white">{(profile?.full_name as string) ?? '—'}</div>
                        <div className="text-xs text-slate-500">{profile?.email as string}</div>
                      </td>
                      <td className="px-4 py-3.5 text-white font-semibold">
                        ₹{(owed / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{sessionCount}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                        {(fe.upi_id as string) ?? '—'}
                      </td>
                    </tr>
                  );
                })}
                {payoutByFaculty.size === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-sm">No pending payouts</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
