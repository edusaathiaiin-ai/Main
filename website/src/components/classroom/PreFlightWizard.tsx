'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PreFlightWizard — 4-step walkthrough shown to first-time faculty before
// they reach the live-session creation form. Reframes the "create a video
// link, paste it, share with students, click join" sequence as a guided
// journey instead of a Changi-airport wall of inputs.
//
// Trigger: /faculty/live/create checks profiles.classroom_onboarded; if
// false it renders this component instead of the form. On completion (or
// the Step 1 "Skip — I'll add this later" link) the wizard hands the
// collected meetingLink + classroomMode to the parent and the parent
// flips classroom_onboarded to true.
//
// Copy rules:
//   • Never the words "onboarding" / "tutorial" / "guide"
//   • Walk-beside-them tone, not instructional
//   • Fraunces headings (h2), Plus Jakarta body (default)
//   • Gold CTAs
//   • Light theme — tokens only, no #fff text
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

interface Props {
  /** Called when faculty finishes Step 4 OR skips out of Step 1 with no
   *  link. The parent should set its own meetingLink + classroomMode
   *  state from these values, flip profiles.classroom_onboarded = true,
   *  and render the regular session-creation form pre-filled. */
  onComplete: (values: {
    meetingLink:   string
    classroomMode: 'standard' | 'interactive'
  }) => void
}

const MEETING_LINK_RE = /^https:\/\/(?:meet\.google\.com|(?:[a-z0-9-]+\.)?zoom\.us)\/.+/i

export function PreFlightWizard({ onComplete }: Props) {
  const [stepNum,        setStepNum]        = useState<1 | 2 | 3 | 4>(1)
  const [meetingLink,    setMeetingLink]    = useState('')
  const [linkError,      setLinkError]      = useState('')
  const [classroomMode,  setClassroomMode]  = useState<'standard' | 'interactive'>('interactive')
  const [skippedStep1,   setSkippedStep1]   = useState(false)
  const [shareCopied,    setShareCopied]    = useState(false)

  const linkValid = MEETING_LINK_RE.test(meetingLink.trim())

  function validateLink(): boolean {
    if (!meetingLink.trim()) {
      setLinkError('Paste your Google Meet or Zoom link above.')
      return false
    }
    if (!linkValid) {
      setLinkError('That doesn’t look like a Meet or Zoom link. Try pasting again.')
      return false
    }
    setLinkError('')
    return true
  }

  function handleNextFromStep1() {
    if (!validateLink()) return
    setStepNum(2)
  }

  function handleSkipStep1() {
    setSkippedStep1(true)
    setMeetingLink('')
    setLinkError('')
    setStepNum(2)
  }

  function handleFinish() {
    onComplete({ meetingLink: meetingLink.trim(), classroomMode })
  }

  async function handleShareCopy() {
    const placeholder =
      'I’m teaching on EdUsaathiAI. Visit https://edusaathiai.in/live to find my upcoming session.'
    try {
      await navigator.clipboard.writeText(placeholder)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      /* clipboard blocked — fail silently */
    }
  }

  function handleShareWhatsApp() {
    const text =
      'Join my EdUsaathiAI classroom session: https://edusaathiai.in/live'
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main
      className="min-h-screen px-4 py-12"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto" style={{ maxWidth: '440px' }}>
        <p
          className="mb-3 text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
        >
          Step {stepNum} of 4
        </p>

        <div
          className="rounded-2xl px-7 py-8"
          style={{
            background: 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
            boxShadow:  '0 8px 24px rgba(26, 24, 20, 0.06)',
          }}
        >
          {stepNum === 1 && (
            <Step1
              meetingLink={meetingLink}
              setMeetingLink={(v) => { setMeetingLink(v); if (linkError) setLinkError('') }}
              linkError={linkError}
              linkValid={linkValid}
              onNext={handleNextFromStep1}
              onSkip={handleSkipStep1}
            />
          )}

          {stepNum === 2 && (
            <Step2
              classroomMode={classroomMode}
              setClassroomMode={setClassroomMode}
              onNext={() => setStepNum(3)}
            />
          )}

          {stepNum === 3 && (
            <Step3
              shareCopied={shareCopied}
              onCopy={handleShareCopy}
              onWhatsApp={handleShareWhatsApp}
              onNext={() => setStepNum(4)}
            />
          )}

          {stepNum === 4 && (
            <Step4
              hasMeetingLink={Boolean(meetingLink.trim())}
              skippedStep1={skippedStep1}
              classroomMode={classroomMode}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </main>
  )
}

// ── Step 1 — Create your video meeting ──────────────────────────────────────

function Step1({
  meetingLink, setMeetingLink, linkError, linkValid, onNext, onSkip,
}: {
  meetingLink:    string
  setMeetingLink: (v: string) => void
  linkError:      string
  linkValid:      boolean
  onNext:         () => void
  onSkip:         () => void
}) {
  return (
    <>
      <h2
        className="text-2xl font-bold leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        First, you need a video link.
      </h2>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Your classroom needs a video link so your students can hear and see you.
        The easiest way:
      </p>

      <ol
        className="mt-4 space-y-1.5 pl-5 text-sm"
        style={{ color: 'var(--text-secondary)', listStyleType: 'decimal' }}
      >
        <li>Open Google Meet in a new tab</li>
        <li>Click <strong>New meeting</strong></li>
        <li>Copy the link it gives you</li>
        <li>Paste it below</li>
      </ol>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="https://meet.google.com/new"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background:     'var(--gold)',
            color:          'var(--bg-surface)',
            textDecoration: 'none',
            display:        'inline-block',
          }}
        >
          Open Google Meet →
        </a>
        <a
          href="https://zoom.us/start"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-2 text-xs font-semibold transition-colors"
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

      <label className="mt-6 block">
        <span
          className="block text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Paste your meeting link here
        </span>
        <input
          type="url"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="https://meet.google.com/..."
          className="mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--bg-elevated)',
            border:     `1px solid ${linkError ? '#DC2626' : 'var(--border-subtle)'}`,
            color:      'var(--text-primary)',
          }}
        />
        {linkError && (
          <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>
            {linkError}
          </p>
        )}
      </label>

      <button
        type="button"
        onClick={onNext}
        disabled={!linkValid}
        className="mt-6 w-full rounded-xl py-3 text-sm font-bold transition-opacity"
        style={{
          background: linkValid ? 'var(--gold)' : 'var(--bg-elevated)',
          color:      linkValid ? 'var(--bg-surface)' : 'var(--text-ghost)',
          cursor:     linkValid ? 'pointer' : 'not-allowed',
          opacity:    linkValid ? 1 : 0.6,
        }}
      >
        Next →
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-3 w-full text-xs underline-offset-2 hover:underline"
        style={{
          background: 'transparent',
          color:      'var(--text-tertiary)',
        }}
      >
        Skip — I&apos;ll add this later
      </button>
    </>
  )
}

// ── Step 2 — Choose how to teach ────────────────────────────────────────────

function Step2({
  classroomMode, setClassroomMode, onNext,
}: {
  classroomMode:    'standard' | 'interactive'
  setClassroomMode: (m: 'standard' | 'interactive') => void
  onNext:           () => void
}) {
  return (
    <>
      <h2
        className="text-2xl font-bold leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        How would you like to teach today?
      </h2>

      <div className="mt-5 space-y-3">
        <ModeCard
          icon="📹"
          label="Video only"
          description="Simple. Just you, your voice, your students. Like a regular video call."
          bestFor="Best for: lectures, Q&A, discussions"
          selected={classroomMode === 'standard'}
          onSelect={() => setClassroomMode('standard')}
        />
        <ModeCard
          icon="🎓"
          label="Video + Interactive Tools"
          description="Show 3D molecules, draw on a shared board, search research papers — all while talking."
          bestFor="Best for: science, law, engineering, medicine"
          recommended
          selected={classroomMode === 'interactive'}
          onSelect={() => setClassroomMode('interactive')}
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90"
        style={{
          background: 'var(--gold)',
          color:      'var(--bg-surface)',
          cursor:     'pointer',
        }}
      >
        Next →
      </button>
    </>
  )
}

function ModeCard({
  icon, label, description, bestFor, recommended, selected, onSelect,
}: {
  icon:         string
  label:        string
  description:  string
  bestFor:      string
  recommended?: boolean
  selected:     boolean
  onSelect:     () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl p-4 text-left transition-colors"
      style={{
        background: selected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border:     selected ? '2px solid var(--gold)' : '1px solid var(--border-subtle)',
        cursor:     'pointer',
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </span>
        </span>
        {recommended && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background:    'var(--gold)',
              color:         'var(--bg-surface)',
              letterSpacing: '0.06em',
            }}
          >
            Recommended
          </span>
        )}
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>
      <p
        className="mt-1.5 text-[11px] italic"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {bestFor}
      </p>
    </button>
  )
}

// ── Step 3 — Share with your students ───────────────────────────────────────

function Step3({
  shareCopied, onCopy, onWhatsApp, onNext,
}: {
  shareCopied: boolean
  onCopy:      () => void
  onWhatsApp:  () => void
  onNext:      () => void
}) {
  return (
    <>
      <h2
        className="text-2xl font-bold leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        Share this with your students.
      </h2>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Your students can find and book this session here:
      </p>

      <div
        className="mt-4 rounded-lg px-4 py-3"
        style={{
          background:  'var(--bg-elevated)',
          border:      '1px dashed var(--border-subtle)',
          color:       'var(--text-tertiary)',
          fontFamily:  'var(--font-mono)',
          fontSize:    '12px',
          textAlign:   'center',
          fontStyle:   'italic',
        }}
      >
        Your session link will appear here after you save
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
          style={{
            background:     shareCopied ? 'var(--gold-light)' : 'transparent',
            color:          'var(--gold)',
            border:         '1px solid var(--gold)',
            cursor:         'pointer',
          }}
        >
          {shareCopied ? '✓ Copied' : '📋 Copy link'}
        </button>
        <button
          type="button"
          onClick={onWhatsApp}
          className="flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
          style={{
            background:     'transparent',
            color:          'var(--gold)',
            border:         '1px solid var(--gold)',
            cursor:         'pointer',
          }}
        >
          💬 Share on WhatsApp
        </button>
      </div>

      <p
        className="mt-4 text-xs italic leading-relaxed"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Students can also find your session in the Live Sessions section
        on their EdUsaathiAI dashboard.
      </p>

      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90"
        style={{
          background: 'var(--gold)',
          color:      'var(--bg-surface)',
          cursor:     'pointer',
        }}
      >
        Next →
      </button>
    </>
  )
}

// ── Step 4 — Ready summary ──────────────────────────────────────────────────

function Step4({
  hasMeetingLink, skippedStep1, classroomMode, onFinish,
}: {
  hasMeetingLink: boolean
  skippedStep1:   boolean
  classroomMode:  'standard' | 'interactive'
  onFinish:       () => void
}) {
  return (
    <>
      <h2
        className="text-2xl font-bold leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        You are ready to teach.
      </h2>

      <ul className="mt-5 space-y-2 text-sm">
        <ChecklistRow
          done={hasMeetingLink}
          doneText="Video link added"
          pendingText={skippedStep1 ? 'Video link not added' : 'Video link not added'}
        />
        <ChecklistRow
          done
          doneText={
            classroomMode === 'interactive'
              ? 'Teaching mode selected — Video + Interactive Tools'
              : 'Teaching mode selected — Video only'
          }
          pendingText=""
        />
        <ChecklistRow
          done
          doneText="Students can find your session"
          pendingText=""
        />
      </ul>

      <p
        className="mt-6 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
      >
        What happens next
      </p>
      <ul
        className="mt-2 space-y-1.5 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <li>• Fill in your session details below (title, date, time)</li>
        <li>• Your students will book their seats</li>
        <li>• When it&apos;s time — open the classroom and click Join</li>
      </ul>

      <p
        className="mt-5 text-sm italic leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        That is all. Your classroom handles the rest.
      </p>

      <button
        type="button"
        onClick={onFinish}
        className="mt-6 w-full rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90"
        style={{
          background: 'var(--gold)',
          color:      'var(--bg-surface)',
          cursor:     'pointer',
        }}
      >
        Set Up My Session →
      </button>
    </>
  )
}

function ChecklistRow({
  done, doneText, pendingText,
}: {
  done:        boolean
  doneText:    string
  pendingText: string
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: done ? '#16A34A' : 'var(--bg-elevated)',
          color:      done ? 'var(--bg-surface)' : 'var(--text-ghost)',
          border:     done ? 'none' : '1px solid var(--border-subtle)',
        }}
      >
        {done ? '✓' : '○'}
      </span>
      <span
        className="text-sm leading-snug"
        style={{ color: done ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
      >
        {done ? doneText : pendingText}
      </span>
    </li>
  )
}
