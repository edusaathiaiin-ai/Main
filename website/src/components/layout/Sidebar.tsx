'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SaathiPointsBar } from '@/components/chat/SaathiPointsBar'
import { CompanionshipCard } from '@/components/chat/CompanionshipCard'
import { getPlanTier } from '@/constants/plans'
import { toVerticalUuid } from '@/constants/verticalIds'
import { createClient } from '@/lib/supabase/client'
import { WorldEducationExplorerCTA } from '@/components/explore/WorldEducationExplorer'
import { ExploreBeyond } from '@/components/chat/ExploreBeyond'
import type { Saathi, Profile, QuotaState } from '@/types'

type Props = {
  profile: Profile
  activeSaathi: Saathi
  quota: QuotaState
  onSignOut: () => void
  sessionCount?: number
  isLegalTheme?: boolean
}

// ─── Sidebar CTA metadata ─────────────────────────────────────────────────────

const SIDEBAR_CTA_META: Record<string, { desc: string; color?: string }> = {
  'chat':                  { desc: 'Chat with your Saathi. Ask anything — it remembers you.' },
  'board':                 { desc: 'Ask the community. Get AI answers plus replies from fellow students.' },
  'news':                  { desc: "Today's education news curated for your Saathi and subjects." },
  'my-progress':           { desc: 'Your learning journey — sessions, streaks, Saathi Points, flame stage.' },
  'your-horizon':          { desc: 'Career destinations worth aiming at — and the first prompt to start today.', color: 'var(--saathi-primary)' },
  'flashcards':            { desc: 'Save key concepts from chat as flashcards. Review anytime.' },
  'explore-beyond':        { desc: 'Books, journals, tools and channels for deeper learning.', color: 'var(--saathi-primary)' },
  'profile':               { desc: 'Edit your subjects, university, academic level and preferences.' },
  'add-extra-saathi':      { desc: 'Add another subject Saathi for ₹99/month or 500 Saathi Points.', color: 'var(--saathi-primary)' },
  'declare-what-you-want': { desc: 'Tell us your topic or skill. Faculty create sessions for you.', color: 'var(--success)' },
  'internships-research':  { desc: 'Soul-matched internships, fellowships and research opportunities.', color: 'var(--saathi-primary)' },
  'research-interns':      { desc: 'Post research projects and find co-authors from the community.', color: '#C084FC' },
  'faculty-finder':        { desc: 'Browse verified faculty. Book a 1:1 session with a subject expert.', color: 'var(--saathi-primary)' },
  'saved-faculty':         { desc: 'Revisit bookmarked faculty and book sessions when ready.', color: 'var(--saathi-primary)' },
  'live-sessions':         { desc: 'Join live group lectures. Ask questions, watch recordings.', color: '#DC2626' },
  'request-lecture':       { desc: 'Ask your favourite faculty to teach a specific topic.', color: 'var(--saathi-primary)' },
  'whatsapp-saathi':       { desc: 'Study via WhatsApp. Save this number, message your Saathi anytime.', color: '#16A34A' },
  'world-education':       { desc: 'Official study-abroad portals — USA, UK, Canada, Germany, Australia.', color: 'var(--saathi-primary)' },
}

// ─── ExpandableSidebarItem ────────────────────────────────────────────────────

function ExpandableSidebarItem({
  id,
  icon,
  label,
  href,
  isActive,
  badge,
  onClick,
  accentColor,
  description,
  iconClassName,
}: {
  id:             string
  icon:           ReactNode
  label:          string
  href?:          string
  isActive?:      boolean
  badge?:         ReactNode
  onClick?:       () => void
  accentColor?:   string
  description?:   string
  iconClassName?: string
}) {
  const [hovered, setHovered] = useState(false)
  const meta = SIDEBAR_CTA_META[id]
  const accent = accentColor ?? meta?.color ?? 'var(--saathi-primary)'
  const desc   = description ?? meta?.desc

  const activeStripe = `inset 2px 0 0 ${accent}`
  const hoverShadow  = 'var(--shadow-xs)'

  const baseStyle: CSSProperties = {
    display:        'flex',
    alignItems:     'flex-start',
    gap:            '10px',
    width:          'calc(100% - 16px)',
    padding:        '10px 14px',
    borderRadius:   '12px',
    margin:         '2px 8px',
    cursor:         'pointer',
    transition:     'all 200ms ease',
    textDecoration: 'none',
    background:     isActive ? 'var(--saathi-light)' : hovered ? 'var(--bg-elevated)' : 'transparent',
    border:         isActive ? '1px solid var(--saathi-border)' : hovered ? '1px solid var(--border-medium)' : '1px solid transparent',
    boxShadow:      isActive ? activeStripe : hovered ? hoverShadow : 'none',
  }

  const inner = (
    <div
      style={baseStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={href ? undefined : onClick}
    >
      {/* Icon — opacity ceded to keyframe animation when iconClassName is set */}
      <span
        className={iconClassName}
        style={{
          fontSize:   '16px',
          flexShrink: 0,
          marginTop:  '2px',
          lineHeight: 1,
          ...(iconClassName
            ? {}
            : { opacity: isActive || hovered ? 1 : 0.6 }),
          transition: 'color 200ms ease',
          color:      isActive || hovered ? accent : 'var(--text-tertiary)',
        }}
      >
        {icon}
      </span>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize:   'var(--text-sm)',
            fontWeight: isActive || hovered ? 600 : 500,
            color:      isActive ? 'var(--saathi-text)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
            lineHeight: 1.3,
            transition: 'all 200ms ease',
          }}>
            {label}
          </span>
          {badge}
        </div>

        {/* Description — always visible */}
        {desc && (
          <p style={{
            fontSize:   'var(--text-xs)',
            color:      hovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            lineHeight: 1.5,
            margin:     '3px 0 0',
            transition: 'color 200ms ease',
          }}>
            {desc}
          </p>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none' }} onClick={onClick}>{inner}</Link>
  }
  return inner
}

// ─── Upgrade pill ─────────────────────────────────────────────────────────────

const UPGRADE_MESSAGES = [
  { min: 0,  max: 2,   text: 'Try Saathi Plus →',          sub: '₹199/month' },
  { min: 3,  max: 5,   text: 'Enjoying this? Go Plus →',   sub: 'Unlimited learning' },
  { min: 6,  max: 9,   text: 'Your Saathi remembers you ✦', sub: 'Upgrade to protect this' },
  { min: 10, max: 999, text: '10 sessions together 🎉',     sub: 'Become a Plus member' },
]

function UpgradePill({ sessionCount }: { sessionCount: number }) {
  const msg = UPGRADE_MESSAGES.find((m) => sessionCount >= m.min && sessionCount <= m.max) ?? UPGRADE_MESSAGES[0]

  function handleClick() {
    sessionStorage.setItem('upgrade_return_url', window.location.pathname)
    sessionStorage.setItem('upgrade_trigger', 'sidebar_pill')
  }

  return (
    <Link
      href="/pricing?trigger=sidebar"
      onClick={handleClick}
      style={{
        display:        'block',
        margin:         '8px 12px',
        padding:        '12px 14px',
        borderRadius:   '12px',
        background:     'var(--saathi-light)',
        border:         '1.5px solid var(--saathi-border)',
        textDecoration: 'none',
        transition:     'all 0.2s ease',
      }}
    >
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--saathi-primary)', margin: '0 0 2px' }}>
        {msg.text}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
        {msg.sub}
      </p>
    </Link>
  )
}

// ─── Digest button ────────────────────────────────────────────────────────────

function DigestButton({
  verticalId,
  saathiName,
}: {
  verticalId:  string
  saathiName:  string
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function sendDigest() {
    if (state === 'sending' || state === 'sent') return
    setState('sending')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-session-digest`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${session.access_token}`,
            apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ verticalId }),
        }
      )
      const data = await res.json()
      if (!res.ok || data.sent === 0) {
        setState('error')
        setTimeout(() => setState('idle'), 3000)
      } else {
        setState('sent')
        setTimeout(() => setState('idle'), 4000)
      }
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const labels = {
    idle:    `📧 Email today's ${saathiName} chat`,
    sending: 'Sending…',
    sent:    '✓ Digest sent to your email',
    error:   'No session today — chat first',
  }

  return (
    <button
      onClick={sendDigest}
      disabled={state === 'sending'}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
        width:        '100%',
        padding:      '11px 16px',
        borderRadius: '0',
        background:   'var(--saathi-bg)',
        border:       'none',
        borderTop:    '1px solid var(--saathi-border)',
        borderBottom: '1px solid var(--saathi-border)',
        color:        state === 'sent'    ? 'var(--success)'
                    : state === 'error'   ? 'var(--error)'
                    : state === 'sending' ? 'var(--text-ghost)'
                    : 'var(--saathi-primary)',
        fontSize:   'var(--text-sm)',
        fontWeight: state === 'sent' ? 600 : 500,
        cursor:     state === 'sending' ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        textAlign:  'left',
        fontFamily: 'var(--font-body)',
      }}
    >
      {labels[state]}
    </button>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({
  profile,
  activeSaathi,
  quota,
  onSignOut,
  sessionCount = 0,
}: Props) {
  const pathname     = usePathname()
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [horizonCount, setHorizonCount]   = useState(0)
  const [exploreOpen, setExploreOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('faculty_bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .then(({ count }) => setBookmarkCount(count ?? 0))
  }, [profile])

  useEffect(() => {
    if (!activeSaathi?.id) return
    const supabase = createClient()
    supabase
      .from('saathi_horizons')
      .select('id', { count: 'exact', head: true })
      .eq('saathi_slug', activeSaathi.id)
      .eq('is_active', true)
      .then(({ count }) => setHorizonCount(count ?? 0))
  }, [activeSaathi?.id])

  return (
    <aside
      className="hidden h-full w-[280px] shrink-0 flex-col overflow-hidden md:flex"
      style={{
        background:   'var(--sidebar-bg)',
        borderRight:  '1px solid var(--border-subtle)',
        transition:   'background 0.4s ease',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/chat" data-tour="nav-chat">
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            EdU<span style={{ color: 'var(--saathi-primary)' }}>saathi</span>AI
          </h1>
        </Link>
      </div>

      {/* Active Saathi card */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{
          background: 'var(--saathi-bg)',
          border:     '1.5px solid var(--saathi-border)',
        }}>
          <span className="text-2xl">{activeSaathi.emoji}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              {activeSaathi.name}
            </p>
            <p className="truncate font-medium" style={{ fontSize: 'var(--text-xs)', color: 'var(--saathi-text)' }}>
              {activeSaathi.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Session digest — students only */}
      {profile.role === 'student' && profile.primary_saathi_id && (
        <DigestButton
          verticalId={profile.primary_saathi_id}
          saathiName={activeSaathi.name}
        />
      )}

      {/* Saathi Points bar */}
      <SaathiPointsBar
        profile={profile}
        primaryColor={activeSaathi.primary}
      />

      <div style={{ height: '6px' }} />

      {/* Scrollable zone */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Companionship card — students only */}
        {profile.role === 'student' && toVerticalUuid(activeSaathi.id) && (
          <div className="px-3 pt-2">
            <CompanionshipCard
              profile={profile}
              verticalId={toVerticalUuid(activeSaathi.id)!}
              location="sidebar"
              primaryColor={activeSaathi.primary}
            />
          </div>
        )}

        {/* ── Primary nav ── */}
        <nav style={{ padding: '8px 0' }}>
          <ExpandableSidebarItem
            id="chat"
            icon="💬"
            label="Chat"
            href="/chat"
            isActive={pathname === '/chat'}
            accentColor="#C9993A"
          />
          <ExpandableSidebarItem
            id="board"
            icon="🏛️"
            label="Board"
            href="/board"
            isActive={pathname === '/board'}
            accentColor="#818CF8"
          />
          <ExpandableSidebarItem
            id="news"
            icon="📡"
            label="News"
            href="/news"
            isActive={pathname === '/news'}
            accentColor="#38BDF8"
          />
          <ExpandableSidebarItem
            id="my-progress"
            icon="📊"
            label="My Progress"
            href="/progress"
            isActive={pathname === '/progress'}
            accentColor="#34D399"
          />
          <ExpandableSidebarItem
            id="your-horizon"
            icon="✦"
            iconClassName="horizon-breathe"
            label="Your Horizon"
            description={`What ${activeSaathi.name} students achieve`}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('horizon:open'))
              const el = document.getElementById('saathi-horizon-panel')
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            accentColor="var(--saathi-primary)"
            badge={
              horizonCount > 0 ? (
                <span style={{
                  fontSize:     'var(--text-xs)',
                  fontWeight:   600,
                  color:        'var(--saathi-primary)',
                  flexShrink:   0,
                  whiteSpace:   'nowrap',
                }}>
                  {horizonCount} paths →
                </span>
              ) : undefined
            }
          />
          <ExpandableSidebarItem
            id="flashcards"
            icon="🃏"
            label="Flashcards"
            href="/flashcards"
            isActive={pathname === '/flashcards'}
            accentColor="#FBBF24"
          />
          <div>
            <ExpandableSidebarItem
              id="explore-beyond"
              icon="🔭"
              label="Explore Beyond"
              onClick={() => setExploreOpen(p => !p)}
              isActive={exploreOpen}
              accentColor="#A78BFA"
            />
            <div style={{
              maxHeight:  exploreOpen ? '600px' : '0px',
              overflow:   'hidden',
              transition: 'max-height 0.3s ease',
            }}>
              <ExploreBeyond saathiSlug={activeSaathi.id} />
            </div>
          </div>
          <ExpandableSidebarItem
            id="profile"
            icon="⚙️"
            label="Profile"
            href="/profile"
            isActive={pathname === '/profile'}
            accentColor="#FB923C"
          />
        </nav>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 16px' }} />

        {/* ── Student CTAs ── */}
        {profile.role === 'student' && (
          <>
            <ExpandableSidebarItem
              id="add-extra-saathi"
              icon="✦"
              label="Add Extra Saathi"
              href="/profile?tab=profile#my-saathis"
              accentColor="var(--saathi-primary)"
              badge={
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-ghost)', flexShrink: 0 }}>
                  ₹99/mo
                </span>
              }
            />
            <ExpandableSidebarItem
              id="declare-what-you-want"
              icon="🎯"
              label="Declare What You Want"
              href="/learn"
              isActive={pathname === '/learn'}
              accentColor="#4ADE80"
            />
            <ExpandableSidebarItem
              id="internships-research"
              icon="🎓"
              label="Internships & Research"
              href="/internships"
              isActive={pathname === '/internships'}
              accentColor="#818CF8"
            />
          </>
        )}

        {/* ── Faculty CTAs ── */}
        {profile.role === 'faculty' && (
          <ExpandableSidebarItem
            id="research-interns"
            icon="🔬"
            label="Research Interns"
            href="/faculty/research"
            isActive={pathname === '/faculty/research'}
            accentColor="#C084FC"
          />
        )}

        {/* ── Shared CTAs ── */}
        <ExpandableSidebarItem
          id="faculty-finder"
          icon="👨‍🏫"
          label="Faculty Finder"
          href="/faculty-finder"
          isActive={pathname === '/faculty-finder'}
          accentColor="var(--saathi-primary)"
        />

        {bookmarkCount > 0 && (
          <ExpandableSidebarItem
            id="saved-faculty"
            icon="🔖"
            label="Saved Faculty"
            href="/saved-faculty"
            isActive={pathname === '/saved-faculty'}
            accentColor="var(--saathi-primary)"
            badge={
              <span style={{
                fontSize:     'var(--text-xs)',
                fontWeight:   700,
                minWidth:     '18px',
                height:       '18px',
                borderRadius: '9px',
                background:   'var(--saathi-light)',
                color:        'var(--saathi-primary)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                padding:      '0 5px',
                flexShrink:   0,
                border:       '1px solid var(--saathi-border)',
              }}>
                {bookmarkCount}
              </span>
            }
          />
        )}

        <ExpandableSidebarItem
          id="live-sessions"
          icon="🎙️"
          label="Live Sessions"
          href="/live"
          isActive={pathname === '/live'}
          accentColor="#DC2626"
          badge={
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#DC2626', flexShrink: 0,
              animation: 'pulse 2s ease infinite',
            }} />
          }
        />

        <ExpandableSidebarItem
          id="request-lecture"
          icon="✉️"
          label="Request a Lecture"
          href="/requests"
          isActive={pathname === '/requests'}
          accentColor="var(--saathi-primary)"
        />

        <ExpandableSidebarItem
          id="whatsapp-saathi"
          icon="💚"
          label="WhatsApp Saathi"
          onClick={() => window.open(
            `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? '919XXXXXXXXX'}?text=Hi`,
            '_blank'
          )}
          accentColor="#16A34A"
        />

        {/* World Education Explorer */}
        <div style={{ margin: '4px 8px 8px' }}>
          <WorldEducationExplorerCTA primaryColor={activeSaathi.primary} />
        </div>

        {/* Upgrade pill — free plan only */}
        {getPlanTier(profile.plan_id) === 'free' && (
          <UpgradePill sessionCount={sessionCount} />
        )}

      </div>{/* end scrollable zone */}

      {/* Daily quota strip */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        {quota.isCooling ? (
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--warning)', margin: 0 }}>
            ☕ Cooling — chats resume soon
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{
                fontSize: 'var(--text-xs)', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-ghost)',
              }}>
                Daily chats
              </span>
              <span style={{
                fontSize: 'var(--text-xs)', fontWeight: 700,
                color: quota.remaining === 0 ? 'var(--error)'
                     : quota.remaining <= 3  ? 'var(--warning)'
                     : 'var(--text-secondary)',
              }}>
                {quota.remaining} / {quota.limit} left
              </span>
            </div>
            <div style={{ height: '4px', borderRadius: '100px', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
              <div style={{
                height:       '100%',
                borderRadius: '100px',
                width:        `${(quota.remaining / quota.limit) * 100}%`,
                background:   quota.remaining === 0 ? 'var(--error)'
                            : quota.remaining <= 3  ? 'var(--warning)'
                            : 'var(--saathi-primary)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </>
        )}
      </div>

      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
            style={{ fontSize: 'var(--text-xs)', background: 'var(--saathi-primary)', color: '#FFFFFF' }}
          >
            {(profile.full_name ?? profile.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              {profile.full_name ?? 'User'}
            </p>
            <p className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {profile.plan_id} plan
              {sessionCount >= 3 && (
                <span style={{ marginLeft: '6px' }}>
                  {sessionCount >= 25 ? '🦋' : sessionCount >= 15 ? '💥' : sessionCount >= 8 ? '🔥' : '✨'}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full rounded-lg py-2 text-center font-medium transition-all duration-150"
          style={{
            fontSize:   'var(--text-sm)',
            color:      'var(--saathi-text)',
            border:     '1px solid var(--saathi-border)',
            background: 'var(--saathi-bg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background    = 'var(--saathi-light)'
            e.currentTarget.style.borderColor   = 'var(--saathi-mid)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background    = 'var(--saathi-bg)'
            e.currentTarget.style.borderColor   = 'var(--saathi-border)'
          }}
          aria-label="Sign out of EdUsaathiAI"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
