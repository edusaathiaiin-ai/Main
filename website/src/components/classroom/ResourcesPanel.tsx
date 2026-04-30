'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ResourcesPanel — honest link list for desktop-only / non-iframable tools.
//
// Used when a tool is genuinely valuable but cannot be embedded in our
// classroom: Bentley Education Suite, FreeCAD, Logisim Evolution,
// CEDAR LS, Energy3D (desktop), CAN-Sim PDF scenarios, etc. Rather
// than pretending we can iframe them, we surface honest "Open in new
// tab" cards with the download link, a 1-line description, and the
// vendor's tutorial URL where applicable.
//
// Same chip-data shape as ToolChipPanel for consistency, but rendered
// as link cards instead of an iframe.
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceChip = {
  /** Resource name. */
  label: string
  /** External URL — always opens in a new tab. */
  url: string
  /** Short description shown under the label. */
  description: string
  /** Optional emoji / icon character. */
  icon?: string
  /** Optional tag, e.g. "Desktop", "Free", "Tutorial". */
  tag?: string
}

type Props = {
  /** Section heading shown at the top of the panel. */
  label: string
  /** Resources to list. */
  resources: ResourceChip[]
  /** Optional intro line under the heading. */
  intro?: string
}

export function ResourcesPanel({ label, resources, intro }: Props) {
  return (
    <div
      className="h-full overflow-y-auto px-4 py-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="mb-4">
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {label}
        </h3>
        {intro && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '4px 0 0',
              lineHeight: 1.5,
            }}
          >
            {intro}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {resources.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'block',
              padding:        '12px 14px',
              borderRadius:   'var(--radius-std)',
              background:     'var(--bg-surface)',
              border:         '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color:          'inherit',
              transition:     'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--gold)'
              e.currentTarget.style.transform   = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.transform   = 'translateY(0)'
            }}
          >
            <div className="flex items-start gap-2">
              {r.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{r.icon}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center justify-between gap-2">
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {r.label}
                  </p>
                  {r.tag && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        color: 'var(--text-ghost)',
                        background: 'var(--bg-elevated)',
                        padding: '2px 6px',
                        borderRadius: 100,
                        flexShrink: 0,
                      }}
                    >
                      {r.tag}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    margin: '3px 0 0',
                    lineHeight: 1.5,
                  }}
                >
                  {r.description}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: 'var(--gold)',
                    margin: '4px 0 0',
                    fontWeight: 600,
                  }}
                >
                  Open in new tab →
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
