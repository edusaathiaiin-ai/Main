'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InstitutionLeaveModal — confirmation dialog for leaving an institution.
// Shows the 7-day data export notice from the brief, accepts an optional
// free-text reason, POSTs to /api/institutions/leave, then invokes onLeft.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

type Props = {
  open:         boolean
  institutionName: string
  onClose:      () => void
  onLeft:       () => void
}

type Status = 'idle' | 'leaving' | 'error'

export function InstitutionLeaveModal({ open, institutionName, onClose, onLeft }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) { setStatus('idle'); setReason(''); setErrorMsg('') }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function confirm() {
    setStatus('leaving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/institutions/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      if (!res.ok) {
        setErrorMsg('Something went wrong. Try again.')
        setStatus('error')
        return
      }
      onLeft()
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-inst-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(6,15,29,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: '100%', maxWidth: 520,
          padding: 24,
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
            }}>
              Leave institution
            </p>
            <h2
              id="leave-inst-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20, fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '4px 0 12px', lineHeight: 1.3,
              }}
            >
              Unlink from {institutionName}?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close (Esc)"
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: 18, lineHeight: 1,
              color: 'var(--text-ghost)', padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* What stays / what goes */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-std)',
          background: 'var(--saathi-light)',
          border: '1px solid var(--saathi-border)',
          marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, color: 'var(--saathi-text)', margin: 0, lineHeight: 1.65 }}>
            Your personal Saathi, chats, notes, and soul profile all stay with you.
            Leaving an institution never touches anything personal.
          </p>
        </div>

        {/* 7-day export notice */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-std)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 16,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase', color: 'var(--text-ghost)',
            margin: '0 0 4px',
          }}>
            7-day data export window
          </p>
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)',
            margin: 0, lineHeight: 1.65,
          }}>
            Anything you created inside your institution&apos;s classrooms over
            the last 7 days will be packaged as a one-click download and emailed
            to you within 24 hours of leaving.
          </p>
        </div>

        <label className="label" htmlFor="leave-reason">Reason (optional)</label>
        <textarea
          id="leave-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Anything we should know? Helps us improve."
          rows={3}
          disabled={status === 'leaving'}
          style={{ minHeight: 80, resize: 'vertical', marginBottom: 12 }}
        />

        {errorMsg && (
          <p role="alert" style={{
            fontSize: 12, color: 'var(--error)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-std)',
            background: 'var(--error-bg)',
            border: '1px solid var(--error)',
            margin: '0 0 12px',
          }}>
            {errorMsg}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={status === 'leaving'}
            className="btn"
            style={{
              padding: '10px 16px', fontSize: 13,
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Stay
          </button>
          <button
            onClick={confirm}
            disabled={status === 'leaving'}
            className="btn"
            style={{
              padding: '10px 18px',
              fontSize: 13, fontWeight: 700,
              background: 'var(--error)',
              color: '#fff',
              opacity: status === 'leaving' ? 0.6 : 1,
              cursor: status === 'leaving' ? 'wait' : 'pointer',
            }}
          >
            {status === 'leaving' ? 'Leaving…' : 'Confirm leave'}
          </button>
        </div>
      </div>
    </div>
  )
}
