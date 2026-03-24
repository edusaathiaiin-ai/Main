'use client';

import type { Saathi } from '@/types';

type Props = {
  activeSaathi: Saathi;
  onAskQuestion: () => void;
  canPost: boolean;
};

// Top contributors: placeholder until we have real aggregation query
const TOP_FACULTY = [
  { name: 'Prof. Ramesh Iyer', badge: '👨‍🏫', verified: true },
  { name: 'Dr. Sunita Mehra', badge: '👩‍🏫', verified: true },
  { name: 'Mr. Aditya Shah', badge: '👨‍🎓', verified: false },
];

export function BoardSidebar({ activeSaathi, onAskQuestion, canPost }: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-[300px] shrink-0 gap-4">
      {/* Ask button */}
      <div>
        {canPost ? (
          <button
            onClick={onAskQuestion}
            className="w-full py-3.5 rounded-2xl text-base font-bold transition-all duration-200"
            style={{ background: '#C9993A', color: '#060F1D' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E5B86A')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
          >
            ✦ Ask a Question
          </button>
        ) : (
          <div className="relative group w-full">
            <button
              className="w-full py-3.5 rounded-2xl text-base font-bold opacity-50 cursor-not-allowed"
              style={{ background: '#C9993A', color: '#060F1D' }}
            >
              ✦ Ask a Question
            </button>
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 text-xs text-center py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              Board posting available for Indian students
            </div>
          </div>
        )}
      </div>

      {/* Active Saathi card */}
      <div
        className="rounded-2xl p-4"
        style={{ background: `${activeSaathi.primary}12`, border: `0.5px solid ${activeSaathi.primary}33` }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{activeSaathi.emoji}</span>
          <div>
            <p className="text-sm font-bold text-white">{activeSaathi.name}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{activeSaathi.tagline}</p>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Questions in this community are answered by AI and reviewed by faculty.
        </p>
      </div>

      {/* Top contributors */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Top Contributors
        </p>
        <div className="space-y-2.5">
          {TOP_FACULTY.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: 'rgba(22,163,74,0.15)', border: '0.5px solid rgba(22,163,74,0.3)' }}
              >
                {f.badge}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{f.name}</p>
              </div>
              {f.verified && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', color: '#4ADE80' }}>
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trending topics */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Trending Topics
        </p>
        <div className="flex flex-wrap gap-2">
          {['Constitutional Law', 'IPC 302', 'Bail Reform', 'UPSC Prep', 'Section 498A'].map((topic) => (
            <span
              key={topic}
              className="text-[10px] font-medium px-2.5 py-1 rounded-full"
              style={{
                background: `${activeSaathi.primary}15`,
                border: `0.5px solid ${activeSaathi.primary}33`,
                color: activeSaathi.primary,
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
