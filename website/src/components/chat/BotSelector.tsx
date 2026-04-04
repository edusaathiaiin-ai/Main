'use client'

import { motion } from 'framer-motion'
import { BOTS } from '@/constants/bots'
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
}

function isUnlocked(
  slot: number,
  planId: string,
  role: UserRole | null,
  createdAt?: string | null
): boolean {
  if (slot === 1 || slot === 5) return true // always free
  // Free trial: all slots open for first 7 days
  const tier = getPlanTier(planId)
  if (tier === 'free' && isInFreeTrial(createdAt)) return true
  if (tier === 'free') return false
  if (role && role !== 'student' && slot !== 1 && slot !== 5) return false
  return true
}

export function BotSelector({
  activeSlot,
  userRole,
  planId,
  createdAt,
  primaryColor,
  onSelect,
  onLockedTap,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5 px-3">
      <p
        className="mb-1 px-2 text-[10px] font-semibold tracking-widest uppercase"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        Bot Modes
      </p>
      {BOTS.map((bot) => {
        const active = activeSlot === bot.slot
        const unlocked = isUnlocked(bot.slot, planId, userRole, createdAt)

        return (
          <motion.button
            key={bot.slot}
            whileHover={{ x: 2 }}
            onClick={() => {
              if (!unlocked) {
                onLockedTap(bot.name)
              } else {
                onSelect(bot.slot as 1 | 2 | 3 | 4 | 5)
              }
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 outline-none"
            style={{
              background: active ? `${primaryColor}22` : 'transparent',
              border: `0.5px solid ${active ? primaryColor : 'transparent'}`,
              cursor: 'pointer',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <span className="w-4 text-center text-base">
              {!unlocked ? '🔒' : active ? '●' : '○'}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{
                  color: active
                    ? '#fff'
                    : unlocked
                      ? 'rgba(255,255,255,0.6)'
                      : 'rgba(255,255,255,0.3)',
                }}
              >
                {bot.name}
              </p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
