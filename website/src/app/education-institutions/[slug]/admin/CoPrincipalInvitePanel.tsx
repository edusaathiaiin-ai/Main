'use client'

// Phase 1.4c — co-principal invite. Mirror of FacultyInvitePanel; posts to
// the same invite-faculty endpoint with role: 'principal'.
//
// Co-principals run alongside the chief principal (continuity coverage when
// chief is unwell / on holiday). PRINCIPAL_LIMIT=3 is enforced server-side;
// the panel surfaces the limit reached message when hit.
//
// Distinct copy from faculty:
//   - "Add a co-principal" (not "Invite a faculty member")
//   - Subtitle warns about authority — co-principals see all rosters, NAAC
//     reports, billing. Not granted lightly.
//   - Different success copy ("Co-principal added — they'll see the
//     dashboard on next login")
//   - Different limit-reached error code (principal_limit_reached)

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Result = { kind: 'ok' | 'err'; msg: string } | null

export function CoPrincipalInvitePanel() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/education-institutions/invite-faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:  name.trim(),
          email: email.trim(),
          role:  'principal',
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        status?: string
        error?: string
        limit?: number
      }

      if (res.ok && data.status === 'linked') {
        setResult({ kind: 'ok', msg: 'Co-principal added — they will see the dashboard on next login.' })
        setName(''); setEmail('')
        router.refresh()
      } else if (res.ok && data.status === 'invited') {
        setResult({ kind: 'ok', msg: `Invitation sent to ${email.trim()}. They'll set up their account and the dashboard opens on first login.` })
        setName(''); setEmail('')
      } else if (res.ok && data.status === 'already_linked') {
        setResult({ kind: 'ok', msg: 'This person is already a principal of your institution.' })
        setName(''); setEmail('')
      } else if (data.error === 'principal_limit_reached') {
        setResult({ kind: 'err', msg: `You've reached the limit of ${data.limit ?? 3} principals per institution. Remove an inactive principal first, or email admin@edusaathiai.in to discuss a larger structure.` })
      } else if (data.error === 'cannot_demote_principal') {
        setResult({ kind: 'err', msg: 'This person is already a principal — you cannot re-invite them.' })
      } else if (data.error === 'already_linked_elsewhere') {
        setResult({ kind: 'err', msg: 'This email is already linked to another institution.' })
      } else if (data.error === 'invalid_email') {
        setResult({ kind: 'err', msg: 'Please enter a valid email address.' })
      } else if (data.error === 'name_required') {
        setResult({ kind: 'err', msg: 'Please enter their full name.' })
      } else if (data.error === 'forbidden_principal_only') {
        setResult({ kind: 'err', msg: 'Only an existing principal can add a co-principal.' })
      } else if (data.error === 'institution_inactive') {
        setResult({ kind: 'err', msg: 'Co-principal invites open once your institution trial is activated.' })
      } else {
        setResult({ kind: 'err', msg: 'Something went wrong. Please try again, or email admin@edusaathiai.in' })
      }
    } catch {
      setResult({ kind: 'err', msg: 'Network error. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      id="invite-co-principal"
      className="mt-5 border-t pt-5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Add a co-principal
      </p>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Co-principals see every roster, NAAC report, and billing detail you do
        — useful for continuity when you&rsquo;re unwell or away. Up to 3 per
        institution.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </label>
        <label className="block flex-1">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'var(--gold)', color: 'var(--bg-surface)', border: '1px solid var(--gold)' }}
        >
          {busy ? 'Sending…' : 'Send Invite →'}
        </button>
      </form>
      {result && (
        <p
          className="mt-3 text-xs font-medium"
          style={{ color: result.kind === 'ok' ? '#166534' : '#B91C1C' }}
        >
          {result.msg}
        </p>
      )}
    </div>
  )
}
