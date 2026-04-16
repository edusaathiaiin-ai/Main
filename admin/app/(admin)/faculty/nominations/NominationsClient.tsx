'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

type Nomination = {
  id: string
  faculty_name: string
  faculty_email: string
  faculty_phone: string | null
  expertise_area: string
  bio_note: string | null
  nominator_type: 'student' | 'faculty'
  status: string
  email_sent_at: string | null
  email_delivered: boolean | null
  whatsapp_sent_at: string | null
  reward_fired: boolean
  created_at: string
  resolved_nominator_name: string
  nominator: {
    full_name: string
    email: string
    institution_name: string | null
    city: string | null
  } | null
}

const STATUS_FILTERS = [
  'all', 'invited', 'applied', 'verified', 'eminent', 'declined',
]

const STATUS_CHIP: Record<string, string> = {
  invited:  'bg-slate-500/20 text-slate-300',
  opened:   'bg-blue-500/20 text-blue-400',
  applied:  'bg-violet-500/20 text-violet-400',
  verified: 'bg-emerald-500/20 text-emerald-400',
  eminent:  'bg-amber-500/20 text-amber-400',
  declined: 'bg-red-500/20 text-red-400',
}

const STATUS_BORDER: Record<string, string> = {
  invited:  'border-l-slate-500',
  opened:   'border-l-blue-500',
  applied:  'border-l-violet-500',
  verified: 'border-l-emerald-500',
  eminent:  'border-l-amber-500',
  declined: 'border-l-red-500',
}

export default function NominationsClient({
  nominations,
}: {
  nominations: Nomination[]
}) {
  const supabase = getBrowserClient()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [list, setList] = useState<Nomination[]>(nominations)

  const filtered = filter === 'all'
    ? list
    : list.filter((n) => n.status === filter)

  async function updateStatus(id: string, status: string) {
    setLoading(id + status)
    const { error } = await supabase
      .from('faculty_nominations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status } : n))
      )
    }
    setLoading(null)
  }

  async function sendWhatsApp(nomination: Nomination) {
    if (!nomination.faculty_phone) {
      alert('No phone number provided for this nomination.')
      return
    }
    setLoading(nomination.id + 'wa')

    const { error } = await supabase.functions.invoke(
      'notify-faculty-nomination-wa',
      { body: { nominationId: nomination.id } }
    )

    if (error) {
      alert('WhatsApp send failed: ' + error.message)
    } else {
      setList((prev) =>
        prev.map((n) =>
          n.id === nomination.id
            ? { ...n, whatsapp_sent_at: new Date().toISOString() }
            : n
        )
      )
      alert('WhatsApp sent')
    }
    setLoading(null)
  }

  async function markEminent(nomination: Nomination) {
    setLoading(nomination.id + 'eminent')

    // 1. Update status
    await supabase
      .from('faculty_nominations')
      .update({ status: 'eminent' })
      .eq('id', nomination.id)

    // 2. Fire reward to nominating student
    const { error } = await supabase.functions.invoke(
      'fire-nomination-reward',
      { body: { nominationId: nomination.id } }
    )

    if (error) {
      alert('Status updated but reward failed: ' + error.message)
    }

    // 3. Notify student — verified email
    if (nomination.nominator?.email) {
      await supabase.functions.invoke('notify-student-faculty-update', {
        body: {
          type: 'verified',
          nominationId: nomination.id,
          studentEmail: nomination.nominator.email,
          studentName: nomination.nominator.full_name,
          facultyName: nomination.faculty_name,
        },
      })
    }

    setList((prev) =>
      prev.map((n) =>
        n.id === nomination.id
          ? { ...n, status: 'eminent', reward_fired: true }
          : n
      )
    )
    setLoading(null)
  }

  async function verifyNomination(nomination: Nomination) {
    setLoading(nomination.id + 'verified')

    await supabase
      .from('faculty_nominations')
      .update({
        status: 'verified',
        student_notified_verified_at: new Date().toISOString(),
      })
      .eq('id', nomination.id)

    // Notify student — verified (without reward yet)
    if (nomination.nominator?.email) {
      await supabase.functions.invoke('notify-student-faculty-update', {
        body: {
          type: 'verified',
          nominationId: nomination.id,
          studentEmail: nomination.nominator.email,
          studentName: nomination.nominator.full_name,
          facultyName: nomination.faculty_name,
        },
      })
    }

    setList((prev) =>
      prev.map((n) =>
        n.id === nomination.id ? { ...n, status: 'verified' } : n
      )
    )
    setLoading(null)
  }

  async function resendEmail(nomination: Nomination) {
    setLoading(nomination.id + 'email')
    const { error } = await supabase.functions.invoke(
      'notify-faculty-nomination',
      { body: { nominationId: nomination.id } }
    )
    if (error) {
      alert('Resend failed: ' + error.message)
    } else {
      alert('Email resent')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const count =
            f === 'all'
              ? list.length
              : list.filter((n) => n.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f} ({count})
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">
          No nominations in this category yet.
        </div>
      )}

      {/* Cards */}
      {filtered.map((nomination) => {
        const nominatorName = nomination.resolved_nominator_name
        const nominatorDetail =
          nomination.nominator_type === 'student'
            ? nomination.nominator?.institution_name ??
              nomination.nominator?.city ??
              ''
            : 'Faculty member'

        return (
          <div
            key={nomination.id}
            className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-[3px] ${
              STATUS_BORDER[nomination.status] ?? 'border-l-slate-500'
            }`}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-[15px]">
                    {nomination.faculty_name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      STATUS_CHIP[nomination.status] ?? STATUS_CHIP.invited
                    }`}
                  >
                    {nomination.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {nomination.expertise_area}
                  &nbsp;&middot;&nbsp;
                  {nomination.faculty_email}
                  {nomination.faculty_phone && (
                    <>
                      &nbsp;&middot;&nbsp;
                      {nomination.faculty_phone}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Nominated by */}
            <div className="text-xs text-slate-400 mb-2">
              Nominated by <strong className="text-slate-300">{nominatorName}</strong>
              {nominatorDetail && (
                <span className="text-slate-500"> &middot; {nominatorDetail}</span>
              )}
              <span className="text-slate-600">
                {' '}&middot;{' '}
                {new Date(nomination.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Bio note */}
            {nomination.bio_note && (
              <div className="mb-3 bg-slate-800/50 rounded-lg px-3 py-2 border-l-2 border-amber-500/40">
                <p className="text-xs text-slate-400 italic leading-relaxed">
                  &ldquo;{nomination.bio_note}&rdquo;
                </p>
              </div>
            )}

            {/* Communication status */}
            <div className="flex gap-4 mb-3 text-[11px]">
              <span
                className={
                  nomination.email_delivered
                    ? 'text-emerald-400'
                    : nomination.email_sent_at
                      ? 'text-amber-400'
                      : 'text-slate-600'
                }
              >
                {nomination.email_delivered
                  ? '✅ Email delivered'
                  : nomination.email_sent_at
                    ? '📧 Email sent'
                    : '📧 Email not sent'}
              </span>
              <span
                className={
                  nomination.whatsapp_sent_at
                    ? 'text-emerald-400'
                    : 'text-slate-600'
                }
              >
                {nomination.whatsapp_sent_at
                  ? '📱 WhatsApp sent'
                  : nomination.faculty_phone
                    ? '📱 WhatsApp ready'
                    : '📱 No phone'}
              </span>
              {nomination.reward_fired && (
                <span className="text-amber-400">🏆 Reward fired</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Resend email */}
              <ActionButton
                label="📧 Resend Email"
                loading={loading === nomination.id + 'email'}
                onClick={() => resendEmail(nomination)}
                variant="secondary"
              />

              {/* Send WhatsApp — only if phone exists */}
              {nomination.faculty_phone && (
                <ActionButton
                  label={
                    nomination.whatsapp_sent_at
                      ? '📱 Resend WA'
                      : '📱 Send WhatsApp'
                  }
                  loading={loading === nomination.id + 'wa'}
                  onClick={() => sendWhatsApp(nomination)}
                  variant="secondary"
                />
              )}

              {/* Mark Applied */}
              {nomination.status === 'invited' && (
                <ActionButton
                  label="Mark Applied"
                  loading={loading === nomination.id + 'applied'}
                  onClick={() => updateStatus(nomination.id, 'applied')}
                  variant="blue"
                />
              )}

              {/* Verify */}
              {['applied', 'invited'].includes(nomination.status) && (
                <ActionButton
                  label="✓ Verify"
                  loading={loading === nomination.id + 'verified'}
                  onClick={() => verifyNomination(nomination)}
                  variant="green"
                />
              )}

              {/* Mark Eminent — fires reward */}
              {nomination.status === 'verified' &&
                !nomination.reward_fired && (
                  <ActionButton
                    label="Mark Eminent + Reward"
                    loading={loading === nomination.id + 'eminent'}
                    onClick={() => markEminent(nomination)}
                    variant="gold"
                  />
                )}

              {/* Decline */}
              {!['declined', 'eminent'].includes(nomination.status) && (
                <ActionButton
                  label="Decline"
                  loading={loading === nomination.id + 'declined'}
                  onClick={() => {
                    if (
                      confirm(
                        `Decline nomination for ${nomination.faculty_name}?`
                      )
                    ) {
                      updateStatus(nomination.id, 'declined')
                    }
                  }}
                  variant="danger"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Action button ───────────────────────────────────────────────────────────

function ActionButton({
  label,
  loading,
  onClick,
  variant = 'secondary',
}: {
  label: string
  loading: boolean
  onClick: () => void
  variant: 'secondary' | 'blue' | 'green' | 'gold' | 'danger'
}) {
  const cls: Record<string, string> = {
    secondary:
      'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    green:
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 font-semibold',
    gold: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 font-semibold',
    danger:
      'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors whitespace-nowrap ${
        loading
          ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
          : cls[variant]
      }`}
    >
      {loading ? 'Working...' : label}
    </button>
  )
}
