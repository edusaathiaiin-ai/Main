import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import { ReleaseButton, RefundButton, NoteButton } from './SessionActions'

export const dynamic = 'force-dynamic'

const STATUS_CHIP: Record<string, string> = {
  requested: 'bg-amber-500/20 text-amber-400',
  accepted: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-emerald-500/30 text-emerald-300',
  disputed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-slate-700 text-slate-400',
  declined: 'bg-slate-700 text-slate-400',
}

const PAYOUT_CHIP: Record<string, string> = {
  pending: 'text-amber-400',
  released: 'text-emerald-400',
  refunded: 'text-blue-400',
}

export default async function SessionsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  const { data: sessions } = await admin
    .from('faculty_sessions')
    .select(
      `
      id,
      session_type,
      topic,
      status,
      fee_paise,
      platform_fee_paise,
      faculty_payout_paise,
      payout_status,
      disputed_by,
      cancellation_reason,
      created_at,
      confirmed_slot,
      student:student_id ( full_name, email ),
      faculty:faculty_id ( full_name, email )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  const all = sessions ?? []
  const pending = all.filter((s) => (s.status as string) === 'requested')
  const completed = all.filter((s) => (s.status as string) === 'completed')
  const disputed = all.filter((s) => (s.status as string) === 'disputed')
  const totalGmv = all.reduce(
    (sum, s) => sum + ((s.fee_paise as number) ?? 0),
    0
  )
  const platformRev = all.reduce(
    (sum, s) => sum + ((s.platform_fee_paise as number) ?? 0),
    0
  )

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <h1 className="text-xl font-bold text-white">
        Sessions — 1:1 Faculty Finder
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Total sessions" value={all.length} />
        <StatCard
          label="Pending"
          value={pending.length}
          dot={pending.length > 0 ? 'amber' : undefined}
        />
        <StatCard label="Completed" value={completed.length} />
        <StatCard
          label="Disputed"
          value={disputed.length}
          dot={disputed.length > 0 ? 'red' : undefined}
          accent={disputed.length > 0}
        />
        <StatCard
          label="Total GMV"
          value={`₹${(totalGmv / 100).toLocaleString('en-IN')}`}
        />
        <StatCard
          label="Platform revenue"
          value={`₹${(platformRev / 100).toLocaleString('en-IN')}`}
        />
      </div>

      {/* Disputed — shown at top */}
      {disputed.length > 0 && (
        <div className="bg-red-950/20 rounded-2xl border border-red-500/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block animate-pulse" />
            <h2 className="text-sm font-semibold text-red-400">
              Disputed Sessions ({disputed.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-500/10 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">ID</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Faculty</th>
                  <th className="text-left px-4 py-3">Topic</th>
                  <th className="text-left px-4 py-3">Fee</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputed.map((s) => {
                  const student = s.student as unknown as Record<
                    string,
                    unknown
                  >
                  const faculty = s.faculty as unknown as Record<
                    string,
                    unknown
                  >
                  return (
                    <tr
                      key={s.id as string}
                      className="border-b border-red-500/10 hover:bg-red-900/10"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                        {(s.id as string).slice(0, 8)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-white">
                          {(student?.full_name as string) ?? '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {student?.email as string}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-white">
                          {(faculty?.full_name as string) ?? '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {faculty?.email as string}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 max-w-[160px] truncate">
                        {s.topic as string}
                      </td>
                      <td className="px-4 py-3.5 text-white font-semibold text-sm">
                        ₹
                        {(((s.fee_paise as number) ?? 0) / 100).toLocaleString(
                          'en-IN'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {s.created_at
                          ? new Date(s.created_at as string).toLocaleDateString(
                              'en-IN',
                              { day: '2-digit', month: 'short' }
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <ReleaseButton sessionId={s.id as string} />
                          <RefundButton sessionId={s.id as string} />
                          <NoteButton sessionId={s.id as string} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All sessions */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">All Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Faculty</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Topic</th>
                <th className="text-left px-4 py-3">Fee</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Payout</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {all.map((s) => {
                const student = s.student as unknown as Record<string, unknown>
                const faculty = s.faculty as unknown as Record<string, unknown>
                const status = s.status as string
                const payout = s.payout_status as string
                return (
                  <tr
                    key={s.id as string}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {(s.id as string).slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {(student?.full_name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {(faculty?.full_name as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize">
                      {s.session_type as string}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[120px] truncate">
                      {s.topic as string}
                    </td>
                    <td className="px-4 py-3 text-xs text-white font-medium">
                      ₹
                      {(((s.fee_paise as number) ?? 0) / 100).toLocaleString(
                        'en-IN'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[status] ?? STATUS_CHIP.requested}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.created_at
                        ? new Date(s.created_at as string).toLocaleDateString(
                            'en-IN',
                            { day: '2-digit', month: 'short' }
                          )
                        : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs font-medium ${PAYOUT_CHIP[payout] ?? 'text-slate-500'}`}
                    >
                      {payout ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {status === 'completed' && payout === 'pending' && (
                          <ReleaseButton sessionId={s.id as string} />
                        )}
                        {status !== 'cancelled' && payout !== 'refunded' && (
                          <NoteButton sessionId={s.id as string} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!all.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-slate-500 text-sm"
                  >
                    No sessions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
