'use client';

import { motion } from 'framer-motion';

const STAGES = [
  { key: 'cold',  emoji: '🌑', label: 'Cold',  desc: 'Still exploring — no clear passion direction yet.' },
  { key: 'spark', emoji: '✨', label: 'Spark', desc: 'Something is lighting up — curiosity is building.' },
  { key: 'flame', emoji: '🔥', label: 'Flame', desc: 'You have direction. Saathi is feeding it deliberately.' },
  { key: 'fire',  emoji: '💥', label: 'Fire',  desc: 'Fully committed. The journey has a destination.' },
  { key: 'wings', emoji: '🦋', label: 'Wings', desc: 'You have clarity, confidence, and momentum.' },
] as const;

type FlameStage = typeof STAGES[number]['key'];

export default function FlameStageVisual({ stage }: { stage: FlameStage | null }) {
  const currentIdx = STAGES.findIndex((s) => s.key === (stage ?? 'cold'));
  const current = STAGES[currentIdx] ?? STAGES[0];

  return (
    <div className="space-y-4">
      {/* Flame row */}
      <div className="flex items-center gap-3 justify-between">
        {STAGES.map((s, i) => {
          const isActive = i === currentIdx;
          const isPast = i < currentIdx;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1">
              <motion.div
                animate={{ scale: isActive ? 1.2 : 1, opacity: isActive ? 1 : isPast ? 0.6 : 0.2 }}
                transition={{ duration: 0.4 }}
                className="text-3xl"
              >
                {s.emoji}
              </motion.div>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: isActive ? '#C9993A' : 'rgba(255,255,255,0.3)' }}
              >
                {s.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="flame-dot"
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#C9993A' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #C9993A, #E5B86A)' }}
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx) / (STAGES.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Current stage description */}
      <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <span style={{ color: '#E5B86A' }}>{current.label}:</span> {current.desc}
      </p>
    </div>
  );
}
