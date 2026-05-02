'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import ProfileTab from '@/components/profile/ProfileTab'
import SoulTab from '@/components/profile/SoulTab'
import DataTab from '@/components/profile/DataTab'
import ArchiveTab from '@/components/profile/ArchiveTab'
import { FacultyProfileTab } from '@/components/faculty/FacultyProfileTab'
import SubscriptionCard from '@/components/profile/SubscriptionCard'
import { EducationInstitutionSection } from '@/components/education-institutions/EducationInstitutionSection'
import type { QuotaState, Saathi } from '@/types'

const DEFAULT_QUOTA: QuotaState = {
  limit: 5,
  used: 0,
  remaining: 5,
  coolingUntil: null,
  isCooling: false,
}

type Tab = 'profile' | 'soul' | 'data' | 'archive'

interface RawSoul {
  academic_level: string | null
  depth_calibration: number | null
  peer_mode: boolean | null
  exam_mode: boolean | null
  flame_stage: string | null
  ambition_level: string | null
  preferred_tone: string | null
  top_topics: string[] | null
  struggle_topics: string[] | null
  last_session_summary: string | null
  session_count: number | null
  future_research_area: string | null
  career_interest: string | null
  career_discovery_stage: string | null
  shell_broken: boolean | null
  shell_broken_at: string | null
  display_name: string | null
  enrolled_subjects: string[] | null
  future_subjects: string[] | null
}

export function ProfileClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuthStore()
  const { activeSaathiId } = useChatStore()

  const resolvedSlug =
    toSlug(activeSaathiId) ??
    toSlug(profile?.primary_saathi_id) ??
    null
  const resolvedSaathi: Saathi | null = resolvedSlug
    ? SAATHIS.find((s) => s.id === resolvedSlug) ?? null
    : null

  const urlTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<Tab>(
    urlTab === 'archive' || urlTab === 'soul' || urlTab === 'data' ? urlTab : 'profile'
  )
  const [soul, setSoul] = useState<RawSoul | null>(null)
  const [soulLoading, setSoulLoading] = useState(true)

  const fetchSoul = useCallback(async () => {
    if (!profile?.id || !profile.primary_saathi_id) {
      setSoulLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('student_soul')
      .select(
        'academic_level, depth_calibration, peer_mode, exam_mode, flame_stage, ambition_level, preferred_tone, top_topics, struggle_topics, last_session_summary, session_count, future_research_area, career_interest, career_discovery_stage, shell_broken, shell_broken_at, display_name, enrolled_subjects, future_subjects'
      )
      .eq('user_id', profile.id)
      .eq('vertical_id', profile.primary_saathi_id)
      .maybeSingle()
    setSoul(data as RawSoul | null)
    setSoulLoading(false)
  }, [profile])

  useEffect(() => {
    function run() {
      void fetchSoul()
    }
    run()
  }, [fetchSoul])

  if (!profile) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--saathi-primary)' }}
        />
      </div>
    )
  }

  if (!resolvedSaathi) {
    return (
      <div
        className="flex h-screen items-center justify-center px-6 text-center"
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <div>
          <p className="mb-3 text-sm">
            We couldn&apos;t resolve your Saathi for the profile view.
          </p>
          <a href="/onboard" style={{ color: 'var(--gold)' }}>
            Pick your Saathi →
          </a>
        </div>
      </div>
    )
  }

  // Past the early returns: TypeScript narrows resolvedSaathi to non-null.
  const saathiId: string = resolvedSlug ?? ''
  const activeSaathi: Saathi = resolvedSaathi
  const color = activeSaathi.primary

  // "My Soul" reads student_soul (academic_level, future_research_area,
  // career_interest) — all student framing. Hide for faculty so they
  // don't see a tab that represents them as a learner being studied.
  const isFaculty = profile.role === 'faculty'
  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'My Profile' },
    ...(isFaculty ? [] : [{ id: 'soul' as Tab, label: 'My Soul' }]),
    { id: 'data', label: 'My Data' },
    { id: 'archive', label: 'Research Archive' },
  ]

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        quota={DEFAULT_QUOTA}
        onSignOut={async () => {
          const s = createClient()
          await s.auth.signOut()
          useAuthStore.getState().setProfile(null)
          sessionStorage.clear()
          router.push('/login')
        }}
      />

      <main className="h-full min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* ── Page header ─────────────────────────────────────── */}
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{activeSaathi.emoji}</span>
              <div>
                <h1
                  className="font-display text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Your Space
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {activeSaathi.name} · Profile, soul, and data
                </p>
              </div>
            </div>
          </div>

          {/* ── Tab navigation ──────────────────────────────────── */}
          <div
            className="mb-8 flex gap-1 rounded-xl p-1"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-150"
                  style={{
                    color: active ? '#fff' : 'var(--text-tertiary)',
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="profile-tab-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: color }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── Tab content ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && (
                profile.role === 'faculty'
                  ? <FacultyProfileTab />
                  : <ProfileTab
                      profile={profile}
                      soul={soul}
                      onSaved={() => fetchSoul()}
                    />
              )}
              {activeTab === 'soul' && !isFaculty &&
                (soulLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div
                      className="h-6 w-6 animate-spin rounded-full border-2"
                      style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--gold)' }}
                    />
                  </div>
                ) : (
                  <SoulTab
                    soul={soul}
                    onEditProfile={() => setActiveTab('profile')}
                  />
                ))}
              {activeTab === 'data' && (
                <DataTab
                  userId={profile.id}
                  onEditProfile={() => setActiveTab('profile')}
                />
              )}
              {activeTab === 'archive' && (
                <ArchiveTab userId={profile.id} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Institution membership — show above subscription ─── */}
          <div className="mt-10">
            <EducationInstitutionSection variant="profile" />
          </div>

          {/* ── Subscription card — always shown below tabs ─────── */}
          <div className="mt-4">
            <SubscriptionCard profile={profile} />
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
