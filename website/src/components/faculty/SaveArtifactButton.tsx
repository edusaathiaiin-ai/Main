'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SaveArtifactButton — pill button mounted on any panel result.
// Tracks three states: idle → saving → saved. On save success, broadcasts
// `faculty-artifacts:changed` so the dock rail can refetch without prop-drill.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { saveArtifact, currentSessionBucketId, type SaveArtifactInput } from '@/lib/faculty-solo/artifactClient'

type Props = {
  saathiSlug:  string
  toolId:      string
  title?:      string
  payload:     Record<string, unknown>
  sourceUrl?:  string
  /** Optional compact variant — icon-only, no label */
  compact?:    boolean
}

export function SaveArtifactButton({ saathiSlug, toolId, title, payload, sourceUrl, compact }: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (state !== 'idle') return
    setState('saving')

    const input: SaveArtifactInput = {
      saathi_slug:       saathiSlug,
      tool_id:           toolId,
      title,
      payload_json:      payload,
      source_url:        sourceUrl,
      session_bucket_id: currentSessionBucketId(),
    }
    const artifact = await saveArtifact(input)
    if (artifact) {
      setState('saved')
      window.dispatchEvent(new Event('faculty-artifacts:changed'))
      setTimeout(() => setState('idle'), 2500)
    } else {
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  const label =
    state === 'saving' ? 'Saving…' :
    state === 'saved'  ? 'Saved ✓'   :
    state === 'error'  ? 'Retry'     :
    'Save to basket'

  const bg =
    state === 'saved'  ? 'rgba(34,197,94,0.14)' :
    state === 'error'  ? 'rgba(239,68,68,0.14)' :
    'var(--bg-elevated)'

  const color =
    state === 'saved'  ? '#16A34A' :
    state === 'error'  ? '#EF4444' :
    'var(--text-secondary)'

  return (
    <button
      onClick={handleClick}
      disabled={state === 'saving'}
      title="Save this result to your Today's Work rail"
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         4,
        padding:     compact ? '3px 7px' : '4px 9px',
        borderRadius: 999,
        border:      '1px solid var(--border-subtle)',
        background:  bg,
        color,
        fontSize:    compact ? 10 : 11,
        fontWeight:  600,
        cursor:      state === 'saving' ? 'wait' : 'pointer',
        fontFamily:  'var(--font-body)',
        transition:  'all 0.15s ease',
      }}
    >
      {compact ? (
        state === 'saved' ? '✓' : state === 'saving' ? '…' : '✦'
      ) : (
        <>
          <span>{state === 'saved' ? '✓' : state === 'saving' ? '…' : '✦'}</span>
          <span>{label}</span>
        </>
      )}
    </button>
  )
}
