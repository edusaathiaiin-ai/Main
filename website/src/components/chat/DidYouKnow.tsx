'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Tip content ──────────────────────────────────────────────────────────────

type Tip = {
  id:          string
  emoji:       string
  headline:    string
  body:        string
  cta?:        { label: string; href: string }
}

const TIPS: Tip[] = [
  {
    id:       'soul-memory',
    emoji:    '✦',
    headline: 'Your Saathi remembers you',
    body:     'Every session builds on the last. Your Saathi tracks what you covered, how deep you went, and where you left off — so you never have to repeat yourself.',
  },
  {
    id:       'voice-output',
    emoji:    '🔊',
    headline: 'Listen to every answer',
    body:     'Tap the speaker icon below any bot reply to hear it read aloud. Great for learning on the go or if reading for long stretches is tiring.',
  },
  {
    id:       'voice-input',
    emoji:    '🎤',
    headline: 'Speak in your own language',
    body:     'Use the mic button in the input bar to speak instead of type. Switch between Hindi, Gujarati, Marathi, Tamil, Telugu, Kannada, Bengali, and English.',
  },
  {
    id:       'faculty-finder',
    emoji:    '🧑‍🏫',
    headline: 'Find a real subject expert',
    body:     'Faculty Finder connects you with verified faculty who teach your exact subject. Book a private 1:1 session at your convenience — from ₹500.',
    cta:      { label: 'Open Faculty Finder →', href: '/faculty-finder' },
  },
  {
    id:       'request-lecture',
    emoji:    '✉️',
    headline: 'Request a lecture from your dream faculty',
    body:     "Can't find a session on your specific topic? Raise a Lecture Request — faculty who match your need will see it and offer a session directly to you.",
    cta:      { label: 'Make a request →', href: '/requests' },
  },
  {
    id:       'bookmark-faculty',
    emoji:    '🔖',
    headline: 'Bookmark faculty for later',
    body:     "Found a great faculty profile but not ready to book? Bookmark them. Your saved faculty list is always one tap away from the sidebar.",
  },
  {
    id:       'live-sessions',
    emoji:    '🎙️',
    headline: 'Learn live alongside other students',
    body:     'Live Sessions are group lectures by expert faculty — in real time. Ask questions, hear different perspectives, and learn more in less time.',
    cta:      { label: 'Browse Live Sessions →', href: '/live' },
  },
  {
    id:       'declare-intent',
    emoji:    '🎯',
    headline: 'Let faculty find you',
    body:     'Declare What You Want — tell us what topic or skill you need. Matching faculty discover your intent and create sessions just for you.',
    cta:      { label: 'Declare now →', href: '/learn' },
  },
  {
    id:       'flashcard',
    emoji:    '🃏',
    headline: 'Save any answer as a flashcard',
    body:     'See something worth remembering? Tap the 🃏 icon on any bot reply to save it as a flashcard. Review it later in your Flashcards dashboard.',
    cta:      { label: 'Open Flashcards →', href: '/flashcards' },
  },
  {
    id:       'font-settings',
    emoji:    'Aa',
    headline: 'Make reading comfortable for you',
    body:     'Tap the Aa button in the header to change font size, style, and text colour. Colorblind-safe palettes included. High contrast and reduce motion toggles also available.',
  },
  {
    id:       'translated-answers',
    emoji:    '🌐',
    headline: 'Your Saathi can answer in your language',
    body:     'Ask your question in Hindi, Gujarati, or any Indian language — your Saathi will respond in the same language. Just type or speak naturally.',
  },
  {
    id:       'internships',
    emoji:    '🎓',
    headline: 'Find internships matched to your soul',
    body:     'Internship and research opportunities matched to your Saathi subject and academic interests — not random listings. Found in Internships & Research.',
    cta:      { label: 'Explore opportunities →', href: '/internships' },
  },
]

// ─── Storage helpers ──────────────────────────────────────────────────────────

const SEEN_KEY      = 'edu_dyk_seen'      // comma-separated tip IDs seen
const DISMISSED_KEY = 'edu_dyk_dismissed' // ISO date of last dismissal
const SESSION_KEY   = 'edu_dyk_sessions'  // total sessions count

function getSeenIds(): Set<string> {
  try {
    return new Set((localStorage.getItem(SEEN_KEY) ?? '').split(',').filter(Boolean))
  } catch { return new Set() }
}

function markSeen(id: string) {
  try {
    const seen = getSeenIds()
    seen.add(id)
    localStorage.setItem(SEEN_KEY, [...seen].join(','))
  } catch { /* ignore */ }
}

function isDismissedToday(): boolean {
  try {
    const d = localStorage.getItem(DISMISSED_KEY)
    if (!d) return false
    return new Date(d) > new Date()
  } catch { return false }
}

function dismiss48h() {
  try {
    const future = new Date()
    future.setHours(future.getHours() + 48)
    localStorage.setItem(DISMISSED_KEY, future.toISOString())
  } catch { /* ignore */ }
}

function getSessionCount(): number {
  try {
    return parseInt(localStorage.getItem(SESSION_KEY) ?? '0', 10)
  } catch { return 0 }
}

function incrementSession() {
  try {
    localStorage.setItem(SESSION_KEY, String(getSessionCount() + 1))
  } catch { /* ignore */ }
}

function shouldShow(): boolean {
  if (isDismissedToday()) return false
  const sessions = getSessionCount()
  if (sessions <= 3) return true
  return true
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  isLegalTheme?:  boolean
  primaryColor?:  string
  reduceMotion?:  boolean
}

export function DidYouKnow({
  isLegalTheme  = false,
  primaryColor  = '#C9993A',
  reduceMotion  = false,
}: Props) {
  const [visible,  setVisible]  = useState(false)
  const [index,    setIndex]    = useState(0)
  const [paused,   setPaused]   = useState(false)
  const [dir,      setDir]      = useState<1 | -1>(1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Unseen tips first, then already-seen
  const orderedTips = (() => {
    const seen    = getSeenIds()
    const unseen  = TIPS.filter((t) => !seen.has(t.id))
    const seenTips = TIPS.filter((t) => seen.has(t.id))
    return [...unseen, ...seenTips]
  })()

  useEffect(() => {
    incrementSession()
    if (shouldShow() && orderedTips.length > 0) {
      markSeen(orderedTips[0].id)
      setVisible(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-rotate every 6s
  useEffect(() => {
    if (!visible || paused) return
    timerRef.current = setInterval(() => {
      setDir(1)
      setIndex((i) => {
        const next = (i + 1) % orderedTips.length
        markSeen(orderedTips[next].id)
        return next
      })
    }, 6000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [visible, paused, orderedTips])

  const goTo = useCallback((i: number) => {
    setDir(i > index ? 1 : -1)
    markSeen(orderedTips[i].id)
    setIndex(i)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [index, orderedTips])

  const prev = useCallback(() => {
    const i = (index - 1 + orderedTips.length) % orderedTips.length
    setDir(-1)
    markSeen(orderedTips[i].id)
    setIndex(i)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [index, orderedTips])

  const next = useCallback(() => {
    const i = (index + 1) % orderedTips.length
    setDir(1)
    markSeen(orderedTips[i].id)
    setIndex(i)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [index, orderedTips])

  function handleDismiss() {
    dismiss48h()
    setVisible(false)
  }

  if (!visible || orderedTips.length === 0) return null

  const tip = orderedTips[index]

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const cardBg      = isLegalTheme ? '#FFFDF7'               : 'rgba(201,153,58,0.05)'
  const cardBorder  = isLegalTheme ? '1px solid #E8D98A'     : '0.5px solid rgba(201,153,58,0.18)'
  const headlineC   = isLegalTheme ? '#1A1A1A'               : '#FFFFFF'
  const bodyC       = isLegalTheme ? '#555555'               : 'rgba(255,255,255,0.6)'
  const mutedC      = isLegalTheme ? 'rgba(0,0,0,0.3)'       : 'rgba(255,255,255,0.2)'
  const navBtnC     = isLegalTheme ? 'rgba(0,0,0,0.25)'      : 'rgba(255,255,255,0.25)'
  const dotInactive = isLegalTheme ? 'rgba(0,0,0,0.15)'      : 'rgba(255,255,255,0.15)'

  const slideVariants = {
    enter:  (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <div
      style={{ margin: '0 16px 12px', position: 'relative' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{
        borderRadius: '16px',
        background:   cardBg,
        border:       cardBorder,
        overflow:     'hidden',
        position:     'relative',
      }}>

        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 0',
        }}>
          <span style={{
            fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: primaryColor,
          }}>
            Did you know?
          </span>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss tips"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: mutedC, fontSize: '13px', padding: '0 2px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tip body — animated */}
        <div style={{ padding: '10px 14px 0', minHeight: '80px', position: 'relative' }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={tip.id}
              custom={dir}
              variants={reduceMotion ? {} : slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Emoji + headline */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                <span style={{
                  fontSize:   tip.emoji === 'Aa' ? '14px' : '20px',
                  fontWeight: tip.emoji === 'Aa' ? 700 : 400,
                  color:      tip.emoji === 'Aa' ? primaryColor : undefined,
                  flexShrink: 0, lineHeight: 1.3, marginTop: '1px',
                }}>
                  {tip.emoji}
                </span>
                <p style={{
                  fontSize: '12px', fontWeight: 700,
                  color: headlineC, margin: 0, lineHeight: 1.35,
                }}>
                  {tip.headline}
                </p>
              </div>

              {/* Body */}
              <p style={{
                fontSize: '11px', color: bodyC,
                margin: '0 0 0 30px', lineHeight: 1.55,
              }}>
                {tip.body}
              </p>

              {/* CTA */}
              {tip.cta && (
                <a
                  href={tip.cta.href}
                  style={{
                    display: 'inline-block',
                    marginTop: '8px', marginLeft: '30px',
                    fontSize: '11px', fontWeight: 600,
                    color: primaryColor, textDecoration: 'none',
                  }}
                >
                  {tip.cta.label}
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 12px',
        }}>
          <button onClick={prev} aria-label="Previous tip" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: navBtnC, fontSize: '14px', padding: '2px 4px', lineHeight: 1,
          }}>
            ‹
          </button>

          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {orderedTips.map((t, i) => (
              <button
                key={t.id}
                onClick={() => goTo(i)}
                aria-label={`Go to tip ${i + 1}`}
                style={{
                  width: i === index ? '16px' : '6px',
                  height: '6px', borderRadius: '3px',
                  background: i === index ? primaryColor : dotInactive,
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: reduceMotion ? 'none' : 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          <button onClick={next} aria-label="Next tip" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: navBtnC, fontSize: '14px', padding: '2px 4px', lineHeight: 1,
          }}>
            ›
          </button>
        </div>

        {/* Progress bar */}
        {!paused && !reduceMotion && (
          <motion.div
            key={`${tip.id}-progress`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
            style={{
              position: 'absolute', bottom: 0, left: 0,
              height: '2px',
              background: `${primaryColor}60`,
            }}
          />
        )}
      </div>

      {/* Dismiss hint */}
      {index >= 2 && (
        <p style={{
          textAlign: 'center', fontSize: '9px',
          color: mutedC, marginTop: '5px',
        }}>
          ✕ to hide for 48 hours
        </p>
      )}
    </div>
  )
}
