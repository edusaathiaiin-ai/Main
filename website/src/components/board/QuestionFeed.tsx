'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { resolveVerticalId } from '@/lib/resolveVertical'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useThemeStore } from '@/stores/themeStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import { getPlanTier } from '@/constants/plans'
import { QuestionCard } from './QuestionCard'
import { PostQuestionModal } from './PostQuestionModal'
import { FilterBar } from './FilterBar'
import { BoardSidebar } from './BoardSidebar'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import type { BoardQuestion, Saathi, QuotaState } from '@/types'

// ── Skeleton loader ────────────────────────────────────────────────────────────

function QuestionSkeleton() {
  return (
    <div
      className="mb-3 animate-pulse rounded-2xl p-5"
      style={{
        background: '#0A1929',
        border: '0.5px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-white/8" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-28 rounded-full bg-white/8" />
          <div className="h-2 w-16 rounded-full bg-white/5" />
        </div>
      </div>
      <div className="mb-3 space-y-1.5">
        <div className="h-3 w-full rounded-full bg-white/8" />
        <div className="h-3 w-3/4 rounded-full bg-white/5" />
      </div>
      <div className="h-2.5 w-16 rounded-full bg-white/5" />
    </div>
  )
}

type Filter = 'all' | 'unanswered' | 'mine' | 'faculty_verified'

type QWithMeta = BoardQuestion & {
  authorName?: string
  authorRole?: string
  aiAnswer?: string | null
  facultyVerified?: boolean
}

type BoardQuota = {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  resets_at: string
}

const PAGE_SIZE = 20
const DEFAULT_QUOTA: QuotaState = {
  limit: 5,
  used: 0,
  remaining: 5,
  coolingUntil: null,
  isCooling: false,
}

export function QuestionFeed() {
  const { profile } = useAuthStore()
  const { activeSaathiId } = useChatStore()
  const { mode } = useThemeStore()
  const searchParams = useSearchParams()

  const saathiSlug =
    toSlug(activeSaathiId) ??
    toSlug(profile?.primary_saathi_id) ??
    SAATHIS[0].id
  const activeSaathi: Saathi =
    SAATHIS.find((s) => s.id === saathiSlug) ?? SAATHIS[0]
  const isLegalTheme = activeSaathi.theme === 'legal' && mode === 'light'

  const [verticalUuid, setVerticalUuid] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QWithMeta[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [newBanner, setNewBanner] = useState<string | null>(null)
  const [boardNudgeDismissed, setBoardNudgeDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!sessionStorage.getItem('board_nudge_dismissed')
  )
  const [boardQuota, setBoardQuota] = useState<BoardQuota | null>(null)
  const [quotaBannerDismissed, setQuotaBannerDismissed] = useState(false)
  const [showQuotaTooltip, setShowQuotaTooltip] = useState(false)
  const newQuestionRef = useRef<HTMLDivElement>(null)

  const canPost = !profile?.is_geo_limited

  // Board access gates — computed from live profile data
  const hoursSince = profile?.registered_at
    ? (Date.now() - new Date(profile.registered_at).getTime()) / 3600000
    : Infinity
  const postBlockReason: 'under24h' | 'profile_incomplete' | null = canPost
    ? hoursSince < 24
      ? 'under24h'
      : (profile?.profile_completeness_pct ?? 0) < 60
        ? 'profile_incomplete'
        : null
    : null
  const canActuallyPost = canPost && postBlockReason === null
  const accessOpensAt = profile?.registered_at
    ? new Date(new Date(profile.registered_at).getTime() + 86400000)
    : null
  const profileGaps: string[] = []
  if (!profile?.institution_name) profileGaps.push('institution')
  if (!profile?.academic_level) profileGaps.push('academic level')
  if (!profile?.degree_programme) profileGaps.push('programme')
  if (!(profile?.current_subjects?.length)) profileGaps.push('subjects')

  // Resolve slug → UUID
  useEffect(() => {
    if (!profile) return
    resolveVerticalId(saathiSlug).then(setVerticalUuid)
  }, [saathiSlug, profile])

  // Board post quota — fetched server-side via RPC (enforced at DB level too)
  async function fetchBoardQuota() {
    if (!profile) return
    try {
      const res = await fetch('/api/board/quota')
      if (!res.ok) return
      const data = await res.json()
      setBoardQuota(data)
    } catch {
      // Non-fatal — quota UI degrades gracefully
    }
  }

  useEffect(() => {
    if (profile) fetchBoardQuota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // Fetch questions
  async function fetchQuestions(
    newFilter: Filter,
    newPage: number,
    append = false
  ) {
    if (!profile || !verticalUuid) return
    if (newPage === 0) setLoading(true)
    else setLoadingMore(true)

    const supabase = createClient()
    let query = supabase
      .from('board_questions')
      .select('*, profiles!board_questions_user_id_fkey(full_name)', {
        count: 'exact',
      })
      .eq('vertical_id', verticalUuid)
      .in('status', ['open', 'answered'])
      .order('created_at', { ascending: false })
      .range(newPage * PAGE_SIZE, (newPage + 1) * PAGE_SIZE - 1)

    if (newFilter === 'unanswered') query = query.is('ai_answer', null)
    if (newFilter === 'mine') query = query.eq('user_id', profile.id)
    if (newFilter === 'faculty_verified')
      query = query.eq('faculty_verified', true)

    const { data, count } = await query
    setTotalCount(count ?? 0)

    const withMeta: QWithMeta[] = (data ?? []).map((q) => ({
      ...q,
      authorName: q.is_anonymous
        ? undefined
        : ((
            (q as Record<string, unknown>).profiles as {
              full_name: string | null
            } | null
          )?.full_name ?? 'Student'),
      aiAnswer: (q as Record<string, unknown>).ai_answer as string | null,
      facultyVerified: (q as Record<string, unknown>)
        .faculty_verified as boolean,
    }))

    if (append) setQuestions((prev) => [...prev, ...withMeta])
    else setQuestions(withMeta)

    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (profile && verticalUuid) {
      setPage(0)
      fetchQuestions(filter, 0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, verticalUuid, filter])

  // Highlight question from ?question=UUID param
  useEffect(() => {
    const questionId = searchParams.get('question')
    if (!questionId || loading) return

    setTimeout(() => {
      const el = document.getElementById(`question-${questionId}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'border-color 0.3s, background 0.3s'
      el.style.borderColor = activeSaathi.primary
      el.style.background = `${activeSaathi.primary}12`
      setTimeout(() => {
        el.style.borderColor = ''
        el.style.background = ''
      }, 3000)
    }, 500)
  }, [searchParams, loading, activeSaathi.primary])

  // Realtime subscription
  useEffect(() => {
    if (!profile || !verticalUuid) return
    const supabase = createClient()
    const channel = supabase
      .channel('board-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_questions',
          filter: `vertical_id=eq.${verticalUuid}`,
        },
        (payload) => {
          const newQ = payload.new as QWithMeta
          if (newQ.user_id === profile.id) return // skip own
          setQuestions((prev) => [newQ, ...prev])
          setNewBanner(newQ.id)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, verticalUuid])

  function handlePosted(newId: string) {
    setPage(0)
    fetchQuestions(filter, 0, false)
    fetchBoardQuota()
    setNewBanner(newId)
    setTimeout(() => setNewBanner(null), 5000)
  }

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchQuestions(filter, nextPage, true)
  }

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setPage(0)
  }

  const hasMore = questions.length < totalCount

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: isLegalTheme ? '#FFFFFF' : '#060F1D' }}
    >
      {/* App Sidebar */}
      <Sidebar
        profile={profile!}
        activeSaathi={activeSaathi}
        quota={DEFAULT_QUOTA}
        isLegalTheme={isLegalTheme}
        onSignOut={async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
        }}
      />

      {/* Main */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
        {/* New question banner */}
        <AnimatePresence>
          {newBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex cursor-pointer items-center justify-center py-2 text-sm"
              style={{
                background: `${activeSaathi.primary}22`,
                borderBottom: `0.5px solid ${activeSaathi.primary}44`,
              }}
              onClick={() => {
                setNewBanner(null)
                newQuestionRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <span style={{ color: activeSaathi.primary }}>
                ↑ New question posted — click to view
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto flex w-full max-w-6xl gap-6 px-6 py-6">
          {/* Feed column */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1
                  className="font-playfair mb-1 text-2xl font-bold"
                  style={{ color: isLegalTheme ? '#1A1A1A' : '#ffffff' }}
                >
                  {activeSaathi.name} Community
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isLegalTheme ? '#888888' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {totalCount > 0 ? `${totalCount} questions` : 'Ask anything'}
                </p>
              </div>

              {/* Mobile ask button — Place C */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => {
                    if (!canActuallyPost) return
                    if (boardQuota && !boardQuota.allowed) {
                      setShowQuotaTooltip(true)
                      setTimeout(() => setShowQuotaTooltip(false), 3000)
                      return
                    }
                    setModalOpen(true)
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold transition-all"
                  style={{
                    background:
                      !canActuallyPost || (boardQuota && !boardQuota.allowed)
                        ? 'rgba(201,153,58,0.25)'
                        : '#C9993A',
                    color:
                      !canActuallyPost || (boardQuota && !boardQuota.allowed)
                        ? '#C9993A'
                        : '#060F1D',
                    opacity:
                      !canActuallyPost || (boardQuota && !boardQuota.allowed)
                        ? 0.6
                        : 1,
                    cursor:
                      !canActuallyPost || (boardQuota && !boardQuota.allowed)
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {postBlockReason === 'under24h'
                    ? 'Opens soon'
                    : postBlockReason === 'profile_incomplete'
                      ? 'Profile needed'
                      : boardQuota && !boardQuota.allowed
                        ? `${boardQuota.used}/${boardQuota.limit} used`
                        : '+ Ask'}
                </button>

                <AnimatePresence>
                  {showQuotaTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: '#0B1F3A',
                        border: '0.5px solid rgba(201,153,58,0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.7)',
                        whiteSpace: 'nowrap',
                        zIndex: 50,
                      }}
                    >
                      Limit reached ·{' '}
                      <Link
                        href="/pricing"
                        style={{ color: '#C9993A', fontWeight: '700' }}
                      >
                        Upgrade →
                      </Link>{' '}
                      or wait till midnight
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Place A — quota banner */}
            {boardQuota &&
              !boardQuota.allowed &&
              !quotaBannerDismissed &&
              canPost && (
                <div
                  style={{
                    margin: '0 0 16px',
                    padding: '16px',
                    background: 'rgba(201,153,58,0.06)',
                    border: '0.5px solid rgba(201,153,58,0.25)',
                    borderRadius: '14px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#C9993A',
                      margin: '0 0 4px',
                    }}
                  >
                    You&apos;ve asked {boardQuota.used} questions today
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.45)',
                      margin: '0 0 14px',
                      lineHeight: 1.5,
                    }}
                  >
                    Free plan allows {boardQuota.limit} questions/day. Upgrade
                    for more — or come back tomorrow.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      href="/pricing"
                      style={{
                        flex: 1,
                        display: 'block',
                        padding: '10px',
                        background: '#C9993A',
                        color: '#0B1F3A',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      Upgrade to Plus →
                    </Link>
                    <button
                      onClick={() => setQuotaBannerDismissed(true)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'transparent',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Maybe later
                    </button>
                  </div>

                  <p
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.2)',
                      textAlign: 'center',
                      margin: '10px 0 0',
                    }}
                  >
                    Resets at midnight IST
                  </p>
                </div>
              )}

            {/* Place A2 — 24h new-account gate */}
            {canPost && postBlockReason === 'under24h' && (
              <div
                style={{
                  margin: '0 0 16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(201,153,58,0.08)',
                  border: '1px solid rgba(201,153,58,0.25)',
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#C9993A',
                    margin: '0 0 4px',
                  }}
                >
                  ✦ Your Board access opens soon
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  To maintain quality, new members can post after 24 hours of
                  joining. You joined {Math.floor(hoursSince)} hour
                  {Math.floor(hoursSince) === 1 ? '' : 's'} ago — access opens
                  at{' '}
                  {accessOpensAt?.toLocaleTimeString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}{' '}
                  IST.
                  <br />
                  Browse and read all questions in the meantime.
                </p>
              </div>
            )}

            {/* Place A3 — profile completeness gate */}
            {canPost && postBlockReason === 'profile_incomplete' && (
              <div
                style={{
                  margin: '0 0 16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#F87171',
                    margin: '0 0 4px',
                  }}
                >
                  Complete your profile to post questions
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 10px',
                    lineHeight: 1.6,
                  }}
                >
                  Your profile is {profile?.profile_completeness_pct ?? 0}%
                  complete. Board posting requires 60% to ensure quality
                  discussions.
                  {profileGaps.length > 0 && (
                    <>
                      {' '}
                      Add your {profileGaps.slice(0, 2).join(' and ')} to reach
                      60%.
                    </>
                  )}
                </p>
                <a
                  href="/profile"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: activeSaathi.primary,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Complete my profile → {profile?.profile_completeness_pct ?? 0}
                  % → 60%
                </a>
              </div>
            )}

            {/* Filter bar */}
            <div className="mb-5">
              <FilterBar
                active={filter}
                onChange={handleFilterChange}
                primaryColor={activeSaathi.primary}
              />
            </div>

            {/* Questions */}
            {loading ? (
              <div>
                {[0, 1, 2, 3].map((i) => (
                  <QuestionSkeleton key={i} />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="mb-4 text-5xl">{activeSaathi.emoji}</span>
                {filter === 'mine' ? (
                  <>
                    <p
                      className="font-playfair mb-4 text-lg"
                      style={{
                        color: isLegalTheme
                          ? '#888888'
                          : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      You haven&apos;t asked any questions yet.
                    </p>
                    {canActuallyPost && (
                      <button
                        onClick={() => setModalOpen(true)}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        style={{ background: '#C9993A', color: '#060F1D' }}
                      >
                        Ask your first question →
                      </button>
                    )}
                  </>
                ) : filter === 'all' ? (
                  <>
                    <p
                      className="font-playfair mb-4 text-lg"
                      style={{
                        color: isLegalTheme
                          ? '#888888'
                          : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Be the first to ask a question in {activeSaathi.name}!
                    </p>
                    {canActuallyPost && (
                      <button
                        onClick={() => setModalOpen(true)}
                        className="rounded-xl px-5 py-2.5 text-sm font-bold"
                        style={{ background: '#C9993A', color: '#060F1D' }}
                      >
                        Ask a Question
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p
                      className="font-playfair mb-2 text-lg"
                      style={{
                        color: isLegalTheme
                          ? '#888888'
                          : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      No questions match this filter
                    </p>
                    <button
                      onClick={() => setFilter('all')}
                      className="text-sm underline underline-offset-2"
                      style={{ color: activeSaathi.primary }}
                    >
                      Show all →
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div ref={newQuestionRef}>
                {questions.map((q, idx) => (
                  <div key={q.id}>
                    <QuestionCard
                      question={q}
                      currentUserId={profile?.id}
                      primaryColor={activeSaathi.primary}
                      isLegalTheme={isLegalTheme}
                    />
                    {/* Upgrade nudge after 3rd question — free plan only */}
                    {idx === 2 &&
                      getPlanTier(profile?.plan_id) === 'free' &&
                      !boardNudgeDismissed && (
                        <div
                          style={{
                            margin: '16px 0',
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: 'rgba(201,153,58,0.06)',
                            border: '0.5px solid rgba(201,153,58,0.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '16px',
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#fff',
                                margin: '0 0 3px',
                              }}
                            >
                              Want to ask your own question?
                            </p>
                            <p
                              style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.4)',
                                margin: 0,
                              }}
                            >
                              Plus members post unlimited questions. Faculty
                              answers yours first.
                            </p>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexShrink: 0,
                            }}
                          >
                            <Link
                              href="/pricing?trigger=board"
                              onClick={() =>
                                sessionStorage.setItem(
                                  'upgrade_return_url',
                                  '/board'
                                )
                              }
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: 'rgba(201,153,58,0.2)',
                                border: '0.5px solid rgba(201,153,58,0.4)',
                                color: '#C9993A',
                                fontSize: '12px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Join Plus →
                            </Link>
                            <button
                              onClick={() => {
                                sessionStorage.setItem(
                                  'board_nudge_dismissed',
                                  '1'
                                )
                                setBoardNudgeDismissed(true)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.25)',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: 0,
                                lineHeight: 1,
                              }}
                              aria-label="Dismiss nudge"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex flex-col items-center gap-2 py-6">
                  <p
                    className="text-xs"
                    style={{
                      color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    Showing {questions.length} of {totalCount} questions
                  </p>
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: isLegalTheme
                          ? '#F5F5F5'
                          : 'rgba(255,255,255,0.05)',
                        border: isLegalTheme
                          ? '0.5px solid #D0D0D0'
                          : '0.5px solid rgba(255,255,255,0.1)',
                        color: isLegalTheme
                          ? '#1A1A1A'
                          : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {loadingMore ? 'Loading...' : 'Load more questions'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <BoardSidebar
            activeSaathi={activeSaathi}
            onAskQuestion={() => {
              if (!canActuallyPost) return
              if (boardQuota && !boardQuota.allowed) return
              setModalOpen(true)
            }}
            canPost={canActuallyPost}
            quotaReached={boardQuota?.allowed === false}
            boardQuota={boardQuota}
          />
        </div>
      </main>

      {/* Mobile nav */}
      <MobileNav />

      {/* Post modal */}
      {profile && verticalUuid && (
        <PostQuestionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          saathiSlug={saathiSlug}
          verticalUuid={verticalUuid}
          saathiName={activeSaathi.name}
          primaryColor={activeSaathi.primary}
          profile={profile}
          onPosted={handlePosted}
          boardQuota={boardQuota}
        />
      )}
    </div>
  )
}
