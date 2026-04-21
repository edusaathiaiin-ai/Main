'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

type State =
  | { kind: 'form'; error: string | null }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

const MAX_MESSAGE = 300
const AUTO_DISMISS_MS = 30_000

export function ContactModal({ open, onClose }: Props) {
  const [state, setState] = useState<State>({ kind: 'form', error: null })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset form when modal reopens
  useEffect(() => {
    if (open) {
      setState({ kind: 'form', error: null })
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
    }
  }, [open])

  // Auto-dismiss after success with no user action
  useEffect(() => {
    if (state.kind !== 'success' || !open) return
    autoDismissRef.current = setTimeout(onClose, AUTO_DISMISS_MS)
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [state.kind, open, onClose])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state.kind === 'submitting') return

    const trimmed = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
    }
    if (
      !trimmed.name ||
      !trimmed.email ||
      !trimmed.phone ||
      !trimmed.message
    ) {
      setState({ kind: 'form', error: 'All fields are required.' })
      return
    }
    if (trimmed.message.length > MAX_MESSAGE) {
      setState({ kind: 'form', error: `Message too long (max ${MAX_MESSAGE} characters).` })
      return
    }

    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmed),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        setState({ kind: 'error', message: body.error ?? 'Could not send.' })
        return
      }
      setState({ kind: 'success' })
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' })
    }
  }

  const charsLeft = MAX_MESSAGE - message.length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          color: '#000000',
          borderRadius: '12px',
          padding: '28px 24px 24px',
          fontFamily:
            "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        {/* Close X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close contact form"
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'transparent',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            color: '#000',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        {state.kind === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>✓</div>
            <h2
              id="contact-modal-title"
              style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}
            >
              Thank you — message received.
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6 }}>
              Our admin will get back to you within 48 hours.
            </p>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>
              This window will close automatically in 30 seconds.
            </p>
          </div>
        ) : (
          <>
            <h2
              id="contact-modal-title"
              style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}
            >
              Contact us
            </h2>
            <p
              style={{
                margin: '0 0 18px',
                fontSize: 13,
                opacity: 0.7,
                lineHeight: 1.5,
              }}
            >
              Send a message to our team at admin@edusaathiai.in. All fields required.
            </p>

            <form onSubmit={handleSubmit}>
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                required
                autoComplete="name"
                style={inputStyle}
              />

              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 120))}
                required
                autoComplete="email"
                style={inputStyle}
              />

              <FieldLabel>Contact number</FieldLabel>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 20))}
                required
                autoComplete="tel"
                placeholder="+91 98255 93204"
                style={inputStyle}
              />

              <FieldLabel>
                Message / Question
                <span
                  style={{
                    float: 'right',
                    fontSize: 11,
                    fontWeight: 400,
                    opacity: charsLeft < 20 ? 1 : 0.6,
                    color: charsLeft < 0 ? '#B00020' : '#000',
                  }}
                >
                  {charsLeft} chars left
                </span>
              </FieldLabel>
              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value.slice(0, MAX_MESSAGE))
                }
                required
                rows={4}
                maxLength={MAX_MESSAGE}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
              />

              {(state.kind === 'form' && state.error) ||
              state.kind === 'error' ? (
                <p
                  style={{
                    margin: '10px 0 0',
                    padding: '8px 10px',
                    background: '#FFEEEE',
                    border: '1px solid #B00020',
                    color: '#B00020',
                    fontSize: 13,
                    borderRadius: 6,
                  }}
                >
                  {state.kind === 'form'
                    ? state.error
                    : state.message}
                </p>
              ) : null}

              <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={secondaryBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={state.kind === 'submitting'}
                  style={{
                    ...primaryBtnStyle,
                    cursor:
                      state.kind === 'submitting' ? 'not-allowed' : 'pointer',
                    opacity: state.kind === 'submitting' ? 0.7 : 1,
                  }}
                >
                  {state.kind === 'submitting' ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 4,
        marginTop: 10,
      }}
    >
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#000',
  background: '#fff',
  border: '1px solid #000',
  borderRadius: 6,
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#fff',
  background: '#000',
  border: '1px solid #000',
  borderRadius: 6,
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  color: '#000',
  background: '#fff',
  border: '1px solid #000',
  borderRadius: 6,
  cursor: 'pointer',
}
