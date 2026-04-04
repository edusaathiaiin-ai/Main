'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BotSelector } from '@/components/chat/BotSelector'
import { getPlanTier } from '@/constants/plans'
import { createClient } from '@/lib/supabase/client'
import type { Saathi, Profile, QuotaState } from '@/types'

type Props = {
  profile: Profile
  activeSaathi: Saathi
  activeSlot: 1 | 2 | 3 | 4 | 5
  quota: QuotaState
  onSlotChange: (slot: 1 | 2 | 3 | 4 | 5) => void
  onLockedTap: (botName: string) => void
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

function UpgradePill({ sessionCount }: { sessionCount: number }) {
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
        background:
          'linear-gradient(135deg, rgba(201,153,58,0.15), rgba(201,153,58,0.05))',
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
        style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}
      >
        {msg.sub}
      </p>
    </Link>
  )
}

const NAV_LINKS = [
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/board', icon: '🏛️', label: 'Board' },
  { href: '/news', icon: '📰', label: 'News' },
  { href: '/progress', icon: '📈', label: 'My Progress' },
  { href: '/flashcards', icon: '🃏', label: 'Flashcards' },
  { href: '/explore', icon: '🗺️', label: 'Explore Beyond' },
  { href: '/profile', icon: '👤', label: 'Profile' },
]

export function Sidebar({
  profile,
  activeSaathi,
  activeSlot,
  quota,
  onSlotChange,
  onLockedTap,
  onSignOut,
  sessionCount = 0,
  isLegalTheme = false,
}: Props) {
  // Legal theme colour helpers
  const lBg = '#FAFAFA'
  const lBorder = '1px solid #E8E8E8'
  const lText = '#1A1A1A'
  const lMuted = '#888888'
  const lHover = '#F0F0F0'
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
        <Link href="/chat">
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

      {/* Bot selector */}
      <div
        className="py-3"
        style={{
          borderBottom: isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <BotSelector
          activeSlot={activeSlot}
          userRole={profile.role}
          planId={profile.plan_id}
          createdAt={profile.created_at}
          primaryColor={activeSaathi.primary}
          onSelect={onSlotChange}
          onLockedTap={onLockedTap}
        />
      </div>

      {/* Quota indicator */}
      <div
        className="px-5 py-3"
        style={{
          borderBottom: isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        {quota.isCooling ? (
          <p className="text-xs font-medium" style={{ color: '#F59E0B' }}>
            ☕ Cooling — chats resume soon
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between">
              <span
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{
                  color: isLegalTheme ? lMuted : 'rgba(255,255,255,0.3)',
                }}
              >
                Daily quota
              </span>
              <span
                className="text-xs font-semibold"
                style={{
                  color:
                    quota.remaining <= 3
                      ? '#FD8C4E'
                      : isLegalTheme
                        ? '#555555'
                        : 'rgba(255,255,255,0.5)',
                }}
              >
                {quota.remaining} / {quota.limit}
              </span>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full"
              style={{
                background: isLegalTheme ? '#E0E0E0' : 'rgba(255,255,255,0.08)',
              }}
            >
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${(quota.remaining / quota.limit) * 100}%` }}
                style={{
                  background:
                    quota.remaining <= 3
                      ? '#F59E0B'
                      : isLegalTheme
                        ? '#1A1A1A'
                        : activeSaathi.primary,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
              style={{
                background: active
                  ? isLegalTheme
                    ? '#1A1A1A'
                    : `${activeSaathi.primary}18`
                  : 'transparent',
                color: active
                  ? isLegalTheme
                    ? '#FFFFFF'
                    : '#fff'
                  : isLegalTheme
                    ? '#444444'
                    : 'rgba(255,255,255,0.45)',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!active && isLegalTheme)
                  e.currentTarget.style.background = lHover
              }}
              onMouseLeave={(e) => {
                if (!active && isLegalTheme)
                  e.currentTarget.style.background = 'transparent'
              }}
            >
              <span className="w-5 text-center text-base">{link.icon}</span>
              {link.label}
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
            padding: '11px 14px',
            borderRadius: '12px',
            background:
              'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.03))',
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
            <p
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.32)',
                margin: 0,
              }}
            >
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
            background: 'rgba(99,102,241,0.06)',
            border: '0.5px solid rgba(99,102,241,0.25)',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>🎯</span>
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
            <p
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                margin: 0,
              }}
            >
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
            background: 'rgba(168,85,247,0.06)',
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
            <p
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                margin: 0,
              }}
            >
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
          padding: '11px 14px',
          borderRadius: '12px',
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
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
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
            }}
          >
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
            <p
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.3)',
                margin: 0,
              }}
            >
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
          padding: '11px 14px',
          borderRadius: '12px',
          background:
            'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
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
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
            }}
          >
            Learn live from experts
          </p>
        </div>
      </Link>

      {/* Lecture Requests */}
      <a
        href="/requests"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(255,255,255,0.08)',
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
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 1px',
            }}
          >
            Request a Lecture
          </p>
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.25)',
              margin: 0,
            }}
          >
            Ask your favourite faculty
          </p>
        </div>
      </a>

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
          <p
            style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
            }}
          >
            Study via chat — save this number
          </p>
        </div>
      </a>

      {/* ── Explore Beyond CTA ─────────────────────────────────────── */}
      <Link
        href="/explore"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '4px 12px 8px',
          padding: '11px 14px',
          borderRadius: '12px',
          background:
            'linear-gradient(135deg, rgba(201,153,58,0.12), rgba(201,153,58,0.04))',
          border: '0.5px solid rgba(201,153,58,0.28)',
          textDecoration: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(201,153,58,0.2), rgba(201,153,58,0.08))'
          e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(201,153,58,0.12), rgba(201,153,58,0.04))'
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
          <p
            style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.32)',
              margin: 0,
            }}
          >
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

      {/* Upgrade pill — free plan only */}
      {getPlanTier(profile.plan_id) === 'free' && (
        <UpgradePill sessionCount={sessionCount} />
      )}

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
          className="w-full rounded-lg py-2 text-center text-xs transition-colors duration-150"
          style={{
            color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.25)',
            border: isLegalTheme
              ? '0.5px solid #D0D0D0'
              : '0.5px solid rgba(255,255,255,0.07)',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = isLegalTheme
              ? '#555555'
              : 'rgba(255,255,255,0.5)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = isLegalTheme
              ? '#AAAAAA'
              : 'rgba(255,255,255,0.25)')
          }
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
