'use client';

import { motion } from 'framer-motion';

const TOTAL_SPOTS = 500;
const SPOTS_REMAINING = 312; // hardcoded — make dynamic later
const SPOTS_TAKEN = TOTAL_SPOTS - SPOTS_REMAINING;
const PCT = Math.round((SPOTS_TAKEN / TOTAL_SPOTS) * 100);

export default function FoundingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(201,153,58,0.12) 0%, rgba(229,184,106,0.08) 50%, rgba(201,153,58,0.12) 100%)',
        border: '1px solid rgba(201,153,58,0.35)',
      }}
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(201,153,58,0.15) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">✦</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#E5B86A' }}>
              Founding Student Access
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              First 500 students get <strong style={{ color: '#C9993A' }}>60 days completely free</strong> — no card required.
            </p>
          </div>
        </div>

        {/* Countdown pill */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
            style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A', border: '1px solid rgba(201,153,58,0.4)' }}
          >
            {SPOTS_REMAINING} founding spots remaining
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #C9993A, #E5B86A)', width: `${PCT}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${PCT}%` }}
              transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {SPOTS_TAKEN} of {TOTAL_SPOTS} claimed
          </p>
        </div>
      </div>
    </motion.div>
  );
}
