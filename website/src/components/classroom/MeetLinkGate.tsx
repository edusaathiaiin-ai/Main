'use client'

// ─────────────────────────────────────────────────────────────────────────────
// MeetLinkGate — render-state gate (NOT a toast).
//
// Replaces the Join button entirely whenever the lobby's Phase-2 lock
// resolves to { status: 'needs_meet_link' }. Renders the same card every
// time — refresh, second device, "I closed it accidentally" — all show
// the gate again until external_url is saved. That's the "fix permanently
// or don't fix" guarantee from CLAUDE.md: faculty can't accidentally bypass
// the URL requirement, and a network blip mid-save reverts naturally.
//
// Faculty-only. Students never see this. The classroom page only renders
// MeetLinkGate when isFaculty + provisionState.status === 'needs_meet_link'.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sessionId:    string
  studentCount: number
  message?:     string
  onLinkSaved:  (url: string) => void
}

const VALID_PREFIXES = [
  'https://meet.google.com/',
  'https://zoom.us/',
  'https://us02web.zoom.us/',
  'https://us06web.zoom.us/',
]

function isValidMeetUrl(url: string): boolean {
  return VALID_PREFIXES.some((p) => url.startsWith(p))
}

export function MeetLinkGate({ sessionId, studentCount, message, onLinkSaved }: Props) {
  const [url, setUrl]         = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const trimmed   = url.trim()
  const valid     = isValidMeetUrl(trimmed)
  const canSubmit = valid && !saving

  async function handleSave() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Your session expired — please refresh the page.')
        setSaving(false)
        return
      }

      const res = await fetch('/api/classroom/save-meet-link', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, url: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'invalid_meet_url') {
          setError('Please paste a valid Google Meet or Zoom link')
        } else if (res.status === 403) {
          setError('You don\'t own this session.')
        } else {
          setError('Could not save the link — please try again.')
        }
        setSaving(false)
        return
      }

      onLinkSaved(trimmed)
    } catch {
      setError('Could not save the link — please check your connection.')
      setSaving(false)
    }
  }

  const finalMessage =
    message ??
    (studentCount > 0
      ? `Your session has ${studentCount} students. Please add a Google Meet link to continue.`
      : 'Please add a Google Meet or Zoom link to continue.')

  return (
    <div
      className="mx-auto w-full max-w-md rounded-2xl px-6 py-6"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {finalMessage}
      </p>

      {/* Quick-create helpers */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="https://meet.google.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background:     'var(--gold)',
            color:          'var(--bg-surface)',
            textDecoration: 'none',
            display:        'inline-block',
          }}
        >
          Create a Google Meet →
        </a>
        <a
          href="https://zoom.us/start"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background:     'transparent',
            color:          'var(--gold)',
            border:         '1px solid var(--gold)',
            textDecoration: 'none',
            display:        'inline-block',
          }}
        >
          Or use Zoom →
        </a>
      </div>

      <div className="mt-4">
        <label
          className="mb-1.5 block text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Paste your meeting link
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder="https://meet.google.com/..."
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--bg-base)',
            border:     '1px solid var(--border-subtle)',
            color:      'var(--text-primary)',
          }}
          disabled={saving}
          autoFocus
        />
        {error && (
          <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>
            {error}
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!canSubmit}
        className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-40"
        style={{
          background: 'var(--gold)',
          color:      'var(--bg-surface)',
          cursor:     canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Saving…' : 'Save and Join →'}
      </button>
    </div>
  )
}
