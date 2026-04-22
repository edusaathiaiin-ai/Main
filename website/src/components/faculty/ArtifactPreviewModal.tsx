'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ArtifactPreviewModal — fullscreen Saathi-branded preview for a saved
// artifact. Reuses the shared artifactRenderer so what you see here matches
// exactly what lands in the PDF + email bundle. Same 📎 📧 💬 export cluster
// so the faculty can deliver from the preview without going back to the rail.
// Esc or backdrop click closes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  emailArtifact,
  whatsappArtifact,
  type ExportResult,
  type SavedArtifact,
} from '@/lib/faculty-solo/artifactClient'
import { printArtifactPdf } from '@/lib/faculty-solo/pdfPrint'
import {
  renderArtifactPayloadHtml,
  resolveSaathiBrand,
} from '@/lib/faculty-solo/artifactRenderer'

type Props = {
  artifact:   SavedArtifact | null
  saathiSlug: string
  onClose:    () => void
}

type Pending = null | 'email' | 'whatsapp'
type Flash   = null | { kind: 'pdf' | 'email' | 'whatsapp'; status: 'sent' | 'pending' | 'failed' }

export function ArtifactPreviewModal({ artifact, saathiSlug, onClose }: Props) {
  const [pending, setPending] = useState<Pending>(null)
  const [flash, setFlash]     = useState<Flash>(null)

  // Reset local state whenever a different artifact opens the modal.
  useEffect(() => { setPending(null); setFlash(null) }, [artifact?.id])

  // Esc closes.
  useEffect(() => {
    if (!artifact) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [artifact, onClose])

  if (!artifact) return null

  const { emoji, name, tagline, primary } = resolveSaathiBrand(saathiSlug)
  const payloadHtml = renderArtifactPayloadHtml(artifact.tool_id, artifact.payload_json)
  const dateStr = new Date(artifact.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  function showFlash(kind: 'pdf' | 'email' | 'whatsapp', status: 'sent' | 'pending' | 'failed') {
    setFlash({ kind, status })
    setTimeout(() => setFlash(null), 2800)
  }

  function onPdf() {
    if (!artifact) return
    printArtifactPdf(artifact, saathiSlug)
    showFlash('pdf', 'sent')
  }

  async function onEmail() {
    if (!artifact || pending) return
    setPending('email')
    const r: ExportResult = await emailArtifact(artifact.id)
    setPending(null)
    showFlash('email', r.status)
  }

  async function onWhatsApp() {
    if (!artifact || pending) return
    setPending('whatsapp')
    const r: ExportResult = await whatsappArtifact(artifact.id)
    setPending(null)
    showFlash('whatsapp', r.status)
  }

  const flashText = !flash ? null : (
    flash.status === 'sent'    ? `✓ ${flash.kind === 'pdf' ? 'PDF ready' : flash.kind === 'email' ? 'Emailed' : 'WhatsApp sent'}` :
    flash.status === 'pending' ? (flash.kind === 'whatsapp' ? '◷ Queued (pending WhatsApp re-engagement)' : `◷ ${flash.kind} queued`) :
    `✕ ${flash.kind} failed`
  )
  const flashColor =
    flash?.status === 'sent'    ? '#16A34A' :
    flash?.status === 'pending' ? '#C9993A' :
    flash?.status === 'failed'  ? '#EF4444' : 'var(--text-ghost)'

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          zIndex:     10000,
          background: 'rgba(6,15,29,0.72)',
          backdropFilter: 'blur(6px)',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding:    '24px',
        }}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width:         '100%',
            maxWidth:      720,
            maxHeight:     'calc(100vh - 48px)',
            background:    'var(--bg-surface)',
            borderRadius:  16,
            overflow:      'hidden',
            display:       'flex',
            flexDirection: 'column',
            boxShadow:     '0 24px 80px rgba(0,0,0,0.4)',
          }}
        >
          {/* Gold accent bar */}
          <div style={{
            height:       4,
            background:   `linear-gradient(90deg, ${primary} 0%, #C9993A 100%)`,
            flexShrink:   0,
          }} />

          {/* Saathi header */}
          <div
            style={{
              display:      'flex',
              alignItems:   'flex-start',
              gap:          12,
              padding:      '16px 20px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink:   0,
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize:   18,
                fontWeight: 700,
                color:      primary,
                margin:     0,
                lineHeight: 1.2,
              }}>
                {name}
              </p>
              <p style={{
                fontSize:   12,
                color:      'var(--text-tertiary)',
                fontStyle:  'italic',
                margin:     '2px 0 0',
              }}>
                {tagline}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close preview (Esc)"
              title="Close (Esc)"
              style={{
                flexShrink:   0,
                background:   'transparent',
                border:       'none',
                cursor:       'pointer',
                color:        'var(--text-ghost)',
                fontSize:     20,
                lineHeight:   1,
                padding:      4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              flex:      1,
              minHeight: 0,
              overflowY: 'auto',
              padding:   '18px 24px 20px',
              color:     'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                padding:       '3px 10px',
                borderRadius:  999,
                background:    `${primary}22`,
                color:         primary,
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                fontFamily:    'var(--font-mono)',
              }}>
                {artifact.tool_id}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-ghost)', marginLeft: 'auto' }}>
                {dateStr}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize:   20,
              fontWeight: 700,
              color:      'var(--text-primary)',
              margin:     '0 0 12px',
              lineHeight: 1.3,
            }}>
              {artifact.title ?? artifact.tool_id}
            </h2>

            {/* Renderer output — escaped server-side, style via nested CSS below.
                The rendered snippet uses .meta / .value classes. */}
            <div
              className="faculty-preview-payload"
              dangerouslySetInnerHTML={{ __html: payloadHtml }}
            />

            {artifact.source_url && (
              <p style={{
                margin:    '16px 0 0',
                paddingTop:'12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize:  12,
                color:     'var(--text-tertiary)',
              }}>
                Source ·{' '}
                <a
                  href={artifact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: primary, textDecoration: 'none' }}
                >
                  {artifact.source_url}
                </a>
              </p>
            )}
          </div>

          {/* Footer: actions + flash */}
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              gap:           12,
              padding:       '12px 20px',
              borderTop:     '1px solid var(--border-subtle)',
              background:    'var(--bg-elevated)',
              flexShrink:    0,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <PreviewAction icon="📎" label="Download branded PDF"    onClick={onPdf}      disabled={!!pending} />
              <PreviewAction icon="📧" label="Email to yourself"        onClick={onEmail}    disabled={!!pending} loading={pending === 'email'} />
              <PreviewAction icon="💬" label="WhatsApp to yourself"     onClick={onWhatsApp} disabled={!!pending} loading={pending === 'whatsapp'} />
            </div>
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              letterSpacing: 0.3,
              color:         flashColor,
              whiteSpace:    'nowrap',
            }}>
              {flashText ?? ''}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scoped styling for the renderer's .meta / .value classes */}
      <style jsx global>{`
        .faculty-preview-payload .meta {
          margin: 12px 0 2px;
          font-size: 10px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-ghost);
        }
        .faculty-preview-payload .value {
          margin: 0 0 8px;
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.55;
        }
        .faculty-preview-payload pre.value {
          font-family: var(--font-mono);
          font-size: 12px;
          white-space: pre-wrap;
          word-break: break-word;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 10px;
        }
        .faculty-preview-payload img {
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          margin: 2px 0 6px;
        }
        .faculty-preview-payload a {
          color: var(--gold);
          text-decoration: none;
        }
        .faculty-preview-payload a:hover { text-decoration: underline; }
      `}</style>
    </AnimatePresence>
  )
}

function PreviewAction({
  icon, label, onClick, disabled, loading,
}: {
  icon:      string
  label:     string
  onClick:   () => void
  disabled?: boolean
  loading?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
      style={{
        width:          32,
        height:         32,
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        border:         '1px solid var(--border-subtle)',
        borderRadius:   8,
        background:     'var(--bg-surface)',
        color:          'var(--text-secondary)',
        fontSize:       14,
        cursor:         loading ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        opacity:        disabled && !loading ? 0.45 : 1,
        transition:     'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return
        e.currentTarget.style.borderColor = 'var(--saathi-primary)'
        e.currentTarget.style.color       = 'var(--saathi-primary)'
        e.currentTarget.style.background  = 'var(--saathi-light)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.color       = 'var(--text-secondary)'
        e.currentTarget.style.background  = 'var(--bg-surface)'
      }}
    >
      {loading ? '…' : icon}
    </button>
  )
}
