'use client'

import { motion } from 'framer-motion'
import { BOTS, type BotDefinition } from '@/constants/bots'
import { isInFreeTrial, getPlanTier } from '@/constants/plans'
import type { UserRole } from '@/types'

type Props = {
  activeSlot: 1 | 2 | 3 | 4 | 5
  userRole: UserRole | null
  planId: string
  createdAt?: string | null
  primaryColor: string
  onSelect: (slot: 1 | 2 | 3 | 4 | 5) => void
  onLockedTap: (botName: string) => void
  isLegalTheme?: boolean
  bots?: BotDefinition[]
  // When bots = FACULTY_BOTS, every slot is free (faculty are verified, not paywalled)
  allUnlocked?: boolean
}

function isUnlocked(
  slot: number,
  planId: string,
  _role: UserRole | null,
  createdAt?: string | null
): boolean {
  if (slot === 1 || slot === 5) return true // always free
  const tier = getPlanTier(planId)
  if (tier === 'free' && isInFreeTrial(createdAt)) return true
  if (tier === 'free') return false
  return true
}

export function BotSelector({
  activeSlot,
  userRole,
  planId,
  createdAt,
  onSelect,
  onLockedTap,
  isLegalTheme = false,
  bots = BOTS,
  allUnlocked = false,
}: Props) {
  return (
    <div className="flex flex-col gap-0.5 px-3">
      <p
        className="mb-1.5 px-2 text-[10px] font-semibold tracking-widest uppercase"
        style={{
          color: isLegalTheme ? 'rgba(0,0,0,0.35)' : 'var(--text-ghost)',
        }}
      >
        Saathi Modes
      </p>

      {bots.map((bot) => {
        const active  = activeSlot === bot.slot
        const unlocked = allUnlocked || isUnlocked(bot.slot, planId, userRole, createdAt)
        const accent  = bot.color

        return (
          <motion.button
            key={bot.slot}
            whileHover={{ x: 2 }}
            aria-label={`Switch to ${bot.name} mode${!unlocked ? ' (locked — upgrade to unlock)' : ''}`}
            aria-pressed={active}
            onClick={() => {
              if (!unlocked) onLockedTap(bot.name)
              else onSelect(bot.slot as 1 | 2 | 3 | 4 | 5)
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-150 outline-none"
            style={{
              background: active
                ? isLegalTheme
                  ? `${accent}14`
                  : `${accent}1A`
                : 'transparent',
              border: `0.5px solid ${
                active
                  ? isLegalTheme
                    ? `${accent}55`
                    : `${accent}66`
                  : 'transparent'
              }`,
              cursor: 'pointer',
            }}
          >
            {/* Emoji icon with a soft colored pill */}
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                flexShrink: 0,
                background: unlocked
                  ? active
                    ? `${accent}25`
                    : isLegalTheme
                      ? `${accent}12`
                      : `${accent}0F`
                  : isLegalTheme
                    ? 'rgba(0,0,0,0.04)'
                    : 'var(--bg-elevated)',
                border: `0.5px solid ${
                  unlocked
                    ? active
                      ? `${accent}55`
                      : `${accent}30`
                    : isLegalTheme
                      ? 'rgba(0,0,0,0.1)'
                      : 'var(--bg-elevated)'
                }`,
                opacity: unlocked ? 1 : 0.4,
                filter: unlocked ? 'none' : 'grayscale(0.6)',
              }}
            >
              {unlocked ? bot.emoji : '🔒'}
            </span>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13px] font-medium"
                style={{
                  color: active
                    ? isLegalTheme
                      ? '#1A1A1A'
                      : '#ffffff'
                    : unlocked
                      ? isLegalTheme
                        ? '#444444'
                        : 'var(--text-secondary)'
                      : isLegalTheme
                        ? '#BBBBBB'
                        : 'var(--text-ghost)',
                }}
              >
                {bot.name}
              </p>
            </div>

            {/* Active dot */}
            {active && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: accent,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${accent}99`,
                }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
