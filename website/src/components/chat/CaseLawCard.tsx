'use client'

/**
 * Inline case law citation card for KanoonSaathi chat.
 * Parses [CASE:name|court|year|url] tags from Claude responses.
 *
 * Source badge: "Indian Kanoon — Supreme Court & High Courts"
 */

type CaseProps = {
  caseName: string
  court: string
  year: string
  url: string
}

export function CaseLawCard({ caseName, court, year, url }: CaseProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        margin: '8px 0',
        transition: 'border-color 200ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--saathi-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>⚖️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px', fontWeight: 600,
            color: 'var(--text-primary)', margin: '0 0 3px',
            lineHeight: 1.4,
          }}>
            {caseName}
          </p>
          <p style={{
            fontSize: '11px', color: 'var(--text-tertiary)', margin: 0,
          }}>
            {court} · {year}
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600, color: 'var(--saathi-primary)',
          flexShrink: 0, marginTop: '2px',
        }}>
          View →
        </span>
      </div>
      <p style={{
        fontSize: '9px', color: 'var(--text-ghost)', margin: '6px 0 0',
        fontFamily: 'var(--font-mono)',
      }}>
        Indian Kanoon — Supreme Court & High Courts
      </p>
    </a>
  )
}

/**
 * Parse [CASE:name|court|year|url] tags from message text.
 * Returns segments: either plain text or CaseLawCard data.
 */
export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'case'; caseName: string; court: string; year: string; url: string }

export function parseCaseTags(text: string): MessageSegment[] {
  const regex = /\[CASE:([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/g
  const segments: MessageSegment[] = []
  let lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    segments.push({
      type: 'case',
      caseName: match[1].trim(),
      court: match[2].trim(),
      year: match[3].trim(),
      url: match[4].trim(),
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return segments
}
