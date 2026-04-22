'use client'

// ─────────────────────────────────────────────────────────────────────────────
// FacultyArtifactRail — Today's Work rail mounted in the dock footer.
//
// Lists saved artifacts newest-first, scoped to today IST. Each row offers
// PDF / Email / WhatsApp delivery and a source link. Refetches when any panel
// dispatches `faculty-artifacts:changed`.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import {
  listTodaysArtifacts,
  emailArtifact,
  whatsappArtifact,
  shareTodaysSession,
  type SavedArtifact,
  type ExportResult,
} from '@/lib/faculty-solo/artifactClient'
import { printArtifactPdf, printSessionBundlePdf } from '@/lib/faculty-solo/pdfPrint'
import { ArtifactPreviewModal } from './ArtifactPreviewModal'

type Props = {
  saathiSlug: string
}

type BundlePending = null | 'email' | 'whatsapp'
type BundleFlash   = null | { kind: 'pdf' | 'email' | 'whatsapp'; status: 'sent' | 'pending' | 'failed'; count?: number }

export function FacultyArtifactRail({ saathiSlug }: Props) {
  const [items, setItems]     = useState<SavedArtifact[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [bundlePending, setBundlePending] = useState<BundlePending>(null)
  const [bundleFlash, setBundleFlash]     = useState<BundleFlash>(null)
  const [preview, setPreview]             = useState<SavedArtifact | null>(null)

  function showBundleFlash(kind: 'pdf' | 'email' | 'whatsapp', status: 'sent' | 'pending' | 'failed', count?: number) {
    setBundleFlash({ kind, status, count })
    setTimeout(() => setBundleFlash(null), 3000)
  }

  function handleBundlePdf() {
    if (!items.length) return
    printSessionBundlePdf(items, saathiSlug)
    showBundleFlash('pdf', 'sent', items.length)
  }

  async function handleBundleEmail() {
    if (!items.length || bundlePending) return
    setBundlePending('email')
    const r = await shareTodaysSession('email', saathiSlug)
    setBundlePending(null)
    showBundleFlash('email', r.status, r.count ?? items.length)
  }

  async function handleBundleWhatsApp() {
    if (!items.length || bundlePending) return
    setBundlePending('whatsapp')
    const r = await shareTodaysSession('whatsapp', saathiSlug)
    setBundlePending(null)
    showBundleFlash('whatsapp', r.status, r.count ?? items.length)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    const rows = await listTodaysArtifacts(saathiSlug)
    setItems(rows)
    setLoading(false)
  }, [saathiSlug])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const handler = () => { void refresh() }
    window.addEventListener('faculty-artifacts:changed', handler)
    return () => window.removeEventListener('faculty-artifacts:changed', handler)
  }, [refresh])

  const hasItems  = items.length > 0
  const latestTwo = items.slice(0, 2)

  return (
    <div
      style={{
        padding:    '10px 14px 12px',
        borderTop:  '1px solid var(--border-subtle)',
        background: hasItems ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        flexShrink: 0,
      }}
    >
      {/* Header row — title, count pill, share-today icons, expand toggle */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          fontFamily:     'var(--font-body)',
          color:          'var(--text-secondary)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color:         'var(--text-ghost)',
          }}>
            Today&apos;s Work
          </span>
          {hasItems && (
            <span style={{
              padding:      '1px 7px',
              borderRadius: 10,
              background:   'var(--gold)',
              color:        '#fff',
              fontSize:     10,
              fontWeight:   700,
            }}>
              {items.length}
            </span>
          )}
        </span>

        {hasItems && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShareIcon
              icon="📎"
              label={`Download today's work as one PDF (${items.length} item${items.length === 1 ? '' : 's'})`}
              onClick={handleBundlePdf}
              disabled={!!bundlePending}
            />
            <ShareIcon
              icon="📧"
              label="Email today's work as one branded bundle"
              onClick={handleBundleEmail}
              disabled={!!bundlePending}
              loading={bundlePending === 'email'}
            />
            <ShareIcon
              icon="💬"
              label="WhatsApp today's work as a summary"
              onClick={handleBundleWhatsApp}
              disabled={!!bundlePending}
              loading={bundlePending === 'whatsapp'}
            />
            <button
              onClick={() => setOpen((o) => !o)}
              style={{
                marginLeft:   4,
                padding:      '4px 8px',
                background:   'transparent',
                border:       'none',
                cursor:       'pointer',
                fontSize:     10,
                fontWeight:   600,
                color:        'var(--text-ghost)',
                whiteSpace:   'nowrap',
              }}
              aria-label={open ? 'Collapse list' : 'Expand list'}
            >
              {open ? '▾ Collapse' : '▸ Expand'}
            </button>
          </div>
        )}
      </div>

      {/* Bundle delivery status flash */}
      {bundleFlash && (
        <p style={{
          margin:     '6px 0 0',
          fontSize:   10,
          fontWeight: 700,
          letterSpacing: 0.3,
          color:
            bundleFlash.status === 'sent'    ? '#16A34A' :
            bundleFlash.status === 'pending' ? '#C9993A' :
            '#EF4444',
        }}>
          {bundleFlash.status === 'sent' && (
            bundleFlash.kind === 'pdf'   ? `✓ PDF ready · ${bundleFlash.count ?? ''} item${(bundleFlash.count ?? 0) === 1 ? '' : 's'}` :
            bundleFlash.kind === 'email' ? `✓ Emailed today's work · ${bundleFlash.count ?? ''} item${(bundleFlash.count ?? 0) === 1 ? '' : 's'}` :
            `✓ WhatsApp summary sent`
          )}
          {bundleFlash.status === 'pending' && (
            bundleFlash.kind === 'whatsapp' ? '◷ Queued (pending WhatsApp re-engagement)' :
            `◷ ${bundleFlash.kind} queued`
          )}
          {bundleFlash.status === 'failed' && `✕ ${bundleFlash.kind} failed`}
        </p>
      )}

      {/* Body */}
      {!hasItems && !loading && (
        <p style={{
          fontSize:   11,
          color:      'var(--text-ghost)',
          margin:     '6px 0 0',
          fontStyle:  'italic',
          lineHeight: 1.5,
        }}>
          Nothing saved yet — pick a tool and hit <span style={{ fontWeight: 600 }}>✦ Save to basket</span>.
        </p>
      )}

      {loading && items.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-ghost)', margin: '6px 0 0', fontStyle: 'italic' }}>
          Loading…
        </p>
      )}

      {hasItems && (
        <div
          style={{
            marginTop: 8,
            display:   'flex',
            flexDirection: 'column',
            gap:       6,
            maxHeight: open ? 280 : 120,
            overflowY: 'auto',
            transition:'max-height 0.18s ease',
          }}
        >
          {(open ? items : latestTwo).map((a) => (
            <ArtifactRow
              key={a.id}
              artifact={a}
              saathiSlug={saathiSlug}
              onOpenPreview={() => setPreview(a)}
            />
          ))}
          {!open && items.length > 2 && (
            <button
              onClick={() => setOpen(true)}
              style={{
                fontSize:   11,
                fontWeight: 700,
                color:      'var(--gold)',
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                textAlign:  'left',
                padding:    '2px 0',
              }}
            >
              + {items.length - 2} more →
            </button>
          )}
        </div>
      )}

      <ArtifactPreviewModal
        artifact={preview}
        saathiSlug={saathiSlug}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────────────

type Pending = null | 'email' | 'whatsapp'
type Flash   = null | { kind: 'pdf' | 'email' | 'whatsapp'; status: 'sent' | 'pending' | 'failed' }

function ArtifactRow({
  artifact,
  saathiSlug,
  onOpenPreview,
}: {
  artifact:      SavedArtifact
  saathiSlug:    string
  onOpenPreview: () => void
}) {
  const [pending, setPending] = useState<Pending>(null)
  const [flash, setFlash]     = useState<Flash>(null)

  const time = new Date(artifact.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  function showFlash(kind: 'pdf' | 'email' | 'whatsapp', status: 'sent' | 'pending' | 'failed') {
    setFlash({ kind, status })
    setTimeout(() => setFlash(null), 2800)
  }

  function onPdf() {
    printArtifactPdf(artifact, saathiSlug)
    showFlash('pdf', 'sent')
  }

  async function onEmail() {
    if (pending) return
    setPending('email')
    const result: ExportResult = await emailArtifact(artifact.id)
    setPending(null)
    showFlash('email', result.status)
  }

  async function onWhatsApp() {
    if (pending) return
    setPending('whatsapp')
    const result: ExportResult = await whatsappArtifact(artifact.id)
    setPending(null)
    showFlash('whatsapp', result.status)
  }

  const flashText = (() => {
    if (!flash) return null
    const label =
      flash.kind === 'pdf'      ? 'PDF ready'   :
      flash.kind === 'email'    ? 'Emailed'     :
      /* whatsapp */              'WhatsApp'
    if (flash.status === 'sent')    return `✓ ${label}`
    if (flash.status === 'pending') return flash.kind === 'whatsapp' ? '◷ Queued (pending approval)' : `◷ ${label} queued`
    return `✕ ${label} failed`
  })()

  const flashColor = (() => {
    if (!flash) return 'var(--text-ghost)'
    if (flash.status === 'sent')    return '#16A34A'
    if (flash.status === 'pending') return '#C9993A'
    return '#EF4444'
  })()

  return (
    <div
      style={{
        padding:      '8px 10px',
        borderRadius: 8,
        background:   'var(--bg-base)',
        border:       '1px solid var(--border-subtle)',
        transition:   'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--saathi-border)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(201,153,58,0.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top line — title + tool chip + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          flexShrink:    0,
          padding:       '1px 6px',
          borderRadius:  4,
          background:    'var(--saathi-light)',
          color:         'var(--saathi-text)',
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          fontFamily:    'var(--font-mono)',
        }}>
          {artifact.tool_id}
        </span>
        <button
          onClick={onOpenPreview}
          title={`Open preview — ${artifact.title ?? 'Untitled'}`}
          className="truncate"
          style={{
            flex:       1,
            minWidth:   0,
            fontSize:   12,
            fontWeight: 600,
            color:      'var(--text-primary)',
            margin:     0,
            textAlign:  'left',
            background: 'transparent',
            border:     'none',
            padding:    0,
            cursor:     'pointer',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--saathi-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
        >
          {artifact.title ?? 'Untitled'}
        </button>
        <span style={{
          flexShrink:    0,
          fontSize:      10,
          fontFamily:    'var(--font-mono)',
          color:         'var(--text-ghost)',
        }}>
          {time}
        </span>
      </div>

      {/* Action row — zoom preview / PDF / Email / WhatsApp / source */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconButton
          icon="🔍"
          label="Zoom in — full preview"
          onClick={onOpenPreview}
        />
        <IconButton
          icon="📎"
          label="Download as Saathi-branded PDF"
          onClick={onPdf}
          disabled={!!pending}
        />
        <IconButton
          icon="📧"
          label="Email this to yourself"
          onClick={onEmail}
          disabled={!!pending}
          loading={pending === 'email'}
        />
        <IconButton
          icon="💬"
          label="WhatsApp to yourself"
          onClick={onWhatsApp}
          disabled={!!pending}
          loading={pending === 'whatsapp'}
        />
        {artifact.source_url && (
          <a
            href={artifact.source_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the original source in a new tab"
            style={iconAnchor}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
          >
            ↗
          </a>
        )}
        {flashText && (
          <span
            style={{
              marginLeft:    'auto',
              fontSize:      10,
              fontWeight:    700,
              color:         flashColor,
              letterSpacing: 0.3,
              whiteSpace:    'nowrap',
            }}
          >
            {flashText}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Shared icon-button styling ─────────────────────────────────────────────

const iconBase = {
  width:         26,
  height:        26,
  display:       'inline-flex',
  alignItems:    'center',
  justifyContent:'center',
  border:        '1px solid var(--border-subtle)',
  borderRadius:  6,
  background:    'var(--bg-elevated)',
  color:         'var(--text-secondary)',
  fontSize:      12,
  cursor:        'pointer',
  textDecoration:'none',
  transition:    'all 0.15s ease',
} as const

const iconAnchor = iconBase

function hoverIn(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
  const el = e.currentTarget as HTMLElement
  el.style.borderColor = 'var(--saathi-primary)'
  el.style.color       = 'var(--saathi-primary)'
  el.style.background  = 'var(--saathi-light)'
}
function hoverOut(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
  const el = e.currentTarget as HTMLElement
  el.style.borderColor = 'var(--border-subtle)'
  el.style.color       = 'var(--text-secondary)'
  el.style.background  = 'var(--bg-elevated)'
}

// Compact icon button for the rail header (smaller than per-row IconButton).
function ShareIcon({
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
        width:         22,
        height:        22,
        display:       'inline-flex',
        alignItems:    'center',
        justifyContent:'center',
        border:        '1px solid var(--border-subtle)',
        borderRadius:  5,
        background:    'var(--bg-elevated)',
        color:         'var(--text-secondary)',
        fontSize:      11,
        cursor:        loading ? 'wait' : disabled ? 'not-allowed' : 'pointer',
        opacity:       disabled && !loading ? 0.45 : 1,
        transition:    'all 0.15s ease',
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
        e.currentTarget.style.background  = 'var(--bg-elevated)'
      }}
    >
      {loading ? '…' : icon}
    </button>
  )
}

function IconButton({
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
        ...iconBase,
        opacity: disabled && !loading ? 0.45 : 1,
        cursor:  loading ? 'wait' : disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
    >
      {loading ? '…' : icon}
    </button>
  )
}
