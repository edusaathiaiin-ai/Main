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
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="mb-3 flex justify-between">
        <div
          className="h-2 w-20 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="h-2 w-14 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      </div>
      <div className="mb-4 space-y-2">
        <div
          className="h-3 w-full rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="h-3 w-4/5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="h-3 w-3/5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      </div>
      <div
        className="h-2 w-12 rounded-full"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      />
    </div>
  )
}

// ── Main NewsFeed ─────────────────────────────────────────────────────────────

export function NewsFeed() {
  const { profile } = useAuthStore()
  const { activeSaathiId } = useChatStore()

  const saathiId =
    toSlug(activeSaathiId) ??
    toSlug(profile?.primary_saathi_id) ??
    SAATHIS[0].id
  // verticalUuid is the UUID FK required for all DB queries — never insert slugs into vertical_id
  const verticalUuid =
    profile?.primary_saathi_id ??
    toVerticalUuid(activeSaathiId) ??
    toVerticalUuid(saathiId) ??
    ''
  const activeSaathi: Saathi =
    SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]

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

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [newsRes, examRes] = await Promise.all([
      supabase
        .from('news_items')
        .select('*')
        .eq('vertical_id', verticalUuid)
        .eq('is_active', true)
        .gte('fetched_at', cutoff24h)
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

  if (!profile) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: '#060F1D' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: '#C9993A' }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: '#060F1D' }}
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
              <h1 className="font-playfair mb-1 text-3xl font-bold text-white">
                Today in {activeSaathi.name}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Curated for your journey
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {lastUpdated && (
                <span
                  className="hidden text-[11px] sm:block"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Updated {lastUpdatedLabel}
                </span>
              )}
              <button
                onClick={fetchAll}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
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
                    background: 'rgba(201,153,58,0.12)',
                    border: '0.5px solid rgba(201,153,58,0.3)',
                    color: '#C9993A',
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
            style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}
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
                    style={{ color: 'rgba(255,255,255,0.3)' }}
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
                  <p className="font-playfair mb-2 text-lg text-white/40">
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
                    style={{ color: 'rgba(255,255,255,0.3)' }}
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
                  <p className="font-playfair text-lg text-white/40">
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
                    <p className="font-playfair mb-2 text-xl text-white/40">
                      Today&apos;s news is being gathered.
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
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
