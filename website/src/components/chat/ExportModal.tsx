'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ExportModal — three-button modal for exporting a chat conversation.
//
// Triggered from the chat ⋯ menu. Three actions:
//   • Download PDF         → client-side pdf-lib generation, browser download
//   • Email with PDF       → POST /api/chat/export-email (recipient field)
//   • Share to WhatsApp    → POST /api/chat/export-share (signed URL),
//                            then open wa.me/?text=... pre-filled
//
// The modal generates the PDF once on first action (download/email/share)
// and reuses the same Uint8Array. Tool cards inside chat content are
// flattened to "[name: value] open in app to view" placeholders by the
// PDF utility — recipient gets text, signaled missing visuals.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  exportChatToPdf,
  pdfToBase64,
  downloadPdfBlob,
  type ExportableMessage,
} from '@/lib/chat/exportToPdf'

type Props = {
  open:        boolean
  onClose:     () => void
  saathiName:  string
  saathiSlug:  string
  saathiColor: string
  studentName: string
  studentEmail?: string | null
  messages:    ExportableMessage[]
}

const WA_TEXT_LIMIT = 1500

export function ExportModal({
  open, onClose, saathiName, saathiSlug, saathiColor, studentName, studentEmail, messages,
}: Props) {
  const [pdfBytes, setPdfBytes]       = useState<Uint8Array | null>(null)
  const [loading, setLoading]         = useState(false)
  const [emailRecipient, setEmail]    = useState(studentEmail ?? '')
  const [status, setStatus]           = useState<{ kind: 'idle' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })

  // Reset state when re-opened.
  useEffect(() => {
    if (open) {
      setStatus({ kind: 'idle' })
      setEmail(studentEmail ?? '')
    }
  }, [open, studentEmail])

  const filename = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10)
    return `${saathiSlug}-chat-${date}.pdf`
  }, [saathiSlug])

  async function ensurePdf(): Promise<Uint8Array> {
    if (pdfBytes) return pdfBytes
    const bytes = await exportChatToPdf({
      saathiName,
      studentName,
      messages,
    })
    setPdfBytes(bytes)
    return bytes
  }

  async function handleDownload() {
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const bytes = await ensurePdf()
      downloadPdfBlob(bytes, filename)
      setStatus({ kind: 'ok', text: 'Downloaded.' })
    } catch (err) {
      console.error('[ExportModal] download failed', err)
      setStatus({ kind: 'err', text: 'Could not generate PDF — please try again.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEmail() {
    if (!emailRecipient.trim()) {
      setStatus({ kind: 'err', text: 'Enter an email address.' })
      return
    }
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const bytes = await ensurePdf()
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setStatus({ kind: 'err', text: 'Session expired — refresh the page.' })
        setLoading(false)
        return
      }
      const res = await fetch('/api/chat/export-email', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient:    emailRecipient.trim(),
          base64Pdf:    pdfToBase64(bytes),
          saathiName,
          saathiSlug,
          messageCount: messages.length,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = data.error === 'invalid_recipient'
          ? 'That email address looks off. Try again.'
          : data.error === 'email_not_configured'
            ? 'Email isn\'t configured yet — try Download or WhatsApp.'
            : 'Could not send the email — please try again.'
        setStatus({ kind: 'err', text: err })
      } else {
        setStatus({ kind: 'ok', text: `Sent to ${emailRecipient.trim()}.` })
      }
    } catch (err) {
      console.error('[ExportModal] email failed', err)
      setStatus({ kind: 'err', text: 'Could not send — check your connection.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleWhatsApp() {
    setLoading(true)
    setStatus({ kind: 'idle' })
    try {
      const bytes = await ensurePdf()
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setStatus({ kind: 'err', text: 'Session expired — refresh the page.' })
        setLoading(false)
        return
      }
      const res = await fetch('/api/chat/export-share', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          base64Pdf:    pdfToBase64(bytes),
          saathiName,
          saathiSlug,
          messageCount: messages.length,
          exportType:   'whatsapp',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.shareUrl) {
        const err = data.error === 'storage_bucket_missing'
          ? 'Sharing isn\'t set up yet — try Download or Email.'
          : 'Could not generate share link — please try again.'
        setStatus({ kind: 'err', text: err })
      } else {
        // Build a friendly first-1500-chars snippet for the WhatsApp message.
        const lastFew = messages.slice(-3).map((m) => {
          const speaker = m.role === 'user' ? studentName || 'You' : saathiName
          return `${speaker}: ${m.content.replace(/\[[A-Z]+:[^\]]+\]/g, '').slice(0, 200)}`
        }).join('\n\n')
        const summary = lastFew.length > WA_TEXT_LIMIT
          ? lastFew.slice(0, WA_TEXT_LIMIT) + '…'
          : lastFew
        const text = `${saathiName} chat\n\n${summary}\n\nFull chat (PDF): ${data.shareUrl}`
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
        window.open(waUrl, '_blank', 'noopener,noreferrer')
        setStatus({ kind: 'ok', text: 'WhatsApp opened — pick a contact to share.' })
      }
    } catch (err) {
      console.error('[ExportModal] whatsapp failed', err)
      setStatus({ kind: 'err', text: 'Could not generate share link.' })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(11, 31, 58, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg-surface)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Export this chat
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
              {messages.length} message{messages.length === 1 ? '' : 's'} · {saathiName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--text-secondary)',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Action 1 — Download PDF */}
        <button
          onClick={handleDownload}
          disabled={loading}
          style={actionStyle(saathiColor)}
        >
          <span style={{ fontSize: 18 }}>📄</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>
              Download as PDF
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Saves to your device. Tool cards become &quot;open in app&quot; references.
            </span>
          </span>
        </button>

        {/* Action 2 — Email */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={handleEmail}
            disabled={loading}
            style={actionStyle(saathiColor)}
          >
            <span style={{ fontSize: 18 }}>📧</span>
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>
                Email me the PDF
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Sends to the address below as an attachment.
              </span>
            </span>
          </button>
          <input
            type="email"
            value={emailRecipient}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '8px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Action 3 — WhatsApp */}
        <button
          onClick={handleWhatsApp}
          disabled={loading}
          style={{ ...actionStyle(saathiColor), marginTop: 8 }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>
              Share to WhatsApp
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Opens WhatsApp with a chat snippet + 30-day PDF link.
            </span>
          </span>
        </button>

        {status.kind !== 'idle' && (
          <p style={{
            marginTop: 14,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            background: status.kind === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            color: status.kind === 'ok' ? '#16A34A' : '#DC2626',
            border: `1px solid ${status.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {status.text}
          </p>
        )}

        <p style={{
          marginTop: 14,
          fontSize: 11,
          color: 'var(--text-ghost)',
          lineHeight: 1.6,
        }}>
          ✦ This export contains your private learning conversation. We log
          the export action to honour your DPDP &quot;right to know what
          data left the system.&quot;
        </p>
      </div>
    </div>
  )
}

function actionStyle(accent: string): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${accent}30`,
    background: `${accent}06`,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s ease, background 0.15s ease',
  }
}
