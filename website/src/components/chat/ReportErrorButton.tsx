'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  verticalId:      string   // UUID
  verticalSlug:    string   // e.g. 'kanoonsaathi'
  verticalName:    string   // e.g. 'KanoonSaathi'
  botSlot:         number
  sessionId?:      string
  messageExcerpt:  string   // the Saathi message that may be wrong
  isLegalTheme?:   boolean
  primaryColor?:   string
}

type State = 'idle' | 'open' | 'submitting' | 'submitted' | 'error'

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportErrorButton({
  verticalId, verticalSlug, verticalName,
  botSlot, sessionId, messageExcerpt,
  isLegalTheme = false, primaryColor = '#C9993A',
}: Props) {
  const { profile } = useAuthStore()

  const [state,       setState]       = useState<State>('idle')
  const [wrongClaim,  setWrongClaim]  = useState('')
  const [correctClaim,setCorrectClaim]= useState('')
  const [topic,       setTopic]       = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [errorMsg,    setErrorMsg]    = useState('')

  const RED     = '#DC2626'
  const NAVY    = 'var(--text-primary)'
  const bg      = 'var(--bg-surface)'
  const textC   = 'var(--text-primary)'
  const borderC = 'var(--border-medium)'
  const inputBg = 'var(--bg-elevated)'

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    borderRadius: '10px', background: inputBg,
    border: `1px solid ${borderC}`,
    color: textC, fontSize: 'var(--text-sm)', outline: 'none',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
  }

  async function handleSubmit() {
    if (!wrongClaim.trim() || !correctClaim.trim()) {
      setErrorMsg('Please fill in both fields')
      return
    }
    setState('submitting')
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please sign in to report errors')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/report-factual-error`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${session.access_token}`,
            apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            verticalId,
            verticalSlug,
            botSlot,
            sessionId:      sessionId ?? null,
            wrongClaim:     wrongClaim.trim(),
            correctClaim:   correctClaim.trim(),
            topic:          topic.trim() || null,
            messageExcerpt: messageExcerpt.slice(0, 1000),
            evidenceUrl:    evidenceUrl.trim() || null,
          }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')

      setState('submitted')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
      setTimeout(() => setState('open'), 3000)
    }
  }

  function reset() {
    setState('idle')
    setWrongClaim('')
    setCorrectClaim('')
    setTopic('')
    setEvidenceUrl('')
    setErrorMsg('')
  }

  return (
    <>
      {/* Trigger button — prominent, below message */}
      {state === 'idle' && (
        <button
          onClick={() => setState('open')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '100px',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.28)',
            color: '#DC2626',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'rgba(220,38,38,0.14)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.45)'
            e.currentTarget.style.color       = '#B91C1C'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'rgba(220,38,38,0.08)'
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.28)'
            e.currentTarget.style.color       = '#DC2626'
          }}
        >
          <span style={{ fontSize: '14px' }}>⚠️</span>
          Found an error? Report it
        </button>
      )}

      {/* Submitted confirmation */}
      {state === 'submitted' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.3)',
            fontSize: 'var(--text-sm)', color: '#16A34A',
            fontWeight: 500,
          }}
        >
          ✓ Reported. Our team will review and update {verticalName}.
          If verified, you earn 50 Saathi Points.
        </motion.div>
      )}

      {/* Report dialog */}
      <AnimatePresence>
        {(state === 'open' || state === 'submitting' || state === 'error') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '20px',
              background: 'rgba(6,15,29,0.85)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={reset}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '480px',
                borderRadius: '20px', background: bg,
                border: `0.5px solid ${borderC}`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 20px 16px',
                borderBottom: `0.5px solid ${borderC}`,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <div>
                  <p style={{
                    fontSize: '15px', fontWeight: 700,
                    color: textC, margin: '0 0 3px',
                    fontFamily: 'Playfair Display, serif',
                  }}>
                    Report a factual error
                  </p>
                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    margin: 0,
                  }}>
                    {verticalName} · Your report helps every student after you
                  </p>
                </div>
                <button onClick={reset}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-ghost)',
                    fontSize: '18px', cursor: 'pointer', padding: '4px',
                  }}>
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px' }}>

                {/* What the Saathi said — auto-filled */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: '6px',
                  }}>
                    What the Saathi said that is wrong *
                  </label>
                  <textarea
                    value={wrongClaim}
                    onChange={e => setWrongClaim(e.target.value.slice(0, 500))}
                    placeholder={`e.g. "Section 498A is non-cognizable"`}
                    rows={3}
                    style={{ ...inp, resize: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = `${RED}60`}
                    onBlur={e  => e.currentTarget.style.borderColor = borderC}
                  />
                  <p style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-ghost)',
                    margin: '3px 0 0', textAlign: 'right',
                  }}>
                    {500 - wrongClaim.length} chars
                  </p>
                </div>

                {/* What is correct */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: '6px',
                  }}>
                    What is the correct information *
                  </label>
                  <textarea
                    value={correctClaim}
                    onChange={e => setCorrectClaim(e.target.value.slice(0, 500))}
                    placeholder={`e.g. "Section 498A is COGNIZABLE, non-bailable, and non-compoundable"`}
                    rows={3}
                    style={{ ...inp, resize: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = `${primaryColor}80`}
                    onBlur={e  => e.currentTarget.style.borderColor = borderC}
                  />
                </div>

                {/* Topic */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: '6px',
                  }}>
                    Topic (optional)
                  </label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Section 498A IPC, Arnesh Kumar guidelines"
                    style={inp}
                    onFocus={e => e.currentTarget.style.borderColor = `${primaryColor}80`}
                    onBlur={e  => e.currentTarget.style.borderColor = borderC}
                  />
                </div>

                {/* Evidence URL */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    marginBottom: '6px',
                  }}>
                    Source / evidence URL (optional but helps)
                  </label>
                  <input
                    value={evidenceUrl}
                    onChange={e => setEvidenceUrl(e.target.value)}
                    placeholder="e.g. https://indiankanoon.org/doc/..."
                    style={inp}
                    onFocus={e => e.currentTarget.style.borderColor = `${primaryColor}80`}
                    onBlur={e  => e.currentTarget.style.borderColor = borderC}
                  />
                </div>

                {/* Reward note */}
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  marginBottom: '16px',
                  background: isLegalTheme
                    ? 'rgba(201,153,58,0.06)'
                    : 'rgba(201,153,58,0.06)',
                  border: '0.5px solid rgba(201,153,58,0.2)',
                }}>
                  <p style={{
                    fontSize: 'var(--text-xs)', margin: 0, lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                  }}>
                    ✦ If your correction is verified — you earn{' '}
                    <strong style={{ color: primaryColor }}>50 Saathi Points</strong> and
                    help every student who asks the same question after you.
                    You will receive an email confirmation.
                  </p>
                </div>

                {errorMsg && (
                  <p style={{
                    fontSize: '12px', color: '#FCA5A5',
                    padding: '8px 12px', borderRadius: '8px',
                    marginBottom: '12px',
                    background: 'rgba(239,68,68,0.08)',
                  }}>
                    ⚠️ {errorMsg}
                  </p>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={reset}
                    style={{
                      padding: '11px 18px', borderRadius: '10px',
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${borderC}`,
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--text-sm)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}>
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={
                      state === 'submitting' ||
                      !wrongClaim.trim() ||
                      !correctClaim.trim()
                    }
                    style={{
                      flex: 1, padding: '11px', borderRadius: '10px',
                      background:
                        wrongClaim.trim() && correctClaim.trim()
                          ? primaryColor
                          : 'var(--bg-elevated)',
                      color:
                        wrongClaim.trim() && correctClaim.trim()
                          ? '#FFFFFF' : 'var(--text-ghost)',
                      fontSize: 'var(--text-sm)', fontWeight: 700,
                      border: 'none',
                      cursor:
                        wrongClaim.trim() && correctClaim.trim() &&
                        state !== 'submitting'
                          ? 'pointer' : 'not-allowed',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.2s',
                    }}
                  >
                    {state === 'submitting' ? (
                      <span style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px',
                      }}>
                        <span style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          border: '2px solid rgba(0,0,0,0.2)',
                          borderTopColor: NAVY,
                          animation: 'spin 0.7s linear infinite',
                          display: 'inline-block',
                        }} />
                        Submitting…
                      </span>
                    ) : 'Submit correction →'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
