'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SessionContextPanel — left-panel filler when video lives elsewhere.
//
// Renders when video_provider === 'google_meet'. The Meet/Zoom call
// already opened in a separate window when faculty clicked Join, so this
// panel fills the classroom's left half with calm session context:
// title, faculty name, participant count (Liveblocks presence), elapsed
// timer. No CTA, no error tone — this is the expected state.
//
// Does NOT show the Meet URL itself. Faculty already has it (they pasted
// it); students who need it can find it in their session notification or
// the email we send. Showing it here would clutter without adding value.
//
// History: previously lived inline in classroom/[id]/page.tsx as
// `ExternalSessionPanel`. Extracted in Step 5 so MeetLinkGate's parent
// can reuse it without duplicating layout, and so the lobby's three
// states render against the same panel after Join.
// ─────────────────────────────────────────────────────────────────────────────

import { useOthers } from './liveblocks.config'

type Props = {
  sessionTitle:  string
  facultyName:   string | null
  saathiPrimary: string
  elapsed:       string
}

export function SessionContextPanel({
  sessionTitle, facultyName, saathiPrimary, elapsed,
}: Props) {
  const others = useOthers()
  // +1 for self. useOthers excludes the current user by design.
  const participantCount = others.length + 1

  return (
    <div
      className="flex h-full w-full flex-col px-8 py-10"
      style={{ background: 'var(--bg-base)' }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize:   '28px',
            fontWeight: 700,
            lineHeight: 1.2,
            color:      'var(--text-primary)',
            margin:     0,
          }}
        >
          {sessionTitle}
        </h1>

        <div
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {facultyName && <span>{facultyName}</span>}
          <span style={{ color: 'var(--text-ghost)' }}>·</span>
          <span>
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
          {elapsed && (
            <>
              <span style={{ color: 'var(--text-ghost)' }}>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>
            </>
          )}
        </div>

        <div
          className="mt-4"
          style={{
            height:       '2px',
            width:        '64px',
            background:   `linear-gradient(90deg, ${saathiPrimary} 0%, ${saathiPrimary}66 100%)`,
            borderRadius: '2px',
          }}
        />
      </div>

      <div className="flex-1" />

      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Meeting open in separate window
      </p>
    </div>
  )
}
