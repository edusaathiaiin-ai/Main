'use client'

// Phase 1.6 — principal-facing institution lifecycle control.
//
// One panel that flips education_institutions.principal_lifecycle between
// 'active' and 'paused'. Each button is its own <form action> posting to the
// server actions in ./actions.ts — progressive enhancement (works without JS)
// and Next's automatic revalidation, same pattern as MemberRosterRow.
//
// principal_lifecycle is the PRINCIPAL's pause switch, distinct from the
// admin-controlled `status`. When paused, the branded faculty page
// (/education-institutions/[slug]/faculty) shows a friendly "paused by the
// principal" state. Students' personal learning is never gated by this — the
// pause only suspends institution-faculty branded access.
//
// Authority rule (same axis as members.set_by): when lifecycle_set_by ===
// 'admin' the pause was set by the EdUsaathiAI admin team and the principal
// cannot lift it — the Reactivate button is disabled with a tooltip. The
// server action enforces the same rule; the disabled button is just UX.

import { pauseInstitution, reactivateInstitution } from './actions'

function confirmPause(e: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm(
    'Pause institution access?\n\n' +
    'Faculty immediately lose access to their branded EdUsaathiAI pages and ' +
    'see a "paused by the principal" message. Students’ personal learning ' +
    'is not affected. You can reactivate at any time.',
  )) {
    e.preventDefault()
  }
}

export function InstitutionAccessPanel({
  institutionId,
  principalLifecycle,
  lifecycleSetBy,
}: {
  institutionId: string
  principalLifecycle: 'active' | 'paused'
  lifecycleSetBy: 'principal' | 'admin' | 'system' | null
}) {
  const isPaused      = principalLifecycle === 'paused'
  const adminLocked   = isPaused && lifecycleSetBy === 'admin'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={
            isPaused
              ? { background: '#FEF3C7', color: '#92400E' }   // amber
              : { background: '#DCFCE7', color: '#166534' }   // green
          }
          title={adminLocked ? 'Paused by the EdUsaathiAI admin team' : undefined}
        >
          {isPaused ? 'Paused' : 'Active'}
          {adminLocked && ' · admin'}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {isPaused ? (
          adminLocked ? (
            <>
              Institution-faculty access is paused by the EdUsaathiAI admin
              team. Faculty see a friendly &ldquo;currently inactive&rdquo; page
              until it is lifted. Contact{' '}
              <a
                href="mailto:admin@edusaathiai.in"
                style={{ color: 'var(--gold)', textDecoration: 'underline' }}
              >
                admin@edusaathiai.in
              </a>{' '}
              to discuss reactivation.
            </>
          ) : (
            <>
              Institution-faculty access is currently <strong>paused</strong>.
              Faculty see a friendly &ldquo;paused by the principal&rdquo; page
              until you reactivate. Students&rsquo; personal learning is
              unaffected.
            </>
          )
        ) : (
          <>
            Faculty can reach their branded EdUsaathiAI pages. Pausing suspends
            faculty access immediately — students&rsquo; personal learning is
            never affected. Use this if your institution is between terms or
            you need to take faculty access offline briefly.
          </>
        )}
      </p>

      <div className="mt-4">
        {!isPaused && (
          <form action={pauseInstitution} onSubmit={confirmPause}>
            <input type="hidden" name="institutionId" value={institutionId} />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
              }}
            >
              Pause institution access
            </button>
          </form>
        )}

        {isPaused && !adminLocked && (
          <form action={reactivateInstitution}>
            <input type="hidden" name="institutionId" value={institutionId} />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: '#DCFCE7',
                color: '#166534',
                border: '1px solid #BBF7D0',
              }}
            >
              Reactivate institution access
            </button>
          </form>
        )}

        {adminLocked && (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl px-4 py-2 text-sm font-semibold opacity-60"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Paused by admin — contact admin@edusaathiai.in to change"
          >
            Reactivate institution access
          </button>
        )}
      </div>
    </div>
  )
}
