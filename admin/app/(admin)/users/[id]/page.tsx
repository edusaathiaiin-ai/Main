import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { CopyField } from '@/components/CopyField';

export const dynamic = 'force-dynamic';

const FOUNDING_PERIOD_END = new Date(process.env.FOUNDING_PERIOD_END ?? '2026-09-01');
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function isFoundingMember(createdAt: string): boolean {
  const d = new Date(createdAt);
  return d < FOUNDING_PERIOD_END && Date.now() - d.getTime() < SIXTY_DAYS_MS;
}

function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  inactive: 'bg-slate-700 text-slate-400',
  cancelled: 'bg-red-500/20 text-red-400',
  failed: 'bg-orange-500/20 text-orange-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  created: 'bg-slate-700 text-slate-400',
  refunded: 'bg-blue-500/20 text-blue-400',
};

export default async function SubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const admin = getAdminClient();

  // Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  // Fetch payment history
  const { data: payments } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Fetch usage stats
  const [
    { count: totalSessions },
    { count: saathisJoined },
    { count: checkinsCount },
    { data: lastMessage },
  ] = await Promise.all([
    admin.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('student_soul').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('checkin_results').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('chat_messages').select('created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(1),
  ]);

  const lastActive = lastMessage?.[0]?.created_at ?? null;
  const founding = isFoundingMember(profile.created_at);
  const days = daysRemaining(profile.subscription_expires_at);
  const rzpBaseUrl = process.env.NEXT_PUBLIC_RAZORPAY_DASHBOARD_URL ?? 'https://dashboard.razorpay.com/app/payments';

  return (
    <div className="p-6 max-w-5xl">
      <Link href="/users" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">← Back to users</Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.full_name ?? 'Unnamed user'}</h1>
          <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
        </div>
        {founding && (
          <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-500/30">
            ⭐ Founding Member
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* ── Personal ─────────────────────────────────────────────── */}
        <Section title="Personal">
          <Row label="Role">
            <span className="capitalize text-white">{profile.role ?? '—'}</span>
          </Row>
          <Row label="Primary Saathi">
            <span className="text-white">{profile.primary_saathi_id ?? '—'}</span>
          </Row>
          <Row label="Country">
            <span className="text-white">{profile.country_code ?? 'India'}</span>
          </Row>
          <Row label="Account created">
            <span className="text-white">{fmtDate(profile.created_at)}</span>
          </Row>
        </Section>

        {/* ── Subscription ─────────────────────────────────────────── */}
        <Section title="Subscription">
          <Row label="Plan">
            <span className="text-white capitalize">{profile.plan_id?.replace(/-/g, ' ') ?? 'free'}</span>
          </Row>
          <Row label="Status">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[profile.subscription_status] ?? STATUS_BADGE.inactive}`}>
              {profile.subscription_status}
            </span>
          </Row>
          {profile.subscription_expires_at && (
            <>
              <Row label="Expires on">
                <span className="text-white">{fmtDate(profile.subscription_expires_at)}</span>
              </Row>
              <Row label="Days remaining">
                <span className={`text-white font-semibold ${days === 0 ? 'text-red-400' : ''}`}>
                  {days === 0 ? 'Expired' : days !== null ? `${days} days` : '—'}
                </span>
              </Row>
            </>
          )}
          {founding && (
            <Row label="Founding member">
              <span className="text-amber-400 text-xs font-semibold">Yes — 60-day grace active</span>
            </Row>
          )}
        </Section>

        {/* ── Usage ────────────────────────────────────────────────── */}
        <Section title="Usage">
          <Row label="Total chat sessions"><span className="text-white">{totalSessions ?? 0}</span></Row>
          <Row label="Saathis joined"><span className="text-white">{saathisJoined ?? 0}</span></Row>
          <Row label="Check-ins completed"><span className="text-white">{checkinsCount ?? 0}</span></Row>
          <Row label="Last active">
            <span className="text-white">{lastActive ? fmtDate(lastActive) : 'Never'}</span>
          </Row>
        </Section>
      </div>

      {/* ── Payment History ────────────────────────────────────────── */}
      <Section title="Payment History">
        {!payments?.length ? (
          <p className="text-slate-500 text-sm py-4">No payment records found.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left py-2.5 pr-6">Order ID</th>
                  <th className="text-left py-2.5 pr-6">Payment ID</th>
                  <th className="text-left py-2.5 pr-6">Subscription ID</th>
                  <th className="text-left py-2.5 pr-4">Amount</th>
                  <th className="text-left py-2.5 pr-4">Date</th>
                  <th className="text-left py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Record<string, unknown>) => (
                  <tr key={p.id as string} className="border-b border-slate-800/40">
                    <td className="py-3 pr-6">
                      <CopyField value={p.razorpay_order_id as string | null} />
                    </td>
                    <td className="py-3 pr-6">
                      {p.razorpay_payment_id ? (
                        <div className="flex items-center gap-2">
                          <CopyField value={p.razorpay_payment_id as string} />
                          <a
                            href={`${rzpBaseUrl}/${p.razorpay_payment_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Razorpay dashboard"
                            className="text-amber-400 hover:text-amber-300 text-xs whitespace-nowrap"
                          >
                            ↗ RZP
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-6">
                      <CopyField value={p.razorpay_subscription_id as string | null} />
                    </td>
                    <td className="py-3 pr-4 text-white font-medium">
                      {p.amount_inr ? `₹${(p.amount_inr as number).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {fmtDate(p.created_at as string)}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status as string] ?? STATUS_BADGE.inactive}`}>
                        {p.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <h2 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-sm">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  );
}
