'use client'

// ─────────────────────────────────────────────────────────────────────────────
// IframePanel — shared base for embed-only tools
//
// GeoGebra, PhET, SageMathCell, Falstad, NASA Eyes, etc. all render via
// iframe. Same chrome for all of them: "Open in new tab" deeplink + title +
// attribution. Per-tool wrappers pass the URL + optional caption.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  src:         string
  title:       string
  openUrl?:    string     // defaults to src
  attribution?:string     // rendered as small ghost text at bottom
  emptyHint?:  string     // shown before any interaction if relevant
}

export function IframePanel({ src, title, openUrl, attribution, emptyHint }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Top bar: title + "open in new tab" */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <a
          href={openUrl ?? src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            color:      'var(--gold)',
            border:     '1px solid var(--border-subtle)',
          }}
          title="Open in a full browser tab"
        >
          Open ↗
        </a>
      </div>

      {/* Iframe body — fills remaining space */}
      <div className="relative flex-1" style={{ background: 'var(--bg-base)' }}>
        <iframe
          src={src}
          title={title}
          style={{
            width:  '100%',
            height: '100%',
            border: '0',
            display:'block',
          }}
          sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin allow-downloads allow-popups-to-escape-sandbox"
          loading="lazy"
        />
        {emptyHint && (
          <p
            className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[10px] italic"
            style={{ color: 'var(--text-ghost)' }}
          >
            {emptyHint}
          </p>
        )}
      </div>

      {attribution && (
        <div
          className="shrink-0 px-3 py-1.5 text-center"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[10px]" style={{ color: 'var(--text-ghost)', letterSpacing: 0.3 }}>
            {attribution}
          </p>
        </div>
      )}
    </div>
  )
}
