import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import {
  ApproveButton,
  RejectLiveButton,
  CancelSessionButton,
} from './LiveActions'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ tab?: string }>

const FORMAT_LABELS: Record<string, string> = {
  single: 'Single lecture',
  series: 'Series',
  workshop: 'Workshop',
  recurring: 'Recurring',
  qa: 'Q&A',
}

function fmtInr(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { tab = 'pending' } = await searchParams
  const admin = getAdminClient()

  const { data: sessions } = await admin
    .from('live_sessions')
    .select(
      `
      id,
      title,
      description,
      session_format,
      price_per_seat_paise,
      total_seats,
      seats_booked,
      status,
      cancelled_at,
      created_at,
      completed_at,
      total_views,
      platform_fee_paise,
      faculty_payout_paise,
      gross_revenue_paise,
      payout_status,
      payout_released_at,
      faculty:faculty_id ( full_name, email ),
      verticals ( name )
    `
    )
    .order('created_at', { ascending: false })

  // Batch — for each completed session, count lectures where notes_sent_to_students=true.
  const completedIds = (sessions ?? [])
    .filter((s) => (s.status as string) === 'completed')
    .map((s) => s.id as string)
  const notesSentBySession = new Map<string, { sent: number; total: number }>()
  if (completedIds.length > 0) {
    const { data: lecRows } = await admin
      .from('live_lectures')
      .select('session_id, notes_sent_to_students')
      .in('session_id', completedIds)
    for (const row of (lecRows ?? []) as Array<{ session_id: string; notes_sent_to_students: boolean }>) {
      const cur = notesSentBySession.get(row.session_id) ?? { sent: 0, total: 0 }
      cur.total += 1
      if (row.notes_sent_to_students) cur.sent += 1
      notesSentBySession.set(row.session_id, cur)
    }
  }

  const pending = (sessions ?? []).filter(
    (s) => (s.status as string) === 'pending_review'
  )
  const upcoming = (sessions ?? []).filter(
    (s) => (s.status as string) === 'published'
  )
  const completed = (sessions ?? []).filter(
    (s) => (s.status as string) === 'completed'
  )
  const cancelled = (sessions ?? []).filter(
    (s) => (s.status as string) === 'cancelled'
  )

  // Revenue breakdown — prefer gross_revenue_paise (set by release_live_session_payout
  // RPC), fall back to seats × price for sessions that haven't been released yet.
  const completedRevenue = completed.reduce(
    (sum, s) => {
      const recorded = (s.gross_revenue_paise as number | null) ?? null
      if (recorded !== null) return sum + recorded
      return sum +
        ((s.price_per_seat_paise as number) ?? 0) *
        ((s.seats_booked as number) ?? 0)
    },
    0
  )
  const platformCut = Math.round(completedRevenue * 0.2)
  const pendingReleaseCount = completed.filter((s) => (s.payout_status as string) === 'pending').length

  const tabSessions =
    tab === 'upcoming'
      ? upcoming
      : tab === 'completed'
        ? completed
        : tab === 'cancelled'
          ? cancelled
          : pending

  // For bookings count — simplified, use seats_booked from session
  function getRefundTotal(s: Record<string, unknown>) {
    return (
      ((s.price_per_seat_paise as number) ?? 0) *
      ((s.seats_booked as number) ?? 0)
    )
  }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-xl font-bold text-white">Live Lectures</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Pending approval"
          value={pending.length}
          dot={pending.length > 0 ? 'amber' : undefined}
        />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard
          label="Pending releases"
          value={pendingReleaseCount}
          dot={pendingReleaseCount > 0 ? 'amber' : undefined}
        />
        <StatCard label="Platform revenue" value={fmtInr(platformCut)} accent />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
        {[
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={`/live?tab=${key}`}
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

      {/* Pending approval */}
      {tab === 'pending' && (
        <div className="space-y-4">
          {pending.length === 0 && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">
              No sessions awaiting approval
            </div>
          )}
          {pending.map((s) => {
            const faculty = s.faculty as unknown as Record<string, unknown>
            const vertical = s.verticals as unknown as Record<string, unknown>
            return (
              <div
                key={s.id as string}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="text-white font-semibold">
                      {s.title as string}
                    </div>
                    <div className="text-slate-400 text-sm line-clamp-2">
                      {s.description as string}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                      <span>👨‍🏫 {(faculty?.full_name as string) ?? '—'}</span>
                      <span>📚 {(vertical?.name as string) ?? '—'}</span>
                      <span>
                        🎬{' '}
                        {FORMAT_LABELS[s.session_format as string] ??
                          (s.session_format as string)}
                      </span>
                      <span>💺 {s.total_seats as number} seats</span>
                      <span>
                        💰 {fmtInr(s.price_per_seat_paise as number)} / seat
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <ApproveButton sessionId={s.id as string} />
                    <RejectLiveButton sessionId={s.id as string} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming / Completed / Cancelled table */}
      {tab !== 'pending' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Title</th>
                  <th className="text-left px-4 py-3">Faculty</th>
                  <th className="text-left px-4 py-3">Format</th>
                  <th className="text-left px-4 py-3">Seats</th>
                  <th className="text-left px-4 py-3">Revenue</th>
                  <th className="text-left px-4 py-3">Date</th>
                  {tab === 'completed' && <th className="px-4 py-3">Notes</th>}
                  {tab === 'completed' && <th className="px-4 py-3">Payout</th>}
                  {tab === 'upcoming' && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tabSessions.map((s) => {
                  const faculty = s.faculty as unknown as Record<
                    string,
                    unknown
                  >
                  const recordedGross = (s.gross_revenue_paise as number | null) ?? null
                  const revenue = recordedGross !== null
                    ? recordedGross
                    : ((s.price_per_seat_paise as number) ?? 0) *
                      ((s.seats_booked as number) ?? 0)
                  const dateIso = (s.completed_at as string | null) ?? (s.created_at as string | null)
                  const payoutStatus = (s.payout_status as string | null) ?? 'pending'
                  const notesInfo = notesSentBySession.get(s.id as string) ?? { sent: 0, total: 0 }
                  return (
                    <tr
                      key={s.id as string}
                      className="border-b border-slate-800/50 hover:bg-slate-800/20"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-white max-w-[200px] truncate">
                          {s.title as string}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {(faculty?.full_name as string) ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 capitalize">
                        {FORMAT_LABELS[s.session_format as string] ??
                          (s.session_format as string)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {s.seats_booked as number} / {s.total_seats as number}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {fmtInr(revenue)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {dateIso
                          ? new Date(dateIso).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '—'}
                      </td>
                      {tab === 'completed' && (
                        <td className="px-4 py-3.5 text-xs">
                          {notesInfo.total === 0 ? (
                            <span className="text-slate-600">—</span>
                          ) : notesInfo.sent === notesInfo.total ? (
                            <span className="text-emerald-400">All shared</span>
                          ) : notesInfo.sent === 0 ? (
                            <span className="text-amber-400">Pending</span>
                          ) : (
                            <span className="text-amber-400">{notesInfo.sent}/{notesInfo.total}</span>
                          )}
                        </td>
                      )}
                      {tab === 'completed' && (
                        <td className="px-4 py-3.5 text-xs">
                          {payoutStatus === 'released' ? (
                            <span className="text-emerald-400">Released</span>
                          ) : payoutStatus === 'on_hold' ? (
                            <span className="text-rose-400">On hold</span>
                          ) : (
                            <span className="text-amber-400">Pending</span>
                          )}
                        </td>
                      )}
                      {tab === 'upcoming' && (
                        <td className="px-4 py-3.5">
                          <CancelSessionButton
                            sessionId={s.id as string}
                            studentCount={(s.seats_booked as number) ?? 0}
                            refundTotal={getRefundTotal(
                              s as Record<string, unknown>
                            )}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
                {!tabSessions.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-slate-500 text-sm"
                    >
                      No sessions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue breakdown */}
      {tab === 'completed' && completed.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            label="Total from lectures"
            value={fmtInr(completedRevenue)}
          />
          <StatCard
            label="Platform cut (20%)"
            value={fmtInr(platformCut)}
            accent
          />
          <StatCard
            label="Faculty payouts (80%)"
            value={fmtInr(completedRevenue - platformCut)}
          />
        </div>
      )}
    </div>
  )
}
