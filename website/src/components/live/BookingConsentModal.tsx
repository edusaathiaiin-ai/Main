'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

/**
 * BookingConsentModal
 *
 * Gates the student's click on "Book Seat" by forcing an explicit moment of
 * attention for the three-way contract between platform, faculty, and student:
 *
 *   1. PLATFORM GUARANTEE — what EdUsaathiAI commits to (faculty-cancel refund,
 *      24h meeting-link delivery, Razorpay payment security).
 *   2. SET BY FACULTY — what this specific faculty promised for this session
 *      (their terms text + refund window for student-initiated cancellation).
 *   3. YOUR COMMITMENT — what the student agrees to by clicking Pay
 *      (no-show = no refund; seat-holding is the commitment, not attendance).
 *
 * Consent is captured client-side by enabling the "Pay" button only after the
 * checkbox is ticked. The durable audit trail is the frozen live_sessions row
 * (terms + refund_window_hours + terms_locked_at from migration 137) alongside
 * the live_bookings.created_at timestamp — together they prove exactly what
 * the student was shown and when.
 *
 * Rendering rules:
 *   - Modal is dismissible (Escape, backdrop click, Cancel button) — only
 *     the Pay button commits to the booking.
 *   - Free sessions reuse the same modal with the Pay button relabelled as
 *     "Reserve seat" and the student-commitment block's first bullet
 *     softened (no financial forfeit on free, but seat-commit still applies).
 *   - Faculty terms block only renders when session.terms is set — platform
 *     guarantee and student commitment always render.
 */

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isFree: boolean
  amountLabel: string // e.g. "₹199" for paid, "Free" for free
  facultyTerms: string | null
  refundWindowHours: number
  saathiPrimary: string
}

export function BookingConsentModal({
  open,
  onClose,
  onConfirm,
  isFree,
  amountLabel,
  facultyTerms,
  refundWindowHours,
  saathiPrimary,
}: Props) {
  const [agreed, setAgreed] = useState(false)

  // Reset agreement whenever the modal closes — don't carry agreement across
  // sessions or retries (student must re-agree each time they click Book).
  useEffect(() => {
    if (!open) setAgreed(false)
  }, [open])

  // Escape key closes the modal
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Scroll-lock the page while modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const refundLine =
    refundWindowHours === 0
      ? 'Non-refundable. No refund if you cancel after booking.'
      : `Full refund if cancelled ${refundWindowHours}h or more before the first lecture.`

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
            background: 'rgba(0,0,0,0.65)',
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
            aria-labelledby="booking-consent-title"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0B1F3A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px 28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h2
              id="booking-consent-title"
              className="font-display mb-1 text-2xl font-bold"
              style={{ color: '#fff' }}
            >
              Before you book
            </h2>
            <p
              className="mb-6 text-xs"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {isFree
                ? 'Please review — your seat is held for a real student.'
                : 'Please review — this is a paid booking.'}
            </p>

            {/* Block 1 — Platform guarantee */}
            <section
              className="mb-4 rounded-xl p-4"
              style={{
                background: 'rgba(74,222,128,0.08)',
                border: '0.5px solid rgba(74,222,128,0.25)',
              }}
            >
              <p
                className="mb-2 text-[10px] font-bold tracking-wider uppercase"
                style={{ color: '#4ADE80' }}
              >
                Platform guarantee
              </p>
              <ul
                className="space-y-1.5 text-xs"
                style={{ color: 'rgba(255,255,255,0.82)' }}
              >
                <li>✓ Full refund if faculty cancels the session</li>
                <li>✓ Meeting link delivered 24 hours before</li>
                <li>✓ Secure payment via Razorpay</li>
              </ul>
            </section>

            {/* Block 2 — Faculty terms (only if set) */}
            {facultyTerms && facultyTerms.trim() && (
              <section
                className="mb-4 rounded-xl p-4"
                style={{
                  background: 'rgba(201,153,58,0.08)',
                  border: '0.5px solid rgba(201,153,58,0.25)',
                }}
              >
                <p
                  className="mb-2 text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#C9993A' }}
                >
                  Set by faculty
                </p>
                <p
                  className="mb-2 text-xs leading-relaxed"
                  style={{
                    color: 'rgba(255,255,255,0.82)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {facultyTerms}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {refundLine}
                </p>
              </section>
            )}

            {/* When faculty has NO custom terms, still show the refund line
                under a small "Set by faculty" header — so the student always
                sees the refund window, not just platform + commitment. */}
            {(!facultyTerms || !facultyTerms.trim()) && (
              <section
                className="mb-4 rounded-xl p-4"
                style={{
                  background: 'rgba(201,153,58,0.06)',
                  border: '0.5px solid rgba(201,153,58,0.2)',
                }}
              >
                <p
                  className="mb-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#C9993A' }}
                >
                  Set by faculty
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {refundLine}
                </p>
              </section>
            )}

            {/* Block 3 — Student commitment */}
            <section
              className="mb-5 rounded-xl p-4"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '0.5px solid rgba(248,113,113,0.25)',
              }}
            >
              <p
                className="mb-2 text-[10px] font-bold tracking-wider uppercase"
                style={{ color: '#F87171' }}
              >
                Your commitment
              </p>
              <ul
                className="space-y-1.5 text-xs"
                style={{ color: 'rgba(255,255,255,0.82)' }}
              >
                <li>
                  {isFree
                    ? '• Booking holds your seat from another student — please show up.'
                    : '• Booking holds your seat — you pay to reserve it, not only to attend.'}
                </li>
                <li>
                  {isFree
                    ? '• No-show may affect priority for high-demand sessions later.'
                    : '• No-show means no refund. The fee is forfeited.'}
                </li>
                <li>
                  • Cancel within the faculty&apos;s refund window above for a
                  full refund.
                </li>
              </ul>
            </section>

            {/* Consent checkbox + Terms link */}
            <label
              className="mb-5 flex cursor-pointer items-start gap-3"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                style={{ accentColor: saathiPrimary }}
              />
              <span className="text-xs leading-relaxed">
                I have read and agreed to the terms above and the platform{' '}
                <Link
                  href="/terms#live-bookings"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#C9993A',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Terms of Use ↗
                </Link>
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold"
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!agreed}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{
                  background: agreed ? '#C9993A' : 'rgba(201,153,58,0.35)',
                  color: agreed ? '#060F1D' : 'rgba(6,15,29,0.7)',
                  cursor: agreed ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                }}
              >
                {isFree ? 'Reserve seat' : `Pay ${amountLabel} →`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
