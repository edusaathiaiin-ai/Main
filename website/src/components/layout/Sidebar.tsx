'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SaathiPointsBar } from '@/components/chat/SaathiPointsBar'
import { CompanionshipCard } from '@/components/chat/CompanionshipCard'
import { getPlanTier } from '@/constants/plans'
import { toVerticalUuid } from '@/constants/verticalIds'
import { createClient } from '@/lib/supabase/client'
import { WorldEducationExplorerCTA } from '@/components/explore/WorldEducationExplorer'
import type { Saathi, Profile, QuotaState } from '@/types'

type Props = {
  profile: Profile
  activeSaathi: Saathi
  quota: QuotaState
  onSignOut: () => void
  sessionCount?: number
  isLegalTheme?: boolean
}

const UPGRADE_MESSAGES = [
  { min: 0, max: 2, text: 'Try Saathi Plus →', sub: '₹199/month' },
  {
    min: 3,
    max: 5,
    text: 'Enjoying this? Go Plus →',
    sub: 'Unlimited learning',
  },
  {
    min: 6,
    max: 9,
    text: 'Your Saathi remembers you ✦',
    sub: 'Upgrade to protect this',
  },
  {
    min: 10,
    max: 999,
    text: '10 sessions together 🎉',
    sub: 'Become a Plus member',
  },
]

function UpgradePill({
  sessionCount,
  isLegalTheme = false,
}: {
  sessionCount: number
  isLegalTheme?: boolean
}) {
  const msg =
    UPGRADE_MESSAGES.find(
      (m) => sessionCount >= m.min && sessionCount <= m.max
    ) ?? UPGRADE_MESSAGES[0]

  function handleClick() {
    sessionStorage.setItem('upgrade_return_url', window.location.pathname)
    sessionStorage.setItem('upgrade_trigger', 'sidebar_pill')
  }

  return (
    <Link
      href="/pricing?trigger=sidebar"
      onClick={handleClick}
      style={{
        display: 'block',
        margin: '8px 12px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: isLegalTheme
          ? 'rgba(201,153,58,0.08)'
          : 'linear-gradient(135deg, rgba(201,153,58,0.15), rgba(201,153,58,0.05))',
        border: '0.5px solid rgba(201,153,58,0.35)',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#C9993A',
          margin: '0 0 2px',
        }}
      >
        {msg.text}
      </p>
      <p
        style={{
          fontSize: '10px',
          color: isLegalTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
          margin: 0,
        }}
      >
        {msg.sub}
      </p>
    </Link>
  )
}

const NAV_LINKS = [
  { href: '/chat',      icon: '💬', label: 'Chat',          color: '#C9993A' },
  { href: '/board',     icon: '🏛️', label: 'Board',         color: '#818CF8' },
  { href: '/news',      icon: '📡', label: 'News',           color: '#38BDF8' },
  { href: '/progress',  icon: '📊', label: 'My Progress',   color: '#34D399' },
  { href: '/flashcards',icon: '🃏', label: 'Flashcards',    color: '#FBBF24' },
  { href: '/explore',   icon: '🔭', label: 'Explore Beyond',color: '#A78BFA' },
  { href: '/profile',   icon: '⚙️', label: 'Profile',       color: '#FB923C' },
]

function DigestButton({
  verticalId,
  saathiName,
  isLegalTheme = false,
}: {
  verticalId: string
  saathiName: string
  isLegalTheme?: boolean
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
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
        padding:      '8px 16px',
        borderRadius: '0',
        background:   state === 'sent'
          ? 'rgba(74,222,128,0.08)'
          : 'transparent',
        border:       'none',
        borderBottom: isLegalTheme
          ? '0.5px solid #E8E8E8'
          : '0.5px solid rgba(255,255,255,0.06)',
        color: state === 'sent'
          ? '#4ADE80'
          : state === 'error'
            ? '#FCA5A5'
            : isLegalTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
        fontSize:   '11px',
        fontWeight: state === 'sent' ? 600 : 400,
        cursor:     state === 'sending' ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        textAlign:  'left',
      }}
    >
      {labels[state]}
    </button>
  )
}

export function Sidebar({
  profile,
  activeSaathi,
  quota,
  onSignOut,
  sessionCount = 0,
  isLegalTheme = false,
}: Props) {
  // Legal theme colour helpers
  const lBg = '#FAFAFA'
  const lBorder = '1px solid #E8E8E8'
  const lText = '#1A1A1A'
  const lMuted = '#888888'

  // Subtitle colour — key fix: was always white, now adapts
  const lSub = 'rgba(0,0,0,0.45)'
  const dSub = 'rgba(255,255,255,0.3)'
  const subColor = isLegalTheme ? lSub : dSub

  const pathname = usePathname()
  const [bookmarkCount, setBookmarkCount] = useState(0)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('faculty_bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', profile.id)
      .then(({ count }) => setBookmarkCount(count ?? 0))
  }, [profile])

  return (
    <aside
      className="hidden h-full w-[280px] shrink-0 flex-col overflow-hidden md:flex"
      style={{
        background: isLegalTheme ? lBg : '#060F1D',
        borderRight: isLegalTheme
          ? lBorder
          : '0.5px solid rgba(255,255,255,0.07)',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Logo */}
      <div
        className="px-5 pt-5 pb-4"
        style={{
          borderBottom: isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href="/chat" data-tour="nav-chat">
          <h1
            className="font-playfair text-xl font-bold"
            style={{ color: isLegalTheme ? lText : '#ffffff' }}
          >
            EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
          </h1>
        </Link>
      </div>

      {/* Active Saathi card */}
      <div
        className="px-3 py-3"
        style={{
          borderBottom: isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: isLegalTheme ? '#F0F0F0' : `${activeSaathi.primary}18`,
            border: isLegalTheme
              ? '0.5px solid #D8D8D8'
              : `0.5px solid ${activeSaathi.primary}33`,
          }}
        >
          <span className="text-2xl">{activeSaathi.emoji}</span>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: isLegalTheme ? lText : '#ffffff' }}
            >
              {activeSaathi.name}
            </p>
            <p
              className="truncate text-[10px]"
              style={{ color: isLegalTheme ? lMuted : 'rgba(255,255,255,0.4)' }}
            >
              {activeSaathi.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Session digest button — students only */}
      {profile.role === 'student' && profile.primary_saathi_id && (
        <DigestButton
          verticalId={profile.primary_saathi_id}
          saathiName={activeSaathi.name}
          isLegalTheme={isLegalTheme}
        />
      )}

      {/* Saathi Points bar — prominent, right below Saathi card */}
      <SaathiPointsBar
        profile={profile}
        isLegalTheme={isLegalTheme}
        primaryColor={activeSaathi.primary}
      />

      {/* 6px breathing room */}
      <div style={{ height: '6px' }} />

      {/* Scrollable zone: nav links + all CTAs */}
      <div className="flex-1 min-h-0 overflow-y-auto">

      {/* Companionship card — students only, triggered when milestone reached */}
      {profile.role === 'student' && toVerticalUuid(activeSaathi.id) && (
        <div className="px-3 pt-2">
          <CompanionshipCard
            profile={profile}
            verticalId={toVerticalUuid(activeSaathi.id)!}
            location="sidebar"
            isLegalTheme={isLegalTheme}
            primaryColor={activeSaathi.primary}
          />
        </div>
      )}

      {/* Add Extra Saathi CTA — students only */}
      {profile.role === 'student' && (
        <Link
          href="/profile?tab=profile#my-saathis"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: isLegalTheme
              ? `${activeSaathi.primary}08`
              : `${activeSaathi.primary}12`,
            border: `0.5px solid ${activeSaathi.primary}35`,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              background: `${activeSaathi.primary}20`,
              border: `0.5px solid ${activeSaathi.primary}40`,
            }}
          >
            ✦
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: isLegalTheme ? activeSaathi.primary : activeSaathi.accent,
                margin: '0 0 1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Add Extra Saathi
            </p>
            <p style={{ fontSize: '9px', color: subColor, margin: 0 }}>
              ₹99/month · or 500 SP free
            </p>
          </div>
          <span
            style={{
              fontSize: '10px',
              color: isLegalTheme
                ? `${activeSaathi.primary}60`
                : 'rgba(255,255,255,0.25)',
              flexShrink: 0,
            }}
          >
            →
          </span>
        </Link>
      )}

      {/* Nav links */}
      <nav className="px-3 py-3">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          const accent = link.color
          return (
            <Link
              key={link.href}
              href={link.href}
              className="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150"
              style={{
                background: active
                  ? isLegalTheme
                    ? `${accent}14`
                    : `${accent}1A`
                  : 'transparent',
                color: active
                  ? isLegalTheme ? '#1A1A1A' : '#fff'
                  : isLegalTheme ? '#444444' : 'rgba(255,255,255,0.5)',
                border: `0.5px solid ${active ? `${accent}40` : 'transparent'}`,
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = isLegalTheme
                    ? `${accent}0D`
                    : `${accent}12`
                  e.currentTarget.style.borderColor = `${accent}25`
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              {/* Icon pill */}
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  flexShrink: 0,
                  background: active
                    ? `${accent}25`
                    : isLegalTheme
                      ? `${accent}12`
                      : `${accent}10`,
                  border: `0.5px solid ${active ? `${accent}55` : `${accent}28`}`,
                }}
              >
                {link.icon}
              </span>
              <span style={{ fontWeight: active ? 600 : 400 }}>{link.label}</span>
              {/* Active indicator */}
              {active && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: accent,
                    flexShrink: 0,
                    boxShadow: `0 0 5px ${accent}99`,
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Learn Intent CTA — students only */}
      {profile.role === 'student' && (
        <Link
          href="/learn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 12px',
            padding: '10px 14px',
            minHeight: '48px',
            borderRadius: '12px',
            background: isLegalTheme
              ? 'rgba(74,222,128,0.06)'
              : 'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.03))',
            border: '0.5px solid rgba(74,222,128,0.28)',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>🎯</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#4ADE80',
                margin: '0 0 1px',
              }}
            >
              Declare What You Want
            </p>
            <p style={{ fontSize: '9px', color: subColor, margin: 0 }}>
              Professors find you → sessions happen
            </p>
          </div>
        </Link>
      )}

      {/* Internships & Research CTA — students only */}
      {profile.role === 'student' && (
        <Link
          href="/internships"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: isLegalTheme
              ? 'rgba(99,102,241,0.04)'
              : 'rgba(99,102,241,0.06)',
            border: '0.5px solid rgba(99,102,241,0.25)',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>🎓</span>
          <div>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#818CF8',
                margin: '0 0 1px',
              }}
            >
              Internships & Research
            </p>
            <p style={{ fontSize: '10px', color: subColor, margin: 0 }}>
              Soul-matched opportunities
            </p>
          </div>
        </Link>
      )}

      {/* Research Interns CTA — faculty only */}
      {profile.role === 'faculty' && (
        <Link
          href="/faculty/research"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: isLegalTheme
              ? 'rgba(168,85,247,0.04)'
              : 'rgba(168,85,247,0.06)',
            border: '0.5px solid rgba(168,85,247,0.25)',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>🔬</span>
          <div>
            <p
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#C084FC',
                margin: '0 0 1px',
              }}
            >
              Research Interns
            </p>
            <p style={{ fontSize: '10px', color: subColor, margin: 0 }}>
              Post projects · find co-authors
            </p>
          </div>
        </Link>
      )}

      {/* Faculty Finder CTA */}
      <Link
        href="/faculty-finder"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px',
          padding: '10px 14px',
          minHeight: '48px',
          borderRadius: '12px',
          background: isLegalTheme
            ? 'rgba(99,102,241,0.04)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
          border: '0.5px solid rgba(99,102,241,0.3)',
          textDecoration: 'none',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '18px' }}>{'\u{1F468}\u200D\u{1F3EB}'}</span>
        <div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#818CF8',
              margin: '0 0 1px',
            }}
          >
            Faculty Finder
          </p>
          <p style={{ fontSize: '10px', color: subColor, margin: 0 }}>
            Book 1:1 expert sessions
          </p>
        </div>
      </Link>

      {/* Saved Faculty CTA — only when bookmarks exist */}
      {bookmarkCount > 0 && (
        <Link
          href="/saved-faculty"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '4px 12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(201,153,58,0.06)',
            border: '0.5px solid rgba(201,153,58,0.2)',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '16px' }}>🔖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#C9993A',
                margin: '0 0 1px',
              }}
            >
              Saved Faculty
            </p>
            <p style={{ fontSize: '9px', color: subColor, margin: 0 }}>
              Revisit and book when ready
            </p>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: 'rgba(201,153,58,0.25)',
              color: '#C9993A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              flexShrink: 0,
            }}
          >
            {bookmarkCount}
          </span>
        </Link>
      )}

      {/* Live Sessions CTA */}
      <Link
        href="/live"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px',
          padding: '10px 14px',
          minHeight: '48px',
          borderRadius: '12px',
          background: isLegalTheme
            ? 'rgba(239,68,68,0.05)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
          border: '0.5px solid rgba(239,68,68,0.3)',
          textDecoration: 'none',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#F87171',
            animation: 'pulse 2s ease infinite',
          }}
        />
        <span style={{ fontSize: '18px' }}>{'\u{1F399}\u{FE0F}'}</span>
        <div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#F87171',
              margin: '0 0 1px',
            }}
          >
            Live Sessions
          </p>
          <p style={{ fontSize: '10px', color: subColor, margin: 0 }}>
            Learn live from experts
          </p>
        </div>
      </Link>

      {/* Lecture Requests */}
      <Link
        href="/requests"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: isLegalTheme
            ? 'rgba(0,0,0,0.02)'
            : 'rgba(255,255,255,0.02)',
          border: isLegalTheme
            ? '0.5px solid rgba(0,0,0,0.08)'
            : '0.5px solid rgba(255,255,255,0.08)',
          textDecoration: 'none',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: '16px' }}>{'\u{2709}'}</span>
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: isLegalTheme ? '#555555' : 'rgba(255,255,255,0.6)',
              margin: '0 0 1px',
            }}
          >
            Request a Lecture
          </p>
          <p style={{ fontSize: '10px', color: subColor, margin: 0 }}>
            Ask your favourite faculty
          </p>
        </div>
      </Link>

      {/* WhatsApp Saathi link */}
      <a
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? '919XXXXXXXXX'}?text=Hi`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'rgba(37,211,102,0.08)',
          border: '0.5px solid rgba(37,211,102,0.25)',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#25D366',
              margin: '0 0 1px',
            }}
          >
            WhatsApp Saathi
          </p>
          <p style={{ fontSize: '9px', color: subColor, margin: 0 }}>
            Study via chat — save this number
          </p>
        </div>
      </a>

      {/* Explore Beyond CTA */}
      <Link
        href="/explore"
        data-tour="nav-explore"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px 8px',
          padding: '10px 14px',
          minHeight: '48px',
          borderRadius: '12px',
          background: isLegalTheme
            ? 'rgba(201,153,58,0.06)'
            : 'linear-gradient(135deg, rgba(201,153,58,0.12), rgba(201,153,58,0.04))',
          border: '0.5px solid rgba(201,153,58,0.28)',
          textDecoration: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isLegalTheme
            ? 'rgba(201,153,58,0.12)'
            : 'linear-gradient(135deg, rgba(201,153,58,0.2), rgba(201,153,58,0.08))'
          e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isLegalTheme
            ? 'rgba(201,153,58,0.06)'
            : 'linear-gradient(135deg, rgba(201,153,58,0.12), rgba(201,153,58,0.04))'
          e.currentTarget.style.borderColor = 'rgba(201,153,58,0.28)'
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            right: '-8px',
            top: '-8px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(201,153,58,0.12)',
            filter: 'blur(14px)',
            pointerEvents: 'none',
          }}
        />
        <span style={{ fontSize: '18px', flexShrink: 0 }}>🗺️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#C9993A',
              margin: '0 0 1px',
            }}
          >
            Explore Beyond
          </p>
          <p style={{ fontSize: '9px', color: subColor, margin: 0 }}>
            Books · Journals · Tools · Channels
          </p>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: 'rgba(201,153,58,0.55)',
            flexShrink: 0,
          }}
        >
          →
        </span>
      </Link>

      {/* World Education Explorer */}
      <div style={{ margin: '4px 12px 8px' }}>
        <WorldEducationExplorerCTA
          isLegalTheme={isLegalTheme}
          primaryColor={activeSaathi.primary}
        />
      </div>

      {/* Upgrade pill — free plan only */}
      {getPlanTier(profile.plan_id) === 'free' && (
        <UpgradePill sessionCount={sessionCount} isLegalTheme={isLegalTheme} />
      )}

      </div>{/* end scrollable zone */}

      {/* Daily quota — compact strip */}
      <div style={{
        padding:   '8px 16px',
        borderTop: isLegalTheme
          ? '0.5px solid #E8E8E8'
          : '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {quota.isCooling ? (
          <p style={{ fontSize: '11px', fontWeight: 500, color: '#F59E0B', margin: 0 }}>
            ☕ Cooling — chats resume soon
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isLegalTheme ? lMuted : 'rgba(255,255,255,0.25)',
              }}>
                Daily chats
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: quota.remaining === 0
                  ? '#F87171'
                  : quota.remaining <= 3
                    ? '#FBBF24'
                    : isLegalTheme ? '#555555' : 'rgba(255,255,255,0.5)',
              }}>
                {quota.remaining} / {quota.limit} left
              </span>
            </div>
            <div style={{
              height: '3px', borderRadius: '100px', overflow: 'hidden',
              background: isLegalTheme ? '#E0E0E0' : 'rgba(255,255,255,0.06)',
            }}>
              <div style={{
                height: '100%', borderRadius: '100px',
                width: `${(quota.remaining / quota.limit) * 100}%`,
                background: quota.remaining === 0
                  ? '#F87171'
                  : quota.remaining <= 3
                    ? '#FBBF24'
                    : isLegalTheme ? '#1A1A1A' : activeSaathi.primary,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </>
        )}
      </div>

      {/* User footer */}
      <div
        className="px-4 py-4"
        style={{
          borderTop: isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: isLegalTheme ? '#1A1A1A' : activeSaathi.primary,
              color: isLegalTheme ? '#FFFFFF' : '#060F1D',
            }}
          >
            {(profile.full_name ?? profile.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-semibold"
              style={{ color: isLegalTheme ? lText : '#ffffff' }}
            >
              {profile.full_name ?? 'User'}
            </p>
            <p
              className="truncate text-[10px]"
              style={{ color: isLegalTheme ? lMuted : 'rgba(255,255,255,0.3)' }}
            >
              {profile.plan_id} plan
              {sessionCount >= 3 && (
                <span style={{ marginLeft: '6px' }}>
                  {sessionCount >= 25
                    ? '🦋'
                    : sessionCount >= 15
                      ? '💥'
                      : sessionCount >= 8
                        ? '🔥'
                        : '✨'}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full rounded-lg py-2 text-center text-xs font-medium transition-all duration-150"
          style={{
            color: isLegalTheme ? '#1E3A5F' : activeSaathi.accent,
            border: isLegalTheme
              ? `0.5px solid #1E3A5F`
              : `0.5px solid ${activeSaathi.accent}55`,
            background: isLegalTheme
              ? 'rgba(30,58,95,0.05)'
              : `${activeSaathi.accent}0D`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isLegalTheme
              ? 'rgba(30,58,95,0.12)'
              : `${activeSaathi.accent}22`
            e.currentTarget.style.borderColor = isLegalTheme
              ? '#1E3A5F'
              : activeSaathi.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isLegalTheme
              ? 'rgba(30,58,95,0.05)'
              : `${activeSaathi.accent}0D`
            e.currentTarget.style.borderColor = isLegalTheme
              ? '#1E3A5F'
              : `${activeSaathi.accent}55`
          }}
          aria-label="Sign out of EdUsaathiAI"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
