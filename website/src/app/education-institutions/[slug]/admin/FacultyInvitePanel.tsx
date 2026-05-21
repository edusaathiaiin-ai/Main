'use client'

// Fix 4 — principal-facing faculty invite. The dashboard is a server
// component; this client child owns the form + POST + inline result.
// invite-faculty derives the institution from the caller's principal
// session (cookies), so no ids are passed in the body.
//
// Correctness: only 'linked'/'already_linked' mean the person is a member
// now → router.refresh() to re-render the server roster. 'invited' does
// NOT add to the roster (they aren't a member until they accept the
// email) — surfacing them would be a lie.

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Result = { kind: 'ok' | 'err'; msg: string } | null

export function FacultyInvitePanel() {
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
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        status?: string
        error?: string
        limit?: number
      }

      if (res.ok && data.status === 'linked') {
        setResult({ kind: 'ok', msg: 'Faculty added successfully. They can log in at edusaathiai.in' })
        setName(''); setEmail('')
        router.refresh()
      } else if (res.ok && data.status === 'invited') {
        setResult({ kind: 'ok', msg: `Invitation sent to ${email.trim()}. They'll receive an email with a link to set up access.` })
        setName(''); setEmail('')
      } else if (res.ok && data.status === 'already_linked') {
        setResult({ kind: 'ok', msg: 'This person is already in your institution.' })
        setName(''); setEmail('')
      } else if (data.error === 'faculty_limit_reached') {
        setResult({ kind: 'err', msg: `You have reached your faculty limit of ${data.limit ?? ''}. Contact admin@edusaathiai.in to increase your limit.` })
      } else if (data.error === 'already_linked_elsewhere') {
        setResult({ kind: 'err', msg: 'This email is already linked to another institution.' })
      } else if (data.error === 'email_in_use') {
        setResult({ kind: 'err', msg: 'This email already has a personal EdUsaathiAI account. For faculty access, invite a dedicated institutional email (e.g. name@yourcollege.edu) — it keeps their teaching role separate from their personal account.' })
      } else if (data.error === 'collision_check_failed') {
        setResult({ kind: 'err', msg: 'We couldn’t verify this email just now. Please try again in a moment.' })
      } else if (data.error === 'invalid_email') {
        setResult({ kind: 'err', msg: 'Please enter a valid email address.' })
      } else if (data.error === 'name_required') {
        setResult({ kind: 'err', msg: 'Please enter the faculty member’s name.' })
      } else if (data.error === 'forbidden_principal_only') {
        setResult({ kind: 'err', msg: 'Only the institution principal can invite faculty.' })
      } else if (data.error === 'institution_inactive') {
        setResult({ kind: 'err', msg: 'Faculty invites open once your institution trial is activated.' })
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
      id="invite-faculty"
      className="mt-5 border-t pt-5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Invite a faculty member
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
