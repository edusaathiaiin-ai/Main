'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getPlanTier } from '@/constants/plans'
import { createClient } from '@/lib/supabase/client'
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
  dataTour,
}: {
  id:             string
  icon:           ReactNode
  label:          string
  href?:          string
  isActive?:      boolean
  badge?:         ReactNode
  onClick?:       () => void
  accentColor?:   string
  dataTour?:      string
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
    return <Link href={href} style={{ textDecoration: 'none' }} onClick={onClick} data-tour={dataTour}>{inner}</Link>
  }
  return <div data-tour={dataTour}>{inner}</div>
}

// ─── Upgrade pill ─────────────────────────────────────────────────────────────

const UPGRADE_MESSAGES = [
  { min: 0,  max: 2,   text: 'Try Saathi Plus →',          sub: '₹99/month' },
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

// ─── Section helpers ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize:       'var(--text-xs)',
      fontWeight:     700,
      letterSpacing:  '0.1em',
      textTransform:  'uppercase',
      color:          'var(--text-ghost)',
      padding:        '10px 22px 4px',
      margin:         0,
    }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 16px' }} />
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({
  profile,
  activeSaathi,
  quota,
  onSignOut,
  sessionCount = 0,
}: Props) {
  const pathname = usePathname()
  const [exploreOpen, setExploreOpen] = useState(false)

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

      {/* Scrollable zone */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ── YOUR BOARDS ── */}
        <SectionLabel>Your Boards</SectionLabel>
        <ExpandableSidebarItem
          id="chat"
          icon="💬"
          label="General"
          href="/chat"
          isActive={pathname === '/chat'}
          accentColor="var(--saathi-primary)"
          description="Your main chat — ask anything."
          dataTour="nav-chat"
        />
        <ExpandableSidebarItem
          id="new-board"
          icon="+"
          label="New Board"
          href="/chat"
          onClick={() => window.dispatchEvent(new CustomEvent('board:new'))}
          accentColor="var(--saathi-primary)"
          description="Create a focused study space — separate boards for each topic keep your learning organised."
        />

        <Divider />

        {/* ── EXPLORE ── */}
        <SectionLabel>Explore</SectionLabel>
        <ExpandableSidebarItem
          id="board"
          icon="🌐"
          label="Community Board"
          href="/board"
          isActive={pathname === '/board'}
          accentColor="#818CF8"
          dataTour="nav-board"
        />
        <ExpandableSidebarItem
          id="live-sessions"
          icon="🎙️"
          label="Live Sessions"
          href="/live"
          isActive={pathname === '/live' || pathname.startsWith('/live/')}
          accentColor="#DC2626"
        />
        <ExpandableSidebarItem
          id="news"
          icon="📰"
          label="News"
          href="/news"
          isActive={pathname === '/news'}
          accentColor="#38BDF8"
        />
        <div>
          <ExpandableSidebarItem
            id="explore-beyond"
            icon="📚"
            label="Explore Beyond"
            onClick={() => setExploreOpen(p => !p)}
            isActive={exploreOpen}
            accentColor="#A78BFA"
            dataTour="nav-explore"
          />
          <div style={{
            maxHeight:  exploreOpen ? '600px' : '0px',
            overflow:   'hidden',
            transition: 'max-height 0.3s ease',
          }}>
            <ExploreBeyond saathiSlug={activeSaathi.id} />
          </div>
        </div>

        <Divider />

        {/* ── YOUR GROWTH ── */}
        <SectionLabel>Your Growth</SectionLabel>
        <ExpandableSidebarItem
          id="my-progress"
          icon="📊"
          label="My Progress"
          href="/progress"
          isActive={pathname === '/progress'}
          accentColor="#34D399"
        />
        {/* Re-opens a dismissed Horizon panel. SaathiHorizon listens for
            'horizon:open' on window — we don't navigate, we re-mount in
            place. The route stays /chat so the user keeps their context.
            The breathing ✦ uses the .horizon-breathe keyframes already
            defined in globals.css for this exact CTA. */}
        <ExpandableSidebarItem
          id="your-horizon"
          icon={<span className="horizon-breathe">✦</span>}
          label="Your Horizon"
          onClick={() => window.dispatchEvent(new CustomEvent('horizon:open'))}
          accentColor="var(--saathi-primary)"
        />
        <ExpandableSidebarItem
          id="profile"
          icon="👤"
          label="Profile"
          href="/profile"
          isActive={pathname === '/profile'}
          accentColor="#FB923C"
          dataTour="nav-profile"
        />

        {/* Upgrade pill — free plan only */}
        {getPlanTier(profile.plan_id) === 'free' && (
          <UpgradePill sessionCount={sessionCount} />
        )}

      </div>{/* end scrollable zone */}

      {/* ── Footer: quota + streak + sign out ── */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 16px 6px' }}>
        {quota.isCooling ? (
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--warning)', margin: '0 0 6px' }}>
            ☕ Cooling — chats resume soon
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>💬</span>
            <span style={{
              fontSize: 'var(--text-xs)', fontWeight: 600,
              color: quota.remaining === 0 ? 'var(--error)'
                   : quota.remaining <= 3  ? 'var(--warning)'
                   : 'var(--text-secondary)',
            }}>
              {quota.remaining} / {quota.limit} chats left today
            </span>
          </div>
        )}
        {sessionCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>
              {sessionCount >= 25 ? '🦋' : sessionCount >= 15 ? '💥' : sessionCount >= 8 ? '🔥' : '✨'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Streak: {sessionCount} sessions
            </span>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="w-full rounded-lg py-1.5 text-center transition-all duration-150"
          style={{
            fontSize:   'var(--text-xs)',
            fontWeight: 500,
            color:      'var(--text-tertiary)',
            border:     '1px solid var(--border-subtle)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background  = 'var(--bg-elevated)'
            e.currentTarget.style.borderColor = 'var(--border-medium)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = 'transparent'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
          aria-label="Sign out of EdUsaathiAI"
        >
          Sign out
        </button>
      </div>

    </aside>
  )
}
