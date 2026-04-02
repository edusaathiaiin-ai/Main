import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { StatCard } from '@/components/ui/StatCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmtInr(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtInrFromRupees(rupees: number) {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export default async function FinancialsPage() {
  await requireAdmin();
  const admin = getAdminClient();

  // ── Student subscription MRR ──────────────────────────────────────────────
  const { data: monthlyActive } = await admin
    .from('profiles')
    .select('plan_id')
    .eq('subscription_status', 'active')
    .in('plan_id', ['plus-monthly', 'institution']);

  let studentMrr = 0;
  let institutionMrr = 0;
  for (const p of monthlyActive ?? []) {
    if (p.plan_id === 'plus-monthly') studentMrr += 199;
    else if (p.plan_id === 'institution') institutionMrr += 4999;
  }
  const { data: annualActive } = await admin
    .from('profiles')
    .select('plan_id')
    .eq('subscription_status', 'active')
    .eq('plan_id', 'plus-annual');
  const annualMrr = Math.round(((annualActive?.length ?? 0) * 1499) / 12);
  const totalStudentMrr = studentMrr + annualMrr;

  // ── Faculty session marketplace ──────────────────────────────────────────
  const { data: sessionsThisMonth } = await admin
    .from('faculty_sessions')
    .select('fee_paise, platform_fee_paise, faculty_payout_paise, payout_status, status')
    .eq('status', 'completed')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const sessionGmv      = (sessionsThisMonth ?? []).reduce((s, r) => s + ((r.fee_paise as number) ?? 0), 0);
  const sessionPlatform = (sessionsThisMonth ?? []).reduce((s, r) => s + ((r.platform_fee_paise as number) ?? 0), 0);

  // ── Live sessions marketplace ────────────────────────────────────────────
  const { data: liveRevenue } = await admin
    .from('live_sessions')
    .select('price_per_seat_paise, seats_booked, status')
    .eq('status', 'completed')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const liveGmv = (liveRevenue ?? []).reduce(
    (s, r) => s + ((r.price_per_seat_paise as number) ?? 0) * ((r.seats_booked as number) ?? 0),
    0
  );
  const livePlatform = Math.round(liveGmv * 0.2);

  const totalMarketplace = sessionPlatform + livePlatform;
  const totalMrr = totalStudentMrr + institutionMrr + totalMarketplace / 100; // already in rupees except marketplace

  // ── Pending faculty payouts ──────────────────────────────────────────────
  const { data: pendingPayouts } = await admin
    .from('faculty_sessions')
    .select(`
      id,
      faculty_payout_paise,
      faculty:faculty_id ( id, full_name, email ),
      faculty_profiles!inner ( upi_id, last_payout_at )
    `)
    .eq('payout_status', 'pending')
    .eq('status', 'completed');

  const payoutByFaculty = new Map<string, { name: string; email: string; upi: string; amountPaise: number; count: number; lastPayout: string | null }>();
  for (const s of pendingPayouts ?? []) {
    const f = s.faculty as unknown as Record<string, unknown>;
    const fp = s.faculty_profiles as unknown as Record<string, unknown>;
    const fid = f?.id as string;
    if (!fid) continue;
    const existing = payoutByFaculty.get(fid);
    if (existing) {
      existing.amountPaise += (s.faculty_payout_paise as number) ?? 0;
      existing.count += 1;
    } else {
      payoutByFaculty.set(fid, {
        name: (f.full_name as string) ?? '—',
        email: (f.email as string) ?? '—',
        upi: (fp?.upi_id as string) ?? '—',
        amountPaise: (s.faculty_payout_paise as number) ?? 0,
        count: 1,
        lastPayout: (fp?.last_payout_at as string) ?? null,
      });
    }
  }

  // ── Refunds ──────────────────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: refunds } = await admin
    .from('subscriptions')
    .select('id, amount_inr, created_at, user_id, plan_id')
    .eq('status', 'refunded')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50);

  // ── Last 30 days revenue trend (daily buckets) ────────────────────────────
  const { data: recentSubs } = await admin
    .from('subscriptions')
    .select('amount_inr, created_at, plan_id')
    .eq('status', 'paid')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });

  // Build 30-day bucket map
  const dailyRevenue = new Map<string, number>();
  for (const s of recentSubs ?? []) {
    const date = new Date(s.created_at as string).toISOString().slice(0, 10);
    dailyRevenue.set(date, (dailyRevenue.get(date) ?? 0) + ((s.amount_inr as number) ?? 0));
  }
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, amount: dailyRevenue.get(key) ?? 0 };
  });
  const maxDaily = Math.max(...last30.map((d) => d.amount), 1);

  // ── TDS (10% on faculty earnings above ₹30k/quarter) ────────────────────
  const { data: facultyEarnings } = await admin
    .from('faculty_profiles')
    .select(`
      user_id,
      total_earned_paise,
      profiles!inner ( full_name, email )
    `)
    .gt('total_earned_paise', 0)
    .order('total_earned_paise', { ascending: false })
    .limit(50);

  const TDS_THRESHOLD_PAISE = 3_000_000; // ₹30,000 in paise
  const TDS_RATE = 0.1;

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <h1 className="text-xl font-bold text-white">Financials</h1>

      {/* MRR Overview */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Monthly Recurring Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Student subscriptions" value={fmtInrFromRupees(totalStudentMrr)} sub="Monthly + annual/12" accent />
          <StatCard label="Institution plans"     value={fmtInrFromRupees(institutionMrr)} />
          <StatCard label="Marketplace (this mo)" value={fmtInr(sessionPlatform + livePlatform)} sub="Sessions + live 20% cut" />
          <StatCard
            label="Total MRR"
            value={`₹${Math.round(totalStudentMrr + institutionMrr + (sessionPlatform + livePlatform) / 100).toLocaleString('en-IN')}`}
            accent
          />
        </div>
      </div>

      {/* Revenue trend — last 30 days */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Revenue trend — last 30 days</h2>
        <div className="flex items-end gap-0.5 h-24">
          {last30.map((d) => {
            const pct = Math.round((d.amount / maxDaily) * 100);
            return (
              <div
                key={d.date}
                title={`${d.date}: ₹${d.amount.toLocaleString('en-IN')}`}
                className="flex-1 bg-amber-500 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>{last30[0]?.date}</span>
          <span>{last30[29]?.date}</span>
        </div>
      </div>

      {/* Pending payouts */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Pending Faculty Payouts
            {payoutByFaculty.size > 0 && (
              <span className="ml-2 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                {payoutByFaculty.size}
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400">
            Total: {fmtInr(Array.from(payoutByFaculty.values()).reduce((s, v) => s + v.amountPaise, 0))}
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
                <th className="text-left px-4 py-3">Last payout</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(payoutByFaculty.entries()).map(([fid, data]) => (
                <tr key={fid} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-white">{data.name}</div>
                    <div className="text-xs text-slate-500">{data.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-white font-semibold">{fmtInr(data.amountPaise)}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{data.count}</td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-400">{data.upi}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {data.lastPayout
                      ? new Date(data.lastPayout).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                      : 'Never'}
                  </td>
                </tr>
              ))}
              {payoutByFaculty.size === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No pending payouts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refunds */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Refunds — last 30 days</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody>
              {(refunds ?? []).map((r) => (
                <tr key={r.id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(r.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${r.user_id as string}`} className="text-xs text-amber-400 hover:text-amber-300">
                      {(r.user_id as string).slice(0, 8)} →
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white text-xs font-medium">
                    ₹{(r.amount_inr as number)?.toLocaleString('en-IN') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">
                    {((r.plan_id as string) ?? '—').replace(/-/g, ' ')}
                  </td>
                </tr>
              ))}
              {!refunds?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No refunds in last 30 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TDS Log */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">TDS Log — Faculty</h2>
          <span className="text-xs text-slate-500">10% on earnings &gt; ₹30,000</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Faculty</th>
                <th className="text-left px-4 py-3">Gross earned</th>
                <th className="text-left px-4 py-3">TDS rate</th>
                <th className="text-left px-4 py-3">TDS deducted</th>
                <th className="text-left px-4 py-3">Net paid</th>
              </tr>
            </thead>
            <tbody>
              {(facultyEarnings ?? []).map((fe) => {
                const profile = fe.profiles as unknown as Record<string, unknown>;
                const grossPaise = (fe.total_earned_paise as number) ?? 0;
                const tdsApplies = grossPaise >= TDS_THRESHOLD_PAISE;
                const tdsPaise   = tdsApplies ? Math.round(grossPaise * TDS_RATE) : 0;
                const netPaise   = grossPaise - tdsPaise;
                return (
                  <tr key={fe.user_id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-white">{(profile?.full_name as string) ?? '—'}</div>
                      <div className="text-xs text-slate-500">{profile?.email as string}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">{fmtInr(grossPaise)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {tdsApplies ? '10%' : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-red-400">{tdsApplies ? fmtInr(tdsPaise) : '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-emerald-400 font-semibold">{fmtInr(netPaise)}</td>
                  </tr>
                );
              })}
              {!facultyEarnings?.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No faculty earnings yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export links */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Export</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/financials/export?type=transactions"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
          >
            Export all transactions CSV
          </Link>
          <Link
            href="/financials/export?type=faculty"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
          >
            Export faculty earnings CSV
          </Link>
          <Link
            href="/financials/export?type=students"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
          >
            Export student payments CSV
          </Link>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          Exports use the Razorpay dashboard for verified payment data. These links generate reports from our DB records.
        </p>
      </div>
    </div>
  );
}
