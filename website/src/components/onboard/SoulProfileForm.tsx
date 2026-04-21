'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { getSubjectChips, getInterestChips } from '@/constants/subjectChips'
import { EXAM_REGISTRY } from '@/constants/exams'
import {
  computeProfileCompleteness,
  getMilestoneLabel,
  getSubmitButtonLabel,
} from '@/lib/profileCompleteness'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParsedEducation = {
  year: number | null
  degree: string | null
  institution: string | null
  collegeName: string | null // matched from colleges table
  university: string | null // affiliation
  city: string | null
  confidence: number
}

export type SoulProfileData = {
  fullName: string
  city: string
  educationRaw: string
  educationParsed: ParsedEducation | null
  currentSubjects: string[]
  interestAreas: string[]
  examTarget: string                  // display string (legacy free-text)
  examTargetId: string | null         // canonical id from EXAM_REGISTRY (or null = no specific exam / "Other")
  learningStyle: string
  dream: string
  nudgePreference: boolean
}

type Props = {
  saathiId: string | null
  academicLevel: string
  examTargetFromLevel: string | null
  onContinue: (data: SoulProfileData) => Promise<void>
  onSkip: () => void
  onBack: () => void
  saving: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CITIES = [
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Ahmedabad',
  'Pune',
  'Kolkata',
  'Jaipur',
  'Surat',
  'Vadodara',
  'Rajkot',
  'Nagpur',
  'Lucknow',
  'Bhopal',
  'Indore',
  'Patna',
  'Chandigarh',
  'Kochi',
  'Coimbatore',
  'Other',
]

// Exam target selection moved to its own onboarding step. Kept the
// EXAM_REGISTRY import because the initialiser below still derives the
// canonical id from any free-text value inherited from earlier steps.

const LEARNING_STYLES = [
  {
    id: 'reading',
    emoji: '📖',
    title: 'Reading & Notes',
    desc: 'I like detailed written explanations and structured summaries',
  },
  {
    id: 'practice',
    emoji: '🎯',
    title: 'Practice First',
    desc: "Show me a problem. I'll figure out the theory from there.",
  },
  {
    id: 'conversation',
    emoji: '💬',
    title: 'Talk it Through',
    desc: "Explain it conversationally — like you're talking to a friend",
  },
  {
    id: 'examples',
    emoji: '🗺️',
    title: 'Show Me Examples',
    desc: 'Give me analogies and real-world examples. Abstract confuses me.',
  },
]

const spring = { type: 'spring', stiffness: 400, damping: 32 } as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function buildSummaryText(p: ParsedEducation): string {
  const parts: string[] = []
  if (p.year) parts.push(`${getOrdinal(p.year)} Year`)
  if (p.degree) parts.push(p.degree)
  const inst = p.collegeName ?? p.institution
  if (inst) parts.push(`at ${inst}`)
  if (p.university) parts.push(`(${p.university} affiliated)`)
  return parts.join(', ')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SoulCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay }}
      style={{
        padding: '10px 14px',
        background: 'rgba(201,153,58,0.08)',
        border: '0.5px solid rgba(201,153,58,0.22)',
        borderRadius: '10px',
        fontSize: '12px',
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        marginBottom: '8px',
      }}
    >
      {children}
    </motion.div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '4px',
        background: 'var(--bg-elevated)',
        borderRadius: '100px',
        overflow: 'hidden',
        marginBottom: '6px',
      }}
    >
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          height: '100%',
          background:
            pct >= 100
              ? 'linear-gradient(90deg, #C9993A, #E5B86A)'
              : 'linear-gradient(90deg, rgba(201,153,58,0.6), #C9993A)',
          borderRadius: '100px',
        }}
      />
    </div>
  )
}

function ChipSelector({
  label,
  helper,
  options,
  maxSelect,
  selected,
  onChange,
  primaryColor,
  allowCustom,
}: {
  label: string
  helper?: string
  options: string[]
  maxSelect: number
  selected: string[]
  onChange: (val: string[]) => void
  primaryColor: string
  allowCustom?: boolean
}) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  function toggle(chip: string) {
    if (selected.includes(chip)) {
      onChange(selected.filter((s) => s !== chip))
    } else if (selected.length < maxSelect) {
      onChange([...selected, chip])
    }
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= maxSelect)
      return
    onChange([...selected, trimmed])
    setCustomInput('')
    setShowCustom(false)
  }

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}
      >
        {label}
      </label>
      {helper && (
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            marginBottom: '12px',
          }}
        >
          {helper}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        {options.map((chip) => {
          const active = selected.includes(chip)
          return (
            <motion.button
              key={chip}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => toggle(chip)}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                background: active ? primaryColor : 'var(--bg-elevated)',
                color: active ? '#060F1D' : 'var(--text-secondary)',
                border: active ? 'none' : '0.5px solid var(--border-medium)',
                cursor:
                  selected.length >= maxSelect && !active
                    ? 'default'
                    : 'pointer',
                opacity: selected.length >= maxSelect && !active ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {chip}
            </motion.button>
          )
        })}
        {allowCustom &&
          (showCustom ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustom()
                  if (e.key === 'Escape') setShowCustom(false)
                }}
                placeholder="Type your subject..."
                style={{
                  padding: '6px 12px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid rgba(201,153,58,0.5)',
                  color: '#fff',
                  outline: 'none',
                  width: '160px',
                }}
              />
              <button
                type="button"
                onClick={addCustom}
                style={{
                  fontSize: '12px',
                  color: '#C9993A',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              disabled={selected.length >= maxSelect}
              style={{
                padding: '6px 12px',
                borderRadius: '100px',
                fontSize: '12px',
                background: 'transparent',
                border: '0.5px dashed var(--text-ghost)',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              + Add your own
            </button>
          ))}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-ghost)' }}>
        {selected.length} of {maxSelect} selected
      </p>
    </div>
  )
}

// ── Soul Preview Panel (right side) ──────────────────────────────────────────

function SoulPreviewPanel({
  data,
  saathiId,
  pct,
}: {
  data: SoulProfileData
  saathiId: string | null
  pct: number
}) {
  const saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]
  const milestone = getMilestoneLabel(pct)

  return (
    <div
      style={{
        position: 'sticky',
        top: '24px',
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--bg-elevated)',
        borderRadius: '20px',
        padding: '24px',
      }}
    >
      {pct >= 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '10px 14px',
            background: 'rgba(201,153,58,0.1)',
            border: '0.5px solid rgba(201,153,58,0.4)',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#C9993A',
            textAlign: 'center',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}
        >
          ✦ Your Saathi knows you fully.
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            This is the beginning of something real.
          </span>
        </motion.div>
      )}

      {/* Saathi emoji */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <motion.span
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          style={{ fontSize: '40px', display: 'block', lineHeight: 1 }}
        >
          {saathi.emoji}
        </motion.span>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            fontStyle: 'italic',
          }}
        >
          Your {saathi.name} is learning about you
        </p>
      </div>

      {/* Progress bar */}
      <ProgressBar pct={pct} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: pct >= 100 ? '#C9993A' : 'var(--text-secondary)',
          }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontSize: '11px',
            color: pct >= 60 ? '#C9993A' : 'var(--text-tertiary)',
          }}
        >
          {milestone}
        </span>
      </div>

      {/* Soul cards — appear as fields filled */}
      <div>
        <AnimatePresence>
          {data.fullName.trim().length > 0 && (
            <SoulCard key="name">
              👤 You are{' '}
              <strong style={{ color: '#fff' }}>{data.fullName.trim()}</strong>
            </SoulCard>
          )}
          {data.city.trim().length > 0 && (
            <SoulCard key="city" delay={0.05}>
              📍 Learning from{' '}
              <strong style={{ color: '#fff' }}>{data.city}</strong>
            </SoulCard>
          )}
          {data.educationParsed && (
            <SoulCard key="education" delay={0.08}>
              🎓 {buildSummaryText(data.educationParsed)}
            </SoulCard>
          )}
          {data.currentSubjects.length > 0 && (
            <SoulCard key="subjects" delay={0.1}>
              📚 Studying: {data.currentSubjects.slice(0, 3).join(', ')}
              {data.currentSubjects.length > 3 &&
                ` +${data.currentSubjects.length - 3} more`}
            </SoulCard>
          )}
          {data.learningStyle.length > 0 && (
            <SoulCard key="style" delay={0.12}>
              🧠 Learns best through{' '}
              <strong style={{ color: '#fff' }}>
                {LEARNING_STYLES.find((l) => l.id === data.learningStyle)
                  ?.title ?? data.learningStyle}
              </strong>
            </SoulCard>
          )}
          {data.dream.trim().length > 5 && (
            <motion.div
              key="dream"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              style={{
                padding: '10px 14px',
                background: 'rgba(201,153,58,0.12)',
                border: '0.5px solid rgba(201,153,58,0.35)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#E5B86A',
                marginBottom: '8px',
              }}
            >
              ✨ Dream: {data.dream.trim().split(' ').slice(0, 8).join(' ')}
              {data.dream.trim().split(' ').length > 8 ? '...' : ''}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Locked incentive at 60% */}
      {pct < 100 && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'var(--bg-elevated)',
            border: '0.5px dashed var(--border-medium)',
            borderRadius: '10px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-ghost)',
              marginBottom: '6px',
            }}
          >
            🔒 Unlock at 60%
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)' }}>
            Intern marketplace access
          </p>
          <div
            style={{
              marginTop: '8px',
              background: 'var(--bg-elevated)',
              borderRadius: '4px',
              height: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min((pct / 60) * 100, 100)}%`,
                height: '100%',
                background: '#C9993A',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <p
            style={{
              fontSize: '10px',
              color: 'var(--text-ghost)',
              marginTop: '4px',
            }}
          >
            {Math.max(0, 60 - pct)}% more to unlock
          </p>
        </div>
      )}

      <p
        style={{
          fontSize: '11px',
          color: 'var(--text-ghost)',
          textAlign: 'center',
          marginTop: '20px',
          lineHeight: 1.6,
          fontStyle: 'italic',
        }}
      >
        &ldquo;The more you share, the more personal every single answer
        becomes.&rdquo;
      </p>
    </div>
  )
}

// ── Education placeholder examples ────────────────────────────────────────────

const EDU_EXAMPLES = [
  '4th sem Mech Engg from DDU Nadiad',
  'Final year MBBS at AIIMS Delhi',
  'LLB 2nd year Mumbai University',
  'MBA 1st sem Symbiosis Pune',
  'B.Sc Physics 3rd year Delhi University',
  'M.Tech CSE 1st sem NIT Surat',
]

// ── Section Divider ────────────────────────────────────────────────────────────

function SectionDivider({
  number,
  title,
  subtitle,
}: {
  number: string
  title: string
  subtitle: string
}) {
  return (
    <div
      style={{
        paddingTop: '8px',
        paddingBottom: '4px',
        borderTop: '0.5px solid var(--bg-elevated)',
        marginTop: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#C9993A',
            background: 'rgba(201,153,58,0.1)',
            border: '0.5px solid rgba(201,153,58,0.3)',
            borderRadius: '100px',
            padding: '2px 10px',
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          fontSize: '11px',
          color: 'var(--text-ghost)',
          margin: 0,
          paddingLeft: '2px',
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function SoulProfileForm({
  saathiId,
  academicLevel: _academicLevel, // eslint-disable-line @typescript-eslint/no-unused-vars
  examTargetFromLevel,
  onContinue,
  onSkip,
  onBack,
  saving,
}: Props) {
  // Core state
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [educationRaw, setEducationRaw] = useState('')
  const [educationParsed, setEducationParsed] =
    useState<ParsedEducation | null>(null)
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parseConfirmed, setParseConfirmed] = useState<boolean | null>(null) // null=not asked, true=yes, false=rejected
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([])
  const [interestAreas, setInterestAreas] = useState<string[]>([])
  // Seeded from the dedicated exam step; the form itself no longer edits these.
  const examTarget = examTargetFromLevel ?? 'None'
  const examTargetId = (() => {
    const match = EXAM_REGISTRY.find(
      (e) => e.name.toLowerCase() === (examTargetFromLevel ?? '').toLowerCase()
    )
    return match?.id ?? null
  })()
  const [learningStyle, setLearningStyle] = useState('')
  const [dream, setDream] = useState('')
  const [nudgePreference, setNudgePreference] = useState(true)

  // City search state (FIX 2)
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  )

  // Rotating education placeholder (FIX 3)
  const [exampleIdx, setExampleIdx] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIdx((i) => (i + 1) % EDU_EXAMPLES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]
  const primaryColor = saathi.primary

  const subjectOptions = getSubjectChips(saathiId ?? '')
  const interestOptions = getInterestChips(saathiId ?? '')

  // Completeness
  const pct = useMemo(
    () =>
      computeProfileCompleteness({
        name: fullName,
        city,
        educationParsed: educationParsed !== null && parseConfirmed !== false,
        subjects: currentSubjects,
        learningStyle,
        dream,
        examTarget,
        interests: interestAreas,
      }),
    [
      fullName,
      city,
      educationParsed,
      parseConfirmed,
      currentSubjects,
      learningStyle,
      dream,
      examTarget,
      interestAreas,
    ]
  )

  const formData: SoulProfileData = {
    fullName,
    city,
    educationRaw,
    educationParsed,
    currentSubjects,
    interestAreas,
    examTarget,
    examTargetId,
    learningStyle,
    dream,
    nudgePreference,
  }

  // ── Parse education on blur ─────────────────────────────────────────────────
  // Returns the parsed result so callers can use it immediately (React state update is async).
  const parseEducation =
    useCallback(async (): Promise<ParsedEducation | null> => {
      if (educationRaw.trim().length < 5 || parseConfirmed === true) return null
      setParseLoading(true)
      setParseError('')
      setEducationParsed(null)
      setParseConfirmed(null)

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-education`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ rawInput: educationRaw }),
          }
        )

        if (!res.ok) throw new Error('Parser unavailable')

        const json = (await res.json()) as {
          parsed: {
            year: number | null
            degree: string | null
            institution: string | null
            city: string | null
          }
          college: { name: string; university: string | null } | null
          confidence: number
        }

        const parsed: ParsedEducation = {
          year: json.parsed.year,
          degree: json.parsed.degree,
          institution: json.parsed.institution,
          collegeName: json.college?.name ?? null,
          university: json.college?.university ?? null,
          city: json.parsed.city,
          confidence: json.confidence,
        }
        setEducationParsed(parsed)
        return parsed
      } catch {
        setParseError(
          'Could not parse — please fill in your details manually below'
        )
        return null
      } finally {
        setParseLoading(false)
      }
    }, [educationRaw, parseConfirmed])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    // If user never blurred the education field (common on mobile),
    // run the parser now and use the returned result directly — React state
    // update from setEducationParsed won't be visible until next render.
    let resolvedParsed = educationParsed
    if (!educationParsed && educationRaw.trim().length >= 5) {
      resolvedParsed = await parseEducation()
    }
    await onContinue({ ...formData, educationParsed: resolvedParsed })
  }

  const [dpdpConsent, setDpdpConsent] = useState(false)
  const canSubmit = fullName.trim().length > 0 && city.length > 0 && dpdpConsent
  const submitLabel = getSubmitButtonLabel(pct)

  // ── Shared input style ────────────────────────────────────────────────────
  const inputCls: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#fff',
    outline: 'none',
    fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)',
  }

  return (
    <div
      style={{
        padding: '32px 24px 80px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* Step header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '40px' }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#C9993A',
            background: 'rgba(201,153,58,0.1)',
            border: '0.5px solid rgba(201,153,58,0.3)',
            borderRadius: '100px',
            padding: '4px 14px',
            display: 'inline-block',
            marginBottom: '16px',
          }}
        >
          Step 3 · Soul Partnership Begins
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            margin: '0 0 10px',
          }}
        >
          Let your Saathi know you.
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            fontWeight: 300,
          }}
        >
          Answer a few questions. Your Saathi calibrates instantly to who you
          are.
        </p>
      </motion.div>

      {/* Mobile soul strip (FIX 9) */}
      <div className="mobile-soul-strip" style={{ display: 'none' }}>
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(201,153,58,0.06)',
            border: '0.5px solid rgba(201,153,58,0.2)',
            borderRadius: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '28px' }}>{saathi.emoji}</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Soul profile
              </span>
              <span
                style={{ fontSize: '12px', fontWeight: 700, color: '#C9993A' }}
              >
                {pct}%
              </span>
            </div>
            <ProgressBar pct={pct} />
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-ghost)',
                margin: 0,
              }}
            >
              {getMilestoneLabel(pct)}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 60%) minmax(0, 40%)',
          gap: '40px',
          alignItems: 'start',
        }}
        className="soul-form-grid"
      >
        {/* ──── LEFT: Form ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <SectionDivider
            number="About you"
            title="Tell me who you are"
            subtitle="Your name, city, and education"
          />

          {/* Field 1: Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '4px',
                fontFamily: 'var(--font-playfair, serif)',
              }}
            >
              What should I call you?
            </label>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-ghost)',
                marginBottom: '12px',
              }}
            >
              Your Saathi will use this in every conversation
            </p>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              placeholder="Your name — exactly as you'd like your Saathi to address you"
              style={inputCls}
            />
          </div>

          {/* Field 2: City */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '4px',
                fontFamily: 'var(--font-playfair, serif)',
              }}
            >
              Where are you learning from?
            </label>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-ghost)',
                marginBottom: '12px',
              }}
            >
              Helps your Saathi connect learning to your local context
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={city ? city : citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value)
                  setCity(e.target.value.trim())
                  setShowCityDropdown(true)
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)'
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  setShowCityDropdown(true)
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = city
                    ? 'rgba(201,153,58,0.5)'
                    : 'var(--border-medium)'
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  setTimeout(() => setShowCityDropdown(false), 200)
                }}
                placeholder="Search your city..."
                style={{
                  ...inputCls,
                  borderColor: city
                    ? 'rgba(201,153,58,0.5)'
                    : 'var(--border-medium)',
                }}
              />
              {city && (
                <span
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: '#4ADE80',
                  }}
                >
                  ✓
                </span>
              )}
              <AnimatePresence>
                {showCityDropdown && filteredCities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-surface)',
                      border: '0.5px solid rgba(201,153,58,0.3)',
                      borderRadius: '12px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    {filteredCities.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={() => {
                          setCity(c)
                          setCitySearch(c)
                          setShowCityDropdown(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          borderBottom: '0.5px solid var(--bg-elevated)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(201,153,58,0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none'
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Field 3: Education (smart parser) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '4px',
                fontFamily: 'var(--font-playfair, serif)',
              }}
            >
              Tell me about your education
            </label>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-ghost)',
                marginBottom: '12px',
              }}
            >
              Just type naturally — your Saathi will figure out the rest ✓
            </p>
            <input
              type="text"
              value={educationRaw}
              onChange={(e) => {
                setEducationRaw(e.target.value)
                setEducationParsed(null)
                setParseConfirmed(null)
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
                void parseEducation()
              }}
              placeholder={EDU_EXAMPLES[exampleIdx]}
              style={inputCls}
            />
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-ghost)',
                marginTop: '6px',
              }}
            >
              Just type naturally. We handle the rest.
            </p>

            {/* Parse states */}
            {parseLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                }}
              >
                <span
                  className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '1.5px solid var(--text-ghost)',
                    borderTop: '1.5px solid #C9993A',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Checking your college database…
              </motion.div>
            )}

            {parseError && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(239,68,68,0.8)',
                  marginTop: '8px',
                }}
              >
                {parseError}
              </p>
            )}

            {educationParsed && parseConfirmed === null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  background: 'rgba(74,222,128,0.06)',
                  border: '0.5px solid rgba(74,222,128,0.25)',
                  borderRadius: '12px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: '#4ADE80',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  ✓ Got it —
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                  }}
                >
                  {buildSummaryText(educationParsed)}
                  {educationParsed.confidence < 70 && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-ghost)',
                        marginLeft: '6px',
                      }}
                    >
                      ({educationParsed.confidence}% confident)
                    </span>
                  )}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '10px',
                  }}
                >
                  Is this right?
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setParseConfirmed(true)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#4ADE80',
                      color: '#060F1D',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Yes ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParseConfirmed(false)
                      setEducationParsed(null)
                    }}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: 'transparent',
                      border: '0.5px solid var(--text-ghost)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Let me correct
                  </button>
                </div>
              </motion.div>
            )}

            {parseConfirmed === true && educationParsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ marginTop: '8px', fontSize: '12px', color: '#4ADE80' }}
              >
                ✓ {buildSummaryText(educationParsed)}
              </motion.div>
            )}
          </div>

          <SectionDivider
            number="Your studies"
            title="What you're learning"
            subtitle="Subjects, interests, and exams"
          />

          {/* Field 4: Current subjects */}
          <ChipSelector
            label="What subjects are you studying this semester?"
            helper="Select up to 5 — your Saathi will teach exactly these"
            options={subjectOptions}
            maxSelect={5}
            selected={currentSubjects}
            onChange={setCurrentSubjects}
            primaryColor={primaryColor}
            allowCustom
          />

          {/* Field 5: Interest areas */}
          <ChipSelector
            label="What excites you beyond your curriculum?"
            helper="Areas you'd explore even without exams"
            options={interestOptions}
            maxSelect={5}
            selected={interestAreas}
            onChange={setInterestAreas}
            primaryColor={primaryColor}
            allowCustom
          />

          {/* Field 6 removed — exam target is now a dedicated onboarding step */}

          <SectionDivider
            number="Your mind"
            title="How you learn best"
            subtitle="Style, dream, and preferences"
          />

          {/* Field 7: Learning style */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '4px',
                fontFamily: 'var(--font-playfair, serif)',
              }}
            >
              How does your mind work best?
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '12px',
              }}
            >
              {LEARNING_STYLES.map((style) => {
                const active = learningStyle === style.id
                return (
                  <motion.button
                    key={style.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setLearningStyle(style.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      position: 'relative',
                      background: active
                        ? `${primaryColor}18`
                        : 'var(--bg-elevated)',
                      border: active
                        ? `1.5px solid ${primaryColor}`
                        : '0.5px solid var(--bg-elevated)',
                      boxShadow: active ? `0 0 20px ${primaryColor}22` : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '24px',
                        display: 'block',
                        marginBottom: '8px',
                      }}
                    >
                      {style.emoji}
                    </span>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                        margin: '0 0 4px',
                      }}
                    >
                      {style.title}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {style.desc}
                    </p>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: primaryColor,
                          color: '#060F1D',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Field 8: Dream */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '4px',
                fontFamily: 'var(--font-playfair, serif)',
              }}
            >
              What&apos;s your biggest dream — even if it feels far away?
            </label>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-ghost)',
                marginBottom: '12px',
              }}
            >
              Your Saathi will remember this always. Every session connects to
              this.
            </p>
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              placeholder="What excites you most — even if it feels impossibly far away?"
              rows={3}
              style={{ ...inputCls, resize: 'none' }}
            />
          </div>

          {/* Field 9: Nudge preference */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--bg-elevated)',
              borderRadius: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setNudgePreference(!nudgePreference)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                flexShrink: 0,
                background: nudgePreference
                  ? '#C9993A'
                  : 'var(--bg-elevated)',
                border: nudgePreference
                  ? 'none'
                  : '0.5px solid var(--text-ghost)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginTop: '2px',
                color: '#060F1D',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {nudgePreference ? '✓' : ''}
            </button>
            <div>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  margin: '0 0 3px',
                }}
              >
                Let my Saathi remind me to update my profile each semester
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--text-ghost)',
                  margin: 0,
                }}
              >
                Keeps your Saathi calibrated as you progress. Turn off anytime.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div>
            {pct >= 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(201,153,58,0.08)',
                  border: '0.5px solid rgba(201,153,58,0.3)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#C9993A',
                }}
              >
                ✦ Your Saathi knows you fully. This is the beginning of
                something real.
              </motion.div>
            )}
            {/* DPDP Act 2023 consent */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="dpdp-consent"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0, accentColor: '#C9993A' }}
              />
              <label htmlFor="dpdp-consent" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, cursor: 'pointer' }}>
                I have read the{' '}
                <a href="/privacy" target="_blank" style={{ color: '#C9993A', textDecoration: 'underline' }}>Privacy Notice</a>
                {' '}and consent to EdUsaathiAI collecting my learning data to personalise my Saathi experience.
                I can withdraw consent anytime from Settings.
              </label>
            </div>

            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              whileHover={
                canSubmit && !saving
                  ? { y: -2, boxShadow: '0 20px 40px rgba(201,153,58,0.3)' }
                  : {}
              }
              whileTap={canSubmit && !saving ? { scale: 0.98 } : {}}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                background: canSubmit ? '#C9993A' : 'var(--bg-elevated)',
                color: canSubmit ? '#060F1D' : 'var(--text-ghost)',
                border: 'none',
                cursor: canSubmit && !saving ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {saving ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid rgba(6,15,29,0.3)',
                      borderTopColor: '#060F1D',
                      animation: 'spin 1s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Setting up your Saathi…
                </span>
              ) : (
                submitLabel
              )}
            </motion.button>
            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--text-ghost)',
                marginTop: '12px',
              }}
            >
              You can always add more later. Your Saathi gets smarter with every
              session.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={onBack}
                style={{
                  fontSize: '13px',
                  color: 'var(--text-ghost)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={onSkip}
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-ghost)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                  title="Skipping means your Saathi starts with less context about you."
                >
                  Skip for now
                </button>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'var(--border-strong)',
                    margin: '3px 0 0',
                  }}
                >
                  Your Saathi will have less context. Complete from Profile
                  anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ──── RIGHT: Soul preview ──────────────────────────────────────── */}
        <div>
          <SoulPreviewPanel data={formData} saathiId={saathiId} pct={pct} />
        </div>
      </div>

      {/* Mobile: responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .soul-form-grid { grid-template-columns: 1fr !important; }
          .mobile-soul-strip { display: block !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
