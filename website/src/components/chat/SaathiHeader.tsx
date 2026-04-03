'use client';

import type { Saathi } from '@/types';
import { useThemeStore } from '@/stores/themeStore';
import { NotificationBell } from '@/components/layout/NotificationBell';

type Props = {
  saathi: Saathi;
  botName: string;
  sessionCount: number;
  onCheckin?: () => void;
};

export function SaathiHeader({ saathi, botName, sessionCount, onCheckin }: Props) {
  const { mode, toggleMode } = useThemeStore();

  return (
    <div
      className="h-16 flex items-center justify-between px-5 shrink-0"
      style={{
        background: `${saathi.bg ?? saathi.primary}26`,
        borderBottom: `0.5px solid ${saathi.primary}33`,
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Left: emoji + name + tagline */}
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{saathi.emoji}</span>
        <div>
          <h2 className="font-playfair font-bold text-white text-base leading-tight">
            {saathi.name}
          </h2>
          <p className="text-[11px] leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {botName}  ·  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{saathi.tagline}</span>
          </p>
        </div>
      </div>

      {/* Right: notifications + theme toggle + check-in */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Day / Night toggle */}
        <button
          onClick={toggleMode}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        >
          {mode === 'dark' ? '☀️ Day' : '🌙 Night'}
        </button>

        {/* Check-in button (after 5 sessions) */}
        {sessionCount >= 5 && onCheckin && (
          <button
            onClick={onCheckin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
            style={{ background: 'rgba(201,153,58,0.15)', border: '0.5px solid #C9993A', color: '#C9993A' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,153,58,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(201,153,58,0.15)'; }}
          >
            ✦ Check-in
          </button>
        )}
      </div>
    </div>
  );
}
