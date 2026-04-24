'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InstitutionJoinModal — two-step modal: search → confirm → POST /join.
// ESC closes, backdrop click closes, focus trap skipped for simplicity
// (small modal, short flow, deferred to Phase I-2 if a11y audit demands it).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { InstitutionSearch, type InstitutionSearchHit } from './InstitutionSearch'

type Props = {
  open:    boolean
  onClose: () => void
  onJoined: (hit: InstitutionSearchHit) => void
}

type Status = 'idle' | 'joining' | 'error'

export function InstitutionJoinModal({ open, onClose, onJoined }: Props) {
  const [picked, setPicked] = useState<InstitutionSearchHit | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Reset local state whenever the modal is opened fresh.
  useEffect(() => {
    if (open) {
      setPicked(null); setStatus('idle'); setErrorMsg('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function confirmJoin() {
    if (!picked) return
    setStatus('joining')
    setErrorMsg('')
    try {
      const res = await fetch('/api/institutions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: picked.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(
          data?.error === 'institution_not_open' ? 'This institution isn\'t accepting students yet. Try again later.' :
          data?.error === 'institution_not_found' ? 'That institution was removed. Please pick another.' :
          data?.error === 'unauthorized'           ? 'Please sign in again.' :
          'Something went wrong. Try again.'
        )
        setStatus('error')
        return
      }
      onJoined(picked)
    } catch {
      setErrorMsg('Network error. Check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-inst-title"
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
            }}>
              Find my institution
            </p>
            <h2
              id="join-inst-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20, fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '4px 0 12px', lineHeight: 1.3,
              }}
            >
              {picked ? `Join ${picked.name}?` : 'Which college do you study at?'}
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

        {/* Body */}
        {!picked && (
          <InstitutionSearch onPick={(hit) => setPicked(hit)} />
        )}

        {picked && (
          <div>
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-std)',
              background: 'var(--saathi-light)',
              border: '1px solid var(--saathi-border)',
              marginBottom: 14,
            }}>
              <p style={{
                fontSize: 15, fontWeight: 700,
                color: 'var(--saathi-text)',
                margin: 0, lineHeight: 1.4,
              }}>
                {picked.name}
              </p>
              <p style={{
                fontSize: 12, color: 'var(--text-tertiary)',
                margin: '2px 0 0',
              }}>
                {picked.city}{picked.affiliation ? ` · ${picked.affiliation}` : ''}
              </p>
            </div>

            <p style={{
              fontSize: 13, color: 'var(--text-secondary)',
              margin: '0 0 16px', lineHeight: 1.65,
            }}>
              We&apos;ll link your account to this institution. Your personal
              Saathi, chats, and soul stay exactly as they are — joining adds
              institutional features on top.
            </p>

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
                onClick={() => { setPicked(null); setStatus('idle'); setErrorMsg('') }}
                disabled={status === 'joining'}
                className="btn"
                style={{
                  padding: '10px 16px', fontSize: 13,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Pick different college
              </button>
              <button
                onClick={confirmJoin}
                disabled={status === 'joining'}
                className="btn btn-primary"
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: status === 'joining' ? 0.6 : 1,
                  cursor: status === 'joining' ? 'wait' : 'pointer',
                }}
              >
                {status === 'joining' ? 'Joining…' : 'Confirm & Join →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
