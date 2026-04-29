'use client'

// ─────────────────────────────────────────────────────────────────────────────
// VoiceCommandButton — push-to-talk affordance for the AI command bar.
//
// Faculty clicks the mic, speaks ("show insulin", "find CRISPR papers"),
// the Web Speech API returns a transcript, and the parent component
// pipes it into the existing CommandBar routing — same path as if
// faculty had typed the command themselves.
//
// Cost: ₹0. Web Speech API is browser-native, no key, no quota.
// Browsers: Chrome / Edge / Safari support it. Firefox does not — the
// button silently hides on unsupported browsers (faculty can still type).
//
// Permission: the browser asks for mic access on first use. Denied
// permission surfaces as the recogniser firing onerror; we exit
// listening state and the next click tries again (browsers usually
// auto-deny without re-prompting until the user grants in settings).
// We don't render an error — keep noise low. Faculty notices the mic
// went idle and falls back to typing.
//
// Locale: 'en-IN' is the default — better recognition for Indian English
// accents than 'en-US'. Web Speech API doesn't auto-switch to Hindi;
// for code-switched Hinglish input the parked Parakeet roadmap (see
// memory) is the proper future path. en-IN is good enough for the
// Saathi-style commands faculty actually issue today.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

// Minimal Web Speech API surface — enough to drive a push-to-talk button.
// The browser-vendored types live under SpeechRecognition / webkitSpeechRecognition;
// we declare just what we touch to avoid pulling in a global d.ts.
type Result    = { 0: { transcript: string }; isFinal: boolean }
type ResultEvt = { results: { length: number; [i: number]: Result } }
type ErrorEvt  = { error: string }

interface SR {
  start: () => void
  stop:  () => void
  abort: () => void
  continuous:     boolean
  interimResults: boolean
  lang: string
  onresult: ((e: ResultEvt) => void) | null
  onerror:  ((e: ErrorEvt) => void)  | null
  onend:    (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => SR) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const Std = w.SpeechRecognition       as (new () => SR) | undefined
  const Wk  = w.webkitSpeechRecognition as (new () => SR) | undefined
  return Std ?? Wk ?? null
}

type Props = {
  /** Called once with the final transcript when speech ends. Not called
   *  when the user starts and stops without speaking. */
  onTranscript: (text: string) => void
  /** Visual size; matches other top-bar buttons. */
  saathiColor?: string
}

export function VoiceCommandButton({ onTranscript, saathiColor = '#C9993A' }: Props) {
  const [supported]   = useState(() => getSpeechRecognitionCtor() !== null)
  const [listening,   setListening]   = useState(false)
  const recRef        = useRef<SR | null>(null)
  const transcriptRef = useRef('')

  function start() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    const rec = new Ctor()
    rec.continuous     = false
    rec.interimResults = true
    rec.lang           = 'en-IN'

    transcriptRef.current = ''

    rec.onresult = (e) => {
      // Concatenate every result chunk we've heard so far. Interim
      // results overwrite, final results stick.
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        const chunk = e.results[i]?.[0]?.transcript ?? ''
        text += chunk
      }
      transcriptRef.current = text
    }

    rec.onerror = () => {
      // 'no-speech', 'aborted', 'not-allowed' all flow through here.
      // Silent on UI — the button falls out of listening state and the
      // faculty can try again or type instead.
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      const final = transcriptRef.current.trim()
      if (final) onTranscript(final)
    }

    try {
      rec.start()
      recRef.current = rec
      setListening(true)
    } catch {
      // Some browsers throw if start() is called too quickly after a
      // previous stop(). Treat as no-op; faculty re-clicks.
      setListening(false)
    }
  }

  function stop() {
    recRef.current?.stop()
  }

  function toggle() {
    if (listening) stop()
    else start()
  }

  // Cleanup on unmount: don't leave a recogniser running across route
  // changes / classroom-state transitions.
  useEffect(() => () => {
    try { recRef.current?.abort() } catch { /* noop */ }
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Listening — click to stop' : 'Voice command'}
      aria-label={listening ? 'Stop voice command' : 'Start voice command'}
      aria-pressed={listening}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: listening ? saathiColor : 'transparent',
        color:      listening ? 'var(--bg-surface)' : 'var(--text-tertiary)',
        border:     listening ? 'none' : '1px solid var(--border-subtle)',
        cursor:     'pointer',
        boxShadow:  listening ? `0 0 0 4px ${saathiColor}26` : undefined,
      }}
    >
      {/* Inline mic glyph — keeps the component dependency-free.
          Pulses subtly while listening via the box-shadow ring above. */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8"  y1="23" x2="16" y2="23" />
      </svg>
    </button>
  )
}
