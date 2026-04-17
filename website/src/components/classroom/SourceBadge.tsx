'use client'

/**
 * Small badge showing data source attribution.
 * Rendered bottom-left of the plugin panel.
 * Signals to students that data is research-grade.
 */
export function SourceBadge({ label }: { label: string }) {
  if (!label) return null

  return (
    <div
      className="absolute bottom-2 left-2 z-10 rounded-md px-2 py-1 text-[9px] font-semibold"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-ghost)',
        fontFamily: 'var(--font-mono)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {label}
    </div>
  )
}
