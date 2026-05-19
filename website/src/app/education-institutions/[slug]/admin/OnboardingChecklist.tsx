'use client'

// Fix 4 — first-run welcome checklist. No DB column (per the corrected
// scope): it auto-disappears once any faculty exist (facultyCount > 0)
// and is session-dismissable. Two steps only — Step 3 (sessions) was
// removed because the stats pipeline is parked; Step 2 is informational
// (no auto-complete) because "Find My Institution" student-join is a
// separate built flow the principal can't complete for the student.

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'eai.principal.checklist.dismissed'
const SITE_URL = 'https://www.edusaathiai.in'

export function OnboardingChecklist({
  facultyCount,
  institutionName,
}: {
  facultyCount: number
  institutionName: string
}) {
  // Start hidden so server render === first client render (no hydration
  // mismatch / flash); reveal after reading sessionStorage on the client.
  const [dismissed, setDismissed] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (facultyCount > 0 || dismissed) return null

  const waText = `Join our institution on EdUsaathiAI: ${SITE_URL} — search for "${institutionName}" under Find My Institution`

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode — best effort */
    }
    setDismissed(true)
  }

  function scrollToInvite() {
    document.getElementById('invite-faculty')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div
      className="mb-6 rounded-2xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Welcome — two quick steps to get your institution running
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Dismiss — I’ll explore on my own
        </button>
      </div>

      <ol className="mt-4 space-y-4">
        <li>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            1. Invite your first faculty member
          </p>
          <button
            onClick={scrollToInvite}
            className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: 'var(--gold)', color: 'var(--bg-surface)', border: '1px solid var(--gold)' }}
          >
            Invite Faculty →
          </button>
        </li>
        <li>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            2. Share this with your students
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            They visit edusaathiai.in and search “Find My Institution” for
            “{institutionName}”.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={copyLink}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}
            >
              Share on WhatsApp
            </a>
          </div>
        </li>
      </ol>
    </div>
  )
}
