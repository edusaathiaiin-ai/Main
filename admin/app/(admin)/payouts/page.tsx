import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { MarkAsPaidButton } from './PayoutActions'

export const dynamic = 'force-dynamic'

function fmtInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit',
  })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// DB types
// ──────────────────────────────────────────────────────────────────────────────

type PayoutRow = {
  id:                string
  faculty_id:        string
  sessions_included: string[] | null
  gross_paise:       number
  tds_paise:         number
  net_paise:         number
  upi_id:            string | null
  upi_reference:     string | null
  bank_reference:    string | null
  status:            string
  initiated_at:      string | null
  completed_at:      string | null
}

type FacultyLite = {
  full_name: string | null
  email:     string | null
}

type SessionLite = {
  id:    string
  topic: string | null
}

// ──────────────────────────────────────────────────────────────────────────────

export default async function PayoutsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  // ── Fetch all payouts, newest first ────────────────────────────────────
  const { data: payoutsRaw } = await admin
    .from('faculty_payouts')
    .select(`
      id, faculty_id, sessions_included,
      gross_paise, tds_paise, net_paise,
      upi_id, upi_reference, bank_reference,
      status, initiated_at, completed_at
    `)
    .order('initiated_at', { ascending: false })

  const payouts = (payoutsRaw ?? []) as PayoutRow[]

  // ── Collect faculty ids + session ids for batch lookup ─────────────────
  const facultyIds = Array.from(new Set(payouts.map((p) => p.faculty_id)))
  const allSessionIds = Array.from(new Set(
    payouts.flatMap((p) => p.sessions_included ?? []),
  ))

  const [{ data: facultyRows }, { data: sessionRows }] = await Promise.all([
    facultyIds.length > 0
      ? admin.from('profiles').select('id, full_name, email').in('id', facultyIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    allSessionIds.length > 0
      ? admin.from('faculty_sessions').select('id, topic').in('id', allSessionIds)
      : Promise.resolve({ data: [] as SessionLite[] }),
  ])

  const facultyMap = new Map<string, FacultyLite>(
    (facultyRows ?? []).map((f) => [f.id as string, { full_name: f.full_name, email: f.email }]),
  )
  const sessionMap = new Map<string, SessionLite>(
    (sessionRows ?? []).map((s) => [s.id, { id: s.id, topic: (s.topic as string | null) ?? null }]),
  )

  // ── Partition pending vs completed ─────────────────────────────────────
  const pending   = payouts.filter((p) => p.status === 'pending')
  const completed = payouts.filter((p) => p.status === 'completed')

  // ── Summary strip ──────────────────────────────────────────────────────
  const pendingTotal  = pending.reduce((s, p) => s + (p.net_paise ?? 0), 0)
  const pendingFaculty = new Set(pending.map((p) => p.faculty_id)).size

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const paidThisMonth = completed
    .filter((p) => p.completed_at && new Date(p.completed_at) >= startOfMonth)
    .reduce((s, p) => s + (p.net_paise ?? 0), 0)

  const totalPaidAllTime = completed.reduce((s, p) => s + (p.net_paise ?? 0), 0)

  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Faculty Payouts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Release cron fires every Sunday 9 AM IST. Admin confirms each UPI transfer here.
          </p>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">
            Pending
          </div>
          <div className="text-2xl font-bold text-white">{fmtInr(pendingTotal)}</div>
          <div className="text-xs text-slate-500 mt-1">
            across {pendingFaculty} {pendingFaculty === 1 ? 'faculty' : 'faculty'}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Paid this month
          </div>
          <div className="text-2xl font-bold text-white">{fmtInr(paidThisMonth)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {completed.filter((p) => p.completed_at && new Date(p.completed_at) >= startOfMonth).length} payouts
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Total paid — all time
          </div>
          <div className="text-2xl font-bold text-emerald-400">{fmtInr(totalPaidAllTime)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {completed.length} payouts total
          </div>
        </div>
      </div>

      {/* ── Pending payouts table ─────────────────────────────────────── */}
      <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Pending
            {pending.length > 0 && (
              <span className="ml-2 bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Faculty</th>
                <th className="text-left px-4 py-3">Session</th>
                <th className="text-right px-4 py-3">Gross</th>
                <th className="text-right px-4 py-3">TDS</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-left px-4 py-3">UPI</th>
                <th className="text-left px-4 py-3">Raised</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No pending payouts. Next release cron fires Sunday 9 AM IST.
                  </td>
                </tr>
              )}
              {pending.map((p) => {
                const f = facultyMap.get(p.faculty_id)
                const facultyName = f?.full_name ?? p.faculty_id.slice(0, 8)
                const sessionIds = p.sessions_included ?? []
                const topics = sessionIds.map((sid) => sessionMap.get(sid)?.topic ?? '—')
                const primaryTopic = topics[0] ?? '—'
                const extraCount = topics.length - 1

                return (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-white">{facultyName}</div>
                      <div className="text-[11px] text-slate-500">{f?.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-slate-300 max-w-[240px] truncate" title={primaryTopic}>
                        {primaryTopic}
                      </div>
                      {extraCount > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          +{extraCount} more
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-300">
                      {fmtInr(p.gross_paise)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-red-400">
                      {p.tds_paise > 0 ? fmtInr(p.tds_paise) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-white">
                      {fmtInr(p.net_paise)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-mono text-slate-400">
                        {p.upi_id || <span className="text-slate-600">none</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-500">
                      {fmtDate(p.initiated_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <MarkAsPaidButton
                        payoutId={p.id}
                        facultyName={facultyName}
                        netRupees={fmtInr(p.net_paise)}
                        upiId={p.upi_id}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Completed payouts table (greyed but persistent) ──────────── */}
      <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Completed
            {completed.length > 0 && (
              <span className="ml-2 bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                {completed.length}
              </span>
            )}
          </h2>
          <div className="text-[11px] text-slate-500">
            Rows never auto-archive — full audit trail.
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Faculty</th>
                <th className="text-left px-4 py-3">Session</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-left px-4 py-3">UPI ref</th>
                <th className="text-left px-4 py-3">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {completed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500 text-sm">
                    No completed payouts yet.
                  </td>
                </tr>
              )}
              {completed.map((p) => {
                const f = facultyMap.get(p.faculty_id)
                const facultyName = f?.full_name ?? p.faculty_id.slice(0, 8)
                const sessionIds = p.sessions_included ?? []
                const primaryTopic = sessionMap.get(sessionIds[0] ?? '')?.topic ?? '—'

                return (
                  <tr key={p.id} className="border-b border-slate-800/50 opacity-60 hover:opacity-90 transition-opacity">
                    <td className="px-5 py-3">
                      <div className="text-sm text-slate-400 flex items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {facultyName}
                      </div>
                      <div className="text-[11px] text-slate-600">{f?.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-500 max-w-[240px] truncate" title={primaryTopic}>
                        {primaryTopic}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400 font-semibold">
                      {fmtInr(p.net_paise)}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-500">
                      {p.upi_reference || <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {fmtDateTime(p.completed_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
