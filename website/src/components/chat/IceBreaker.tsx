'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getProfileCompleteness,
  COMPLETENESS_THRESHOLDS,
  type CompletenessProfile,
  type CompletenessSoul,
} from '@/lib/profileCompleteness'

// ─── Subject family per Saathi ───────────────────────────────────────────
// Used in the "What's on your mind about <subject> lately?" line.
const SUBJECT_FAMILY: Record<string, string> = {
  biosaathi:         'Biology',
  biotechsaathi:     'Biotechnology',
  physicsaathi:      'Physics',
  chemsaathi:        'Chemistry',
  maathsaathi:       'Mathematics',
  compsaathi:        'Computer Science',
  mechsaathi:        'Mechanical Engineering',
  civilsaathi:       'Civil Engineering',
  aerospacesaathi:   'Aerospace Engineering',
  elecsaathi:        'Electrical Engineering',
  electronicssaathi: 'Electronics',
  'chemengg-saathi': 'Chemical Engineering',
  envirosaathi:      'Environmental Engineering',
  agrisaathi:        'Agriculture',
  medicosaathi:      'Medicine',
  pharmasaathi:      'Pharmacy',
  nursingsaathi:     'Nursing',
  kanoonsaathi:      'Law',
  historysaathi:     'History',
  psychsaathi:       'Psychology',
  polscisaathi:      'Political Science',
  geosaathi:         'Geology',
  archsaathi:        'Architecture',
  econsaathi:        'Economics',
  accountsaathi:     'Accounting',
  finsaathi:         'Finance',
  bizsaathi:         'Business',
  mktsaathi:         'Marketing',
  hrsaathi:          'Human Resources',
  statssaathi:       'Statistics',
}

// ─── Copy composer ───────────────────────────────────────────────────────

type ToneVariant = 'full' | 'soft'

type ComposerInput = {
  firstName:    string
  city:         string | null
  institution:  string | null
  examTarget:   string | null
  saathiName:   string
  subject:      string
  variant:      ToneVariant
}

type Paragraph = { text: string; emphasis?: 'header' | 'body' | 'closing' | 'nudge' }

function composeParagraphs(ctx: ComposerInput): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // 1. Greeting (always)
  paragraphs.push({
    text: `Hey ${ctx.firstName} 👋`,
    emphasis: 'header',
  })

  // 2. "I can see you're..." — only when we have something meaningful
  if (ctx.variant === 'full') {
    if (ctx.institution && ctx.city) {
      paragraphs.push({
        text: `I can see you're studying at ${ctx.institution} in ${ctx.city}.`,
      })
    } else if (ctx.institution) {
      paragraphs.push({ text: `I can see you're studying at ${ctx.institution}.` })
    } else if (ctx.city) {
      paragraphs.push({ text: `I can see you're based in ${ctx.city}.` })
    }
  } else if (ctx.institution) {
    // Soft variant: still acknowledge institution if we know it
    paragraphs.push({ text: `I can see you're at ${ctx.institution}.` })
  }

  // 3. The promise (always)
  paragraphs.push({
    text: `I'm your ${ctx.saathiName} — and I've been looking forward to this conversation.`,
  })

  // 4. The reassurance (always)
  paragraphs.push({
    text: `You don't need to know what to ask yet. That's my job.`,
  })

  // 5. The opening — adapts to exam_target if known
  if (ctx.examTarget) {
    paragraphs.push({
      text: `Tell me — is the ${ctx.examTarget} pulling your attention right now? Or is there a concept that's not clicking, or a career question on your mind?`,
    })
  } else {
    paragraphs.push({
      text: `Tell me — what's on your mind about ${ctx.subject} lately? An exam coming up? A concept that's not clicking? A career question?`,
    })
  }

  // 6. The invitation (always)
  paragraphs.push({
    text: `Just start talking. I'll take it from there. ✦`,
    emphasis: 'closing',
  })

  // 7. Soft profile nudge — only in soft variant
  if (ctx.variant === 'soft') {
    paragraphs.push({
      text: `There's more I'd love to know about you — your profile fills in the rest.`,
      emphasis: 'nudge',
    })
  }

  return paragraphs
}

// ─── Mobile keyboard heuristic ───────────────────────────────────────────

function isKeyboardOpen(): boolean {
  if (typeof window === 'undefined') return false
  const vv = window.visualViewport
  if (!vv) return false
  return vv.height < window.innerHeight * 0.75
}

// ─── Component ───────────────────────────────────────────────────────────

const IDLE_MS = 8000

type Props = {
  saathi: {
    id:      string
    name:    string
    emoji:   string
    primary: string
    accent:  string
    bg:      string
  }
  saathiSlug:   string
  profile:      CompletenessProfile & { full_name?: string | null; exam_target?: string | null }
  soul:         CompletenessSoul | null | undefined
  inputValue:   string
  enabled:      boolean
  reduceMotion: boolean
}

export function IceBreaker({
  saathi,
  saathiSlug,
  profile,
  soul,
  inputValue,
  enabled,
  reduceMotion,
}: Props) {
  const completeness = useMemo(
    () => getProfileCompleteness(profile, soul),
    [profile, soul]
  )

  const variant: ToneVariant | null = useMemo(() => {
    if (completeness < COMPLETENESS_THRESHOLDS.ICEBREAKER_MIN) return null
    return completeness >= COMPLETENESS_THRESHOLDS.ICEBREAKER_FULL ? 'full' : 'soft'
  }, [completeness])

  const [phase, setPhase] = useState<'waiting' | 'showing' | 'closed'>('waiting')

  const storageKey = `edu_icebreaker_shown_${saathiSlug}`
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Skip entirely if no variant resolved (under min threshold)
  // or if disabled (welcome overlay still up) or already shown this session.
  const shouldEverFire = useMemo(() => {
    if (!enabled) return false
    if (!variant) return false
    if (typeof window === 'undefined') return false
    try {
      if (window.sessionStorage.getItem(storageKey)) return false
    } catch {
      // sessionStorage blocked — fail closed
      return false
    }
    return true
  }, [enabled, variant, storageKey])

  // Idle timer with mobile-keyboard + visibility awareness
  useEffect(() => {
    if (!shouldEverFire || phase !== 'waiting') return
    if (isKeyboardOpen()) return
    if (inputValue.trim().length > 0) return // student already started typing — never fire

    function startTimer(): void {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
        if (isKeyboardOpen()) return
        setPhase('showing')
        try {
          window.sessionStorage.setItem(storageKey, String(Date.now()))
        } catch {
          /* ignore */
        }
      }, IDLE_MS)
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        startTimer()
      } else if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function onViewportResize(): void {
      if (isKeyboardOpen() && timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    startTimer()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.visualViewport?.addEventListener('resize', onViewportResize)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.visualViewport?.removeEventListener('resize', onViewportResize)
    }
  }, [shouldEverFire, phase, inputValue, storageKey])

  // Any typing → close. Once closed, the phase state is sticky, so deleting
  // the input afterwards does not resurrect the bubble. The setState in this
  // effect is intentional: we're synchronising the parent-owned `inputValue`
  // prop into our internal phase machine — there is no event handler we can
  // attach to a sibling component's textarea.
  useEffect(() => {
    if (phase !== 'closed' && inputValue.trim().length > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('closed')
    }
  }, [inputValue, phase])

  if (phase !== 'showing' || !variant) return null

  const firstName =
    (profile.full_name ?? '').trim().split(/\s+/)[0] || 'there'

  const paragraphs = composeParagraphs({
    firstName,
    city:        profile.city?.trim() ?? null,
    institution: profile.institution_name?.trim() ?? null,
    examTarget:  profile.exam_target?.trim() ?? null,
    saathiName:  saathi.name,
    subject:     SUBJECT_FAMILY[saathiSlug] ?? 'your subject',
    variant,
  })

  const handleClose = (): void => {
    setPhase('closed')
  }

  const stagger = reduceMotion ? 0 : 0.45

  return (
    <AnimatePresence>
      <motion.div
        key="icebreaker"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          margin: '0 16px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        {/* Saathi avatar */}
        <div
          aria-hidden
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: saathi.bg,
            border: `1px solid ${saathi.primary}33`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          {saathi.emoji}
        </div>

        {/* Bubble */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            background: 'var(--bg-surface)',
            border: `1px solid ${saathi.primary}26`,
            borderRadius: 16,
            padding: '16px 18px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          {/* Saathi label + close */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: saathi.primary,
              }}
            >
              {saathi.name}
            </span>
            <button
              onClick={handleClose}
              aria-label="Dismiss greeting"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-ghost)',
                fontSize: 13,
                padding: '0 2px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0.2 : 0.35,
                delay: i * stagger,
                ease: 'easeOut',
              }}
              style={{
                margin: '0 0 10px',
                fontSize:
                  p.emphasis === 'header'
                    ? 'var(--text-md, 17px)'
                    : 'var(--text-base, 15px)',
                fontWeight: p.emphasis === 'header' ? 700 : 400,
                fontFamily:
                  p.emphasis === 'header'
                    ? 'var(--font-fraunces, "Fraunces", serif)'
                    : 'var(--font-jakarta, "Plus Jakarta Sans", system-ui, sans-serif)',
                color:
                  p.emphasis === 'nudge'
                    ? 'var(--text-tertiary)'
                    : 'var(--text-primary)',
                fontStyle: p.emphasis === 'closing' ? 'italic' : 'normal',
                lineHeight: 1.65,
              }}
            >
              {p.emphasis === 'nudge' ? (
                <>
                  {p.text}{' '}
                  <Link
                    href="/profile"
                    style={{
                      color: saathi.primary,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Update profile →
                  </Link>
                </>
              ) : (
                p.text
              )}
            </motion.p>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
