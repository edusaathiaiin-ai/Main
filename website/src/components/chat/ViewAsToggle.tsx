'use client'

import { useViewAsStore } from '@/stores/viewAsStore'

export function ViewAsToggle() {
  const { viewAs, setViewAs } = useViewAsStore()

  return (
    <div
      role="tablist"
      aria-label="View as"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: '100px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        gap: '2px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          padding: '0 8px 0 6px',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        Viewing as
      </span>
      {(['faculty', 'student'] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={viewAs === v}
          onClick={() => setViewAs(v)}
          style={{
            padding: '4px 10px',
            borderRadius: '100px',
            background: viewAs === v ? 'var(--saathi-light)' : 'transparent',
            border: viewAs === v ? '1px solid var(--saathi-border)' : '1px solid transparent',
            color: viewAs === v ? 'var(--saathi-text)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: viewAs === v ? 600 : 500,
            cursor: 'pointer',
            textTransform: 'capitalize',
            transition: 'all 150ms ease',
            fontFamily: 'var(--font-body)',
          }}
        >
          {v}
        </button>
      ))}
    </div>
  )
}
