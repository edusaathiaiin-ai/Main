'use client';

import { motion } from 'framer-motion';
import { BOTS } from '@/constants/bots';
import type { UserRole } from '@/types';

type Props = {
  activeSlot: 1 | 2 | 3 | 4 | 5;
  userRole: UserRole | null;
  planId: string;
  primaryColor: string;
  onSelect: (slot: 1 | 2 | 3 | 4 | 5) => void;
  onLockedTap: (botName: string) => void;
};

const PROVIDER_COLORS = {
  Claude: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#A78BFA' },
  Groq: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', text: '#4ADE80' },
};

function isUnlocked(slot: number, planId: string, role: UserRole | null): boolean {
  if (slot === 1 || slot === 5) return true; // always free
  if (planId === 'free') return false;
  // Non-student roles: only slots 1 and 5
  if (role && role !== 'student' && slot !== 1 && slot !== 5) return false;
  return true;
}

export function BotSelector({ activeSlot, userRole, planId, primaryColor, onSelect, onLockedTap }: Props) {
  return (
    <div className="flex flex-col gap-1.5 px-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase px-2 mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Bot Modes
      </p>
      {BOTS.map((bot) => {
        const active = activeSlot === bot.slot;
        const unlocked = isUnlocked(bot.slot, planId, userRole);
        const providerStyle = PROVIDER_COLORS[bot.apiProvider];

        return (
          <motion.button
            key={bot.slot}
            whileHover={{ x: 2 }}
            onClick={() => {
              if (!unlocked) {
                onLockedTap(bot.name);
              } else {
                onSelect(bot.slot as 1 | 2 | 3 | 4 | 5);
              }
            }}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-left transition-all duration-150 outline-none"
            style={{
              background: active ? `${primaryColor}22` : 'transparent',
              border: `0.5px solid ${active ? primaryColor : 'transparent'}`,
            }}
          >
            <span className="text-base w-4 text-center">
              {!unlocked ? '🔒' : active ? '●' : '○'}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: active ? '#fff' : unlocked ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}
              >
                {bot.name}
              </p>
            </div>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: providerStyle.bg,
                border: `0.5px solid ${providerStyle.border}`,
                color: providerStyle.text,
              }}
            >
              {bot.apiProvider}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
