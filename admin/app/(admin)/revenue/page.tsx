import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1.5">{sub}</div>}
    </div>
  );
}

export default async function RevenuePage() {
  await requireAdmin();
  const admin = getAdminClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // MRR — active monthly + institution subscriptions
  const { data: monthlyActive } = await admin
    .from('profiles')
    .select('plan_id')
    .eq('subscription_status', 'active')
    .in('plan_id', ['plus-monthly', 'institution']);

  let mrr = 0;
  for (const p of monthlyActive ?? []) {
    mrr += p.plan_id === 'plus-monthly' ? 199 : 4999;
  }

  // ARR — active annual subscriptions
  const { data: annualActive } = await admin
    .from('profiles')
    .select('plan_id')
    .eq('subscription_status', 'active')
    .eq('plan_id', 'plus-annual');
  const arr = (annualActive?.length ?? 0) * 1499;

  // Failed payments — last 30 days
  const { count: failedCount } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', thirtyDaysAgo);

  // Churn this month
  const { count: churnCount } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_status', 'cancelled')
    .gte('updated_at', startOfMonth);

  // All payments for the table
  const { data: allPayments } = await admin
    .from('subscriptions')
    .select('id, razorpay_order_id, razorpay_payment_id, plan_id, amount_inr, status, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100);

  const rzpBaseUrl = process.env.NEXT_PUBLIC_RAZORPAY_DASHBOARD_URL ?? 'https://dashboard.razorpay.com/app/payments';

  const statusChip: Record<string, string> = {
    paid: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
    created: 'bg-slate-700 text-slate-400',
    cancelled: 'bg-orange-500/20 text-orange-400',
    refunded: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-white mb-6">Revenue</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="MRR"
          value={`₹${mrr.toLocaleString('en-IN')}`}
          sub="Monthly recurring revenue"
          accent
        />
        <MetricCard
          label="ARR"
          value={`₹${arr.toLocaleString('en-IN')}`}
          sub="Annual plans annualised"
          accent
        />
        <MetricCard
          label="Failed payments (30d)"
          value={String(failedCount ?? 0)}
          sub="Requires follow-up"
        />
        <MetricCard
          label="Churn this month"
          value={String(churnCount ?? 0)}
          sub="Cancelled subscriptions"
        />
      </div>

      {/* Payments table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">All Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-4 py-3">Order ID</th>
                <th className="text-left px-4 py-3">Payment ID</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(allPayments ?? []).map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {new Date(p.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[160px] truncate">
                    {(p.razorpay_order_id as string) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.razorpay_payment_id ? (
                      <a
                        href={`${rzpBaseUrl}/${p.razorpay_payment_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-amber-400 hover:text-amber-300 max-w-[160px] truncate block"
                      >
                        {p.razorpay_payment_id as string}
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs font-mono">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs capitalize">
                    {(p.plan_id as string)?.replace(/-/g, ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {p.amount_inr ? `₹${(p.amount_inr as number).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusChip[p.status as string] ?? statusChip.created}`}>
                      {p.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${p.user_id as string}`} className="text-slate-500 hover:text-white text-xs">
                      User →
                    </Link>
                  </td>
                </tr>
              ))}
              {!allPayments?.length && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
