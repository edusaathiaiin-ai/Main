import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { MarkRefundPaidButton } from './RefundActions'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ tab?: string }>

function fmtInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

type Joined = {
  id: string
  amount_paid_paise: number
  refund_status: string
  refund_upi_id: string | null
  refund_initiated_at: string | null
  refund_reason: string | null
  refunded_at: string | null
  refund_upi_reference: string | null
  student_id: string
  session_id: string
  live_sessions: { id: string; title: string; cancellation_reason: string | null; faculty_id: string } | null
  profiles:      { id: string; full_name: string | null; email: string | null; wa_phone: string | null } | null
}

export default async function RefundsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const { tab = 'ready' } = await searchParams
  const admin = getAdminClient()

  const { data: rows } = await admin
    .from('live_bookings')
    .select(`
      id, amount_paid_paise, refund_status, refund_upi_id,
      refund_initiated_at, refund_reason, refunded_at, refund_upi_reference,
      student_id, session_id,
      live_sessions ( id, title, cancellation_reason, faculty_id ),
      profiles:student_id ( id, full_name, email, wa_phone )
    `)
    .neq('refund_status', 'none')
    .order('refund_initiated_at', { ascending: false })

  const all = (rows ?? []) as unknown as Joined[]
  const pending = all.filter((r) => r.refund_status === 'pending')
  const ready   = all.filter((r) => r.refund_status === 'ready')
  const paid    = all.filter((r) => r.refund_status === 'paid')

  const totalPendingPaise = pending.reduce((a, r) => a + r.amount_paid_paise, 0)
  const totalReadyPaise   = ready.reduce((a, r) => a + r.amount_paid_paise, 0)
  const totalPaidPaise    = paid.reduce((a, r) => a + r.amount_paid_paise, 0)

  const tabRows = tab === 'pending' ? pending : tab === 'paid' ? paid : ready

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-xl font-bold text-white">Refunds</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Awaiting student UPI"
          value={pending.length}
          dot={pending.length > 0 ? 'amber' : undefined}
        />
        <StatCard
          label="Ready to pay"
          value={ready.length}
          dot={ready.length > 0 ? 'amber' : undefined}
        />
        <StatCard label="Total to send" value={fmtInr(totalReadyPaise)} accent />
        <StatCard label="Refunded lifetime" value={fmtInr(totalPaidPaise)} />
      </div>

      <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
        {[
          { key: 'ready',   label: `Ready (${ready.length})` },
          { key: 'pending', label: `Awaiting UPI (${pending.length})` },
          { key: 'paid',    label: `Paid (${paid.length})` },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={`/refunds?tab=${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Session</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">UPI</th>
                <th className="text-left px-4 py-3">Cancelled</th>
                {tab !== 'paid' && <th className="px-4 py-3">Action</th>}
                {tab === 'paid' && <th className="text-left px-4 py-3">Refunded</th>}
                {tab === 'paid' && <th className="text-left px-4 py-3">UTR</th>}
              </tr>
            </thead>
            <tbody>
              {tabRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="px-5 py-3.5 text-xs">
                    <div className="text-sm text-white max-w-[220px] truncate">
                      {r.live_sessions?.title ?? '—'}
                    </div>
                    {r.refund_reason && (
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 max-w-[220px]">
                        {r.refund_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">
                    <div>{r.profiles?.full_name ?? '—'}</div>
                    <div className="text-[11px] text-slate-500">{r.profiles?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-emerald-400 font-semibold">
                    {fmtInr(r.amount_paid_paise)}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {r.refund_upi_id ? (
                      <span className="text-slate-200 font-mono">{r.refund_upi_id}</span>
                    ) : (
                      <span className="text-amber-400">awaiting</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {fmtDate(r.refund_initiated_at)}
                  </td>
                  {tab === 'ready' && (
                    <td className="px-4 py-3.5">
                      <MarkRefundPaidButton bookingId={r.id} />
                    </td>
                  )}
                  {tab === 'pending' && (
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      Student emailed — waiting
                    </td>
                  )}
                  {tab === 'paid' && (
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {fmtDate(r.refunded_at)}
                    </td>
                  )}
                  {tab === 'paid' && (
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                      {r.refund_upi_reference ?? '—'}
                    </td>
                  )}
                </tr>
              ))}
              {tabRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No refunds in this state
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tab === 'pending' && pending.length > 0 && (
        <p className="text-xs text-slate-500">
          Awaiting students to share their UPI. They received an email with a /refunds link
          when the cancellation went out — total awaiting: {fmtInr(totalPendingPaise)}.
        </p>
      )}
    </div>
  )
}
