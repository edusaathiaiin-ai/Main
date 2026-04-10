'use client'

import type { Saathi } from '@/types'
import { useThemeStore } from '@/stores/themeStore'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useFontStore, useFontStoreSync } from '@/stores/fontStore'
import type { FontSize } from '@/stores/fontStore'
import { BOTS } from '@/constants/bots'
import { isInFreeTrial, getPlanTier } from '@/constants/plans'
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
}

export function SaathiHeader({
  saathi,
  botName,
  sessionCount,
  onCheckin,
  isLegalTheme = false,
  activeSlot,
  planId,
  createdAt,
  onSlotChange,
  onLockedTap,
}: Props) {
  const { mode, toggleMode } = useThemeStore()
  const { fontSize, setFontSize } = useFontStore()
  useFontStoreSync()

  function isUnlocked(slot: number): boolean {
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
      {/* Top row: name + controls */}
      <div className="flex h-14 items-center justify-between px-5">
        {/* Left: emoji + name + tagline */}
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{saathi.emoji}</span>
          <div>
            <h2
              className="font-display text-base leading-tight font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {saathi.name}
            </h2>
            <p
              className="mt-0.5 text-xs leading-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              {botName} ·{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                {saathi.tagline}
              </span>
            </p>
          </div>
        </div>

        {/* Right: notifications + font size + theme */}
        <div className="flex items-center gap-2">
          <NotificationBell />

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
          gap:           '6px',
          padding:       '8px 16px',
          borderTop:     '1px solid var(--border-subtle)',
          overflowX:     'auto',
          scrollbarWidth:'none',
          background:    'var(--bg-surface)',
        }}
      >
        {BOTS.map((bot) => {
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
                padding:      '5px 12px',
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
      </div>
    </div>
  )
}
