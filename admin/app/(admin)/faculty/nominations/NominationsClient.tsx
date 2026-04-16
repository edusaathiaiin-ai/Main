'use client'

import { useState } from 'react'
import { updateNominationStatus, resendInvitationEmail } from './actions'

type Nomination = {
  id: string
  faculty_name: string
  faculty_email: string
  faculty_phone: string | null
  expertise_area: string
  bio_note: string | null
  nominator_type: string
  status: string
  email_sent_at: string | null
  email_delivered: boolean | null
  email_error: string | null
  reward_fired: boolean | null
  created_at: string
  resolved_nominator_name: string
}

type Props = {
  nominations: Nomination[]
}

const STATUS_CHIP: Record<string, string> = {
  invited: 'bg-slate-500/20 text-slate-300',
  opened: 'bg-blue-500/20 text-blue-400',
  applied: 'bg-blue-500/20 text-blue-400',
  verified: 'bg-emerald-500/20 text-emerald-400',
  eminent: 'bg-amber-500/20 text-amber-400',
  declined: 'bg-red-500/20 text-red-400',
}

const TABS = ['all', 'invited', 'applied', 'verified', 'eminent', 'declined'] as const

export default function NominationsClient({ nominations }: Props) {
  const [tab, setTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = nominations.filter((n) => {
    if (tab !== 'all' && n.status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        n.faculty_name.toLowerCase().includes(q) ||
        n.faculty_email.toLowerCase().includes(q) ||
        n.expertise_area.toLowerCase().includes(q) ||
        n.resolved_nominator_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function handleStatusChange(id: string, newStatus: string) {
    setActionLoading(id)
    const fd = new FormData()
    fd.set('nomination_id', id)
    fd.set('status', newStatus)
    await updateNominationStatus(fd)
    setActionLoading(null)
  }

  async function handleResendEmail(id: string) {
    setActionLoading(id)
    const fd = new FormData()
    fd.set('nomination_id', id)
    await resendInvitationEmail(fd)
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
          {TABS.map((t) => {
            const count = t === 'all'
              ? nominations.length
              : nominations.filter((n) => n.status === t).length
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
              </button>
            )
          })}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, expertise..."
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 w-64"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">
          No nominations {tab !== 'all' ? `with status "${tab}"` : 'found'}
        </div>
      )}

      {/* Cards */}
      {filtered.map((n) => (
        <div
          key={n.id}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: details */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{n.faculty_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CHIP[n.status] ?? STATUS_CHIP.invited}`}>
                  {n.status}
                </span>
              </div>
              <div className="text-slate-400 text-sm">{n.faculty_email}</div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span>📚 {n.expertise_area}</span>
                <span>
                  👤 {n.resolved_nominator_name}
                  <span className="text-slate-600 ml-1">({n.nominator_type})</span>
                </span>
                {n.faculty_phone && <span>📱 {n.faculty_phone}</span>}
                <span>
                  📅{' '}
                  {new Date(n.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Bio note */}
              {n.bio_note && (
                <div className="mt-2 bg-slate-800/50 rounded-lg px-3 py-2 border-l-2 border-amber-500/40">
                  <p className="text-xs text-slate-400 italic leading-relaxed">
                    &ldquo;{n.bio_note}&rdquo;
                  </p>
                </div>
              )}

              {/* Email status */}
              <div className="mt-2 text-[11px]">
                {n.email_delivered === true && (
                  <span className="text-emerald-400">
                    ✅ Email sent{' '}
                    {n.email_sent_at
                      ? new Date(n.email_sent_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                )}
                {n.email_delivered === false && (
                  <span className="text-red-400">
                    ❌ Email failed{n.email_error ? `: ${n.email_error}` : ''}
                  </span>
                )}
                {n.email_delivered === null && !n.email_sent_at && (
                  <span className="text-slate-500">📧 Email not sent yet</span>
                )}
              </div>

              {/* Reward badge */}
              {n.reward_fired && (
                <span className="inline-block mt-1 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                  🏆 Reward fired
                </span>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex flex-col gap-2 shrink-0">
              {actionLoading === n.id ? (
                <span className="text-xs text-slate-500">Working...</span>
              ) : (
                <>
                  {n.status === 'invited' && (
                    <>
                      <button
                        onClick={() => handleResendEmail(n.id)}
                        className="text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📧 Resend Email
                      </button>
                      <button
                        onClick={() => handleStatusChange(n.id, 'declined')}
                        className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✕ Decline
                      </button>
                    </>
                  )}
                  {n.status === 'applied' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(n.id, 'verified')}
                        className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✅ Mark Verified
                      </button>
                      <button
                        onClick={() => handleStatusChange(n.id, 'declined')}
                        className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✕ Decline
                      </button>
                    </>
                  )}
                  {n.status === 'verified' && (
                    <button
                      onClick={() => handleStatusChange(n.id, 'eminent')}
                      className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      🏆 Mark Eminent
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
