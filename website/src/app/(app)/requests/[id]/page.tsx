'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotProposal = {
  start: string
  end:   string
  label: string
}

type RequestDetail = {
  id:                    string
  student_id:            string
  faculty_id:            string
  subject:               string
  message:               string
  proposed_slots:        SlotProposal[]
  proposed_fee_paise:    number
  proposed_duration:     number
  proposal_message:      string | null
  proposal_sent_at:      string | null
  status:                string
  linked_session_id:     string | null
  student_confirmed_slot:string | null
  // joined
  faculty_name?:         string
  faculty_institution?:  string
  faculty_designation?:  string
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const GOLD  = '#C9993A'
const GREEN = '#4ADE80'
const NAVY  = '#060F1D'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paise(p: number) {
  return `₹${(p / 100).toLocaleString('en-IN')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }) + ' IST'
}

// ─── Slot card ────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  selected,
  onClick,
}: {
  slot:     SlotProposal
  selected: boolean
  onClick:  () => void
}) {
  const d = new Date(slot.start)
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '16px 18px', borderRadius: '14px', cursor: 'pointer',
        background: selected ? 'rgba(201,153,58,0.1)' : 'rgba(255,255,255,0.03)',
        border: selected
          ? '1.5px solid rgba(201,153,58,0.6)'
          : '0.5px solid rgba(255,255,255,0.09)',
        transition: 'all 0.18s',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Radio indicator */}
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: selected ? '5px solid #C9993A' : '1.5px solid rgba(255,255,255,0.25)',
          background: selected ? '#C9993A' : 'transparent',
          transition: 'all 0.15s',
        }} />
        <div>
          <p style={{
            fontSize: '14px', fontWeight: 700, color: selected ? '#fff' : 'rgba(255,255,255,0.75)',
            margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif',
          }}>
            {slot.label}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            {fmtDate(slot.start)} · {fmtTime(slot.start)}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConfirmLectureSlotPage({
  params,
}: {
  params: { id: string }
}) {
  const { profile } = useAuthStore()
  const router = useRouter()

  const [request,      setRequest]      = useState<RequestDetail | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)  // ISO start of chosen slot
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [sessionId,    setSessionId]    = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  async function load() {
    const supabase = createClient()
    const { data, error: dbErr } = await supabase
      .from('lecture_requests')
      .select(`
        id, student_id, faculty_id, subject, message,
        proposed_slots, proposed_fee_paise, proposed_duration,
        proposal_message, proposal_sent_at, status,
        linked_session_id, student_confirmed_slot
      `)
      .eq('id', params.id)
      .single()

    if (dbErr || !data) {
      setError('This request could not be found.')
      setLoading(false)
      return
    }

    const lr = data as RequestDetail

    // Fetch faculty profile
    if (lr.faculty_id) {
      const { data: fp } = await supabase
        .from('profiles')
        .select('full_name, institution_name')
        .eq('id', lr.faculty_id)
        .single()
      if (fp) {
        lr.faculty_name        = (fp.full_name       as string | null) ?? undefined
        lr.faculty_institution = (fp.institution_name as string | null) ?? undefined
      }
    }

    setRequest(lr)

    // If already session_created, skip to done
    if (lr.status === 'session_created' && lr.linked_session_id) {
      setConfirmed(true)
      setSessionId(lr.linked_session_id)
    }

    setLoading(false)
  }

  async function handleConfirm() {
    if (!selectedSlot || !profile || !request) return
    setConfirming(true)

    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        setError('Session expired — please refresh and try again.')
        setConfirming(false)
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/confirm-lecture-slot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ requestId: request.id, slotStart: selectedSlot }),
        }
      )

      const json = await res.json() as { sessionId?: string; error?: string; alreadyConfirmed?: boolean }

      if (!res.ok || !json.sessionId) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setConfirming(false)
        return
      }

      setSessionId(json.sessionId)
      setConfirmed(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setConfirming(false)
    }
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────

  if (!profile) return null

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.08)', borderTopColor: GOLD,
          animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error && !request) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>{error}</p>
          <Link href="/requests" style={{ color: GOLD, fontSize: '13px', textDecoration: 'none' }}>
            ← Back to requests
          </Link>
        </div>
      </main>
    )
  }

  if (!request) return null

  // ── Not the right student ────────────────────────────────────────────────────

  if (request.student_id !== profile.id) {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</p>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>
            This confirmation link is for the student who made the request.
          </p>
        </div>
      </main>
    )
  }

  // ── Not in confirmable state ─────────────────────────────────────────────────

  if (request.status === 'pending' || request.status === 'acknowledged') {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</p>
          <h2 style={{ fontSize: '20px', color: '#fff', fontFamily: 'Playfair Display, serif', margin: '0 0 10px' }}>
            Waiting for faculty response
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Your request for <strong style={{ color: '#fff' }}>{request.subject}</strong> has
            been sent. You'll receive an email and WhatsApp when the faculty proposes a slot.
          </p>
          <Link href="/requests" style={{
            display: 'inline-block', marginTop: '20px',
            color: GOLD, fontSize: '13px', textDecoration: 'none',
          }}>
            ← Back to my requests
          </Link>
        </div>
      </main>
    )
  }

  if (request.status === 'declined') {
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🙏</p>
          <h2 style={{ fontSize: '20px', color: '#fff', fontFamily: 'Playfair Display, serif', margin: '0 0 10px' }}>
            Request declined
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            The faculty is unable to take this session. You can post your request to
            other faculty members.
          </p>
          <Link href="/faculty-finder" style={{
            display: 'inline-block', marginTop: '20px', padding: '10px 20px',
            background: GOLD, color: NAVY, borderRadius: '10px',
            fontSize: '13px', fontWeight: 700, textDecoration: 'none',
          }}>
            Find another faculty →
          </Link>
        </div>
      </main>
    )
  }

  // ── Confirmed screen ─────────────────────────────────────────────────────────

  if (confirmed && sessionId) {
    const chosenSlot = request.proposed_slots.find(
      (s) => s.start === selectedSlot || s.start === request.student_confirmed_slot,
    )
    return (
      <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', maxWidth: '480px', padding: '40px 24px' }}
        >
          {/* Celebration */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
            style={{ fontSize: '60px', marginBottom: '16px' }}
          >
            🎉
          </motion.div>

          <h1 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 'clamp(22px,5vw,32px)',
            fontWeight: 800, color: '#fff', margin: '0 0 10px',
          }}>
            Session confirmed!
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 28px', lineHeight: 1.6 }}>
            You're booked with {request.faculty_name ?? 'your faculty'} for{' '}
            <strong style={{ color: '#fff' }}>{request.subject}</strong>.
          </p>

          {/* Slot + fee summary */}
          <div style={{
            background: 'rgba(74,222,128,0.07)', border: '0.5px solid rgba(74,222,128,0.22)',
            borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', textAlign: 'left',
          }}>
            {chosenSlot && (
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                📅 {chosenSlot.label}
              </p>
            )}
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
              Duration: {request.proposed_duration} minutes
            </p>
            <p style={{ fontSize: '13px', color: GREEN, margin: 0, fontWeight: 600 }}>
              ✓ Seat reserved · {paise(request.proposed_fee_paise)} paid
            </p>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Your meeting link will be shared by the faculty before the session starts.
            You'll receive it via email and WhatsApp.
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/live/${sessionId}`}
              style={{
                padding: '12px 24px', borderRadius: '12px',
                background: GOLD, color: NAVY, fontSize: '14px',
                fontWeight: 700, textDecoration: 'none',
              }}
            >
              View your session →
            </Link>
            <Link
              href="/requests"
              style={{
                padding: '12px 18px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                fontSize: '13px', textDecoration: 'none',
              }}
            >
              Back to requests
            </Link>
          </div>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    )
  }

  // ── Main confirmation form ───────────────────────────────────────────────────

  const slots = request.proposed_slots ?? []

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#060F1D 0%,#0B1F3A 60%,#060F1D 100%)',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: '20px',
          fontWeight: 700, color: GOLD,
        }}>
          EdUsaathiAI
        </span>
        <Link href="/requests" style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
        }}>
          ← My requests
        </Link>
      </nav>

      <div style={{ maxWidth: '580px', margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(201,153,58,0.15)',
            border: '0.5px solid rgba(201,153,58,0.3)',
            padding: '4px 12px', borderRadius: '100px',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: GOLD, marginBottom: '12px',
          }}>
            Faculty Proposal
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(22px,4vw,32px)',
            fontWeight: 800, color: '#fff', margin: '0 0 6px',
          }}>
            {request.subject}
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Proposed by {request.faculty_name ?? 'faculty'}
            {request.faculty_institution ? ` · ${request.faculty_institution}` : ''}
          </p>
        </div>

        {/* Faculty proposal message */}
        {request.proposal_message && (
          <div style={{
            padding: '16px 18px', borderRadius: '14px', marginBottom: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderLeft: `3px solid ${GOLD}`,
          }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(201,153,58,0.8)',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
              Message from faculty
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
              &ldquo;{request.proposal_message}&rdquo;
            </p>
          </div>
        )}

        {/* Fee + Duration summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
          marginBottom: '28px',
        }}>
          <div style={{
            padding: '16px 18px', borderRadius: '14px',
            background: 'rgba(74,222,128,0.06)',
            border: '0.5px solid rgba(74,222,128,0.18)',
          }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: GREEN, margin: '0 0 3px' }}>
              {paise(request.proposed_fee_paise)}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              session fee
            </p>
          </div>
          <div style={{
            padding: '16px 18px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.07)',
          }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 3px' }}>
              {request.proposed_duration} min
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              session duration
            </p>
          </div>
        </div>

        {/* Slot picker */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
            margin: '0 0 12px',
          }}>
            Choose your time slot
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {slots.map((slot) => (
              <SlotCard
                key={slot.start}
                slot={slot}
                selected={selectedSlot === slot.start}
                onClick={() => setSelectedSlot(slot.start)}
              />
            ))}
          </div>
          {slots.length === 0 && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              No slots available — please contact support.
            </p>
          )}
        </div>

        {/* What happens next */}
        <div style={{
          padding: '14px 18px', borderRadius: '12px', marginBottom: '24px',
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            What happens next
          </p>
          {[
            'Your slot is instantly confirmed',
            'Faculty receives a notification',
            'Meeting link shared via email + WhatsApp before session',
            'You can view the session in My Sessions',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '5px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: GOLD, fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>
                {i + 1}.
              </span>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.08)',
                border: '0.5px solid rgba(239,68,68,0.3)',
              }}
            >
              <p style={{ fontSize: '13px', color: '#FCA5A5', margin: 0 }}>⚠️ {error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <button
          onClick={handleConfirm}
          disabled={!selectedSlot || confirming}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '14px', border: 'none',
            background: selectedSlot && !confirming ? GOLD : 'rgba(255,255,255,0.06)',
            color: selectedSlot && !confirming ? NAVY : 'rgba(255,255,255,0.25)',
            fontSize: '15px', fontWeight: 700,
            cursor: selectedSlot && !confirming ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.18s',
          }}
        >
          {confirming ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.2)', borderTopColor: NAVY,
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }} />
              Confirming…
            </span>
          ) : selectedSlot ? (
            'Confirm this slot →'
          ) : (
            'Select a slot to continue'
          )}
        </button>

        <p style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          marginTop: '12px', lineHeight: 1.5,
        }}>
          By confirming you agree to EdUsaathiAI's session terms.
          Payment is processed securely via Razorpay.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
