'use client'

import Link from 'next/link'

/**
 * Shown inside Faculty chat when viewAs=faculty AND botSlot=5.
 * One-click handoff: carries the last draft into /faculty/question-paper
 * via sessionStorage, so the formal page can pick it up and format for export.
 */
export function SendToQuestionPaper({ draft }: { draft: string }) {
  const hasDraft = draft.trim().length > 0

  function handleClick() {
    if (!hasDraft) return
    try {
      sessionStorage.setItem('edu-qp-draft', draft)
      sessionStorage.setItem('edu-qp-draft-at', new Date().toISOString())
    } catch {
      // sessionStorage unavailable — the destination page falls back to empty state
    }
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: 'var(--saathi-light, var(--bg-elevated))',
        border: '1px solid var(--saathi-border, var(--border-subtle))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Ready to format this into a printable paper?
      </span>
      <Link
        href="/faculty/question-paper"
        onClick={handleClick}
        aria-disabled={!hasDraft}
        style={{
          padding: '6px 14px',
          borderRadius: 100,
          background: hasDraft ? 'var(--saathi-text, var(--text-primary))' : 'var(--text-ghost)',
          color: 'var(--bg-surface)',
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          cursor: hasDraft ? 'pointer' : 'not-allowed',
          pointerEvents: hasDraft ? 'auto' : 'none',
        }}
      >
        Send to Question Paper →
      </Link>
    </div>
  )
}
