'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toSlug, toVerticalUuid } from '@/constants/verticalIds'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import CollegeAutocomplete from '@/components/ui/CollegeAutocomplete'
import { validateDisplayName } from '@/lib/validation/nameValidation'
import type { Profile, Saathi } from '@/types'

const EXAM_TARGETS = [
  'UPSC',
  'GATE',
  'NEET',
  'CA',
  'CLAT',
  'NET',
  'JEE',
  'Bar Exam',
  'None',
]
const ACADEMIC_LEVELS = [
  { value: 'diploma', label: '📜 Diploma / Certificate' },
  { value: 'bachelor', label: "🎓 Bachelor's Degree" },
  { value: 'masters', label: "🔬 Master's Degree" },
  { value: 'phd', label: '🏛️ PhD / Doctoral' },
  { value: 'professional', label: '⚕️ Professional Programme' },
  { value: 'competitive', label: '🎯 Competitive Exam Prep' },
  { value: 'professional_learner', label: '💼 Working Professional' },
  { value: 'exploring', label: '🌱 Just Exploring' },
]
const LEARNING_STYLES = [
  { value: 'visual', label: '👁 Visual', desc: 'Diagrams & mind maps' },
  { value: 'practice', label: '✍️ Practice', desc: 'Problems & exercises' },
  { value: 'discussion', label: '💬 Discussion', desc: 'Debate & explain' },
  { value: 'reading', label: '📖 Reading', desc: 'Texts & notes' },
]

interface RawSoul {
  academic_level: string | null
  depth_calibration: number | null
  top_topics: string[] | null
  struggle_topics: string[] | null
  future_research_area: string | null
  career_interest: string | null
  enrolled_subjects: string[] | null
  future_subjects: string[] | null
  session_count: number | null
  flame_stage: string | null
}

const WA_NUMBER = '919XXXXXXXXX' // Replace with actual WhatsApp Business number

interface ProfileTabProps {
  profile: Profile
  soul: RawSoul | null
  onSaved: () => void
}

export default function ProfileTab({
  profile,
  soul,
  onSaved,
}: ProfileTabProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [institution, setInstitution] = useState(profile.institution_name ?? '')
  const [academicLevel, setAcademicLevel] = useState(
    soul?.academic_level ?? 'bachelor'
  )
  const [examTarget, setExamTarget] = useState(profile.exam_target ?? '')
  const [learningStyle, setLearningStyle] = useState<string>('')
  const [researchArea, setResearchArea] = useState(
    soul?.future_research_area ?? ''
  )
  const [careerInterest, setCareerInterest] = useState(
    soul?.career_interest ?? ''
  )
  const [enrolledChips, setEnrolledChips] = useState<string[]>(
    soul?.enrolled_subjects ?? []
  )
  const [futureChips, setFutureChips] = useState<string[]>(
    soul?.future_subjects ?? []
  )
  const [newChip, setNewChip] = useState('')
  const [waPhone, setWaPhone] = useState(profile.wa_phone ?? '')
  const [waSaving, setWaSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Saathi change flow
  const currentSaathi: Saathi | null =
    SAATHIS.find((s) => s.id === toSlug(profile.primary_saathi_id)) ?? null
  const [showSaathiChange, setShowSaathiChange] = useState(false)
  const [newSaathi, setNewSaathi] = useState<Saathi | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [saathiChanging, setSaathiChanging] = useState(false)

  // Gate: Saathi change is a paid-only feature.
  // Free users cannot change — they must subscribe first or create a new account.
  // Paid users can change only after their current subscription expires.
  const isFreeUser = !profile.plan_id || profile.plan_id === 'free'
  const hasActiveSubscription =
    !isFreeUser &&
    profile.subscription_status === 'active' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date()

  async function handleSaathiChange() {
    if (!newSaathi || confirmText !== 'CHANGE' || !profile.id) return
    setSaathiChanging(true)
    const supabase = createClient()

    // 1. Delete old soul data for this user × old Saathi
    if (profile.primary_saathi_id) {
      await supabase
        .from('student_soul')
        .delete()
        .eq('user_id', profile.id)
        .eq('vertical_id', profile.primary_saathi_id)

      // Delete old chat sessions + messages
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', profile.id)
        .eq('vertical_id', profile.primary_saathi_id)
    }

    // 2. Update profile with new Saathi + reset to free plan
    // newSaathi.id is a slug — convert to UUID for FK columns
    const newVerticalUuid = toVerticalUuid(newSaathi.id) ?? newSaathi.id
    await supabase
      .from('profiles')
      .update({
        primary_saathi_id: newVerticalUuid,
        wa_saathi_id: newVerticalUuid,
        plan_id: 'free',
        subscription_status: 'cancelled',
      })
      .eq('id', profile.id)

    // 3. Create fresh soul row for new Saathi
    await supabase.from('student_soul').upsert(
      {
        user_id: profile.id,
        vertical_id: newVerticalUuid,
        display_name: profile.full_name ?? 'Student',
        academic_level: soul?.academic_level ?? 'bachelor',
        depth_calibration: 38,
        flame_stage: 'spark',
        career_discovery_stage: 'exploring',
        session_count: 0,
        top_topics: [],
        struggle_topics: [],
        preferred_tone: 'neutral',
        peer_mode: false,
        exam_mode: false,
      },
      { onConflict: 'user_id,vertical_id' }
    )

    // 4. Refresh app state
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()
    if (updatedProfile) {
      useAuthStore.getState().setProfile(updatedProfile as Profile)
    }
    // Reset chat store so it picks up new Saathi
    useChatStore.getState().clearMessages()
    useChatStore.setState({ activeSaathiId: null })

    setSaathiChanging(false)
    setShowSaathiChange(false)
    setNewSaathi(null)
    setConfirmText('')
    setToast(`✓ You are now with ${newSaathi.name}. A new journey begins.`)
    setTimeout(() => setToast(null), 6000)
    onSaved()
  }

  // Profile completeness meter
  const completeness = useMemo(() => {
    let score = 0
    if (fullName.trim()) score += 15
    if (city.trim()) score += 10
    if (institution.trim()) score += 10
    if (academicLevel) score += 10
    if (examTarget) score += 10
    if (researchArea.trim()) score += 15
    if (careerInterest.trim()) score += 15
    if (enrolledChips.length > 0) score += 10
    if (futureChips.length > 0) score += 5
    return Math.min(100, score)
  }, [
    fullName,
    city,
    institution,
    academicLevel,
    examTarget,
    researchArea,
    careerInterest,
    enrolledChips,
    futureChips,
  ])

  function addChip(list: string[], setList: (v: string[]) => void, max = 5) {
    const val = newChip.trim()
    if (!val || list.includes(val) || list.length >= max) return
    setList([...list, val])
    setNewChip('')
  }

  const [nameTouched, setNameTouched] = useState(false)

  const nameTyped = fullName.trim().length > 0
  const { valid: nameValid, error: nameError } = nameTyped
    ? validateDisplayName(fullName)
    : { valid: false, error: null }

  const showNameError = nameTouched && nameTyped && !nameValid
  const showNameValid = nameTouched && nameValid
  const nameFieldBorderColor = showNameError
    ? 'rgba(239,68,68,0.6)'
    : showNameValid
      ? 'rgba(74,222,128,0.5)'
      : 'rgba(255,255,255,0.1)'

  async function handleSave() {
    if (!profile) return
    if (nameTyped && !nameValid) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim().slice(0, 100) || null,
          city: city.trim().slice(0, 100) || null,
          institution_name: institution.trim().slice(0, 200) || null,
          exam_target: examTarget || null,
        })
        .eq('id', profile.id)

      if (profile.primary_saathi_id) {
        await supabase.from('student_soul').upsert(
          {
            user_id: profile.id,
            vertical_id: profile.primary_saathi_id,
            display_name: fullName.trim() || null,
            academic_level: academicLevel,
            future_research_area: researchArea.trim().slice(0, 500) || null,
            career_interest: careerInterest.trim().slice(0, 300) || null,
            enrolled_subjects: enrolledChips,
            future_subjects: futureChips,
            profile_update_acknowledged: false,
          },
          { onConflict: 'user_id,vertical_id' }
        )
      }

      setToast(
        '✓ Profile updated. Your Saathi will acknowledge this in your next session.'
      )
      setTimeout(() => setToast(null), 5000)
      onSaved()
    } catch {
      setToast('⚠️ Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontFamily: 'var(--font-dm-sans)',
  }

  const labelStyle = { color: 'rgba(255,255,255,0.45)' }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.25)',
            color: '#4ADE80',
          }}
        >
          {toast}
        </motion.div>
      )}

      {/* ── Identity ────────────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair mb-4 text-lg font-bold text-white">
          Identity
        </h3>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
            style={{
              background: 'rgba(201,153,58,0.2)',
              color: '#C9993A',
              border: '2px solid rgba(201,153,58,0.4)',
            }}
          >
            {(fullName || profile.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">
              {fullName || 'Your name'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {profile.email}
            </p>
            <div className="mt-1.5 flex gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}
              >
                {profile.plan_id?.toUpperCase() ?? 'FREE'}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Member since{' '}
                {new Date(profile.created_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full name — validated */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={labelStyle}>
              Full name
            </label>
            <div className="relative">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="Your full name"
                className="w-full rounded-xl px-4 py-3 pr-9 text-sm transition-all outline-none"
                style={{ ...inputStyle, borderColor: nameFieldBorderColor }}
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
              <p className="mt-1 text-xs" style={{ color: '#F87171' }}>{nameError}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold" style={labelStyle}>
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Your city"
              className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={labelStyle}
            >
              Email (read only)
            </label>
            <input
              value={profile.email}
              readOnly
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold"
              style={labelStyle}
            >
              Institution
            </label>
            <CollegeAutocomplete
              value={institution}
              onChange={setInstitution}
              placeholder="Start typing your college name…"
              className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
              inputStyle={inputStyle}
            />
          </div>
        </div>
      </section>

      {/* ── WhatsApp Connect ───────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair mb-4 text-lg font-bold text-white">
          WhatsApp Saathi
        </h3>
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(37,211,102,0.06)',
            border: '1px solid rgba(37,211,102,0.2)',
          }}
        >
          {profile.wa_phone ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">&#x2705;</span>
              <div>
                <p className="text-sm font-semibold text-white">
                  Connected: {profile.wa_phone}
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Message your Saathi anytime on WhatsApp
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Connect WhatsApp
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Study without opening the app &mdash; just message your
                    Saathi
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={waPhone}
                  onChange={(e) =>
                    setWaPhone(
                      e.target.value.replace(/[^+\d]/g, '').slice(0, 15)
                    )
                  }
                  placeholder="+919825123456"
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                />
                <button
                  disabled={waSaving || !waPhone.match(/^\+\d{10,14}$/)}
                  onClick={async () => {
                    setWaSaving(true)
                    const supabase = createClient()
                    const { error } = await supabase
                      .from('profiles')
                      .update({ wa_phone: waPhone, wa_state: 'active' })
                      .eq('id', profile.id)
                    setWaSaving(false)
                    if (error) {
                      setToast(
                        error.message.includes('unique')
                          ? '⚠️ This number is already linked to another account.'
                          : '⚠️ Failed to save. Try again.'
                      )
                    } else {
                      setToast(
                        '✓ WhatsApp connected! Send "Hi" to your Saathi to get started.'
                      )
                    }
                    setTimeout(() => setToast(null), 5000)
                  }}
                  className="rounded-xl px-5 py-3 text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: '#25D366', color: '#fff' }}
                >
                  {waSaving ? '...' : 'Connect'}
                </button>
              </div>
              <p
                className="mt-2 text-[10px]"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Or save this number and send &quot;Hi&quot;:{' '}
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#25D366', textDecoration: 'underline' }}
                >
                  +{WA_NUMBER}
                </a>
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Your Saathi (locked) ──────────────────────────────────── */}
      {currentSaathi && (
        <section>
          <h3 className="font-playfair mb-4 text-lg font-bold text-white">
            Your Saathi
          </h3>
          <div
            className="rounded-xl p-5"
            style={{
              background: `${currentSaathi.primary}12`,
              border: `1px solid ${currentSaathi.primary}33`,
            }}
          >
            <div className="mb-3 flex items-center gap-4">
              <span className="text-4xl">{currentSaathi.emoji}</span>
              <div>
                <p className="text-base font-bold text-white">
                  {currentSaathi.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {currentSaathi.tagline}
                </p>
                <p
                  className="mt-1 text-[10px] font-semibold"
                  style={{ color: currentSaathi.primary }}
                >
                  {soul?.session_count
                    ? `${soul.session_count} sessions together`
                    : 'Soul matching in progress'}
                  {soul?.flame_stage && soul.flame_stage !== 'spark'
                    ? ` \u2022 ${soul.flame_stage}`
                    : ''}
                </p>
              </div>
            </div>

            {!showSaathiChange ? (
              <button
                onClick={() => setShowSaathiChange(true)}
                className="mt-1 text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'rgba(244,63,94,0.6)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')
                }
              >
                Changed your academic journey? Request Saathi change...
              </button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Gate: free users cannot change */}
                  {isFreeUser ? (
                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        color: '#A5B4FC',
                      }}
                    >
                      <p className="mb-1 font-semibold">
                        Saathi change is a paid feature
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        Free accounts are locked to their chosen Saathi. To
                        change your Saathi, upgrade to a paid plan first.
                      </p>
                      <p
                        className="mt-2 text-xs"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Alternatively, you can create a new account with a
                        different email and phone number to start fresh with a
                        different Saathi.
                      </p>
                      <div className="mt-3 flex gap-3">
                        <a
                          href="/pricing?trigger=saathi_change"
                          className="rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                          style={{
                            background: '#C9993A',
                            color: '#060F1D',
                            textDecoration: 'none',
                          }}
                        >
                          View plans
                        </a>
                        <button
                          onClick={() => setShowSaathiChange(false)}
                          className="text-xs underline"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : hasActiveSubscription ? (
                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        color: '#FBBF24',
                      }}
                    >
                      <p className="mb-1 font-semibold">
                        Active subscription detected
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        You can change your Saathi after your current
                        subscription expires on{' '}
                        <strong style={{ color: '#FBBF24' }}>
                          {new Date(
                            profile.subscription_expires_at!
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                        . Your remaining subscription days will not transfer to
                        a new Saathi.
                      </p>
                      <button
                        onClick={() => setShowSaathiChange(false)}
                        className="mt-3 text-xs underline"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Warning */}
                      <div
                        className="mb-4 rounded-xl p-4"
                        style={{
                          background: 'rgba(244,63,94,0.06)',
                          border: '1px solid rgba(244,63,94,0.2)',
                        }}
                      >
                        <p
                          className="mb-2 text-sm font-semibold"
                          style={{ color: '#F43F5E' }}
                        >
                          This action is irreversible
                        </p>
                        <ul
                          className="space-y-1 text-xs"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          <li>
                            All soul matching data with {currentSaathi.name}{' '}
                            will be permanently deleted
                          </li>
                          <li>
                            All chat history and session memory will be erased
                          </li>
                          <li>
                            Your struggle topics, depth calibration, and flame
                            progress will reset to zero
                          </li>
                          <li>
                            Any remaining subscription days will be forfeited
                          </li>
                        </ul>
                      </div>

                      {/* New Saathi picker */}
                      <p
                        className="mb-2 text-xs font-semibold"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Choose your new Saathi:
                      </p>
                      <div className="mb-4 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                        {SAATHIS.filter((s) => s.id !== currentSaathi.id).map(
                          (s) => {
                            const selected = newSaathi?.id === s.id
                            return (
                              <button
                                key={s.id}
                                onClick={() => setNewSaathi(s)}
                                className="rounded-lg p-2 text-left transition-all"
                                style={{
                                  background: selected
                                    ? `${s.primary}25`
                                    : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${selected ? s.primary : 'rgba(255,255,255,0.06)'}`,
                                }}
                              >
                                <span className="block text-lg">{s.emoji}</span>
                                <p className="mt-0.5 truncate text-[10px] font-bold text-white">
                                  {s.name}
                                </p>
                              </button>
                            )
                          }
                        )}
                      </div>

                      {/* Confirmation */}
                      {newSaathi && (
                        <div className="space-y-3">
                          <p
                            className="text-xs"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            Type{' '}
                            <strong style={{ color: '#F43F5E' }}>CHANGE</strong>{' '}
                            to confirm switching from{' '}
                            <strong style={{ color: currentSaathi.primary }}>
                              {currentSaathi.name}
                            </strong>{' '}
                            to{' '}
                            <strong style={{ color: newSaathi.primary }}>
                              {newSaathi.name}
                            </strong>
                            :
                          </p>
                          <input
                            value={confirmText}
                            onChange={(e) =>
                              setConfirmText(e.target.value.toUpperCase())
                            }
                            placeholder="Type CHANGE"
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: `1px solid ${confirmText === 'CHANGE' ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              color: '#fff',
                            }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaathiChange}
                              disabled={
                                confirmText !== 'CHANGE' || saathiChanging
                              }
                              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-30"
                              style={{ background: '#F43F5E', color: '#fff' }}
                            >
                              {saathiChanging
                                ? 'Resetting soul...'
                                : `Switch to ${newSaathi.name}`}
                            </button>
                            <button
                              onClick={() => {
                                setShowSaathiChange(false)
                                setNewSaathi(null)
                                setConfirmText('')
                              }}
                              className="rounded-xl px-4 text-sm"
                              style={{
                                color: 'rgba(255,255,255,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>
      )}

      {/* ── My Saathis ──────────────────────────────────────────── */}
      {profile.role === 'student' && (
        <section id="my-saathis">
          <h3 className="font-playfair mb-1 text-lg font-bold text-white">
            My Saathis
          </h3>
          <p className="mb-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Add up to 2 extra Saathis to your learning journey.
          </p>

          {/* Primary Saathi — always shown */}
          {currentSaathi && (
            <div
              className="mb-3 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: `${currentSaathi.primary}14`,
                border: `0.5px solid ${currentSaathi.primary}35`,
              }}
            >
              <span className="text-2xl">{currentSaathi.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {currentSaathi.name}
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Primary Saathi
                </p>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}
              >
                Active
              </span>
            </div>
          )}

          {/* Add Extra Saathi CTA */}
          <a
            href="/profile?tab=profile#my-saathis"
            onClick={(e) => {
              e.preventDefault()
              // Navigate to SaathiUnlockModal via points bar or pricing
              window.location.href = '/pricing?trigger=addon_saathi'
            }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(201,153,58,0.1), rgba(201,153,58,0.03))',
              border: '0.5px solid rgba(201,153,58,0.3)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
                background: 'rgba(201,153,58,0.15)',
                border: '0.5px solid rgba(201,153,58,0.3)',
              }}
            >
              ✦
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#C9993A' }}>
                Add Extra Saathi
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                ₹99/month per add-on · or 500 SP earned free
              </p>
            </div>
            <span style={{ color: 'rgba(201,153,58,0.5)', fontSize: '14px' }}>→</span>
          </a>

          <p className="mt-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Extra Saathis share your soul profile. Each learns who you are over time.
            You can have up to 3 Saathis active simultaneously.
          </p>
        </section>
      )}

      {/* ── Academic Journey ─────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair mb-4 text-lg font-bold text-white">
          Academic Journey
        </h3>
        <div className="mb-4">
          <label
            className="mb-2 block text-xs font-semibold"
            style={labelStyle}
          >
            Academic level
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACADEMIC_LEVELS.map((lvl) => {
              const active = academicLevel === lvl.value
              return (
                <button
                  key={lvl.value}
                  onClick={() => setAcademicLevel(lvl.value)}
                  className="rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all"
                  style={{
                    background: active
                      ? 'rgba(201,153,58,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#E5B86A' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {lvl.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Learning Preferences ─────────────────────────────────── */}
      <section>
        <h3 className="font-playfair mb-4 text-lg font-bold text-white">
          Learning Preferences
        </h3>

        <div className="mb-4">
          <label
            className="mb-2 block text-xs font-semibold"
            style={labelStyle}
          >
            Learning style
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEARNING_STYLES.map((s) => {
              const active = learningStyle === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => setLearningStyle(active ? '' : s.value)}
                  className="rounded-xl px-3 py-3 text-center transition-all"
                  style={{
                    background: active
                      ? 'rgba(201,153,58,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="mb-1 text-xl">{s.label.split(' ')[0]}</div>
                  <div
                    className="text-xs font-semibold"
                    style={{
                      color: active ? '#E5B86A' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {s.label.split(' ').slice(1).join(' ')}
                  </div>
                  <div
                    className="mt-0.5 text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {s.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label
            className="mb-2 block text-xs font-semibold"
            style={labelStyle}
          >
            Exam target
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAM_TARGETS.map((exam) => {
              const active = examTarget === exam
              return (
                <button
                  key={exam}
                  onClick={() => setExamTarget(active ? '' : exam)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: active
                      ? 'rgba(201,153,58,0.2)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#C9993A' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {exam}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Interests ───────────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair mb-4 text-lg font-bold text-white">
          Interests
        </h3>

        {/* Current subjects chips */}
        {[
          {
            label: 'Current subjects (max 5)',
            list: enrolledChips,
            setList: setEnrolledChips,
          },
          {
            label: 'Interest areas (max 5)',
            list: futureChips,
            setList: setFutureChips,
          },
        ].map(({ label, list, setList }) => (
          <div key={label} className="mb-4">
            <label
              className="mb-2 block text-xs font-semibold"
              style={labelStyle}
            >
              {label}
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {list.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setList(list.filter((c) => c !== chip))}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: 'rgba(201,153,58,0.15)',
                    border: '1px solid rgba(201,153,58,0.35)',
                    color: '#C9993A',
                  }}
                >
                  {chip} <span style={{ opacity: 0.6 }}>×</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newChip}
                onChange={(e) => setNewChip(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addChip(list, setList)
                  }
                }}
                placeholder="Add topic → Enter"
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                style={inputStyle}
              />
              <button
                onClick={() => addChip(list, setList)}
                className="rounded-xl px-3 py-2 text-xs font-bold"
                style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div>
          <label
            className="mb-1.5 block text-xs font-semibold"
            style={labelStyle}
          >
            Future research area
          </label>
          <textarea
            value={researchArea}
            onChange={(e) => setResearchArea(e.target.value.slice(0, 500))}
            placeholder="What research area excites you most?"
            rows={3}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="mt-4">
          <label
            className="mb-1.5 block text-xs font-semibold"
            style={labelStyle}
          >
            Career interest / direction
          </label>
          <textarea
            value={careerInterest}
            onChange={(e) => setCareerInterest(e.target.value.slice(0, 300))}
            placeholder="Industry, academia, research, entrepreneurship..."
            rows={2}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </section>

      {/* ── Completeness meter ──────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(201,153,58,0.05)',
          border: '1px solid rgba(201,153,58,0.15)',
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p
            className="text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Your Saathi knows{' '}
            <span style={{ color: '#C9993A' }}>{completeness}%</span> of your
            journey
          </p>
          <p className="text-xs font-bold" style={{ color: '#C9993A' }}>
            {completeness}/100
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9993A, #E5B86A)' }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-6">
        <button
          onClick={handleSave}
          disabled={saving || (nameTyped && !nameValid)}
          className="w-full rounded-xl py-4 text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: '#C9993A', color: '#060F1D' }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>

        <button
          onClick={() => {
            if (profile?.id) {
              localStorage.removeItem(`edusaathiai_tour_v1_${profile.id}`)
              window.location.reload()
            }
          }}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span>🎯</span>
          <span>Replay platform walkthrough</span>
        </button>

        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          type="button"
          className="w-full rounded-xl py-4 text-sm font-bold transition-all hover:bg-rose-500/10 active:bg-rose-500/20"
          style={{ color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
