'use client'

import type { Saathi } from '@/types'
import { useThemeStore } from '@/stores/themeStore'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useFontStore, useFontStoreSync } from '@/stores/fontStore'
import type { FontSize } from '@/stores/fontStore'
import { BOTS, FACULTY_BOTS } from '@/constants/bots'
import { isInFreeTrial, getPlanTier } from '@/constants/plans'
import { useViewAsStore } from '@/stores/viewAsStore'
import { ViewAsToggle } from './ViewAsToggle'
import { FacultyToolsButton } from '@/components/faculty/FacultyToolsButton'
import type { UserRole } from '@/types'

type Props = {
  saathi:        Saathi
  botName:       string
  sessionCount:  number
  onCheckin?:    () => void
  isLegalTheme?: boolean
  // bot strip
  activeSlot:    1 | 2 | 3 | 4 | 5
  planId:        string
  userRole:      UserRole | null
  createdAt?:    string | null
  onSlotChange:  (slot: 1 | 2 | 3 | 4 | 5) => void
  onLockedTap:   (botName: string) => void
  onSuggestFaculty?: () => void
  onEmailDigest?: () => void
  digestState?: 'idle' | 'sending' | 'sent' | 'error'
  onWalkthrough?: () => void
}

export function SaathiHeader({
  saathi,
  botName,
  sessionCount,
  onCheckin,
  isLegalTheme: _isLegalTheme = false,
  activeSlot,
  planId,
  userRole,
  createdAt,
  onSlotChange,
  onLockedTap,
  onSuggestFaculty,
  onEmailDigest,
  digestState = 'idle',
  onWalkthrough,
}: Props) {
  const { mode, toggleMode } = useThemeStore()
  const { fontSize, setFontSize } = useFontStore()
  useFontStoreSync()
  const { viewAs } = useViewAsStore()

  const isFacultyUser = userRole === 'faculty'
  const effectiveRole = isFacultyUser ? viewAs : 'student'
  const bots = effectiveRole === 'faculty' ? FACULTY_BOTS : BOTS

  function isUnlocked(slot: number): boolean {
    // Faculty modes: every slot unlocked (verified, not paywalled)
    if (effectiveRole === 'faculty') return true
    if (slot === 1 || slot === 5) return true
    const tier = getPlanTier(planId)
    if (tier === 'free' && isInFreeTrial(createdAt)) return true
    return tier !== 'free'
  }

  const primaryColor = saathi.primary

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
        flexShrink: 0,
      }}
    >
      {/* Top row: name + controls
          h-11 (44px) is the compact chrome height set by fdee2d4.
          Works because .h-compact (18px) + 2px gap + .p-compact (13px) = 33px
          fits with 5.5px top/bottom padding. */}
      <div className="flex h-11 items-center justify-between px-4">
        {/* Left: emoji + name + tagline
            Uses .h-compact / .p-compact from globals.css — the constitution's
            explicit variants for fixed-height chrome rows. Semantic tags kept. */}
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{saathi.emoji}</span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h2 className="h-compact" style={{ whiteSpace: 'nowrap' }}>
              {saathi.name}
            </h2>
            <p
              className="p-compact"
              style={{
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {botName} ·{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {saathi.tagline}
              </span>
            </p>
          </div>
        </div>

        {/* Right: actions + controls */}
        <div className="flex items-center gap-2">
          {/* Email today's chat */}
          {onEmailDigest && (
            <button
              onClick={onEmailDigest}
              disabled={digestState === 'sending'}
              title="Email today's chat as a study summary — key concepts + homework for tomorrow"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
              style={{
                background: digestState === 'sent' ? 'var(--success-bg)' : 'var(--bg-elevated)',
                border: `1px solid ${digestState === 'sent' ? 'var(--success)' : 'var(--border-medium)'}`,
                color: digestState === 'sent' ? 'var(--success)' : digestState === 'error' ? 'var(--error)' : 'var(--text-secondary)',
                cursor: digestState === 'sending' ? 'not-allowed' : 'pointer',
              }}
            >
              {digestState === 'sending' ? '⏳' : digestState === 'sent' ? '✓' : digestState === 'error' ? '✗' : '📧'}
              {digestState === 'sent' ? 'Sent to your email!' : digestState === 'error' ? 'No chat today' : digestState === 'sending' ? 'Sending...' : "Email today's chat"}
            </button>
          )}

          {/* Walkthrough */}
          {onWalkthrough && (
            <button
              onClick={onWalkthrough}
              title="Take a guided tour of all features"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              🎓 Guided tour
            </button>
          )}

          {/* Faculty research basket — only when actually in faculty view */}
          {isFacultyUser && viewAs === 'faculty' && <FacultyToolsButton />}

          <NotificationBell />

          {/* Viewing-as toggle — faculty only */}
          {isFacultyUser && <ViewAsToggle />}

          {/* Font size: three Aa buttons */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '2px',
            padding:      '4px 6px',
            borderRadius: '8px',
            background:   'var(--bg-elevated)',
            border:       '1px solid var(--border-medium)',
          }}>
            {(['M', 'L', 'XL'] as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                title={size === 'M' ? 'Normal text' : size === 'L' ? 'Large text' : 'Extra large text'}
                aria-pressed={fontSize === size}
                style={{
                  padding:      '4px 8px',
                  borderRadius: '6px',
                  background:   fontSize === size ? 'var(--saathi-light)' : 'transparent',
                  border:       fontSize === size ? '1px solid var(--saathi-border)' : '1px solid transparent',
                  color:        fontSize === size ? 'var(--saathi-text)' : 'var(--text-tertiary)',
                  fontSize:     size === 'M' ? '11px' : size === 'L' ? '13px' : '15px',
                  fontWeight:   700,
                  cursor:       'pointer',
                  lineHeight:   1,
                  fontFamily:   'var(--font-body)',
                  transition:   'all 150ms ease',
                }}
              >
                Aa
              </button>
            ))}
          </div>

          {/* Day / Night toggle */}
          <button
            onClick={toggleMode}
            title={mode === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
            aria-label={mode === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
            className="flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200"
            style={{
              padding:    '6px 12px',
              background: 'var(--bg-elevated)',
              border:     '1px solid var(--border-medium)',
              color:      'var(--text-secondary)',
              fontSize:   'var(--text-xs)',
              cursor:     'pointer',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background   = 'var(--saathi-light)'
              e.currentTarget.style.borderColor  = 'var(--saathi-border)'
              e.currentTarget.style.color        = 'var(--saathi-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background   = 'var(--bg-elevated)'
              e.currentTarget.style.borderColor  = 'var(--border-medium)'
              e.currentTarget.style.color        = 'var(--text-secondary)'
            }}
          >
            <span>{mode === 'dark' ? '☀️' : '🌙'}</span>
            <span>{mode === 'dark' ? 'Day' : 'Night'}</span>
          </button>

          {sessionCount >= 5 && onCheckin && (
            <button
              onClick={onCheckin}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={{
                background: 'rgba(201,153,58,0.15)',
                border: '0.5px solid #C9993A',
                color: '#C9993A',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,153,58,0.25)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(201,153,58,0.15)' }}
            >
              ✦ Check-in
            </button>
          )}
        </div>
      </div>

      {/* Saathi Modes — horizontal scrollable strip */}
      <div
        style={{
          display:       'flex',
          gap:           '4px',
          padding:       '4px 12px',
          borderTop:     '1px solid var(--border-subtle)',
          overflowX:     'auto',
          scrollbarWidth:'none',
          background:    'var(--bg-surface)',
        }}
      >
        {bots.map((bot) => {
          const active   = activeSlot === bot.slot
          const unlocked = isUnlocked(bot.slot)
          return (
            <button
              key={bot.slot}
              onClick={() => {
                if (!unlocked) onLockedTap(bot.name)
                else onSlotChange(bot.slot)
              }}
              aria-pressed={active}
              aria-label={`${bot.name}${!unlocked ? ' (locked)' : ''}`}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '5px',
                padding:      '4px 10px',
                borderRadius: '100px',
                border:     active
                  ? '1px solid var(--saathi-border)'
                  : '1px solid var(--border-subtle)',
                background: active ? 'var(--saathi-light)' : 'transparent',
                color:      active
                  ? 'var(--saathi-text)'
                  : unlocked
                    ? 'var(--text-secondary)'
                    : 'var(--text-ghost)',
                fontSize:     '12px',
                fontWeight:   active ? 600 : 400,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'all 0.18s',
                flexShrink:   0,
                fontFamily:   'DM Sans, sans-serif',
              }}
            >
              <span style={{ fontSize: '13px', opacity: unlocked ? 1 : 0.4 }}>
                {unlocked ? bot.emoji : '🔒'}
              </span>
              {bot.name}
              {active && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: primaryColor, flexShrink: 0,
                  boxShadow: `0 0 4px ${primaryColor}99`,
                }} />
              )}
            </button>
          )
        })}

        {/* Suggest a Faculty — after bot slots */}
        {onSuggestFaculty && (
          <div style={{ position: 'relative', flexShrink: 0 }} className="group">
            <button
              onClick={onSuggestFaculty}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '5px',
                padding:      '4px 10px',
                borderRadius: '100px',
                border:       '1px solid var(--border-subtle)',
                background:   'transparent',
                color:        'var(--text-tertiary)',
                fontSize:     '12px',
                fontWeight:   500,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'all 0.18s',
                fontFamily:   'DM Sans, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#16A34A'
                e.currentTarget.style.color       = '#16A34A'
                e.currentTarget.style.background  = 'rgba(22,163,74,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.color       = 'var(--text-tertiary)'
                e.currentTarget.style.background  = 'transparent'
              }}
            >
              <span style={{ fontSize: '13px' }}>👨‍🏫</span>
              Suggest a Faculty
            </button>
            {/* Hover tooltip */}
            <div
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-lg px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:  'var(--text-primary)',
                color:       'var(--bg-surface)',
                fontSize:    '11px',
                lineHeight:  '1.4',
                width:       '200px',
                textAlign:   'center',
                boxShadow:   '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              Know a great teacher? Nominate them to join EdUsaathiAI and earn rewards when they get verified.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
