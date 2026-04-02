import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import { BlockWaButton, BroadcastForm } from './WaActions';

export const dynamic = 'force-dynamic';

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 5) + '***' + phone.slice(-3);
}

export default async function WhatsAppPage() {
  await requireAdmin();
  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Stats
  const { count: totalWaUsers } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('wa_phone', 'is', null);

  const { data: sessions } = await admin
    .from('whatsapp_sessions')
    .select('wa_phone, user_id, message_count_today, last_message_at, last_reset_date');

  const messagesToday = (sessions ?? [])
    .filter((s) => s.last_reset_date === today)
    .reduce((sum, s) => sum + (s.message_count_today as number), 0);

  const activeNumbers = (sessions ?? []).filter((s) => {
    const last = s.last_message_at ? new Date(s.last_message_at as string) : null;
    if (!last) return false;
    return Date.now() - last.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
  }).length;

  const unlinked = (sessions ?? []).filter((s) => !s.user_id);

  // Linked users: join profiles
  const linkedPhones = (sessions ?? [])
    .filter((s) => s.user_id)
    .map((s) => s.wa_phone as string);

  const { data: linkedProfiles } = await admin
    .from('profiles')
    .select('id, full_name, email, wa_phone, wa_saathi_id, wa_state')
    .in('wa_phone', linkedPhones.length ? linkedPhones : ['__none__']);

  const profileByPhone = new Map(
    (linkedProfiles ?? []).map((p) => [p.wa_phone as string, p])
  );

  const linkedSessions = (sessions ?? []).filter((s) => s.user_id);

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <h1 className="text-xl font-bold text-white">WhatsApp Saathi</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total WA users"    value={totalWaUsers ?? 0} />
        <StatCard label="Messages today"    value={messagesToday} />
        <StatCard label="Active numbers"    value={activeNumbers} sub="Last 7 days" />
        <StatCard label="Webhook status"    value="Live" sub="webhook connected" dot="green" />
      </div>

      {/* Linked users table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Registered WhatsApp Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-4 py-3">Profile</th>
                <th className="text-left px-4 py-3">Saathi</th>
                <th className="text-left px-4 py-3">Today / Month</th>
                <th className="text-left px-4 py-3">Last Active</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {linkedSessions.map((s) => {
                const p = profileByPhone.get(s.wa_phone as string);
                const isBlocked = (p?.wa_state as string) === 'blocked';
                return (
                  <tr key={s.wa_phone as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">
                      {maskPhone(s.wa_phone as string)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{(p?.full_name as string) ?? '—'}</div>
                      <div className="text-xs text-slate-500">{(p?.email as string) ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {(p?.wa_saathi_id as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {(s.message_count_today as number) ?? 0} / —
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.last_message_at
                        ? new Date(s.last_message_at as string).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isBlocked
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {isBlocked ? 'blocked' : 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!isBlocked && <BlockWaButton phone={s.wa_phone as string} />}
                    </td>
                  </tr>
                );
              })}
              {!linkedSessions.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No linked WhatsApp users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unlinked numbers */}
      {unlinked.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Unlinked Numbers
              <span className="ml-2 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                {unlinked.length}
              </span>
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-4 py-3">First Contact</th>
                <th className="text-left px-4 py-3">Messages</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {unlinked.map((s) => (
                <tr key={s.wa_phone as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-5 py-3 font-mono text-xs text-slate-300">
                    {maskPhone(s.wa_phone as string)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.last_message_at
                      ? new Date(s.last_message_at as string).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {(s.message_count_today as number) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <BlockWaButton phone={s.wa_phone as string} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhook Health */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Webhook Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Endpoint</div>
            <div className="font-mono text-xs text-slate-300 truncate">/functions/v1/whatsapp-webhook</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Status</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-emerald-400 text-xs font-semibold">Active</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Messages today</div>
            <div className="text-white font-semibold">{messagesToday}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Active sessions</div>
            <div className="text-white font-semibold">{(sessions ?? []).length}</div>
          </div>
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Broadcast Message</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Send a WhatsApp message to all registered users
            </p>
          </div>
          <BroadcastForm userCount={linkedSessions.length} />
        </div>
        <div className="text-xs text-amber-400/70 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2">
          Use broadcasts sparingly. Excessive messaging may cause users to block the number.
        </div>
      </div>
    </div>
  );
}
