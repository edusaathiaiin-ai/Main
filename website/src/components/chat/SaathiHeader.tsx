'use client'

import type { Saathi } from '@/types'
import { useThemeStore } from '@/stores/themeStore'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { FontSelector } from '@/components/chat/FontSelector'
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
        background: isLegalTheme ? '#FFFFFF' : `${saathi.bg ?? saathi.primary}26`,
        borderBottom: isLegalTheme
          ? '1px solid #E0E0E0'
          : `0.5px solid ${saathi.primary}33`,
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
              className="font-playfair text-base leading-tight font-bold"
              style={{ color: isLegalTheme ? '#1A1A1A' : '#ffffff' }}
            >
              {saathi.name}
            </h2>
            <p
              className="mt-0.5 text-[11px] leading-none"
              style={{ color: isLegalTheme ? '#888888' : 'rgba(255,255,255,0.45)' }}
            >
              {botName} ·{' '}
              <span style={{ color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.3)' }}>
                {saathi.tagline}
              </span>
            </p>
          </div>
        </div>

        {/* Right: notifications + font + theme + check-in */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <FontSelector isLegalTheme={isLegalTheme} />
          <button
            onClick={toggleMode}
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200"
            style={{
              background: isLegalTheme ? '#F0F0F0' : 'rgba(255,255,255,0.07)',
              border: isLegalTheme ? '0.5px solid #D0D0D0' : '0.5px solid rgba(255,255,255,0.15)',
              color: isLegalTheme ? '#555555' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLegalTheme ? '#E4E4E4' : 'rgba(255,255,255,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLegalTheme ? '#F0F0F0' : 'rgba(255,255,255,0.07)'
            }}
          >
            {mode === 'dark' ? '☀️ Day' : '🌙 Night'}
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
          borderTop:     isLegalTheme
            ? '0.5px solid #E8E8E8'
            : '0.5px solid rgba(255,255,255,0.06)',
          overflowX:     'auto',
          scrollbarWidth:'none',
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
                border:       active
                  ? `1px solid ${primaryColor}60`
                  : isLegalTheme
                    ? '0.5px solid #E0E0E0'
                    : '0.5px solid rgba(255,255,255,0.08)',
                background:   active
                  ? `${primaryColor}15`
                  : isLegalTheme
                    ? 'rgba(0,0,0,0.03)'
                    : 'rgba(255,255,255,0.03)',
                color:        active
                  ? isLegalTheme ? '#1A1A1A' : primaryColor
                  : unlocked
                    ? isLegalTheme ? '#555555' : 'rgba(255,255,255,0.45)'
                    : isLegalTheme ? '#BBBBBB' : 'rgba(255,255,255,0.2)',
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
