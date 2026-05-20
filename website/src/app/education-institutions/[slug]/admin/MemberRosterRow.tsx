'use client'

// Phase 1.4a — principal-facing roster row with lifecycle controls.
// One row per education_institution_members faculty entry; status-conditional
// buttons (Pause / Reactivate / Remove). Each button is its own <form action>
// posting to the server actions in ./actions.ts so we get progressive
// enhancement (works without JS) and Next's automatic revalidation.
//
// Authority rule: Reactivate is DISABLED when set_by === 'admin' — the
// principal cannot lift an admin-set state. Tooltip explains where to go.
// (The server action also enforces this; the disabled button is just UX.)
//
// Remove uses a tiny window.confirm guard. The action is reversible (status
// flips to 'removed', the auth user is preserved) so we don't need a heavy
// modal — a confirm is honest enough.

import {
  pauseFacultyMember,
  reactivateFacultyMember,
  removeFacultyMember,
} from './actions'

export type MemberRow = {
  id: string
  full_name: string | null
  email: string
  status: 'invited' | 'active' | 'paused' | 'removed'
  member_role: 'principal' | 'faculty'
  set_by: 'principal' | 'admin' | 'system'
  user_id: string | null
  created_at: string
}

const STATUS_STYLE: Record<MemberRow['status'], { label: string; bg: string; fg: string }> = {
  invited: { label: 'Invited',  bg: '#DBEAFE', fg: '#1E40AF' },  // sky
  active:  { label: 'Active',   bg: '#DCFCE7', fg: '#166534' },  // green
  paused:  { label: 'Paused',   bg: '#FEF3C7', fg: '#92400E' },  // amber
  removed: { label: 'Removed',  bg: '#FEE2E2', fg: '#991B1B' },  // red
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function confirmRemove(e: React.FormEvent<HTMLFormElement>) {
  if (!window.confirm(
    'Remove this faculty member?\n\nTheir access is revoked immediately. You can reactivate them later — their account is preserved.',
  )) {
    e.preventDefault()
  }
}

export function MemberRosterRow({
  member,
  isSelf = false,
}: {
  member: MemberRow
  isSelf?: boolean
}) {
  const style = STATUS_STYLE[member.status]
  const adminLocked = member.set_by === 'admin'

  // Self-target guard mirrors the server action — principals cannot
  // pause / reactivate / remove themselves. UI hides every button on
  // their own row and shows a "(you)" badge; server-side
  // verifyPrincipalForMember enforces the same rule.
  const canPause       = !isSelf && member.status === 'active'
  const canReactivate  = !isSelf && (member.status === 'paused' || member.status === 'removed') && !adminLocked
  const canRemove      = !isSelf && member.status !== 'removed'

  // Show a disabled-with-tooltip Reactivate when admin-locked so the
  // principal isn't left wondering why no button appeared.
  const showAdminLockedHint =
    (member.status === 'paused' || member.status === 'removed') && adminLocked

  return (
    <li
      className="flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {member.full_name?.trim() || '(name not set)'}
          {isSelf && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--gold-light, #F5E6C8)', color: '#78350F' }}
            >
              you
            </span>
          )}
        </p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {member.email} · Joined {formatJoined(member.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: style.bg, color: style.fg }}
          title={adminLocked ? 'Status set by admin' : undefined}
        >
          {style.label}
          {adminLocked && ' · admin'}
        </span>

        {canPause && (
          <form action={pauseFacultyMember}>
            <input type="hidden" name="memberId" value={member.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-1 text-xs font-semibold"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Pause
            </button>
          </form>
        )}

        {canReactivate && (
          <form action={reactivateFacultyMember}>
            <input type="hidden" name="memberId" value={member.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-1 text-xs font-semibold"
              style={{
                background: '#DCFCE7',
                color: '#166534',
                border: '1px solid #BBF7D0',
              }}
            >
              Reactivate
            </button>
          </form>
        )}

        {showAdminLockedHint && (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg px-3 py-1 text-xs font-semibold opacity-60"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Status set by admin — contact admin@edusaathiai.in to change"
          >
            Reactivate
          </button>
        )}

        {canRemove && (
          <form action={removeFacultyMember} onSubmit={confirmRemove}>
            <input type="hidden" name="memberId" value={member.id} />
            <button
              type="submit"
              className="rounded-lg px-3 py-1 text-xs font-semibold"
              style={{
                background: '#FEE2E2',
                color: '#991B1B',
                border: '1px solid #FECACA',
              }}
            >
              Remove
            </button>
          </form>
        )}
      </div>
    </li>
  )
}
