'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { streamChat } from '@/lib/ai'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import { BOTS } from '@/constants/bots'
import { getPlanTier, isInFreeTrial } from '@/constants/plans'
import { todayIST } from '@/lib/quota'
import { getSaathiTheme } from '@/lib/saathiThemes'
import { useThemeStore } from '@/stores/themeStore'
import { useFontStore, getChatFontStyle } from '@/stores/fontStore'
// ── Always-visible — eager ────────────────────────────────────────────────────
import { ChatWatermark } from './ChatWatermark'
import { SaathiHeader } from './SaathiHeader'
import { MessageBubble } from './MessageBubble'
import { InputArea } from './InputArea'
import { EmptyState } from './EmptyState'
import { QuotaBanner } from './QuotaBanner'
import { CoolingBanner } from './CoolingBanner'
import { FreePlanBar } from './FreePlanBar'
import { Sidebar } from '@/components/layout/Sidebar'
// ── Below-fold / conditional — lazy ───────────────────────────────────────────
const DidYouKnow            = dynamic(() => import('./DidYouKnow').then(m => ({ default: m.DidYouKnow })), { ssr: false })
const CompanionshipCard     = dynamic(() => import('./CompanionshipCard').then(m => ({ default: m.CompanionshipCard })), { ssr: false })
const ConversionModal       = dynamic(() => import('./ConversionModal').then(m => ({ default: m.ConversionModal })), { ssr: false })
const SuspensionScreen      = dynamic(() => import('./SuspensionScreen').then(m => ({ default: m.SuspensionScreen })), { ssr: false })
const SaathiCommunityBanner = dynamic(() => import('./SaathiCommunityBanner').then(m => ({ default: m.SaathiCommunityBanner })), { ssr: false })
const MobileNav             = dynamic(() => import('@/components/layout/MobileNav').then(m => ({ default: m.MobileNav })), { ssr: false })
const UpgradeBanner         = dynamic(() => import('@/components/ui/UpgradeBanner').then(m => ({ default: m.UpgradeBanner })), { ssr: false })
import type { UpgradeTrigger } from '@/components/ui/UpgradeBanner'
import type { QuotaState, Saathi } from '@/types'

const DEFAULT_QUOTA: QuotaState = {
  limit: 5,
  used: 0,
  remaining: 5,
  coolingUntil: null,
  isCooling: false,
}

type SoulBanner = {
  name: string
  summary: string
}

// ─── Rich Feature Banner ──────────────────────────────────────────────────────

const RICH_FEATURE_SAATHIS: Record<
  string,
  { features: string[]; example: string }
> = {
  maathsaathi: {
    features: ['📐 Equations render as beautiful math'],
    example: 'Try: "What is the quadratic formula?"',
  },
  chemsaathi: {
    features: [
      '🧪 Molecular structures appear inline',
      '📐 Chemical equations render beautifully',
    ],
    example: 'Try: "Show me the structure of glucose"',
  },
  pharmasaathi: {
    features: ['🧪 Drug molecular structures appear inline'],
    example: 'Try: "What does paracetamol look like?"',
  },
  biosaathi: {
    features: [
      '🧬 Molecular structures appear inline',
      '📊 Biological processes become diagrams',
    ],
    example: 'Try: "Show me the structure of DNA bases"',
  },
  archsaathi: {
    features: ['📊 Design processes become visual flowcharts'],
    example: 'Try: "Show me a basic design process"',
  },
  compsaathi: {
    features: [
      '💻 Code renders with syntax highlighting',
      '📊 System architecture becomes diagrams',
    ],
    example: 'Try: "Show me a binary search algorithm"',
  },
  kanoonsaathi: {
    features: ['📊 Legal processes become visual flows'],
    example: 'Try: "How does a case reach the Supreme Court?"',
  },
  mechsaathi: {
    features: [
      '📐 Engineering equations render beautifully',
      '📊 Mechanisms become diagrams',
    ],
    example: 'Try: "Show stress-strain relationship"',
  },
  civilsaathi: {
    features: [
      '📊 Structural processes become diagrams',
      '📐 Engineering equations render beautifully',
    ],
    example: 'Try: "Explain load distribution in a beam"',
  },
  physicsaathi: {
    features: ['📐 Physics equations render beautifully'],
    example: 'Try: "Show Maxwell\'s equations"',
  },
  biotechsaathi: {
    features: [
      '🧬 Molecular structures appear inline',
      '📐 Biochemical equations render beautifully',
    ],
    example: 'Try: "Show me ATP synthesis"',
  },
  aerospacesaathi: {
    features: [
      '📐 Equations render beautifully',
      '📊 Flight & orbital processes become diagrams',
    ],
    example: 'Try: "Show orbital mechanics equations"',
  },
  elecsaathi: {
    features: [
      '📐 Circuit equations render beautifully',
      '📊 Circuit flows become diagrams',
    ],
    example: 'Try: "Show Kirchhoff\'s laws"',
  },
  envirosathi: {
    features: [
      '📐 Environmental equations render beautifully',
      '📊 Processes become diagrams',
    ],
    example: 'Try: "Show the carbon cycle"',
  },
  econsaathi: {
    features: ['📊 Economic processes become diagrams'],
    example: 'Try: "Show supply and demand flow"',
  },
}

function RichFeatureBanner({
  saathiSlug,
  isLegalTheme,
}: {
  saathiSlug: string
  isLegalTheme: boolean
}) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('feature_banner_dismissed') === 'true'
  })

  const features = RICH_FEATURE_SAATHIS[saathiSlug]
  if (!features || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        margin: '0 16px 12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: isLegalTheme ? '#FFFEF5' : 'rgba(201,153,58,0.08)',
        border: isLegalTheme
          ? '0.5px solid #E8E0C0'
          : '0.5px solid rgba(201,153,58,0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>✦</span>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#C9993A',
            margin: '0 0 4px',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          This Saathi has rich features
        </p>
        {features.features.map((f, i) => (
          <p
            key={i}
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '2px 0',
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            {f}
          </p>
        ))}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            margin: '6px 0 0',
            fontStyle: 'italic',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {features.example}
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('feature_banner_dismissed', 'true')
          setDismissed(true)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-ghost)',
          cursor: 'pointer',
          fontSize: '16px',
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  )
}

export function ChatWindow() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const {
    activeSaathiId,
    activeBotSlot,
    messages,
    isStreaming,
    streamingText,
    setActiveSaathi,
    setActiveBotSlot,
    addMessage,
    setStreaming,
    appendStreamChunk,
    commitStreamedMessage,
  } = useChatStore()

  const { mode, setMode } = useThemeStore()
  const { fontSize, fontType, fontColor, highContrast, reduceMotion } = useFontStore()
  const searchParams = useSearchParams()

  const [quota, setQuota] = useState<QuotaState>(DEFAULT_QUOTA)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined)
  const [inputValue, setInputValue] = useState('')
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [soulBanner, setSoulBanner] = useState<SoulBanner | null>(null)
  const [showSoulBanner, setShowSoulBanner] = useState(true)
  const [conversionModal, setConversionModal] = useState<{
    open: boolean
    trigger: 'quota_hit' | 'plus_bot_tap'
    botName?: string
  }>({
    open: false,
    trigger: 'quota_hit',
  })
  const [soulData, setSoulData] = useState<{
    sessionCount: number
    shellBroken: boolean
  } | null>(null)
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | null>(
    null
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [flameTransition, setFlameTransition] = useState<{
    stage: string
    emoji: string
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  // Resolve active Saathi — primary_saathi_id is UUID, SAATHIS uses slugs
  const saathiId =
    toSlug(activeSaathiId) ??
    toSlug(profile?.primary_saathi_id) ??
    SAATHIS[0].id
  const activeSaathi: Saathi =
    SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]
  const activeBot = BOTS.find((b) => b.slot === activeBotSlot) ?? BOTS[0]
  const theme = getSaathiTheme(saathiId, mode)

  // Legal theme = KanoonSaathi in day (light) mode
  const isLegalTheme = activeSaathi.theme === 'legal' && mode === 'light'

  // Apply per-Saathi CSS variable world to body
  useEffect(() => {
    if (saathiId) {
      document.body.setAttribute('data-saathi', saathiId)
    }
    return () => {
      document.body.removeAttribute('data-saathi')
    }
  }, [saathiId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Post-upgrade celebration — refresh profile from DB so new plan takes effect
  // Uses a ref to run only once (not on every profile change)
  const upgradeHandled = useRef(false)
  // Store timer in a ref so React effect cleanup on profile change doesn't cancel it
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (upgradeHandled.current) return
    if (searchParams.get('upgraded') !== 'true') return
    if (!profile?.id) return
    upgradeHandled.current = true

    // Show celebration immediately
    setShowCelebration(true)
    // Fix: was '\chat' (backslash = relative path bug) — must be '/chat'
    router.replace('/chat', { scroll: false })

    // Poll for webhook to update plan_id (may take 2-5 seconds)
    const supabase = createClient()
    let attempts = 0
    const maxAttempts = 6
    const capturedProfileId = profile.id

    const pollProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan_id, subscription_status, subscription_expires_at')
        .eq('id', capturedProfileId)
        .single()

      if (data && data.plan_id !== 'free') {
        useAuthStore.getState().setProfile({
          ...useAuthStore.getState().profile!,
          ...data,
        })
        // Re-fetch quota with the confirmed new plan so limit updates immediately
        fetchQuota(capturedProfileId, data.plan_id)
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(pollProfile, 2000)
      }
    }
    void pollProfile()

    // Store in ref — NOT returned as cleanup — so profile-change re-runs don't cancel it
    celebrationTimerRef.current = setTimeout(
      () => setShowCelebration(false),
      3500
    )
  }, [searchParams, router, profile])

  // Cleanup celebration timer only on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
    }
  }, [])

  // Upgrade banner trigger logic — free plan only
  useEffect(() => {
    if (getPlanTier(profile?.plan_id) !== 'free') return
    if (bannerDismissed || !soulData) return

    // Cooling — highest priority
    if (quota.isCooling) {
      if (!sessionStorage.getItem('banner_dismissed_cooling')) {
        setUpgradeTrigger('cooling')
      }
      return
    }

    // Quota low
    if (quota.remaining <= 3 && quota.remaining > 0) {
      if (!sessionStorage.getItem('banner_dismissed_quota_low')) {
        setUpgradeTrigger('quota_low')
      }
      return
    }

    // Shell broken — passion moment
    if (soulData.shellBroken && !sessionStorage.getItem('shell_banner_shown')) {
      sessionStorage.setItem('shell_banner_shown', '1')
      setUpgradeTrigger('shell_broken')
      return
    }

    // Session milestones
    if (
      [3, 5, 10].includes(soulData.sessionCount) &&
      !sessionStorage.getItem('banner_dismissed_session_milestone')
    ) {
      setUpgradeTrigger('session_milestone')
    }
  }, [quota, soulData, bannerDismissed, profile?.plan_id])

  // Init: set saathi + fetch quota + soul banner + apply per-saathi theme default
  useEffect(() => {
    if (!profile) return
    const sid = profile.primary_saathi_id ?? '' // UUID for DB queries
    const sidSlug = toSlug(sid) ?? SAATHIS[0].id // slug for chatStore / SAATHIS lookup
    setActiveSaathi(sidSlug)

    // Per-saathi theme preference (stored in localStorage)
    // Key: 'edusaathiai_saathi_themes' → JSON map of { slug: 'day' | 'night' }
    // KanoonSaathi defaults to 'day'; all others default to 'night'
    try {
      const stored = JSON.parse(
        localStorage.getItem('edusaathiai_saathi_themes') ?? '{}'
      ) as Record<string, string>
      const saathi = SAATHIS.find((s) => s.id === sidSlug)
      // Legal Saathis (KanoonSaathi) always use light mode — never honour a saved 'night' pref
      if (saathi?.theme === 'legal') {
        setMode('light')
      } else {
        const savedPref = stored[sidSlug]
        if (savedPref === 'day') setMode('light')
        else if (savedPref === 'night') setMode('dark')
        else setMode('dark')
      }
    } catch {
      /* localStorage unavailable — leave mode unchanged */
    }

    fetchQuota(profile.id)
    fetchSoulBanner(profile.id, sid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, setActiveSaathi])

  // Save per-saathi theme preference whenever mode changes
  useEffect(() => {
    if (!saathiId) return
    try {
      const stored = JSON.parse(
        localStorage.getItem('edusaathiai_saathi_themes') ?? '{}'
      ) as Record<string, string>
      stored[saathiId] = mode === 'light' ? 'day' : 'night'
      localStorage.setItem('edusaathiai_saathi_themes', JSON.stringify(stored))
    } catch {
      /* localStorage unavailable */
    }
  }, [mode, saathiId])

  function getPlanLimit(planId: string | null | undefined): number {
    if (!planId || planId === 'free') return 5
    if (planId.startsWith('plus')) return 20
    if (planId.startsWith('pro')) return 50
    if (planId.startsWith('unlimited') || planId === 'institution') return 9999
    return 5
  }

  async function fetchQuota(userId: string, overridePlanId?: string) {
    const supabase = createClient()
    // vertical_id filter prevents cross-Saathi row collision; todayIST() matches
    // the IST date the Edge Function uses (avoids 12 AM–5:30 AM UTC date mismatch)
    const vid = profile?.primary_saathi_id ?? ''
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, message_count, cooling_until')
      .eq('user_id', userId)
      .eq('vertical_id', vid)
      .eq('bot_slot', activeBotSlot)
      .eq('quota_date_ist', todayIST())
      .maybeSingle()

    const planId = overridePlanId ?? profile?.plan_id ?? 'free'
    const limit = getPlanLimit(planId)

    if (!data) {
      // No sessions today — show correct limit with full remaining
      setQuota({ limit, used: 0, remaining: limit, coolingUntil: null, isCooling: false })
      return
    }
    if (data.id) setCurrentSessionId(data.id as string)
    const used = data.message_count ?? 0
    const coolingUntil = data.cooling_until
      ? new Date(data.cooling_until)
      : null
    const isCooling = coolingUntil ? coolingUntil > new Date() : false

    setQuota({
      limit,
      used,
      remaining: Math.max(0, limit - used),
      coolingUntil,
      isCooling,
    })
  }

  async function fetchSoulBanner(userId: string, sid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('student_soul')
      .select('display_name, last_session_summary, session_count, shell_broken')
      .eq('user_id', userId)
      .eq('vertical_id', sid)
      .maybeSingle()

    if (data?.last_session_summary && data.session_count > 0) {
      setSoulBanner({
        name: data.display_name ?? 'there',
        summary:
          data.last_session_summary.split('.')[0] ?? data.last_session_summary,
      })
    }
    setSoulData({
      sessionCount: (data?.session_count as number) ?? 0,
      shellBroken: Boolean(data?.shell_broken),
    })
  }

  // Saathi is locked to primary_saathi_id — no switching allowed.
  // Students must request a full profile reset to change Saathi.

  // Switch bot slot
  function handleSlotChange(slot: 1 | 2 | 3 | 4 | 5) {
    setActiveBotSlot(slot)
  }

  // Locked bot tap
  function handleLockedTap(botName: string) {
    setConversionModal({ open: true, trigger: 'plus_bot_tap', botName })
  }

  // Flag a message
  async function handleFlag(messageId: string) {
    const supabase = createClient()
    await supabase.from('moderation_flags').insert({
      target_id: messageId,
      target_type: 'chat_message',
      reporter_user_id: profile?.id,
      reason: 'user_flag',
    })
  }

  // Send message
  const handleSend = useCallback(
    async (text: string, imageBase64?: string) => {
      if (!profile || isStreaming || quota.isCooling || quota.remaining === 0)
        return

      const supabase = createClient()
      // Use refreshSession() to guarantee a fresh, valid access_token.
      // getSession() can return a session where access_token is undefined/malformed
      // if the @supabase/ssr cookie chunks are incomplete — this causes the Supabase
      // gateway to reject the request with 401 "Invalid Token or Protected Header formatting".
      // refreshSession() always returns a complete, validated session or an error.
      const {
        data: { session },
        error: refreshErr,
      } = await supabase.auth.refreshSession()
      if (refreshErr || !session?.access_token) {
        router.push('/login')
        return
      }

      const userMsgId = `user-${Date.now()}`
      addMessage({
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      })
      setInputValue('')
      setErrorBanner(null)
      setStreaming(true)

      try {
        const history = messages
          .slice(-20)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))

        for await (const delta of streamChat({
          saathiId,
          botSlot: activeBotSlot,
          message: text,
          history,
          accessToken: session.access_token,
          ...(imageBase64 ? { imageBase64 } : {}),
        })) {
          appendStreamChunk(delta)
        }

        const assistantId = `asst-${Date.now()}`
        commitStreamedMessage(assistantId)

        // Refresh quota
        await fetchQuota(profile.id)

        // Call soul-update (fire-and-forget — never block the UI)
        const sessionMsgs = messages
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }))

        // soul-update expects vertical_id as UUID — use primary_saathi_id (UUID FK), not saathiId (slug)
        const verticalUuid = profile.primary_saathi_id ?? activeSaathiId
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/soul-update`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              saathiId: verticalUuid,
              sessionMessages: sessionMsgs,
            }),
          }
        )
          .then((r) =>
            r.ok
              ? r.json()
              : Promise.reject(new Error(`soul-update ${r.status}`))
          )
          .then(
            (result: {
              flameStageChanged?: boolean
              newFlameStage?: string
            }) => {
              if (result.flameStageChanged && result.newFlameStage) {
                const FLAME_EMOJI: Record<string, string> = {
                  spark: '✨',
                  flame: '🔥',
                  fire: '💥',
                  wings: '🦋',
                }
                const emoji = FLAME_EMOJI[result.newFlameStage] ?? '🔥'
                setFlameTransition({ stage: result.newFlameStage, emoji })
                setTimeout(() => setFlameTransition(null), 3500)
              }
            }
          )
          .catch(() => {
            /* soul-update failure must never affect chat */
          })

        // Show conversion modal after quota hit
        const updatedRemaining = quota.remaining - 1
        if (updatedRemaining <= 0) {
          conversionTimeoutRef.current = setTimeout(() => {
            setConversionModal({ open: true, trigger: 'quota_hit' })
          }, 1500)
        }
      } catch (err) {
        setStreaming(false)
        // Distinguish forced logout (another device) from normal errors
        if (
          err instanceof Error &&
          (err as Error & { code?: string }).code === 'FORCED_LOGOUT'
        ) {
          // Sign out silently and redirect to login with forced=1 flag
          const supabase = createClient()
          await supabase.auth.signOut()
          router.replace('/login?forced=1')
          return
        }
        if (
          err instanceof Error &&
          (err as Error & { code?: string }).code === 'SUSPENDED'
        ) {
          // Refresh profile to trigger SuspensionScreen render
          const supabase = createClient()
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profile!.id)
            .single()
          if (data) useAuthStore.getState().setProfile(data)
          return
        }
        setErrorBanner(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.'
        )
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      profile,
      isStreaming,
      quota,
      messages,
      saathiId,
      activeBotSlot,
      addMessage,
      setStreaming,
      appendStreamChunk,
      commitStreamedMessage,
      router,
    ]
  )

  // Starter click
  function handleStarterClick(text: string) {
    setInputValue(text)
  }

  // Sign out — clear all state and return to login
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    useAuthStore.getState().setProfile(null)
    sessionStorage.clear()
    router.push('/login')
  }

  if (!profile) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ background: '#060F1D' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: '#C9993A' }}
        />
      </div>
    )
  }

  // Suspension gate — show suspension screen instead of chat
  if (
    profile.suspension_status === 'suspended' ||
    profile.suspension_status === 'banned' ||
    profile.is_banned
  ) {
    return (
      <div className="flex h-screen w-full" style={{ background: '#060F1D' }}>
        <Sidebar
          profile={profile}
          activeSaathi={activeSaathi}
          quota={quota}
          isLegalTheme={false}
          onSignOut={async () => {
            const s = createClient()
            await s.auth.signOut()
            useAuthStore.getState().setProfile(null)
            sessionStorage.clear()
            router.push('/login')
          }}
        />
        <SuspensionScreen
          tier={profile.suspension_tier ?? 2}
          until={profile.suspended_until}
          reason={profile.suspension_reason}
          isBanned={profile.is_banned}
        />
        <MobileNav />
      </div>
    )
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        transition: 'background 0.4s ease, color 0.3s ease',
      }}
    >
      {/* Sidebar (desktop) */}
      <Sidebar
        profile={profile}
        activeSaathi={activeSaathi}
        quota={quota}
        onSignOut={handleSignOut}
        sessionCount={soulData?.sessionCount ?? 0}
        isLegalTheme={isLegalTheme}
      />

      {/* Main chat area */}
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Saathi header */}
        <SaathiHeader
          saathi={activeSaathi}
          botName={activeBot.name}
          sessionCount={soulData?.sessionCount ?? 0}
          isLegalTheme={isLegalTheme}
          activeSlot={activeBotSlot}
          planId={profile.plan_id}
          userRole={profile.role}
          createdAt={profile.created_at}
          onSlotChange={handleSlotChange}
          onLockedTap={handleLockedTap}
        />

        {/* Free plan ambient quota bar — always visible, hides during cooling */}
        <FreePlanBar
          quota={quota}
          planId={profile.plan_id ?? 'free'}
          isFreeTrial={isInFreeTrial(profile.created_at)}
        />

        {/* Quota banner */}
        <QuotaBanner quota={quota} />

        {/* Soul welcome banner */}
        <AnimatePresence>
          {soulBanner && showSoulBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start justify-between px-5 py-3 text-sm"
              style={{
                background: 'var(--saathi-bg)',
                borderBottom: '1px solid var(--saathi-border)',
              }}
            >
              <p style={{ color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Welcome back, {soulBanner.name}.
                </span>{' '}
                Last time we covered: {soulBanner.summary}
              </p>
              <button
                onClick={() => setShowSoulBanner(false)}
                className="ml-4 shrink-0 text-xs"
                style={{ color: 'var(--text-ghost)' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Community count banner */}
        <SaathiCommunityBanner
          saathiId={saathiId}
          saathiName={activeSaathi.name}
          saathiColor={activeSaathi.primary}
          saathiEmoji={activeSaathi.emoji}
          studentName={profile?.full_name ?? 'Student'}
        />

        {/* Error banner */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-5 py-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                borderBottom: '0.5px solid rgba(239,68,68,0.2)',
              }}
            >
              <span style={{ color: '#FCA5A5' }}>⚠️ {errorBanner}</span>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-xs"
                style={{ color: 'var(--text-ghost)' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          id="chat-main"
          aria-live="polite"
          aria-label="Chat messages"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6"
          style={{ position: 'relative', ...getChatFontStyle(fontSize, fontType, fontColor, isLegalTheme, highContrast) }}
        >
          <ChatWatermark saathiSlug={saathiId} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {messages.length === 0 && !isStreaming ? (
              <>
                <DidYouKnow
                  isLegalTheme={isLegalTheme}
                  primaryColor={activeSaathi.primary}
                  reduceMotion={reduceMotion}
                />
                {profile.primary_saathi_id && (
                  <CompanionshipCard
                    profile={profile}
                    verticalId={profile.primary_saathi_id}
                    location="chat"
                    isLegalTheme={isLegalTheme}
                    primaryColor={activeSaathi.primary}
                    onAddSaathi={(newVerticalId) => {
                      console.log('New Saathi added:', newVerticalId)
                    }}
                  />
                )}
                <EmptyState
                  saathiId={saathiId}
                  saathiEmoji={activeSaathi.emoji}
                  botName={activeBot.name}
                  onStarterClick={handleStarterClick}
                  isLegalTheme={isLegalTheme}
                />
              </>
            ) : (
              <div>
                {messages.map((msg, i) => {
                  const prevMsg = messages[i - 1]
                  const showBotLabel =
                    msg.role === 'assistant' && prevMsg?.role !== 'assistant'
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      showBotLabel={showBotLabel}
                      botName={activeBot.name}
                      onFlag={handleFlag}
                      primaryColor={activeSaathi.primary}
                      isLegalTheme={isLegalTheme}
                      verticalId={activeSaathiId ?? profile?.primary_saathi_id ?? ''}
                      verticalSlug={saathiId}
                      verticalName={activeSaathi.name}
                      botSlot={activeBotSlot}
                      sessionId={currentSessionId}
                    />
                  )
                })}

                {/* Streaming bubble */}
                {isStreaming && (
                  <MessageBubble
                    key="streaming"
                    message={{
                      id: 'streaming',
                      role: 'assistant',
                      content: '',
                      createdAt: new Date().toISOString(),
                    }}
                    isStreaming={true}
                    streamingText={streamingText}
                    showBotLabel={
                      messages[messages.length - 1]?.role !== 'assistant'
                    }
                    botName={activeBot.name}
                    primaryColor={activeSaathi.primary}
                    isLegalTheme={isLegalTheme}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Rich feature discovery banner — shown once on first session */}
        <AnimatePresence>
          <RichFeatureBanner
            saathiSlug={saathiId}
            isLegalTheme={isLegalTheme}
          />
        </AnimatePresence>

        {/* Cooling banner or input */}
        {quota.isCooling ? (
          <CoolingBanner quota={quota} saathiName={activeSaathi.name} />
        ) : (
          <InputArea
            quota={quota}
            isStreaming={isStreaming}
            primaryColor={activeSaathi.primary}
            onSend={handleSend}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isLegalTheme={isLegalTheme}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Conversion modal */}
      <ConversionModal
        open={conversionModal.open}
        trigger={conversionModal.trigger}
        botName={conversionModal.botName}
        onClose={() => setConversionModal((p) => ({ ...p, open: false }))}
      />

      {/* Upgrade banner */}
      <AnimatePresence>
        {upgradeTrigger && !bannerDismissed && (
          <UpgradeBanner
            trigger={upgradeTrigger}
            studentName={profile.full_name ?? undefined}
            onDismiss={() => {
              sessionStorage.setItem(
                `banner_dismissed_${upgradeTrigger}`,
                'true'
              )
              setBannerDismissed(true)
              setUpgradeTrigger(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Flame stage transition moment */}
      <AnimatePresence>
        {flameTransition && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 55,
              padding: '16px 28px',
              borderRadius: '20px',
              background: 'rgba(11,31,58,0.95)',
              border: '1px solid rgba(201,153,58,0.5)',
              backdropFilter: 'blur(16px)',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>
              {flameTransition.emoji}
            </div>
            <p
              className="font-playfair"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#C9993A',
                margin: '0 0 4px',
              }}
            >
              Your passion just levelled up
            </p>
            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {flameTransition.stage} stage reached
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-upgrade celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6,15,29,0.92)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>✦</div>
              <h2
                className="font-playfair"
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#C9993A',
                  marginBottom: '12px',
                }}
              >
                Welcome to Plus, {profile.full_name?.split(' ')[0] ?? 'friend'}!
                🎉
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.6)',
                  maxWidth: '320px',
                  lineHeight: 1.6,
                }}
              >
                No more limits. Your Saathi is fully yours.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
