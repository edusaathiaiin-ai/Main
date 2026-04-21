'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestRow = {
  id:                    string
  student_id:            string
  faculty_id:            string | null
  subject:               string
  message:               string
  preferred_duration:    number
  budget_paise:          number | null
  upvote_count:          number
  status:                string
  faculty_response:      string | null
  faculty_responded_at:  string | null
  proposed_slots:        SlotProposal[] | null
  proposed_fee_paise:    number | null
  proposed_duration:     number | null
  proposal_message:      string | null
  proposal_sent_at:      string | null
  student_confirmed_slot:string | null
  linked_session_id:     string | null
  decline_reason:        string | null
  created_at:            string
  // joined
  student_name?:         string
  student_institution?:  string
  student_city?:         string
  student_level?:        string
}

type SlotProposal = {
  start: string   // ISO datetime
  end:   string
  label: string   // "Monday 14 Apr, 4:00 PM – 5:00 PM IST"
}

type TabId = 'pending' | 'responded' | 'accepted' | 'declined'
type ActionMode = 'respond' | 'propose' | 'decline' | null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paise(p: number) { return `₹${(p / 100).toLocaleString('en-IN')}` }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtSlotLabel(start: string, durationMin: number): string {
  const d = new Date(start)
  const end = new Date(d.getTime() + durationMin * 60000)
  const dateStr = d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const endStr  = end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${dateStr}, ${timeStr} – ${endStr} IST`
}

// Next N days in datetime-local format for slot picker defaults
function nextDayLocal(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(17, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

const GOLD  = '#C9993A'
const GREEN = '#4ADE80'
const NAVY  = '#060F1D'

// ─── Stat card ────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      padding: '16px', borderRadius: '14px',
      background: 'var(--bg-elevated)',
      border: '0.5px solid var(--border-subtle)',
    }}>
      <p style={{ fontSize: '22px', fontWeight: 800, color: color ?? '#fff', margin: '0 0 3px' }}>
        {value}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>{label}</p>
    </div>
  )
}

// ─── Propose session panel ────────────────────────────────────────────────────

function ProposePanel({
  request,
  onPropose,
  onCancel,
  saving,
}: {
  request: RequestRow
  onPropose: (data: {
    slots:       SlotProposal[]
    feePaise:    number
    duration:    number
    proposalMsg: string
  }) => Promise<void>
  onCancel: () => void
  saving:   boolean
}) {
  const defaultDuration = request.preferred_duration ?? 60

  const [duration,    setDuration]    = useState(defaultDuration)
  const [feePaise,    setFeePaise]    = useState(request.budget_paise ?? 50000)
  const [slotInputs,  setSlotInputs]  = useState([
    nextDayLocal(1),
    nextDayLocal(2),
    nextDayLocal(3),
  ])
  const [proposalMsg, setProposalMsg] = useState('')
  const [error,       setError]       = useState('')

  function updateSlot(i: number, val: string) {
    setSlotInputs((prev) => prev.map((s, idx) => idx === i ? val : s))
  }

  function addSlot() {
    if (slotInputs.length >= 5) return
    setSlotInputs((prev) => [...prev, nextDayLocal(prev.length + 1)])
  }

  function removeSlot(i: number) {
    if (slotInputs.length <= 1) return
    setSlotInputs((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    if (feePaise < 10000) { setError('Minimum fee is ₹100'); return }
    if (duration < 30)    { setError('Minimum duration is 30 minutes'); return }
    const validSlots: SlotProposal[] = slotInputs
      .filter((s) => s.trim())
      .map((s) => ({
        start: new Date(s).toISOString(),
        end:   new Date(new Date(s).getTime() + duration * 60000).toISOString(),
        label: fmtSlotLabel(new Date(s).toISOString(), duration),
      }))
    if (validSlots.length === 0) { setError('Please add at least one time slot'); return }
    setError('')
    await onPropose({ slots: validSlots, feePaise, duration, proposalMsg })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: '12px', padding: '16px', borderRadius: '14px',
        background: 'rgba(201,153,58,0.06)',
        border: '1px solid rgba(201,153,58,0.2)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: GOLD, margin: '0 0 14px' }}>
          ✦ Propose a 1:1 session
        </p>

        {/* Fee + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
              display: 'block', marginBottom: '5px' }}>
              Your fee (₹)
            </label>
            <input
              type="number" min="100" step="50"
              value={feePaise / 100}
              onChange={(e) => setFeePaise(Math.round(parseFloat(e.target.value || '0') * 100))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {request.budget_paise && (
              <p style={{ fontSize: '9px', color: 'var(--text-ghost)', marginTop: '3px' }}>
                Student budget: {paise(request.budget_paise)}
              </p>
            )}
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
              display: 'block', marginBottom: '5px' }}>
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                appearance: 'none', boxSizing: 'border-box',
              }}>
              {[30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m} style={{ background: 'var(--bg-elevated)' }}>
                  {m} minutes {m === defaultDuration ? '(student preferred)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Earnings display */}
        <div style={{
          padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
          background: 'rgba(74,222,128,0.06)',
          border: '0.5px solid rgba(74,222,128,0.18)',
          display: 'flex', gap: '16px', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 800, color: GREEN, margin: '0 0 1px' }}>
              {paise(Math.round(feePaise * 0.8))}
            </p>
            <p style={{ fontSize: '9px', color: 'var(--text-ghost)', margin: 0 }}>
              you earn (80%)
            </p>
          </div>
          <div style={{ width: '1px', height: '28px', background: 'var(--border-subtle)' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
            Student pays <strong style={{ color: 'var(--text-primary)' }}>{paise(feePaise)}</strong> total
          </p>
        </div>

        {/* Time slots */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            display: 'block', marginBottom: '6px' }}>
            Offer time slots (student picks one)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {slotInputs.map((slot, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="datetime-local"
                  value={slot}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => updateSlot(i, e.target.value)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: '9px',
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-subtle)',
                    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                {slotInputs.length > 1 && (
                  <button onClick={() => removeSlot(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-ghost)',
                      cursor: 'pointer', fontSize: '16px', padding: '4px', flexShrink: 0 }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {slotInputs.length < 5 && (
            <button onClick={addSlot}
              style={{ marginTop: '6px', background: 'none', border: 'none',
                color: 'rgba(201,153,58,0.7)', fontSize: '13px', cursor: 'pointer',
                padding: '4px 0', fontFamily: 'DM Sans, sans-serif' }}>
              + Add another time option
            </button>
          )}
          <p style={{ fontSize: '13px', color: 'var(--text-ghost)', marginTop: '5px' }}>
            Offering 2–3 slots gives students more flexibility and increases acceptance.
          </p>
        </div>

        {/* Note to student */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            display: 'block', marginBottom: '5px' }}>
            Note to student (optional)
          </label>
          <textarea
            value={proposalMsg}
            onChange={(e) => setProposalMsg(e.target.value.slice(0, 400))}
            placeholder="e.g. Happy to cover this topic. I'll walk through both theory and solved examples. Please come with your notes from class."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-subtle)',
              color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
              resize: 'none', boxSizing: 'border-box',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
          <p style={{ fontSize: '9px', color: 'var(--text-ghost)', marginTop: '3px' }}>
            {400 - proposalMsg.length} characters remaining
          </p>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#FCA5A5', marginBottom: '10px' }}>⚠️ {error}</p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: GOLD, color: NAVY,
              fontSize: '13px', fontWeight: 700,
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif',
            }}>
            {saving ? 'Sending proposal…' : 'Send proposal to student →'}
          </button>
          <button onClick={onCancel}
            style={{ padding: '10px 14px', borderRadius: '10px',
              background: 'none', border: 'none',
              color: 'var(--text-ghost)',
              fontSize: '13px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif' }}>
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Decline panel ────────────────────────────────────────────────────────────

function DeclinePanel({
  onDecline, onCancel, saving,
}: { onDecline: (reason: string) => Promise<void>; onCancel: () => void; saving: boolean }) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')

  const REASONS = [
    'Outside my current subject focus',
    'Scheduling constraints this month',
    'Topic needs more advanced prerequisite knowledge',
    'I cover this in my upcoming Live Session — please enrol there',
    'Other (specify below)',
  ]

  const finalReason = reason === 'Other (specify below)' ? custom.trim() : reason

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: '10px', padding: '14px 16px', borderRadius: '13px',
        background: 'rgba(239,68,68,0.05)',
        border: '0.5px solid rgba(239,68,68,0.2)',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#F87171', margin: '0 0 10px' }}>
          Decline this request
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
          {REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)}
              style={{
                padding: '8px 12px', borderRadius: '8px', textAlign: 'left',
                background: reason === r ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
                border: reason === r ? '0.5px solid rgba(239,68,68,0.35)' : '0.5px solid var(--bg-elevated)',
                color: reason === r ? '#FCA5A5' : 'var(--text-tertiary)',
                fontSize: '13px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              {r}
            </button>
          ))}
        </div>
        {reason === 'Other (specify below)' && (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value.slice(0, 200))}
            placeholder="Please tell the student why…"
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '9px', marginBottom: '10px',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-subtle)',
              color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none',
              boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
            }}
          />
        )}
        <p style={{ fontSize: '13px', color: 'var(--text-ghost)', marginBottom: '10px' }}>
          The student will be notified politely. They can post to other faculty.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => finalReason && onDecline(finalReason)}
            disabled={!finalReason || saving}
            style={{
              padding: '9px 16px', borderRadius: '9px',
              background: finalReason ? 'rgba(239,68,68,0.75)' : 'var(--bg-elevated)',
              color: finalReason ? '#fff' : 'var(--text-ghost)',
              fontSize: '13px', fontWeight: 600, border: 'none',
              cursor: finalReason && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            {saving ? 'Sending…' : 'Decline politely'}
          </button>
          <button onClick={onCancel}
            style={{ background: 'none', border: 'none',
              color: 'var(--text-ghost)', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FacultyRequestsPage() {
  const { profile } = useAuthStore()
  const [requests,     setRequests]     = useState<RequestRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState<TabId>('pending')
  const [actionMode,   setActionMode]   = useState<Record<string, ActionMode>>({})
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [saving,       setSaving]       = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('lecture_requests')
      .select(`
        id, student_id, faculty_id, subject, message,
        preferred_duration, budget_paise, upvote_count,
        status, faculty_response, faculty_responded_at,
        proposed_slots, proposed_fee_paise, proposed_duration,
        proposal_message, proposal_sent_at,
        student_confirmed_slot, linked_session_id,
        decline_reason, created_at
      `)
      .eq('faculty_id', profile!.id)
      .order('upvote_count', { ascending: false })

    const rows = (data ?? []) as RequestRow[]

    if (rows.length > 0) {
      const sIds = [...new Set(rows.map((r) => r.student_id))]
      const { data: sData } = await supabase
        .from('profiles')
        .select('id, full_name, institution_name, city, academic_level')
        .in('id', sIds)
      const map: Record<string, {
        full_name: string
        institution_name: string | null
        city: string | null
        academic_level: string | null
      }> = {}
      ;(sData ?? []).forEach((p: {
        id: string
        full_name: string
        institution_name: string | null
        city: string | null
        academic_level: string | null
      }) => { map[p.id] = p })
      rows.forEach((r) => {
        const s = map[r.student_id]
        if (s) {
          r.student_name        = s.full_name
          r.student_institution = s.institution_name ?? undefined
          r.student_city        = s.city ?? undefined
          r.student_level       = s.academic_level ?? undefined
        }
      })
    }

    setRequests(rows)
    setLoading(false)
  }

  const pending   = requests.filter((r) => ['pending', 'acknowledged'].includes(r.status))
  const accepted  = requests.filter((r) => ['accepted', 'session_created'].includes(r.status))
  const responded = requests.filter((r) => r.faculty_response && !['accepted', 'declined', 'session_created'].includes(r.status))
  const declined  = requests.filter((r) => r.status === 'declined')

  const tabMap: Record<TabId, RequestRow[]> = { pending, responded, accepted, declined }

  const topTopic = pending.length > 0
    ? [...pending].sort((a, b) => b.upvote_count - a.upvote_count)[0]
    : null

  function setMode(id: string, mode: ActionMode) {
    setActionMode((p) => ({ ...p, [id]: mode }))
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleRespond(requestId: string) {
    const text = responseText[requestId]?.trim()
    if (!text) return
    setSaving(requestId)
    const supabase = createClient()
    await supabase.from('lecture_requests').update({
      faculty_response:     text,
      faculty_responded_at: new Date().toISOString(),
      status:               'acknowledged',
    }).eq('id', requestId)
    setRequests((prev) => prev.map((r) =>
      r.id === requestId ? { ...r, faculty_response: text, status: 'acknowledged' } : r
    ))
    setMode(requestId, null)
    setSaving(null)
  }

  async function handlePropose(requestId: string, data: {
    slots:       SlotProposal[]
    feePaise:    number
    duration:    number
    proposalMsg: string
  }) {
    setSaving(requestId)
    const supabase = createClient()

    await supabase.from('lecture_requests').update({
      proposed_slots:     data.slots,
      proposed_fee_paise: data.feePaise,
      proposed_duration:  data.duration,
      proposal_message:   data.proposalMsg || null,
      proposal_sent_at:   new Date().toISOString(),
      status:             'accepted',
    }).eq('id', requestId)

    // Notify student via Edge Function (fire-and-forget)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        void fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-lecture-proposal`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ requestId }),
          }
        )
      }
    } catch { /* notification failure is non-critical */ }

    setRequests((prev) => prev.map((r) =>
      r.id === requestId ? {
        ...r,
        proposed_slots:     data.slots,
        proposed_fee_paise: data.feePaise,
        proposed_duration:  data.duration,
        proposal_message:   data.proposalMsg,
        proposal_sent_at:   new Date().toISOString(),
        status:             'accepted',
      } : r
    ))
    setMode(requestId, null)
    setSaving(null)
  }

  async function handleDecline(requestId: string, reason: string) {
    setSaving(requestId)
    const supabase = createClient()
    await supabase.from('lecture_requests').update({
      status:               'declined',
      decline_reason:       reason,
      faculty_response:     reason,
      faculty_responded_at: new Date().toISOString(),
    }).eq('id', requestId)

    // Notify student (fire-and-forget)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        void fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-lecture-proposal`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ requestId, declined: true, reason }),
          }
        )
      }
    } catch { /* non-critical */ }

    setRequests((prev) => prev.map((r) =>
      r.id === requestId
        ? { ...r, status: 'declined', decline_reason: reason, faculty_response: reason }
        : r
    ))
    setMode(requestId, null)
    setSaving(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!profile) return null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '0.5px solid var(--bg-elevated)',
      }}>
        <Link href="/faculty" style={{
          fontFamily: 'Playfair Display, serif', fontSize: '20px',
          fontWeight: 700, color: GOLD, textDecoration: 'none',
        }}>
          EdUsaathiAI
        </Link>
        <Link href="/faculty" style={{
          fontSize: '13px', color: 'var(--text-tertiary)', textDecoration: 'none',
        }}>
          ← Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 'clamp(24px,4vw,36px)',
          fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px',
        }}>
          Lecture Requests
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: '0 0 28px' }}>
          Students want to learn from you. Accept a request to propose a time and fee.
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '28px' }}>
          <Stat label="Total requests"    value={requests.length} />
          <Stat label="Awaiting response" value={pending.length}  color="#FBBF24" />
          <Stat label="Proposals sent"    value={accepted.length} color={GREEN}   />
          <div style={{
            padding: '16px', borderRadius: '14px',
            background: 'rgba(201,153,58,0.06)',
            border: '0.5px solid rgba(201,153,58,0.2)',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: GOLD, margin: '0 0 4px' }}>
              Most requested
            </p>
            <p style={{
              fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {topTopic?.subject ?? '—'}
            </p>
            {topTopic && (
              <p style={{ fontSize: '13px', color: 'var(--text-ghost)', margin: 0 }}>
                {topTopic.upvote_count} students
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '6px', padding: '5px',
          background: 'var(--bg-elevated)',
          borderRadius: '13px', width: 'fit-content',
          marginBottom: '24px',
          border: '0.5px solid var(--bg-elevated)',
        }}>
          {([
            { id: 'pending'   as const, label: 'Pending',   count: pending.length   },
            { id: 'accepted'  as const, label: 'Proposed',  count: accepted.length  },
            { id: 'responded' as const, label: 'Responded', count: responded.length },
            { id: 'declined'  as const, label: 'Declined',  count: declined.length  },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: '9px',
                background: tab === t.id ? GOLD : 'transparent',
                color: tab === t.id ? NAVY : 'var(--text-tertiary)',
                fontSize: '13px', fontWeight: tab === t.id ? 700 : 400,
                border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.18s',
              }}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Request cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid var(--border-subtle)', borderTopColor: GOLD,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : tabMap[tab].length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-ghost)' }}>
              No {tab} requests yet
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tabMap[tab].map((r) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '20px', borderRadius: '18px',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}>

                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{
                    fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0,
                    fontFamily: 'Playfair Display, serif',
                  }}>
                    {r.subject}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {r.upvote_count >= 5 && (
                      <span style={{ fontSize: '13px', color: '#FB923C' }}>
                        🔥 {r.upvote_count} students
                      </span>
                    )}
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '3px 8px',
                      borderRadius: '100px', letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: r.status === 'pending'      ? '#FBBF24'
                           : r.status === 'accepted'     ? GREEN
                           : r.status === 'declined'     ? '#F87171'
                           : 'var(--text-tertiary)',
                      background: r.status === 'pending'  ? 'rgba(251,191,36,0.1)'
                           : r.status === 'accepted'       ? 'rgba(74,222,128,0.1)'
                           : r.status === 'declined'       ? 'rgba(239,68,68,0.1)'
                           : 'var(--bg-elevated)',
                    }}>
                      {r.status === 'accepted' ? 'Proposed' : r.status}
                    </span>
                  </div>
                </div>

                {/* Student info */}
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)', margin: '0 0 10px' }}>
                  {r.student_name ?? 'Student'}
                  {r.student_institution ? ` · ${r.student_institution}` : ''}
                  {r.student_city ? ` · ${r.student_city}` : ''}
                  {r.student_level ? ` · ${r.student_level.replace('_', ' ')}` : ''}
                  {` · ${fmtDate(r.created_at)}`}
                </p>

                {/* Message */}
                <p style={{
                  fontSize: '13px', color: 'var(--text-secondary)',
                  lineHeight: 1.6, margin: '0 0 12px', fontStyle: 'italic',
                }}>
                  &ldquo;{r.message}&rdquo;
                </p>

                {/* Budget + preferred duration */}
                {(r.budget_paise || r.preferred_duration) && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {r.budget_paise != null && (
                      <span style={{
                        fontSize: '13px', fontWeight: 600,
                        color: 'var(--text-secondary)',
                        padding: '3px 10px', borderRadius: '100px',
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border-subtle)',
                      }}>
                        Budget: {paise(r.budget_paise)}
                      </span>
                    )}
                    {!!r.preferred_duration && (
                      <span style={{
                        fontSize: '13px', fontWeight: 600,
                        color: 'var(--text-secondary)',
                        padding: '3px 10px', borderRadius: '100px',
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border-subtle)',
                      }}>
                        Prefers: {r.preferred_duration} min
                      </span>
                    )}
                  </div>
                )}

                {/* Faculty text response (acknowledged state) */}
                {r.faculty_response && !['accepted', 'declined', 'session_created'].includes(r.status) && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                    background: 'rgba(74,222,128,0.06)',
                    border: '0.5px solid rgba(74,222,128,0.15)',
                  }}>
                    <p style={{ fontSize: '9px', fontWeight: 700, color: GREEN, margin: '0 0 3px' }}>
                      Your response
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      {r.faculty_response}
                    </p>
                  </div>
                )}

                {/* Proposal details */}
                {r.status === 'accepted' && r.proposed_slots && (
                  <div style={{
                    padding: '12px 14px', borderRadius: '12px', marginBottom: '12px',
                    background: 'rgba(201,153,58,0.07)',
                    border: '0.5px solid rgba(201,153,58,0.2)',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: GOLD, margin: '0 0 8px' }}>
                      ✦ Proposal sent · waiting for student to confirm
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: GREEN }}>
                        {paise(r.proposed_fee_paise ?? 0)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>·</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        {r.proposed_duration} min
                      </span>
                      {r.proposal_sent_at && (
                        <>
                          <span style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>·</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>
                            Sent {fmtDate(r.proposal_sent_at)}
                          </span>
                        </>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
                      Time slots offered:
                    </p>
                    {r.proposed_slots.map((s, i) => (
                      <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 3px' }}>
                        {i + 1}. {s.label}
                      </p>
                    ))}
                    {r.proposal_message && (
                      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)',
                        marginTop: '8px', fontStyle: 'italic' }}>
                        &ldquo;{r.proposal_message}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Session created */}
                {r.status === 'session_created' && r.linked_session_id && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                    background: 'rgba(74,222,128,0.07)',
                    border: '0.5px solid rgba(74,222,128,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontSize: '13px', color: GREEN, margin: 0, fontWeight: 600 }}>
                      ✓ Session created · student paid
                    </p>
                    <Link href={`/faculty/sessions/${r.linked_session_id}`}
                      style={{ fontSize: '13px', color: GREEN, textDecoration: 'none', fontWeight: 600 }}>
                      View session →
                    </Link>
                  </div>
                )}

                {/* Decline reason */}
                {r.status === 'declined' && r.decline_reason && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '0.5px solid rgba(239,68,68,0.15)',
                  }}>
                    <p style={{ fontSize: '9px', fontWeight: 700, color: '#F87171', margin: '0 0 3px' }}>
                      Your decline reason
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                      {r.decline_reason}
                    </p>
                  </div>
                )}

                {/* Action buttons — only for pending/acknowledged */}
                {['pending', 'acknowledged'].includes(r.status) && (
                  <div>
                    <AnimatePresence mode="wait">
                      {!actionMode[r.id] && (
                        <motion.div key="buttons"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <button onClick={() => setMode(r.id, 'propose')}
                            style={{
                              padding: '9px 18px', borderRadius: '10px',
                              background: 'rgba(74,222,128,0.12)',
                              border: '0.5px solid rgba(74,222,128,0.3)',
                              color: GREEN, fontSize: '13px', fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            }}>
                            Accept — propose time &amp; fee →
                          </button>
                          <button onClick={() => setMode(r.id, 'respond')}
                            style={{
                              padding: '9px 14px', borderRadius: '10px',
                              background: 'rgba(201,153,58,0.1)',
                              border: '0.5px solid rgba(201,153,58,0.25)',
                              color: GOLD, fontSize: '13px', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            }}>
                            Reply only
                          </button>
                          <button onClick={() => setMode(r.id, 'decline')}
                            style={{
                              padding: '9px 12px', borderRadius: '10px',
                              background: 'var(--bg-elevated)',
                              border: '0.5px solid var(--border-subtle)',
                              color: 'var(--text-ghost)', fontSize: '13px',
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                            }}>
                            Decline
                          </button>
                        </motion.div>
                      )}

                      {actionMode[r.id] === 'propose' && (
                        <ProposePanel
                          key="propose"
                          request={r}
                          saving={saving === r.id}
                          onPropose={(data) => handlePropose(r.id, data)}
                          onCancel={() => setMode(r.id, null)}
                        />
                      )}

                      {actionMode[r.id] === 'respond' && (
                        <motion.div key="respond"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}>
                          <div style={{ marginTop: '10px' }}>
                            <textarea
                              value={responseText[r.id] ?? ''}
                              onChange={(e) => setResponseText((p) => ({ ...p, [r.id]: e.target.value }))}
                              placeholder="Your response to this student…"
                              rows={3}
                              style={{
                                width: '100%', padding: '10px 14px', borderRadius: '10px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                                resize: 'none', boxSizing: 'border-box',
                                fontFamily: 'DM Sans, sans-serif', marginBottom: '8px',
                              }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleRespond(r.id)}
                                disabled={saving === r.id || !responseText[r.id]?.trim()}
                                style={{
                                  padding: '9px 18px', borderRadius: '10px',
                                  background: GOLD, color: NAVY,
                                  fontSize: '13px', fontWeight: 700, border: 'none',
                                  cursor: 'pointer', opacity: saving === r.id ? 0.6 : 1,
                                  fontFamily: 'DM Sans, sans-serif',
                                }}>
                                {saving === r.id ? 'Sending…' : 'Send reply'}
                              </button>
                              <button onClick={() => setMode(r.id, null)}
                                style={{ background: 'none', border: 'none',
                                  color: 'var(--text-ghost)', fontSize: '13px',
                                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {actionMode[r.id] === 'decline' && (
                        <DeclinePanel
                          key="decline"
                          saving={saving === r.id}
                          onDecline={(reason) => handleDecline(r.id, reason)}
                          onCancel={() => setMode(r.id, null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}

              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
