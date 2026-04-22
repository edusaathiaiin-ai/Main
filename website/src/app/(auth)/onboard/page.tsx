'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { SLUG_TO_UUID, toSlug } from '@/constants/verticalIds'
import { EXAM_REGISTRY } from '@/constants/exams'
import { inferExamDate } from '@/lib/examCountdown'
import { createExamBoardIfMissing } from '@/lib/createExamBoard'
import { ExamPicker, type ExamPickerValue } from '@/components/shared/ExamPicker'
import { useAuthStore } from '@/stores/authStore'
import { trackSaathiSelected } from '@/lib/analytics'
import {
  ACADEMIC_LEVEL_CARDS,
  instantCalibrate,
  type AcademicLevel,
  type AcademicLevelCard,
} from '@/lib/instantSoulCalibration'
import {
  SoulProfileForm,
  type SoulProfileData,
} from '@/components/onboard/SoulProfileForm'
import { computeProfileCompleteness } from '@/lib/profileCompleteness'
import CollegeAutocomplete from '@/components/ui/CollegeAutocomplete'
import { validateFacultyEmail } from '@/lib/faculty-email-validation'
import { validateDisplayName } from '@/lib/validation/nameValidation'
import type { Saathi, Profile } from '@/types'
import { FacultyOnboardFlow } from '@/components/onboard/FacultyOnboardFlow'
import { InstitutionOnboardFlow } from '@/components/onboard/InstitutionOnboardFlow'

// ── Types ─────────────────────────────────────────────────────────────────────

type DbUserRole = 'student' | 'faculty' | 'public' | 'institution'
type OnboardStep = 'loading' | 'role_extra' | 'academic' | 'saathi' | 'exam' | 'profile' | 'name'

type MinProfile = {
  id: string
  role: DbUserRole | null
  primary_saathi_id: string | null
  full_name: string | null
  academic_level: string | null
  is_active: boolean | null
  needs_name_update: boolean | null
}

type ProfileForm = {
  fullName: string
  city: string
  institution: string
  examTarget: string
  futureResearch: string
  // Level-specific
  previousDegree: string
  thesisArea: string
  prepDuration: string
  currentYear: number | null
  totalYears: number | null
  // Faculty-specific
  facultySubject: string
  facultyYears: string
  // Institution-specific
  orgName: string
  orgType: string
  orgContactEmail: string
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

const PREP_DURATIONS = [
  'Just started',
  '3–6 months',
  '6–12 months',
  '1–2 years',
  '2+ years',
]

// All 24 Saathis are now live
const LIVE_SAATHIS = { has: (_id: string) => true }

// ── Animation presets ─────────────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const

const stepVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { x: -60, opacity: 0, transition: { duration: 0.2 } },
}

const cardItem = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0, transition: { duration: 0.28 } },
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: OnboardStep }) {
  const steps: Exclude<OnboardStep, 'loading'>[] = [
    'academic',
    'saathi',
    'exam',
    'profile',
  ]
  const labels = ['Academic Level', 'Your Saathi', 'Your Exam', 'Your Profile']
  const currentIdx = steps.indexOf(step as Exclude<OnboardStep, 'loading'>)
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                animate={{
                  background: done
                    ? '#C9993A'
                    : active
                      ? 'rgba(201,153,58,0.2)'
                      : 'rgba(255,255,255,0.06)',
                  borderColor:
                    done || active ? '#C9993A' : 'rgba(255,255,255,0.12)',
                  color: done
                    ? '#060F1D'
                    : active
                      ? '#C9993A'
                      : 'rgba(255,255,255,0.25)',
                }}
                style={{ border: '1.5px solid' }}
                transition={spring}
              >
                {done ? '✓' : i + 1}
              </motion.div>
              <span
                className="hidden text-[9px] sm:block"
                style={{ color: active ? '#C9993A' : 'rgba(255,255,255,0.25)' }}
              >
                {labels[i]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                className="mb-3 h-px w-8"
                animate={{
                  background: done ? '#C9993A' : 'rgba(255,255,255,0.1)',
                }}
                transition={spring}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm transition-colors duration-150"
      style={{ color: 'rgba(255,255,255,0.35)' }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')
      }
    >
      ← Back
    </button>
  )
}

function InputField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-medium"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: '#C9993A' }}>
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  color: '#fff',
} as const

// ── Step 0: Academic Level ────────────────────────────────────────────────────

function AcademicLevelStep({
  onContinue,
  saving,
}: {
  onContinue: (
    level: AcademicLevel,
    yearIdx: number | null,
    examTarget: string | null
  ) => Promise<void>
  saving: boolean
}) {
  const [selected, setSelected] = useState<AcademicLevelCard | null>(null)
  const [yearIdx, setYearIdx] = useState<number | null>(null)
  const [examTarget, setExamTarget] = useState<string | null>(null)

  const canProceed =
    !!selected &&
    (selected.yearOptions.length === 0 ||
      yearIdx !== null ||
      examTarget !== null)

  function handleCardClick(card: AcademicLevelCard) {
    setSelected(card)
    setYearIdx(null)
    setExamTarget(null)
  }

  async function handleContinue() {
    if (!selected) return
    const resolvedYear = selected.id === 'competitive' ? null : yearIdx
    const resolvedExam = selected.id === 'competitive' ? examTarget : null
    await onContinue(selected.id, resolvedYear, resolvedExam)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="font-playfair mb-3 text-4xl font-bold text-white md:text-5xl">
          Where are you right now?
        </h1>
        <p className="text-lg text-white/50">
          Your Saathi calibrates instantly to your level
        </p>
      </motion.div>

      {/* 8 Cards */}
      <div className="mb-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACADEMIC_LEVEL_CARDS.map((card, i) => {
          const isSelected = selected?.id === card.id
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
              onClick={() => handleCardClick(card)}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              className="relative rounded-2xl p-4 text-left transition-shadow outline-none"
              style={{
                background: isSelected
                  ? `${card.color}22`
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? card.color : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isSelected ? `0 0 24px ${card.color}33` : undefined,
              }}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: card.color, color: '#fff' }}
                >
                  ✓
                </motion.div>
              )}
              <span className="mb-2 block text-3xl">{card.emoji}</span>
              <p className="mb-0.5 text-sm font-semibold text-white">
                {card.title}
              </p>
              <p
                className="mb-1.5 text-[11px]"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                {card.subtitle}
              </p>
              <p
                className="inline-block rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: `${card.color}22`, color: card.color }}
              >
                {card.durationHint}
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* Sub-question — appears inline below cards when card is selected */}
      <AnimatePresence mode="wait">
        {selected && selected.yearOptions.length > 0 && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 w-full overflow-hidden"
          >
            <div
              className="rounded-2xl p-5"
              style={{
                background: `${selected.color}12`,
                border: `1px solid ${selected.color}33`,
              }}
            >
              <p className="mb-3 text-sm font-semibold text-white">
                {selected.yearQuestion}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.yearOptions.map((opt, i) => {
                  const isYearActive =
                    selected.id === 'competitive'
                      ? examTarget === opt
                      : yearIdx === i
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (selected.id === 'competitive') {
                          setExamTarget(opt)
                          setYearIdx(null)
                        } else {
                          setYearIdx(i)
                          setExamTarget(null)
                        }
                      }}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-150"
                      style={{
                        background: isYearActive
                          ? selected.color
                          : 'rgba(255,255,255,0.06)',
                        border: `0.5px solid ${isYearActive ? selected.color : 'rgba(255,255,255,0.12)'}`,
                        color: isYearActive ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        animate={{
          opacity: canProceed ? 1 : 0.4,
          background:
            canProceed && selected ? selected.color : 'rgba(255,255,255,0.1)',
        }}
        onClick={handleContinue}
        disabled={!canProceed || saving}
        className="w-full max-w-xs rounded-xl py-4 text-base font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Calibrating…
          </span>
        ) : canProceed ? (
          `Continue as ${selected?.title} →`
        ) : (
          'Select your level to continue'
        )}
      </motion.button>
    </div>
  )
}

// ── Step 1: Saathi Picker ─────────────────────────────────────────────────────

function SaathiStep({
  onContinue,
  onBack,
  saving,
}: {
  onContinue: (saathiId: string) => Promise<void>
  onBack: () => void
  saving: boolean
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Saathi | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return SAATHIS
    const q = search.toLowerCase()
    return SAATHIS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="flex w-full flex-col items-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <p
          className="mb-4 text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Choose your companion
        </p>
        <h2 className="font-playfair mb-3 text-3xl font-bold text-white md:text-4xl leading-snug">
          Your Saathi is not here to teach you.
        </h2>
        <h2
          className="font-playfair mb-5 text-3xl font-bold md:text-4xl leading-snug"
          style={{ color: '#C9993A', fontStyle: 'italic' }}
        >
          Your Saathi is here to show you who you&apos;re becoming.
        </h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Choose the subject you are studying. One student. One soul. One
          Saathi.
        </p>
      </motion.div>

      <div className="mb-6 w-full max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subjects…"
          className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
          style={inputStyle}
          onFocus={(e) =>
            (e.currentTarget.style.outline = '1.5px solid #C9993A')
          }
          onBlur={(e) => (e.currentTarget.style.outline = 'none')}
        />
      </div>

      <div className="mb-8 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((saathi) => {
          const isSelected = selected?.id === saathi.id
          const isLive = LIVE_SAATHIS.has(saathi.id)
          return (
            <motion.button
              key={saathi.id}
              variants={cardItem}
              onClick={() => setSelected(saathi)}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              className="relative rounded-xl p-4 text-left outline-none"
              style={{
                background: isSelected
                  ? `${saathi.primary}33`
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? '#C9993A' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isSelected
                  ? '0 0 20px rgba(201,153,58,0.2)'
                  : undefined,
              }}
            >
              <div className="absolute top-2 right-2">
                {isSelected ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: '#C9993A', color: '#060F1D' }}
                  >
                    ✓
                  </motion.div>
                ) : isLive ? (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      border: '0.5px solid rgba(34,197,94,0.4)',
                      color: '#4ADE80',
                    }}
                  >
                    LIVE ✓
                  </span>
                ) : null}
              </div>
              <span className="mb-2 block text-[40px] leading-none">
                {saathi.emoji}
              </span>
              <p className="mb-0.5 text-xs leading-tight font-bold text-white">
                {saathi.name}
              </p>
              <p
                className="line-clamp-2 text-[10px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                {saathi.tagline}
              </p>
            </motion.button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.button
          animate={{
            opacity: selected ? 1 : 0.4,
            background: selected?.primary ?? 'rgba(255,255,255,0.1)',
          }}
          onClick={() => selected && onContinue(selected.id)}
          disabled={!selected || saving}
          className="w-full max-w-xs rounded-xl py-4 text-base font-semibold text-white disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </span>
          ) : selected ? (
            `Begin with ${selected.name} →`
          ) : (
            'Choose a Saathi to continue'
          )}
        </motion.button>
        {selected && (
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              maxWidth: '320px',
              lineHeight: '1.5',
            }}
          >
            Your Saathi will be locked to{' '}
            <strong style={{ color: '#C9993A' }}>{selected.name}</strong>. To
            change later, you&apos;ll need a full profile and soul reset.
          </p>
        )}
        <BackButton onClick={onBack} />
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.25)',
              margin: 0,
            }}
          >
            Can&apos;t find your subject?{' '}
            <a
              href="mailto:support@edusaathiai.in?subject=New Saathi Suggestion"
              style={{
                color: 'rgba(201,153,58,0.7)',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Write to us
            </a>{' '}
            and we&apos;ll add it and notify you.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Exam Step — optional, after Saathi selection, before full profile ─────────

function ExamStep({
  saathiSlug,
  value,
  onChange,
  onContinue,
  onSkip,
  onBack,
  saving,
}: {
  saathiSlug: string | null
  value: ExamPickerValue
  onChange: (v: ExamPickerValue) => void
  onContinue: () => void
  onSkip: () => void
  onBack: () => void
  saving: boolean
}) {
  const hasSelection =
    value.examId !== null || value.examName.trim().length > 0

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1
          className="font-playfair mb-2 text-2xl font-bold text-white sm:text-3xl"
          style={{ lineHeight: 1.25 }}
        >
          Are you preparing for a specific exam?
        </h1>
        <p
          className="mb-8 text-sm"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          Optional — pick if it applies, otherwise skip. You can always add this
          later from your profile.
        </p>

        <ExamPicker
          saathiSlug={saathiSlug ?? undefined}
          value={value}
          onChange={onChange}
          theme="dark"
        />

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="rounded-xl px-5 py-3 text-sm font-medium transition-colors"
            style={{
              color: 'rgba(255,255,255,0.5)',
              background: 'transparent',
              border: '0.5px solid rgba(255,255,255,0.12)',
            }}
          >
            ← Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSkip}
              disabled={saving}
              className="rounded-xl px-5 py-3 text-sm font-medium transition-colors"
              style={{
                color: 'rgba(255,255,255,0.5)',
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.12)',
              }}
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={saving || !hasSelection}
              className="rounded-xl px-6 py-3 text-sm font-semibold transition-all"
              style={{
                background: hasSelection ? '#C9993A' : 'rgba(201,153,58,0.2)',
                color: hasSelection ? '#060F1D' : 'rgba(201,153,58,0.5)',
                cursor: hasSelection ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Name Fix Step — shown to users with needs_name_update = true ──────────────
// This step is NOT part of the normal onboarding sequence.
// It appears when (app)/layout.tsx detects needs_name_update on an active profile.

function NameStep({
  onSave,
  saving,
}: {
  onSave: (name: string) => Promise<void>
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateDisplayName(name)
    if (!result.valid) {
      setError(result.error)
      return
    }
    setError(null)
    void onSave(name.trim())
  }

  return (
    <div
      className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-12"
    >
      <div
        className="w-full rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(201,153,58,0.2)',
        }}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9993A' }}>
          One moment
        </p>
        <h2 className="mb-2 font-playfair text-2xl font-bold text-white">
          What should your Saathi call you?
        </h2>
        <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Your Saathi greets you by name every session. Enter the name you'd like to hear.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              placeholder="Your name"
              autoFocus
              maxLength={40}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(201,153,58,0.25)'}`,
              }}
            />
            {error && (
              <p className="mt-1.5 text-xs" style={{ color: '#F87171' }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || name.trim().length < 2}
            className="rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#C9993A', color: '#060F1D' }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Step 2: Profile Form (level-adaptive) ─────────────────────────────────────

export function ProfileStep({
  academicLevel,
  examTargetFromLevel,
  onContinue,
  onSkip,
  onBack,
  saving,
}: {
  academicLevel: AcademicLevel
  examTargetFromLevel: string | null
  onContinue: (form: ProfileForm) => Promise<void>
  onSkip: () => void
  onBack: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<ProfileForm>({
    fullName: '',
    city: '',
    institution: '',
    examTarget: examTargetFromLevel ?? '',
    futureResearch: '',
    previousDegree: '',
    thesisArea: '',
    prepDuration: '',
    currentYear: null,
    totalYears: null,
    facultySubject: '',
    facultyYears: '',
    orgName: '',
    orgType: '',
    orgContactEmail: '',
  })

  const set = (key: keyof ProfileForm) => (val: string | number | null) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const [nameTouched, setNameTouched] = useState(false)

  const nameTyped = form.fullName.trim().length > 0
  const { valid: nameValid, error: nameError } = nameTyped
    ? validateDisplayName(form.fullName)
    : { valid: false, error: null }

  // Only show feedback after the user has blurred the field
  const showNameError  = nameTouched && nameTyped && !nameValid
  const showNameValid  = nameTouched && nameValid
  const nameFieldBorderColor = showNameError
    ? 'rgba(239,68,68,0.6)'
    : showNameValid
      ? 'rgba(74,222,128,0.5)'
      : 'rgba(255,255,255,0.1)'

  const canSubmit = nameValid && form.city !== ''

  const isPhD = academicLevel === 'phd' || academicLevel === 'postdoc'
  const isMasters = academicLevel === 'masters'
  const isCompetitive = academicLevel === 'competitive'
  const isProfessional = academicLevel === 'professional_learner'

  const levelLabel: Record<AcademicLevel, string> = {
    diploma: 'Diploma / Certificate',
    bachelor: "Bachelor's",
    masters: "Master's",
    phd: 'PhD / Doctorate',
    professional: 'Professional Programme',
    postdoc: 'Postdoc',
    competitive: 'Exam Prep',
    professional_learner: 'Working Professional',
    exploring: 'Explorer',
  }

  return (
    <div className="flex w-full flex-col items-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 w-full max-w-xl"
      >
        {/* Level badge */}
        <div className="mb-4">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{
              background: 'rgba(201,153,58,0.15)',
              border: '0.5px solid rgba(201,153,58,0.3)',
              color: '#C9993A',
            }}
          >
            {levelLabel[academicLevel]} · Soul calibrated ✓
          </span>
        </div>
        <h2 className="font-playfair mb-2 text-3xl font-bold text-white md:text-4xl">
          Tell your Saathi about you
        </h2>
        <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          The more you share, the more personal your Saathi becomes.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.12 } }}
        className="w-full max-w-xl space-y-4"
      >
        {/* Full name */}
        <InputField label="Full name" required>
          <div className="relative">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set('fullName')(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Your name as your Saathi will call you"
              className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white transition-all outline-none"
              style={{
                ...inputStyle,
                borderColor: nameFieldBorderColor,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = showNameError
                  ? 'rgba(239,68,68,0.8)'
                  : showNameValid
                    ? 'rgba(74,222,128,0.7)'
                    : 'rgba(201,153,58,0.6)')
              }
            />
            {showNameValid && (
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: '#4ADE80' }}
              >
                ✓
              </span>
            )}
          </div>
          {showNameError && (
            <p className="mt-1.5 text-xs" style={{ color: '#FCA5A5' }}>
              {nameError}
            </p>
          )}
        </InputField>

        {/* City */}
        <InputField label="City" required>
          <select
            value={form.city}
            onChange={(e) => set('city')(e.target.value)}
            className="w-full appearance-none rounded-xl px-4 py-3 text-sm transition-all outline-none"
            style={{
              ...inputStyle,
              color: form.city ? '#fff' : 'rgba(255,255,255,0.35)',
            }}
          >
            <option value="" disabled style={{ background: 'var(--bg-surface)' }}>
              Select your city
            </option>
            {CITIES.map((c) => (
              <option
                key={c}
                value={c}
                style={{ background: 'var(--bg-surface)', color: '#fff' }}
              >
                {c}
              </option>
            ))}
          </select>
        </InputField>

        {/* Institution */}
        <InputField
          label={isPhD ? 'Institution & Department' : 'Institution / College'}
        >
          <CollegeAutocomplete
            value={form.institution}
            onChange={set('institution')}
            placeholder={
              isPhD
                ? 'e.g. IIT Bombay, Dept. of Electrical Engineering'
                : 'Start typing your college name…'
            }
            className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
            inputStyle={inputStyle}
          />
        </InputField>

        {/* ── Level-adaptive fields ── */}

        {/* Masters: previous degree + specialisation */}
        {isMasters && (
          <>
            <InputField label="What did you complete before this?">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. B.Tech Mech from NIT Surat"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
            <InputField label="Your specialisation / thesis area">
              <input
                type="text"
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="e.g. Thermal Engineering / Heat Transfer"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
          </>
        )}

        {/* PhD: thesis topic (required) + previous degree */}
        {isPhD && (
          <>
            <InputField label="Your thesis topic / research area" required>
              <textarea
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="What is your research question? Even a rough statement is fine."
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
            <InputField label="Your previous degree">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. M.Tech from IIT Delhi"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
          </>
        )}

        {/* Competitive: exam target (pre-filled) + prep duration + optional subject */}
        {isCompetitive && (
          <>
            <InputField label="Target exam">
              <input
                type="text"
                value={form.examTarget}
                onChange={(e) => set('examTarget')(e.target.value)}
                placeholder="UPSC / GATE / NEET / CA…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
            <InputField label="How long have you been preparing?">
              <div className="mt-0.5 flex flex-wrap gap-2">
                {PREP_DURATIONS.map((d) => {
                  const isActive = form.prepDuration === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set('prepDuration')(isActive ? '' : d)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-150"
                      style={{
                        background: isActive
                          ? '#C9993A'
                          : 'rgba(255,255,255,0.05)',
                        border: `0.5px solid ${isActive ? '#C9993A' : 'rgba(255,255,255,0.1)'}`,
                        color: isActive ? '#060F1D' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </InputField>
          </>
        )}

        {/* Working professional: role + upskilling area */}
        {isProfessional && (
          <>
            <InputField label="Your current role / industry">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. Software Engineer at Infosys"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
            <InputField label="What are you upskilling in?">
              <input
                type="text"
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="e.g. Machine Learning, Corporate Law, Finance"
                className="w-full rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </InputField>
          </>
        )}

        {/* Future research (for bachelor/diploma) or "What brings you here?" (exploring) */}
        {!isPhD && !isMasters && !isCompetitive && !isProfessional && (
          <InputField
            label={
              academicLevel === 'exploring'
                ? 'What are you curious about?'
                : 'Future research / career dream'
            }
          >
            <textarea
              value={form.futureResearch}
              onChange={(e) => set('futureResearch')(e.target.value)}
              placeholder={
                academicLevel === 'exploring'
                  ? 'Tell us what brings you here today'
                  : 'What excites you most, even if it feels far away?'
              }
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
              style={inputStyle}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
              }
            />
          </InputField>
        )}

        {/* Submit */}
        <motion.button
          animate={{ opacity: canSubmit ? 1 : 0.45 }}
          onClick={() => canSubmit && onContinue(form)}
          disabled={!canSubmit || saving}
          className="mt-2 w-full rounded-xl py-4 text-base font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
          style={{ background: '#C9993A', color: '#060F1D' }}
          onMouseEnter={(e) => {
            if (canSubmit && !saving)
              e.currentTarget.style.background = '#E5B86A'
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D]" />
              Setting up your Saathi…
            </span>
          ) : (
            'Begin Your Journey →'
          )}
        </motion.button>

        <div className="flex items-center justify-between">
          <BackButton onClick={onBack} />
          <button
            onClick={onSkip}
            className="text-xs underline underline-offset-2 transition-colors duration-150"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')
            }
          >
            Skip for now — I&apos;ll complete this later
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Onboard Page ─────────────────────────────────────────────────────────

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'var(--bg-base)' }}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
            style={{ borderTopColor: '#C9993A' }}
          />
        </main>
      }
    >
      <OnboardInner />
    </Suspense>
  )
}

function OnboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setProfile } = useAuthStore()
  const [step, setStep] = useState<OnboardStep>('loading')
  const [profile, setLocalProfile] = useState<MinProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [urlRole, setUrlRole] = useState<DbUserRole | null>(null)
  // Academic level state (carried through all steps)
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('bachelor')
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const [totalYears, setTotalYears] = useState<number | null>(null)
  const [examTargetFromLevel, setExamTargetFromLevel] = useState<string | null>(
    null
  )
  const [examPickerValue, setExamPickerValue] = useState<ExamPickerValue>({
    examId: null,
    examName: '',
  })

  // Faculty-specific state
  const [facultyDesignation, setFacultyDesignation] = useState('')
  const [facultyDepartment, setFacultyDepartment] = useState('')
  const [facultyInstitution, setFacultyInstitution] = useState('')
  const [facultyYrsExp, setFacultyYrsExp] = useState('')
  const [facultyQualification, setFacultyQualification] = useState('')
  const [facultyLinkedin, setFacultyLinkedin] = useState('')
  const [facultyScholar, setFacultyScholar] = useState('')
  const [facultyResearch, setFacultyResearch] = useState('')
  const [facultyThesis, setFacultyThesis] = useState('')
  const [facultySpecialities, setFacultySpecialities] = useState<string[]>([])
  const [facultyEmailError, setFacultyEmailError] = useState('')
  const [facultyEmployment, setFacultyEmployment] = useState<
    'active' | 'retired' | 'independent'
  >('active')
  const [facultyRetirementYear, setFacultyRetirementYear] = useState('')
  const [facultyFormerInstitution, setFacultyFormerInstitution] = useState('')
  const [facultyIndependentCredential, setFacultyIndependentCredential] =
    useState('')
  const [facultyIndependentLinkedin, setFacultyIndependentLinkedin] =
    useState('')
  const [facultyEmailValidation, setFacultyEmailValidation] = useState<
    import('@/lib/faculty-email-validation').EmailValidationResult | null
  >(null)

  // Institution-specific state
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [orgContactPerson, setOrgContactPerson] = useState('')
  const [orgContactEmail, setOrgContactEmail] = useState('')
  const [orgCity, setOrgCity] = useState('')
  const [orgDescription, setOrgDescription] = useState('')

  // ── Mount — runs ONCE only ────────────────────────────────────────────────
  const initRef = useRef(false)
  useEffect(() => {
    // Strict-mode / double-mount guard — ensures loadProfile runs exactly once
    if (initRef.current) return
    initRef.current = true

    // Read searchParams synchronously before async work (avoids stale closure)
    const roleParam = searchParams.get('role') as DbUserRole | null
    function applyRole() {
      if (roleParam) setUrlRole(roleParam)
    }
    applyRole()

    let cancelled = false

    async function loadProfile() {
      const supabase = createClient()

      // ── Auth check — use getUser() for server-verified identity after OAuth ──
      // getSession() can return stale/null immediately after Google redirect;
      // getUser() re-validates the JWT with Supabase server.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        router.replace('/login')
        return
      }

      // ── Small initial delay — lets the session cookie propagate to the client
      // before the first profile fetch, especially after Google OAuth redirects.
      await new Promise((r) => setTimeout(r, 1000))
      if (cancelled) return

      // ── Fetch profile with max 4 retries (2 s gap) — never infinite ─────────
      let data: {
        id: string
        role: DbUserRole | null
        primary_saathi_id: string | null
        full_name: string | null
        academic_level: string | null
      } | null = null

      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled) return
        // maybeSingle() returns null (not error) when row is missing
        const { data: row, error } = await supabase
          .from('profiles')
          .select('id, role, primary_saathi_id, full_name, academic_level, is_active, needs_name_update')
          .eq('id', user.id)
          .maybeSingle()

        if (!error && row) {
          data = row as unknown as MinProfile
          break
        }

        if (attempt < 3) {
          // Wait 2 s before next attempt
          await new Promise((r) => setTimeout(r, 2000))
        }
      }

      if (cancelled) return

      if (!data) {
        // Profile still missing after 3 attempts — session is broken, back to login
        router.replace('/login?error=profile_missing')
        return
      }

      const p = data as MinProfile
      setLocalProfile(p)

      // Name-fix flow: ?step=name redirected here by (app)/layout.tsx
      // Skip all routing logic and show the name collection step directly.
      if (searchParams.get('step') === 'name' || p.needs_name_update) {
        setStep('name')
        return
      }

      // Faculty and institution skip the academic level step
      const effectiveRole = roleParam ?? p.role
      const skipAcademic =
        effectiveRole === 'faculty' || effectiveRole === 'institution'

      // Resume at the right step
      // If user already completed onboarding (is_active + full_name), route by role
      if (p.full_name && p.is_active) {
        if (effectiveRole === 'faculty') router.replace('/faculty')
        else if (effectiveRole === 'institution') router.replace('/institution')
        else router.replace('/chat')
      } else if (!p.primary_saathi_id) {
        setStep(
          skipAcademic ? 'saathi' : p.academic_level ? 'saathi' : 'academic'
        )
      } else if (!p.full_name) {
        setStep('profile')
      } else {
        if (effectiveRole === 'faculty') router.replace('/faculty')
        else if (effectiveRole === 'institution') router.replace('/institution')
        else router.replace('/chat')
      }
    }

    loadProfile().catch(() => {
      if (!cancelled) router.replace('/login?error=profile_missing')
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ← EMPTY — runs exactly once on mount only

  // ── Faculty email validation — runs when employment status changes ──────────
  useEffect(() => {
    if (urlRole !== 'faculty' || !profile) return
    let cancelled = false
    async function checkEmail() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email || cancelled) return
      const result = await validateFacultyEmail(
        user.email,
        facultyEmployment,
        supabase
      )
      if (!cancelled) setFacultyEmailValidation(result)
    }
    void checkEmail()
    return () => {
      cancelled = true
    }
  }, [urlRole, facultyEmployment, profile])

  // ── Step 0: Academic level ─────────────────────────────────────────────────
  async function handleAcademicLevel(
    level: AcademicLevel,
    yearIdx: number | null,
    examTarget: string | null
  ) {
    setSaving(true)
    const supabase = createClient()

    // Compute year numbers from year index
    const card = ACADEMIC_LEVEL_CARDS.find((c) => c.id === level)!
    const compYearIdx = yearIdx ?? 0
    const compCurrentYear =
      level === 'competitive' || card.yearOptions.length === 0
        ? null
        : compYearIdx + 1
    const compTotalYears =
      card.yearOptions.length > 0 && level !== 'competitive'
        ? card.yearOptions.length
        : null

    // Map level → role (respect URL role override)
    const role: DbUserRole =
      urlRole ?? (card.mapToRole === 'public' ? 'public' : 'student')

    // Save academic_level + role to profiles
    await supabase
      .from('profiles')
      .update({
        academic_level: level,
        role,
        exam_target: examTarget ?? undefined,
      })
      .eq('id', profile!.id)

    setAcademicLevel(level)
    setCurrentYear(compCurrentYear)
    setTotalYears(compTotalYears)
    setExamTargetFromLevel(examTarget)
    setLocalProfile((p) => (p ? { ...p, academic_level: level, role } : p))
    setSaving(false)
    setStep('saathi')
  }

  // ── Step 1: Saathi selection ───────────────────────────────────────────────
  async function handleSaathi(saathiId: string) {
    // saathiId is a slug from the picker. Convert to UUID for DB FK.
    const uuid = SLUG_TO_UUID[saathiId] ?? saathiId
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ primary_saathi_id: uuid })
      .eq('id', profile!.id)
    setLocalProfile((p) => (p ? { ...p, primary_saathi_id: uuid } : p))
    trackSaathiSelected(saathiId, true)
    setSaving(false)
    setStep('exam')
  }

  // ── Step 1b: Exam target (optional) ────────────────────────────────────────
  async function handleExam(value: ExamPickerValue | null) {
    setSaving(true)
    const supabase = createClient()

    if (value === null) {
      // Student skipped — no DB write. Move on.
      setSaving(false)
      setStep('profile')
      return
    }

    const examName = value.examName.trim()
    const exam = value.examId
      ? EXAM_REGISTRY.find((e) => e.id === value.examId)
      : null
    const year = exam
      ? (() => {
          const examDate = new Date(exam.next_date + 'T00:00:00Z')
          return examDate.getTime() < Date.now()
            ? examDate.getUTCFullYear() + 1
            : examDate.getUTCFullYear()
        })()
      : null

    await supabase
      .from('profiles')
      .update({
        exam_target: examName || null,
        exam_target_id: value.examId,
        exam_target_year: year,
        exam_target_date: value.examId ? inferExamDate(value.examId) : null,
      })
      .eq('id', profile!.id)

    if (value.examId && profile?.primary_saathi_id) {
      const saathiSlug = toSlug(profile.primary_saathi_id)
      if (saathiSlug) {
        await createExamBoardIfMissing(supabase, {
          userId:         profile!.id,
          saathiSlug,
          examTargetId:   value.examId,
          examTargetYear: year,
        })
      }
    }

    // Seed the downstream profile form so completeness reflects it.
    setExamTargetFromLevel(examName || null)
    setExamPickerValue(value)
    setSaving(false)
    setStep('profile')
  }

  // ── Step 2: Soul profile form ─────────────────────────────────────────────
  async function handleProfile(data: SoulProfileData) {
    // ── Faculty validation gate — runs BEFORE any DB write ──────────────
    if (urlRole === 'faculty') {
      if (!facultyDesignation) {
        setFacultyEmailError('Please select your designation before continuing')
        return
      }
      if (!facultyDepartment.trim()) {
        setFacultyEmailError('Please enter your department or subject area')
        return
      }
      if (facultyEmployment === 'active' && !facultyInstitution.trim()) {
        setFacultyEmailError('Please enter your institution name')
        return
      }
      if (facultyEmployment === 'retired' && !facultyFormerInstitution.trim()) {
        setFacultyEmailError('Please enter your former institution')
        return
      }
      if (
        facultyEmployment === 'independent' &&
        !facultyIndependentCredential.trim()
      ) {
        setFacultyEmailError('Please describe your credentials')
        return
      }
    }
    setSaving(true)
    const supabase = createClient()
    const userId = profile!.id

    // Run instant soul calibration
    const calibration = instantCalibrate({
      academicLevel,
      currentYear,
      totalYears,
      examTarget: data.examTarget || examTargetFromLevel || null,
      previousDegree: null,
    })

    // Compute completeness
    const pct = computeProfileCompleteness({
      name: data.fullName,
      city: data.city,
      educationParsed: data.educationParsed !== null,
      subjects: data.currentSubjects,
      learningStyle: data.learningStyle,
      dream: data.dream,
      examTarget: data.examTarget,
      interests: data.interestAreas,
    })

    // Update profiles table with all soul fields
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName.trim(),
        city: data.city,
        institution_name:
          (data.educationParsed?.collegeName ??
            data.educationParsed?.institution ??
            data.educationRaw.trim()) ||
          null,
        degree_programme: data.educationParsed?.degree ?? null,
        university_affiliation: data.educationParsed?.university ?? null,
        current_semester: data.educationParsed?.year ?? null,
        academic_level: academicLevel,
        exam_target: data.examTarget || null,
        exam_target_id: data.examTargetId,
        exam_target_year: (() => {
          if (!data.examTargetId) return null
          const exam = EXAM_REGISTRY.find((e) => e.id === data.examTargetId)
          if (!exam) return null
          const examDate = new Date(exam.next_date + 'T00:00:00Z')
          // If the registry's next_date already passed, the student is
          // preparing for the *following* sitting.
          return examDate.getTime() < Date.now()
            ? examDate.getUTCFullYear() + 1
            : examDate.getUTCFullYear()
        })(),
        current_subjects: data.currentSubjects,
        interest_areas: data.interestAreas,
        learning_style: data.learningStyle || null,
        nudge_preference: data.nudgePreference,
        profile_completeness_pct: pct,
        last_profile_updated_at: new Date().toISOString(),
        ...(urlRole === 'faculty' ? { role: 'faculty' } : {}),
        ...(urlRole === 'institution' ? { role: 'institution' } : {}),
        is_active: true,
      })
      .eq('id', userId)

    // Upsert student_soul with all calibrated values
    // primary_saathi_id is a UUID FK → verticals(id) — query by id directly
    let verticalUUID: string | null = null
    if (profile?.primary_saathi_id) {
      const { data: vRow } = await supabase
        .from('verticals')
        .select('id')
        .eq('id', profile.primary_saathi_id)
        .maybeSingle()
      verticalUUID = vRow?.id ?? null
    }
    if (verticalUUID) {
      await supabase.from('student_soul').upsert(
        {
          user_id: userId,
          vertical_id: verticalUUID,
          display_name: data.fullName.trim(),
          academic_level: academicLevel,
          depth_calibration: calibration.depth_calibration,
          peer_mode: calibration.peer_mode,
          exam_mode: calibration.exam_mode,
          ambition_level: calibration.ambition_level,
          flame_stage: calibration.flame_stage,
          career_discovery_stage: calibration.career_discovery_stage,
          prior_knowledge_base: calibration.prior_knowledge_base,
          future_research_area: data.dream.trim() || null,
          preferred_tone: 'neutral',
          enrolled_subjects: data.currentSubjects,
          future_subjects: data.interestAreas,
          top_topics: [],
          struggle_topics: [],
          session_count: 0,
        },
        { onConflict: 'user_id,vertical_id' }
      )
    }
    // Upsert faculty profile (enriched)
    if (urlRole === 'faculty') {
      // Email domain validation via allowed_domains table
      const userEmail = (await supabase.auth.getUser()).data?.user?.email ?? ''
      const validation = await validateFacultyEmail(
        userEmail,
        facultyEmployment,
        supabase
      )
      if (!validation.allowed) {
        setFacultyEmailError(validation.message)
        setSaving(false)
        return
      }
      setFacultyEmailValidation(validation)

      const expertiseTags = [
        ...(facultyDepartment.trim() ? [facultyDepartment.trim()] : []),
        ...facultySpecialities,
      ].slice(0, 8)

      // Auto-verify if domain is in allowed_domains with auto_verify = true
      const autoVerified = validation.status === 'auto_verify'

      await supabase.from('faculty_profiles').upsert(
        {
          user_id: userId,
          institution_name:
            validation.institution_name ??
            (facultyInstitution.trim() || data.fullName.trim()),
          department: facultyDepartment.trim() || 'General',
          designation: facultyDesignation.trim() || null,
          subject_expertise: expertiseTags,
          years_experience: parseInt(facultyYrsExp) || 0,
          highest_qualification: facultyQualification || null,
          linkedin_url:
            facultyLinkedin.trim() || facultyIndependentLinkedin.trim() || null,
          google_scholar_url: facultyScholar.trim() || null,
          current_research: facultyResearch.trim() || null,
          thesis_title: facultyThesis.trim() || null,
          speciality_areas: facultySpecialities,
          employment_status: facultyEmployment,
          retirement_year:
            facultyEmployment === 'retired' && facultyRetirementYear
              ? parseInt(facultyRetirementYear)
              : null,
          former_institution:
            facultyEmployment === 'retired'
              ? facultyFormerInstitution.trim() || null
              : null,
          independent_credential:
            facultyEmployment === 'independent'
              ? facultyIndependentCredential.trim() || null
              : null,
          verification_status: autoVerified ? 'verified' : 'pending',
          badge_type: autoVerified ? 'faculty_verified' : 'pending',
          ...(autoVerified ? { verified_at: new Date().toISOString() } : {}),
        },
        { onConflict: 'user_id' }
      )
    }

    // Upsert institution profile
    if (urlRole === 'institution') {
      const validOrgType = (
        ['university', 'company', 'ngo', 'government', 'other'] as const
      ).includes(orgType.toLowerCase() as 'university')
        ? (orgType.toLowerCase() as
            | 'university'
            | 'company'
            | 'ngo'
            | 'government'
            | 'other')
        : 'other'
      await supabase.from('institution_profiles').upsert(
        {
          user_id: userId,
          org_name: orgName.trim() || data.fullName.trim(),
          org_type: validOrgType,
          website: orgWebsite.trim() || null,
          contact_person: orgContactPerson.trim() || null,
          contact_email: orgContactEmail.trim() || '',
          city: orgCity.trim() || data.city || null,
          description: orgDescription.trim() || null,
          verification_status: 'pending',
        },
        { onConflict: 'user_id' }
      )
    }

    // Log DPDP consent
    await supabase.from('consent_log').insert({
      user_id: userId,
      consent_type: 'dpdp_data_collection',
      consent_version: '1.0',
      accepted: true,
      accepted_at: new Date().toISOString(),
      metadata: { source: 'onboarding', role: urlRole ?? 'student' },
    })

    // Fire welcome email — profile + Saathi are now set, name is known
    // Fire-and-forget: never block navigation
    const { data: { session: welSession } } = await supabase.auth.getSession()
    if (welSession?.access_token) {
      void fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-welcome-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${welSession.access_token}`,
          },
          body: JSON.stringify({}),
        }
      ).catch(() => { /* fire-and-forget */ })
    }

    setProfile({
      ...profile,
      id: userId,
      full_name: data.fullName.trim(),
      city: data.city,
      institution_name:
        (data.educationParsed?.collegeName ??
          data.educationParsed?.institution ??
          data.educationRaw.trim()) ||
        null,
      is_active: true,
    } as unknown as Profile)

    setSaving(false)
    // Route to role-specific dashboard
    router.push(
      urlRole === 'faculty'
        ? '/faculty'
        : urlRole === 'institution'
          ? '/institution'
          : '/chat'
    )
  }

  function goBack() {
    if (step === 'profile') {
      setStep('exam')
    } else if (step === 'exam') {
      setStep('saathi')
    } else if (step === 'saathi') {
      const skipAcademic = urlRole === 'faculty' || urlRole === 'institution'
      if (!skipAcademic) setStep('academic')
      // faculty/institution: saathi is first step, back does nothing
    }
  }

  async function handleNameSave(name: string) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, needs_name_update: false })
      .eq('id', user.id)

    setSaving(false)
    if (error) return // stay on step, user can retry

    // Call auth-register so authStore gets updated profile back
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'register_profile' }),
      })
    }

    router.replace('/chat')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Faculty gets their own dedicated flow — not the student form
  if (urlRole === 'faculty' && step !== 'loading') {
    return (
      <FacultyOnboardFlow
        profile={profile ?? { id: '', role: null }}
        onComplete={() => router.push('/faculty')}
      />
    )
  }

  // Institution gets its own dedicated flow — light theme, institutional
  // tone, single-page form. Never the student Saathi picker / exam picker.
  if (urlRole === 'institution' && step !== 'loading') {
    return (
      <InstitutionOnboardFlow
        profile={profile ?? { id: '', role: null }}
        onComplete={() => router.push('/institution')}
      />
    )
  }

  if (step === 'loading') {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: '#C9993A' }}
        />
      </main>
    )
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 55%, #060F1D 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 800,
          height: 800,
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(201,153,58,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A' }}
        >
          EdUsaathiAI
        </span>
        {step !== 'academic' && step !== 'name' && <StepIndicator step={step} />}
      </div>

      {/* Step content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 'academic' && (
            <motion.div
              key="academic"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <AcademicLevelStep
                onContinue={handleAcademicLevel}
                saving={saving}
              />
            </motion.div>
          )}
          {step === 'saathi' && (
            <motion.div
              key="saathi"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <SaathiStep
                onContinue={handleSaathi}
                onBack={goBack}
                saving={saving}
              />
            </motion.div>
          )}
          {step === 'exam' && (
            <motion.div
              key="exam"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <ExamStep
                saathiSlug={toSlug(profile?.primary_saathi_id) ?? null}
                value={examPickerValue}
                onChange={setExamPickerValue}
                onContinue={() => handleExam(examPickerValue)}
                onSkip={() => handleExam(null)}
                onBack={goBack}
                saving={saving}
              />
            </motion.div>
          )}
          {step === 'name' && (
            <motion.div
              key="name"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <NameStep onSave={handleNameSave} saving={saving} />
            </motion.div>
          )}
          {step === 'profile' && (
            <motion.div
              key="profile"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <SoulProfileForm
                saathiId={toSlug(profile?.primary_saathi_id) ?? null}
                academicLevel={academicLevel}
                examTargetFromLevel={examTargetFromLevel}
                onContinue={handleProfile}
                onSkip={() =>
                  router.push(
                    urlRole === 'faculty'
                      ? '/faculty'
                      : urlRole === 'institution'
                        ? '/institution'
                        : '/chat'
                  )
                }
                onBack={goBack}
                saving={saving}
              />
              {/* Faculty extra fields — rich, conversational */}
              {urlRole === 'faculty' && (
                <div className="mx-auto max-w-xl px-4 pb-8">
                  <div
                    className="mt-4 rounded-2xl p-6"
                    style={{
                      background: 'rgba(22,163,74,0.06)',
                      border: '0.5px solid rgba(22,163,74,0.2)',
                    }}
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <span className="text-2xl">
                        {'\u{1F468}\u200D\u{1F3EB}'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Your Faculty Profile
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          Students see this when they find you on Faculty Finder
                        </p>
                      </div>
                    </div>

                    {/* Email validation status */}
                    {facultyEmailValidation &&
                      !facultyEmailError &&
                      (() => {
                        const v = facultyEmailValidation
                        const cfg =
                          v.status === 'auto_verify'
                            ? {
                                bg: 'rgba(74,222,128,0.08)',
                                border: 'rgba(74,222,128,0.3)',
                                color: '#4ADE80',
                                icon: '✅',
                              }
                            : v.status === 'skipped'
                              ? {
                                  bg: 'rgba(96,165,250,0.08)',
                                  border: 'rgba(96,165,250,0.25)',
                                  color: '#93C5FD',
                                  icon: 'ℹ️',
                                }
                              : v.status === 'blocked'
                                ? {
                                    bg: 'rgba(239,68,68,0.08)',
                                    border: 'rgba(239,68,68,0.25)',
                                    color: '#F87171',
                                    icon: '❌',
                                  }
                                : {
                                    bg: 'rgba(251,146,60,0.08)',
                                    border: 'rgba(251,146,60,0.25)',
                                    color: '#FB923C',
                                    icon: '🟡',
                                  }
                        return (
                          <div
                            className="mb-3 rounded-xl p-3"
                            style={{
                              background: cfg.bg,
                              border: `0.5px solid ${cfg.border}`,
                            }}
                          >
                            <p className="text-xs" style={{ color: cfg.color }}>
                              {cfg.icon} {v.message}
                            </p>
                          </div>
                        )
                      })()}
                    {facultyEmailError && (
                      <div
                        className="mb-4 rounded-xl p-3"
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          border: '0.5px solid rgba(239,68,68,0.25)',
                        }}
                      >
                        <p className="text-xs" style={{ color: '#F87171' }}>
                          ❌ {facultyEmailError}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Employment status */}
                      <div>
                        <label
                          className="mb-1.5 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          I am currently...
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              id: 'active' as const,
                              label: 'Teaching',
                              emoji: '\u{1F4DA}',
                              desc: 'At an institution',
                            },
                            {
                              id: 'retired' as const,
                              label: 'Retired',
                              emoji: '\u{2726}',
                              desc: 'Ready to teach again',
                            },
                            {
                              id: 'independent' as const,
                              label: 'Independent',
                              emoji: '\u{1F310}',
                              desc: 'Freelance / consultant',
                            },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setFacultyEmployment(opt.id)}
                              className="rounded-xl p-3 text-left transition-all"
                              style={{
                                background:
                                  facultyEmployment === opt.id
                                    ? opt.id === 'retired'
                                      ? 'rgba(201,153,58,0.12)'
                                      : 'rgba(22,163,74,0.1)'
                                    : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${facultyEmployment === opt.id ? (opt.id === 'retired' ? 'rgba(201,153,58,0.5)' : 'rgba(22,163,74,0.4)') : 'rgba(255,255,255,0.06)'}`,
                              }}
                            >
                              <span className="mb-0.5 block text-lg">
                                {opt.emoji}
                              </span>
                              <p
                                className="text-xs font-semibold"
                                style={{
                                  color:
                                    facultyEmployment === opt.id
                                      ? opt.id === 'retired'
                                        ? '#C9993A'
                                        : '#4ADE80'
                                      : 'rgba(255,255,255,0.5)',
                                }}
                              >
                                {opt.label}
                              </p>
                              <p
                                className="text-[9px]"
                                style={{ color: 'rgba(255,255,255,0.25)' }}
                              >
                                {opt.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Retired faculty: special fields */}
                      {facultyEmployment === 'retired' && (
                        <div
                          className="rounded-xl p-4"
                          style={{
                            background: 'rgba(201,153,58,0.06)',
                            border: '0.5px solid rgba(201,153,58,0.2)',
                          }}
                        >
                          <p
                            className="mb-3 text-xs font-semibold"
                            style={{ color: '#C9993A' }}
                          >
                            {'\u2726'} Welcome back, Professor.
                          </p>
                          <p
                            className="mb-3 text-[10px]"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Your decades of experience are exactly what students
                            need. No institutional email required.
                          </p>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label
                                  className="mb-1 block text-[9px] font-semibold"
                                  style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                  Former institution *
                                </label>
                                <CollegeAutocomplete
                                  value={facultyFormerInstitution}
                                  onChange={setFacultyFormerInstitution}
                                  placeholder="e.g. Gujarat University"
                                  className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                                  inputStyle={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '0.5px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                  }}
                                />
                              </div>
                              <div>
                                <label
                                  className="mb-1 block text-[9px] font-semibold"
                                  style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                  Retirement year
                                </label>
                                <input
                                  value={facultyRetirementYear}
                                  onChange={(e) =>
                                    setFacultyRetirementYear(e.target.value)
                                  }
                                  placeholder="e.g. 2022"
                                  type="number"
                                  min="1980"
                                  max="2026"
                                  className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                                  style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '0.5px solid rgba(255,255,255,0.1)',
                                  }}
                                />
                              </div>
                            </div>
                            <p
                              className="text-[9px]"
                              style={{ color: 'rgba(255,255,255,0.25)' }}
                            >
                              Upload your verification document (retirement
                              letter, pension slip, or appointment letter) from
                              your faculty dashboard after signup. Admin
                              verifies within 48 hours.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Independent faculty: credential fields */}
                      {facultyEmployment === 'independent' && (
                        <div
                          className="rounded-xl p-4"
                          style={{
                            background: 'rgba(45,212,191,0.05)',
                            border: '0.5px solid rgba(45,212,191,0.2)',
                          }}
                        >
                          <p
                            className="mb-1 text-xs font-semibold"
                            style={{ color: '#2DD4BF' }}
                          >
                            🌐 Independent Professional
                          </p>
                          <p
                            className="mb-3 text-[10px]"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Tell us about your credentials. Our team reviews
                            within 48 hours and issues an Expert Verified badge.
                          </p>
                          <div className="space-y-2">
                            <div>
                              <label
                                className="mb-1 block text-[9px] font-semibold"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                              >
                                Your credentials *
                              </label>
                              <textarea
                                value={facultyIndependentCredential}
                                onChange={(e) =>
                                  setFacultyIndependentCredential(
                                    e.target.value.slice(0, 300)
                                  )
                                }
                                placeholder="e.g. PhD IIT Bombay, 10 years industry at Reliance, SEBI-registered advisor..."
                                rows={3}
                                className="w-full resize-none rounded-lg px-3 py-2 text-xs text-white outline-none"
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '0.5px solid rgba(255,255,255,0.1)',
                                }}
                              />
                              <p
                                className="mt-0.5 text-[9px]"
                                style={{ color: 'rgba(255,255,255,0.2)' }}
                              >
                                {300 - facultyIndependentCredential.length}{' '}
                                chars remaining
                              </p>
                            </div>
                            <div>
                              <label
                                className="mb-1 block text-[9px] font-semibold"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                              >
                                LinkedIn URL (strongly recommended)
                              </label>
                              <input
                                value={facultyIndependentLinkedin}
                                onChange={(e) =>
                                  setFacultyIndependentLinkedin(e.target.value)
                                }
                                placeholder="linkedin.com/in/yourprofile"
                                className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '0.5px solid rgba(255,255,255,0.1)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Row 1: Designation + Qualification */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-semibold"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Designation *
                          </label>
                          <select
                            value={facultyDesignation}
                            onChange={(e) =>
                              setFacultyDesignation(e.target.value)
                            }
                            className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '0.5px solid rgba(255,255,255,0.1)',
                              color: facultyDesignation
                                ? '#fff'
                                : 'rgba(255,255,255,0.35)',
                            }}
                          >
                            <option value="" style={{ background: 'var(--bg-surface)' }}>
                              Select designation
                            </option>
                            {[
                              'Professor',
                              'Associate Professor',
                              'Assistant Professor',
                              'Lecturer',
                              'Senior Lecturer',
                              'Visiting Faculty',
                              'Research Fellow',
                              'Adjunct Faculty',
                            ].map((d) => (
                              <option
                                key={d}
                                value={d}
                                style={{ background: 'var(--bg-surface)', color: '#fff' }}
                              >
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-semibold"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Highest qualification
                          </label>
                          <select
                            value={facultyQualification}
                            onChange={(e) =>
                              setFacultyQualification(e.target.value)
                            }
                            className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '0.5px solid rgba(255,255,255,0.1)',
                              color: facultyQualification
                                ? '#fff'
                                : 'rgba(255,255,255,0.35)',
                            }}
                          >
                            <option value="" style={{ background: 'var(--bg-surface)' }}>
                              Select qualification
                            </option>
                            {[
                              'PhD',
                              'M.Phil',
                              'Masters',
                              'Professional (MD/LLM/MBA/CA)',
                              'Post-Doctoral',
                            ].map((q) => (
                              <option
                                key={q}
                                value={q}
                                style={{ background: 'var(--bg-surface)', color: '#fff' }}
                              >
                                {q}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          Department / Subject area *
                        </label>
                        <input
                          value={facultyDepartment}
                          onChange={(e) => setFacultyDepartment(e.target.value)}
                          placeholder="e.g. Physics, Constitutional Law, Pharmacology"
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      </div>

                      {/* Institution — with CollegeAutocomplete */}
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          Institution *
                        </label>
                        <CollegeAutocomplete
                          value={facultyInstitution}
                          onChange={setFacultyInstitution}
                          placeholder="Start typing your institution name..."
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                          inputStyle={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                          }}
                        />
                      </div>

                      {/* Row: Years + Publications */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-semibold"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Years teaching
                          </label>
                          <input
                            value={facultyYrsExp}
                            onChange={(e) => setFacultyYrsExp(e.target.value)}
                            placeholder="e.g. 12"
                            type="number"
                            min="0"
                            max="50"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '0.5px solid rgba(255,255,255,0.1)',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-1 block text-[10px] font-semibold"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Speciality areas
                          </label>
                          <input
                            placeholder="e.g. Quantum Optics, Fluid Dynamics"
                            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '0.5px solid rgba(255,255,255,0.1)',
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                e.currentTarget.value.trim() &&
                                facultySpecialities.length < 5
                              ) {
                                e.preventDefault()
                                setFacultySpecialities([
                                  ...facultySpecialities,
                                  e.currentTarget.value.trim(),
                                ])
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                          {facultySpecialities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {facultySpecialities.map((s) => (
                                <button
                                  key={s}
                                  onClick={() =>
                                    setFacultySpecialities(
                                      facultySpecialities.filter((x) => x !== s)
                                    )
                                  }
                                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    background: 'rgba(22,163,74,0.15)',
                                    border: '0.5px solid rgba(22,163,74,0.3)',
                                    color: '#4ADE80',
                                  }}
                                >
                                  {s} {'\u00D7'}
                                </button>
                              ))}
                            </div>
                          )}
                          <p
                            className="mt-1 text-[9px]"
                            style={{ color: 'rgba(255,255,255,0.2)' }}
                          >
                            Press Enter to add (max 5)
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div
                        style={{
                          height: '0.5px',
                          background: 'rgba(255,255,255,0.06)',
                          margin: '4px 0',
                        }}
                      />

                      {/* Current research */}
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          What are you currently researching?
                        </label>
                        <textarea
                          value={facultyResearch}
                          onChange={(e) =>
                            setFacultyResearch(e.target.value.slice(0, 500))
                          }
                          placeholder="Your current research focus, ongoing projects, or areas of active investigation..."
                          rows={2}
                          className="w-full resize-none rounded-xl px-4 py-3 text-xs text-white outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                          }}
                        />
                        <p
                          className="mt-0.5 text-[9px]"
                          style={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                          Students looking for research guidance will see this
                        </p>
                      </div>

                      {/* Thesis */}
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          PhD/Masters thesis title (optional)
                        </label>
                        <input
                          value={facultyThesis}
                          onChange={(e) =>
                            setFacultyThesis(e.target.value.slice(0, 300))
                          }
                          placeholder="e.g. Quantum entanglement in topological materials"
                          className="w-full rounded-xl px-4 py-3 text-xs text-white outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      </div>

                      {/* Divider */}
                      <div
                        style={{
                          height: '0.5px',
                          background: 'rgba(255,255,255,0.06)',
                          margin: '4px 0',
                        }}
                      />

                      {/* Academic links */}
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          Academic links (optional but recommended)
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center text-sm opacity-40">
                              in
                            </span>
                            <input
                              value={facultyLinkedin}
                              onChange={(e) =>
                                setFacultyLinkedin(e.target.value)
                              }
                              placeholder="LinkedIn profile URL"
                              className="flex-1 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '0.5px solid rgba(255,255,255,0.1)',
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center text-sm opacity-40">
                              {'\u{1F393}'}
                            </span>
                            <input
                              value={facultyScholar}
                              onChange={(e) =>
                                setFacultyScholar(e.target.value)
                              }
                              placeholder="Google Scholar profile URL"
                              className="flex-1 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '0.5px solid rgba(255,255,255,0.1)',
                              }}
                            />
                          </div>
                        </div>
                        <p
                          className="mt-1 text-[9px]"
                          style={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                          Helps students trust your expertise. Verified badge
                          comes faster with these.
                        </p>
                      </div>
                    </div>

                    <p
                      className="mt-4 text-[10px]"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {'\u{1F512}'} Submitted for admin review. Faculty Verified
                      badge within 48 hours. Institutional email speeds up
                      verification.
                    </p>
                  </div>
                </div>
              )}
              {/* Institution extra fields — fully controlled */}
              {urlRole === 'institution' && (
                <div className="mx-auto max-w-xl px-4 pb-8">
                  <div
                    className="mt-4 rounded-2xl p-5"
                    style={{
                      background: 'rgba(124,58,237,0.08)',
                      border: '0.5px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    <p
                      className="mb-4 text-sm font-semibold"
                      style={{ color: '#A78BFA' }}
                    >
                      🏢 Institution registration
                    </p>
                    <div className="space-y-3">
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Organisation name *"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value)}
                        className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          color: orgType ? '#fff' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        <option value="" style={{ background: 'var(--bg-surface)' }}>
                          Organisation type *
                        </option>
                        {[
                          ['University', 'university'],
                          ['Company', 'company'],
                          ['NGO', 'ngo'],
                          ['Government', 'government'],
                          ['Other', 'other'],
                        ].map(([label, val]) => (
                          <option
                            key={val}
                            value={val}
                            style={{ background: 'var(--bg-surface)', color: '#fff' }}
                          >
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                        placeholder="Website (optional)"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <input
                        value={orgContactPerson}
                        onChange={(e) => setOrgContactPerson(e.target.value)}
                        placeholder="Contact person name"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <input
                        value={orgContactEmail}
                        onChange={(e) => setOrgContactEmail(e.target.value)}
                        placeholder="Primary contact email *"
                        type="email"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <input
                        value={orgCity}
                        onChange={(e) => setOrgCity(e.target.value)}
                        placeholder="City"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <textarea
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        placeholder="Brief description (max 200 chars)"
                        maxLength={200}
                        rows={3}
                        className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    </div>
                    <p
                      className="mt-3 text-xs"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      Flagged for admin verification. Our team will reach out
                      within 24 hours.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
