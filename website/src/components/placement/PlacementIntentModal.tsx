'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

/**
 * PlacementIntentModal
 *
 * Captures a student's upcoming-interview context in 4 questions, writes
 * a placement_intent row + consent_log entry server-side, and the chat
 * edge function then seeds Bot 2 (Exam Prep) with this context for the
 * next 7–30 days.
 *
 * DPDP: share_with_faculty defaults OFF. Only role/companies/date are
 * shared with mentor-ready faculty when student opts in. Name, email,
 * phone are never shared via this surface.
 */

type RoleType = 'tech' | 'non_tech' | 'hybrid'
type RoleSeniority = 'fresher_campus' | 'fresher_offcampus' | 'lateral'

type Props = {
  open: boolean
  onClose: () => void
  saathiSlug: string
  saathiName: string
}

export function PlacementIntentModal({ open, onClose, saathiSlug, saathiName }: Props) {
  const [roleType, setRoleType] = useState<RoleType | null>(null)
  const [seniority, setSeniority] = useState<RoleSeniority | null>(null)
  const [companiesRaw, setCompaniesRaw] = useState('')
  const [dateRaw, setDateRaw] = useState('')
  const [shareConsent, setShareConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset all fields when the modal closes — never carry state across opens.
  useEffect(() => {
    if (!open) {
      setRoleType(null)
      setSeniority(null)
      setCompaniesRaw('')
      setDateRaw('')
      setShareConsent(false)
      setSubmitting(false)
      setError(null)
      setSuccess(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const canSubmit = roleType !== null && seniority !== null && !submitting

  // Today as YYYY-MM-DD for the date input min — student can't book a
  // mock for an interview that already happened.
  const todayIso = new Date().toISOString().slice(0, 10)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const companies = companiesRaw
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    try {
      const res = await fetch('/api/placement-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saathi_slug: saathiSlug,
          role_type: roleType,
          role_seniority: seniority,
          companies,
          expected_interview_date: dateRaw || null,
          share_with_faculty: shareConsent,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error === 'unknown_saathi'
          ? "Couldn't link this to your Saathi. Try refreshing."
          : 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="placement-intent-title"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px 28px',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
            }}
          >
            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✦</div>
                <h2
                  id="placement-intent-title"
                  className="font-display"
                  style={{
                    fontSize: 'var(--text-xl)',
                    color: 'var(--text-primary)',
                    margin: '0 0 8px',
                    fontWeight: 700,
                  }}
                >
                  Got it. Your Saathi is ready.
                </h2>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 20px',
                }}>
                  Open <strong>Exam Prep</strong> in {saathiName} — it now knows what you&apos;re preparing for.
                  {shareConsent && ' Mentor-ready faculty in this Saathi will be notified if a match comes up.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'var(--saathi-primary)',
                    color: 'var(--bg-surface)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 28px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2
                  id="placement-intent-title"
                  className="font-display"
                  style={{
                    fontSize: 'var(--text-xl)',
                    color: 'var(--text-primary)',
                    margin: '0 0 6px',
                    fontWeight: 700,
                  }}
                >
                  Preparing for an interview?
                </h2>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-tertiary)',
                  margin: '0 0 22px',
                  lineHeight: 1.5,
                }}>
                  Tell us a little. Your Saathi will tune Exam Prep to your role, and — if you allow it — a mentor can offer a mock interview.
                </p>

                {/* Q1 — Role type */}
                <Question label="What kind of role?">
                  <ChipRow>
                    <Chip selected={roleType === 'tech'} onClick={() => setRoleType('tech')}>Tech</Chip>
                    <Chip selected={roleType === 'non_tech'} onClick={() => setRoleType('non_tech')}>Non-tech</Chip>
                    <Chip selected={roleType === 'hybrid'} onClick={() => setRoleType('hybrid')}>Hybrid</Chip>
                  </ChipRow>
                </Question>

                {/* Q2 — Seniority */}
                <Question label="How are you applying?">
                  <ChipRow>
                    <Chip selected={seniority === 'fresher_campus'} onClick={() => setSeniority('fresher_campus')}>Campus fresher</Chip>
                    <Chip selected={seniority === 'fresher_offcampus'} onClick={() => setSeniority('fresher_offcampus')}>Off-campus fresher</Chip>
                    <Chip selected={seniority === 'lateral'} onClick={() => setSeniority('lateral')}>Lateral</Chip>
                  </ChipRow>
                </Question>

                {/* Q3 — Companies */}
                <Question label="Companies on your radar (optional)" hint="Comma-separated. Up to 8.">
                  <input
                    type="text"
                    value={companiesRaw}
                    onChange={(e) => setCompaniesRaw(e.target.value)}
                    placeholder="Infosys, TCS, Wipro"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-base)',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </Question>

                {/* Q4 — Date */}
                <Question label="Interview date (optional)" hint="If you know it, prep gets sharper as the day approaches.">
                  <input
                    type="date"
                    value={dateRaw}
                    min={todayIso}
                    onChange={(e) => setDateRaw(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-base)',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </Question>

                {/* Consent — DPDP opt-in, default OFF */}
                <label
                  className="flex cursor-pointer items-start gap-3"
                  style={{
                    margin: '8px 0 22px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'var(--saathi-bg)',
                    border: '1px solid var(--saathi-border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shareConsent}
                    onChange={(e) => setShareConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                    style={{ accentColor: 'var(--saathi-primary)' }}
                  />
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                    }}
                  >
                    Share these details (role, companies, date — never your name, email or phone) with mentor-ready faculty in {saathiName}, so they can offer a mock interview if matched. You can change this anytime in{' '}
                    <Link href="/profile?tab=data" style={{ color: 'var(--saathi-primary)', textDecoration: 'underline' }}>
                      Profile → Data
                    </Link>
                    .
                  </span>
                </label>

                {error && (
                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--error)',
                    margin: '0 0 14px',
                  }}>
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: '12px',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-medium)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: '12px',
                      background: canSubmit ? 'var(--saathi-primary)' : 'var(--saathi-light)',
                      color: canSubmit ? 'var(--bg-surface)' : 'var(--text-tertiary)',
                      border: 'none',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                    }}
                  >
                    {submitting ? 'Saving…' : 'Start Saathi prep →'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── small inline UI primitives — keep this component self-contained ───

function Question({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label
        style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: hint ? '2px' : '8px',
        }}
      >
        {label}
      </label>
      {hint && (
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          margin: '0 0 8px',
        }}>{hint}</p>
      )}
      {children}
    </div>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{children}</div>
}

function Chip({
  selected, onClick, children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderRadius: '999px',
        border: selected ? '1.5px solid var(--saathi-primary)' : '1px solid var(--border-medium)',
        background: selected ? 'var(--saathi-bg)' : 'var(--bg-surface)',
        color: selected ? 'var(--saathi-text)' : 'var(--text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: selected ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}
