'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type ParseResult = {
  parsed: {
    year: number | null
    degree: string | null
    institution: string | null
    city: string | null
    saathi_suggestion: string | null
  }
  college: {
    id: string
    name: string
    city: string
    state: string
    university: string | null
    naac_grade: string | null
    score: number
  } | null
  course: {
    id: string
    name: string
    saathi_slug: string | null
    score: number
  } | null
  confidence: number
  subjects: Record<string, string[]> | null
  saathi_suggestion: string | null
  alternatives: {
    id: string
    name: string
    city: string
    state: string
    score: number
  }[]
}

type Props = {
  currentSaathiId?: string
  onConfirmed: (data: {
    collegeId: string | null
    courseId: string | null
    year: number | null
    currentSubjects: string[]
    saathiSuggestion: string | null
    rawInput: string
  }) => void
  onSaathiSwitch?: (slug: string) => void
  primaryColor?: string
}

const EXAMPLES = [
  '2nd Year B.Tech CSE from NIT Surat',
  'Final year MBBS, AIIMS Delhi',
  'MBA 1st sem, Symbiosis Pune',
  'LLB 3rd year GLC Mumbai',
  '4th yr B.Pharm, LM College Ahmedabad',
]

// ── SmartEducationInput ───────────────────────────────────────────────────────

export function SmartEducationInput({
  currentSaathiId,
  onConfirmed,
  onSaathiSwitch,
  primaryColor = '#C9993A',
}: Props) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [autoAdding, setAutoAdding] = useState(false)
  const [communityAdded, setCommunityAdded] = useState(false)

  // Rotate examples every 3s
  useEffect(() => {
    const t = setInterval(
      () => setExampleIdx((i) => (i + 1) % EXAMPLES.length),
      3000
    )
    return () => clearInterval(t)
  }, [])

  // ── Call parse-education Edge Function on blur ──────────────────────────────

  async function handleBlur() {
    const trimmed = value.trim()
    if (!trimmed || loading || confirmed) return
    if (trimmed.length < 8) return // too short to parse

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-education`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ rawInput: trimmed }),
        }
      )

      if (!res.ok) throw new Error(`Parse failed: ${res.status}`)
      const data: ParseResult = await res.json()
      setResult(data)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not parse. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation ────────────────────────────────────────────────────────────

  function handleConfirm() {
    if (!result) return
    const subjects = result.subjects
      ? Object.values(result.subjects).flat()
      : []
    setConfirmed(true)
    onConfirmed({
      collegeId: result.college?.id ?? null,
      courseId: result.course?.id ?? null,
      year: result.parsed.year,
      currentSubjects: subjects,
      saathiSuggestion: result.saathi_suggestion,
      rawInput: value.trim(),
    })
  }

  function handleCorrect() {
    setResult(null)
    setConfirmed(false)
    setCommunityAdded(false)
  }

  // ── Phase 2: Auto-add unknown college via community sourcing ────────────────

  async function handleAutoAdd() {
    if (!result) return
    const institutionName = result.parsed.institution ?? value.trim()
    if (!institutionName) return

    setAutoAdding(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-add-college`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            institution_name: institutionName,
            city: result.parsed.city ?? undefined,
            courses: result.parsed.degree ? [result.parsed.degree] : [],
          }),
        }
      )
      if (!res.ok) throw new Error(`auto-add failed: ${res.status}`)
      const data = await res.json()

      // Update result with the new/found college and confirm
      setResult((prev) =>
        prev
          ? {
              ...prev,
              college: data.college
                ? {
                    id: data.college.id,
                    name: data.college.name,
                    city: data.college.city ?? '',
                    state: data.college.state ?? '',
                    university: null,
                    naac_grade: null,
                    score: 1,
                  }
                : prev.college,
              confidence: 90,
            }
          : prev
      )
      setCommunityAdded(data.action === 'added')
      setConfirmed(true)
      const subjects = result.subjects
        ? Object.values(result.subjects).flat()
        : []
      onConfirmed({
        collegeId: data.college?.id ?? null,
        courseId: result.course?.id ?? null,
        year: result.parsed.year,
        currentSubjects: subjects,
        saathiSuggestion: result.saathi_suggestion,
        rawInput: value.trim(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add college.')
    } finally {
      setAutoAdding(false)
    }
  }

  // ── Subject list preview ────────────────────────────────────────────────────

  function getSubjectPreview(result: ParseResult): string {
    if (!result.subjects) return ''
    const all = Object.values(result.subjects).flat()
    if (all.length === 0) return ''
    const preview = all.slice(0, 3).join(', ')
    return all.length > 3 ? `${preview} +${all.length - 3} more` : preview
  }

  const showSaathiNudge =
    result &&
    result.saathi_suggestion &&
    currentSaathiId &&
    result.saathi_suggestion !== currentSaathiId

  return (
    <div className="w-full">
      {/* Label */}
      <label
        className="mb-1.5 block text-xs font-semibold tracking-wide"
        style={{ color: 'var(--text-secondary)' }}
      >
        Tell us about your education
      </label>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setResult(null)
            setConfirmed(false)
          }}
          onBlur={handleBlur}
          rows={2}
          disabled={confirmed}
          placeholder={`e.g. "${EXAMPLES[exampleIdx]}"`}
          className="w-full resize-none rounded-xl px-4 py-3.5 text-sm text-white transition-all outline-none"
          style={{
            background: 'var(--bg-elevated)',
            border: `0.5px solid ${result ? (result.confidence >= 85 ? 'rgba(34,197,94,0.4)' : result.confidence >= 60 ? `${primaryColor}66` : 'rgba(239,68,68,0.35)') : 'var(--border-medium)'}`,
            fontFamily: 'var(--font-dm-sans)',
            opacity: confirmed ? 0.6 : 1,
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = `${primaryColor}80`)
          }
        />

        {/* Loading spinner overlay */}
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/10"
              style={{ borderTopColor: primaryColor }}
            />
          </div>
        )}
      </div>

      {/* Hint */}
      {!loading && !result && (
        <p
          className="mt-1.5 text-[10px]"
          style={{ color: 'var(--text-ghost)' }}
        >
          Just type naturally — we&#39;ll figure it out
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-[11px]" style={{ color: '#FCA5A5' }}>
          ⚠️ {error}
        </p>
      )}

      {/* ── Result cards ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && !confirmed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-3 space-y-2"
          >
            {/* ── HIGH confidence (≥85) — green confirmation card ─────────────── */}
            {result.confidence >= 85 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '0.5px solid rgba(34,197,94,0.25)',
                }}
              >
                <p
                  className="mb-2 text-xs font-semibold"
                  style={{ color: '#4ADE80' }}
                >
                  ✓ We understood:
                </p>
                <p className="mb-0.5 text-sm font-medium text-white">
                  {result.parsed.year
                    ? `${result.parsed.year}${['st', 'nd', 'rd', 'th'][Math.min(result.parsed.year - 1, 3)]} Year `
                    : ''}
                  {result.parsed.degree}
                </p>
                {result.college && (
                  <p
                    className="mb-1 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    at {result.college.name}, {result.college.city}
                    {result.college.university
                      ? ` (${result.college.university})`
                      : ''}
                  </p>
                )}
                {getSubjectPreview(result) && (
                  <p
                    className="mb-3 text-[10px]"
                    style={{ color: 'var(--text-ghost)' }}
                  >
                    📚 {getSubjectPreview(result)}
                  </p>
                )}
                <p
                  className="mb-2 text-[11px] font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Is this right?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 rounded-lg py-2 text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(34,197,94,0.2)',
                      border: '0.5px solid rgba(34,197,94,0.4)',
                      color: '#4ADE80',
                    }}
                  >
                    Yes, that&#39;s me ✓
                  </button>
                  <button
                    onClick={handleCorrect}
                    className="flex-1 rounded-lg py-2 text-xs font-medium transition-all"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Let me correct this
                  </button>
                </div>
              </div>
            )}

            {/* ── MEDIUM confidence (60–84) — "Did you mean" ──────────────────── */}
            {result.confidence >= 60 && result.confidence < 85 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: `${primaryColor}0d`,
                  border: `0.5px solid ${primaryColor}44`,
                }}
              >
                <p
                  className="mb-2 text-xs font-semibold"
                  style={{ color: primaryColor }}
                >
                  Did you mean…
                </p>
                {result.college && (
                  <button
                    onClick={handleConfirm}
                    className="mb-2 w-full rounded-lg px-3 py-2.5 text-left transition-all"
                    style={{
                      background: `${primaryColor}15`,
                      border: `0.5px solid ${primaryColor}33`,
                    }}
                  >
                    <p className="text-sm font-medium text-white">
                      {result.college.name}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {result.college.city}, {result.college.state}
                      {result.college.naac_grade
                        ? ` · NAAC ${result.college.naac_grade}`
                        : ''}
                    </p>
                  </button>
                )}
                {/* Alternatives */}
                {result.alternatives.slice(0, 2).map((alt) => (
                  <button
                    key={alt.id}
                    onClick={() => {
                      setResult((prev) =>
                        prev
                          ? {
                              ...prev,
                              college: {
                                ...alt,
                                university: null,
                                naac_grade: null,
                              },
                              confidence: 90,
                            }
                          : prev
                      )
                    }}
                    className="mb-1.5 w-full rounded-lg px-3 py-2 text-left transition-all"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--bg-elevated)',
                    }}
                  >
                    <p className="text-xs text-white/70">{alt.name}</p>
                    <p className="text-[10px] text-white/35">
                      {alt.city}, {alt.state}
                    </p>
                  </button>
                ))}
                <button
                  onClick={handleCorrect}
                  className="mt-1 text-[11px]"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  None of these — let me retype
                </button>
              </div>
            )}

            {/* ── LOW confidence (<60) — manual selection ─────────────────────── */}
            {result.confidence < 60 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '0.5px solid rgba(239,68,68,0.2)',
                }}
              >
                <p
                  className="mb-1 text-xs font-semibold"
                  style={{ color: '#FCA5A5' }}
                >
                  We weren&#39;t sure — can you help us?
                </p>
                <p
                  className="mb-3 text-[10px]"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Select the closest match below, or retype more details.
                </p>
                {[result.college, ...result.alternatives]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((c) => (
                    <button
                      key={c!.id}
                      onClick={() => {
                        setResult((prev) =>
                          prev
                            ? {
                                ...prev,
                                college: {
                                  ...c!,
                                  university: null,
                                  naac_grade: null,
                                },
                                confidence: 90,
                              }
                            : prev
                        )
                      }}
                      className="mb-2 w-full rounded-lg px-3 py-2.5 text-left transition-all"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '0.5px solid var(--border-medium)',
                      }}
                    >
                      <p className="text-xs font-medium text-white">
                        {c!.name}
                      </p>
                      <p className="text-[10px] text-white/35">
                        {c!.city}, {c!.state}
                      </p>
                    </button>
                  ))}

                {/* Phase 2 — Community add button */}
                <button
                  onClick={handleAutoAdd}
                  disabled={autoAdding}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgba(99,102,241,0.12)',
                    border: '0.5px solid rgba(99,102,241,0.3)',
                    color: '#A5B4FC',
                    opacity: autoAdding ? 0.6 : 1,
                  }}
                >
                  {autoAdding ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border border-indigo-400/30 border-t-indigo-400" />
                      Adding to database…
                    </>
                  ) : (
                    "🌍 My college isn't listed — add it"
                  )}
                </button>

                <button
                  onClick={handleCorrect}
                  className="mt-2 text-[11px]"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Retype with more details →
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Confirmed state ────────────────────────────────────────────────── */}
        {confirmed && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs" style={{ color: '#4ADE80' }}>
              ✓ Saved: {result.parsed.degree} · Year {result.parsed.year}
            </span>
            {communityAdded && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  background: 'rgba(99,102,241,0.2)',
                  color: '#A5B4FC',
                  border: '0.5px solid rgba(99,102,241,0.3)',
                }}
              >
                🌍 Added to EdUsaathiAI DB
              </span>
            )}
            <button
              onClick={handleCorrect}
              className="text-[10px] underline"
              style={{ color: 'var(--text-ghost)' }}
            >
              edit
            </button>
          </motion.div>
        )}

        {/* ── Saathi mismatch nudge ────────────────────────────────────────── */}
        {showSaathiNudge && result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-xl p-3.5"
            style={{
              background: 'rgba(79,70,229,0.1)',
              border: '0.5px solid rgba(79,70,229,0.25)',
            }}
          >
            <p className="mb-2 text-xs text-white/70">
              💡 Based on your course,{' '}
              <span className="font-semibold text-white capitalize">
                {result.saathi_suggestion}
              </span>{' '}
              might be a better match for you.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onSaathiSwitch?.(result.saathi_suggestion!)}
                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  background: 'rgba(79,70,229,0.25)',
                  border: '0.5px solid rgba(79,70,229,0.4)',
                  color: '#818CF8',
                }}
              >
                Switch to {result.saathi_suggestion}
              </button>
              <button
                onClick={() =>
                  setResult((prev) =>
                    prev ? { ...prev, saathi_suggestion: null } : prev
                  )
                }
                className="flex-1 rounded-lg py-1.5 text-[11px] transition-all"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--bg-elevated)',
                  color: 'var(--text-tertiary)',
                }}
              >
                Keep current
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
