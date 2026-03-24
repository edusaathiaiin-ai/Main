'use client';

import type { Saathi } from '@/types';

type Props = {
  saathi: Saathi;
  botName: string;
  apiProvider: 'Claude' | 'Groq';
  sessionCount: number;
  onCheckin?: () => void;
};

const PROVIDER_STYLE = {
  Claude: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#A78BFA' },
  Groq: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', text: '#4ADE80' },
};

export function SaathiHeader({ saathi, botName, apiProvider, sessionCount, onCheckin }: Props) {
  const provider = PROVIDER_STYLE[apiProvider];

  return (
    <div
      className="h-16 flex items-center justify-between px-5 shrink-0"
      style={{
        background: `${saathi.bg ?? saathi.primary}26`,
        borderBottom: `0.5px solid ${saathi.primary}33`,
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

      {/* Right: check-in + provider badge */}
      <div className="flex items-center gap-2">
        {/* API provider badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: provider.bg, border: `0.5px solid ${provider.border}`, color: provider.text }}
        >
          {apiProvider}
        </span>

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
