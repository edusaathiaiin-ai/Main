'use client'

// ─────────────────────────────────────────────────────────────────────────────
// StudentWelcomeCard — single dismissable card shown the first time a
// student joins a classroom (profiles.classroom_onboarded === false).
//
// Not a wizard, not a step sequence. One card, one CTA. Card overlays
// the lobby/live view but does not block input — students can dismiss
// or click around it.
//
// Trigger lives in /classroom/[id]/page.tsx; this component just renders
// and reports dismissal. The parent flips classroom_onboarded = true
// (fire-and-forget) so the card never appears again for this profile.
//
// Copy rules — same as the faculty wizard:
//   • Never the words "onboarding" / "tutorial" / "guide"
//   • Walk-beside-them tone
//   • Light theme tokens only, gold CTA
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onDismiss: () => void
}

export function StudentWelcomeCard({ onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
      // Backdrop click also dismisses — keeps the "never blocks" promise.
      onClick={onDismiss}
      style={{ background: 'rgba(26, 24, 20, 0.35)' }}
    >
      <div
        // Stop propagation so clicking the card doesn't dismiss it.
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl px-6 py-7"
        style={{
          background: 'var(--bg-surface)',
          border:     '1px solid var(--border-subtle)',
          boxShadow:  '0 16px 40px rgba(26, 24, 20, 0.18)',
          maxWidth:   '440px',
          width:      '100%',
        }}
      >
        <h2
          className="text-xl font-bold leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome to your EdUsaathiAI classroom.
        </h2>

        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Your faculty is teaching on the right. Everything discussed today
          saves automatically to your Research Archive in your profile.
        </p>

        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Have a question during class? Use the <strong>Q&amp;A</strong>{' '}
          button above — your faculty will see it.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90"
          style={{
            background: 'var(--gold)',
            color:      'var(--bg-surface)',
            cursor:     'pointer',
          }}
        >
          Got it — Start Learning →
        </button>
      </div>
    </div>
  )
}
