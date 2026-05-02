'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug, toVerticalUuid } from '@/constants/verticalIds'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { CoolingBanner } from '@/components/chat/CoolingBanner'
import { NewsCard } from './NewsCard'
import { ExamAlertCard } from './ExamAlertCard'
import { AnnouncementCard } from './AnnouncementCard'
import { NewsFilterTabs } from './NewsFilterTabs'
import type { NewsItem, QuotaState, Saathi } from '@/types'
import type { ExamAlert } from './ExamAlertCard'
import type { NewsTab } from './NewsFilterTabs'

// ── Extended news item ────────────────────────────────────────────────────────

type ExtNewsItem = NewsItem & {
  item_type?: string
  category?: string
  tags?: string[]
  isResearchArea?: boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_QUOTA: QuotaState = {
  limit: 5,
  used: 0,
  remaining: 5,
  coolingUntil: null,
  isCooling: false,
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl p-5"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="mb-3 flex justify-between">
        <div className="h-2 w-20 rounded-full bg-black/10" />
        <div className="h-2 w-14 rounded-full bg-black/5" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-3 w-full rounded-full bg-black/10" />
        <div className="h-3 w-4/5 rounded-full bg-black/[0.07]" />
        <div className="h-3 w-3/5 rounded-full bg-black/5" />
      </div>
      <div className="h-2 w-12 rounded-full bg-black/5" />
    </div>
  )
}

// ── Main NewsFeed ─────────────────────────────────────────────────────────────

export function NewsFeed() {
  const { profile } = useAuthStore()
  const { activeSaathiId } = useChatStore()

  // Slug is the lookup key for SAATHIS. Resolve from active store ↦ profile;
  // if neither yields a slug we render a "pick your Saathi" prompt below
  // instead of silently theming as KanoonSaathi (the SAATHIS[0] trap).
  const saathiSlug =
    toSlug(activeSaathiId) ??
    toSlug(profile?.primary_saathi_id) ??
    null
  // verticalUuid is the UUID FK required for all DB queries — never insert slugs into vertical_id
  const verticalUuid =
    profile?.primary_saathi_id ??
    toVerticalUuid(activeSaathiId) ??
    (saathiSlug ? toVerticalUuid(saathiSlug) : null) ??
    ''
  const resolvedSaathi: Saathi | null = saathiSlug
    ? SAATHIS.find((s) => s.id === saathiSlug) ?? null
    : null
  // Hooks below need non-null types for saathiId + activeSaathi. The
  // SAATHIS[0] coalesce here is the type-narrowing dummy ONLY; the
  // !resolvedSaathi early-return below means these defaults never reach
  // runtime — render exits before any hook reads them in the null state.
  const saathiId = saathiSlug ?? ''
  const activeSaathi = (resolvedSaathi ?? SAATHIS[0]) as Saathi

  const [newsItems, setNewsItems] = useState<ExtNewsItem[]>([])
  const [examAlerts, setExamAlerts] = useState<ExamAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<NewsTab>('all')
  const [quota, setQuota] = useState<QuotaState>(DEFAULT_QUOTA)
  const [adminFetching, setAdminFetching] = useState(false)
  const [futureResearchArea, setFutureResearchArea] = useState<string>('')

  const isAdmin = profile?.role === ('admin' as unknown)

  // Fetch quota for cooling banner
  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_sessions')
        .select('message_count, cooling_until')
        .eq('user_id', profile.id)
        .eq('quota_date_ist', new Date().toISOString().slice(0, 10))
        .single()
      if (data) {
        function getPlanLimit(planId: string | null | undefined): number {
          if (!planId || planId === 'free') return 5
          if (planId.startsWith('plus')) return 20
          if (planId.startsWith('pro')) return 50
          if (planId.startsWith('unlimited') || planId === 'institution') return 9999
          return 5
        }
        const limit = getPlanLimit(profile.plan_id)
        const coolingUntil = data.cooling_until
          ? new Date(data.cooling_until)
          : null
        setQuota({
          limit,
          used: data.message_count ?? 0,
          remaining: Math.max(0, limit - (data.message_count ?? 0)),
          coolingUntil,
          isCooling: coolingUntil ? coolingUntil > new Date() : false,
        })
      }
    })()
  }, [profile])

  // Fetch soul for personalisation
  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('student_soul')
        .select('future_research_area')
        .eq('user_id', profile.id)
        .eq('vertical_id', verticalUuid)
        .single()
      if (data?.future_research_area)
        setFutureResearchArea(data.future_research_area.toLowerCase())
    })()
  }, [profile, saathiId])

  // Fetch news + exams in parallel
  async function fetchAll() {
    if (!profile) return
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString()

    // No date cutoff — keep showing the latest 30 active items even if
    // the cron lags. The rss-fetch function deactivates items older than
    // 7 days, so .eq('is_active', true) is the freshness guarantee.
    const [newsRes, examRes] = await Promise.all([
      supabase
        .from('news_items')
        .select('*')
        .eq('vertical_id', verticalUuid)
        .eq('is_active', true)
        .order('fetched_at', { ascending: false })
        .range(0, 29),
      supabase
        .from('exam_calendar')
        .select('*')
        .eq('vertical_id', saathiId)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(5),
    ])

    const rawNews: ExtNewsItem[] = (newsRes.data ?? []).map((item) => {
      const itemAny = item as Record<string, unknown>
      const titleLower = (item.title ?? '').toLowerCase()
      const summaryLower = (item.summary ?? '').toLowerCase()
      const isResearchArea = futureResearchArea
        ? futureResearchArea
            .split(/[\s,]+/)
            .some(
              (word) =>
                word.length > 3 &&
                (titleLower.includes(word) || summaryLower.includes(word))
            )
        : false

      return {
        ...item,
        item_type: (itemAny.item_type as string | undefined) ?? 'article',
        category: (itemAny.category as string | undefined) ?? undefined,
        tags: (itemAny.tags as string[] | undefined) ?? [],
        isResearchArea,
      }
    })

    // Sort: research-area matches first
    rawNews.sort(
      (a, b) => (b.isResearchArea ? 1 : 0) - (a.isResearchArea ? 1 : 0)
    )

    setNewsItems(rawNews)
    setExamAlerts((examRes.data ?? []) as ExamAlert[])
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    async function run() {
      await fetchAll()
    }
    void run()
  }, [profile, saathiId, futureResearchArea]) // eslint-disable-line react-hooks/exhaustive-deps

  // Admin: trigger RSS fetch via server-side proxy (cron secret never exposed to client)
  async function handleAdminFetch() {
    if (!profile) return
    setAdminFetching(true)
    await fetch('/api/admin/trigger-rss', { method: 'POST' })
    setTimeout(() => {
      setAdminFetching(false)
      fetchAll()
    }, 3000)
  }

  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('')
  useEffect(() => {
    async function computeLabel() {
      await Promise.resolve()
      if (!lastUpdated) {
        setLastUpdatedLabel('')
        return
      }
      const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
      if (mins < 1) setLastUpdatedLabel('just now')
      else if (mins < 60) setLastUpdatedLabel(`${mins}m ago`)
      else setLastUpdatedLabel(`${Math.floor(mins / 60)}h ago`)
    }
    void computeLabel()
  }, [lastUpdated])

  // Filter logic
  const filteredNews = newsItems.filter((item) => {
    if (activeTab === 'all') return item.item_type !== 'announcement'
    if (activeTab === 'news') return item.item_type === 'article'
    if (activeTab === 'research') return item.item_type === 'research'
    if (activeTab === 'announcements') return item.item_type === 'announcement'
    return true
  })

  const announcements = newsItems.filter((i) => i.item_type === 'announcement')
  const allVisible =
    activeTab === 'all'
      ? [...filteredNews]
      : activeTab === 'announcements'
        ? announcements
        : filteredNews

  const showExams = activeTab === 'all' || activeTab === 'exams'

  if (!resolvedSaathi) {
    return (
      <div
        className="flex h-screen items-center justify-center px-6 text-center"
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <div>
          <p className="mb-3 text-sm">
            We couldn&apos;t resolve your Saathi for the news feed.
          </p>
          <a href="/onboard" style={{ color: 'var(--gold)' }}>
            Pick your Saathi →
          </a>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full"
          style={{
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--saathi-primary, #B8860B)',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* App Sidebar */}
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        quota={quota}
        onSignOut={async () => {
          const supabase = createClient()
          await supabase.auth.signOut()
        }}
      />

      {/* Main content */}
      <main className="h-full min-w-0 flex-1 overflow-y-auto">
        {/* Cooling banner */}
        {quota.isCooling && (
          <CoolingBanner quota={quota} saathiName={activeSaathi.name} />
        )}

        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Page header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1
                className="font-display mb-1 text-3xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Today in {activeSaathi.name}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Curated for your journey
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {lastUpdated && (
                <span
                  className="hidden text-[11px] sm:block"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Updated {lastUpdatedLabel}
                </span>
              )}
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:opacity-80"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
                title="Refresh"
              >
                <span className={loading ? 'animate-spin' : ''}>↻</span>
              </button>
              {/* Admin trigger */}
              {isAdmin && (
                <button
                  onClick={handleAdminFetch}
                  disabled={adminFetching}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: 'rgba(184,134,11,0.12)',
                    border: '0.5px solid rgba(184,134,11,0.3)',
                    color: '#B8860B',
                    opacity: adminFetching ? 0.6 : 1,
                  }}
                >
                  {adminFetching ? 'Fetching...' : '↻ Fetch now'}
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="mb-6"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <NewsFilterTabs
              active={activeTab}
              onChange={setActiveTab}
              primaryColor={activeSaathi.primary}
            />
          </div>

          {loading ? (
            /* Skeleton grid */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* Exam alerts (shown in All or Exams tab) */}
              {showExams && examAlerts.length > 0 && (
                <div className="mb-6">
                  <p
                    className="mb-3 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    📅 Upcoming Exams
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {examAlerts.map((exam, i) => (
                      <ExamAlertCard key={exam.id} exam={exam} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Exams empty state */}
              {activeTab === 'exams' && examAlerts.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="mb-3 text-4xl">📅</span>
                  <p
                    className="font-display mb-2 text-lg"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    No upcoming exams for {activeSaathi.name}
                  </p>
                  <a
                    href="/profile"
                    className="text-sm underline underline-offset-2"
                    style={{ color: activeSaathi.primary }}
                  >
                    Add your exam target in Profile →
                  </a>
                </div>
              )}

              {/* Announcements section in All tab */}
              {activeTab === 'all' && announcements.length > 0 && (
                <div className="mb-6">
                  <p
                    className="mb-3 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    📢 Platform Announcements
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {announcements.map((item, i) => (
                      <AnnouncementCard key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Announcements tab */}
              {activeTab === 'announcements' && announcements.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="mb-3 text-4xl">📢</span>
                  <p
                    className="font-display text-lg"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    No announcements right now.
                  </p>
                </div>
              )}

              {/* Main news grid */}
              {activeTab !== 'exams' &&
                activeTab !== 'announcements' &&
                (allVisible.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {allVisible.map((item, i) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        primaryColor={activeSaathi.primary}
                        bgColor={activeSaathi.bg ?? activeSaathi.primary}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  /* Empty state */
                  <div className="flex flex-col items-center py-20 text-center">
                    <span className="mb-4 text-5xl">📰</span>
                    <p
                      className="font-display mb-2 text-xl"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Today&apos;s news is being gathered.
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Check back after 6 AM IST — your Saathi fetches fresh
                      headlines every morning.
                    </p>
                  </div>
                ))}
            </>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
