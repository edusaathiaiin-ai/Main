'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { QuotaState } from '@/types';

type Props = {
  quota: QuotaState;
};

export function QuotaBanner({ quota }: Props) {
  const { remaining } = quota;

  // Hide when plenty of quota left
  if (remaining > 5) return null;

  const isOut = remaining === 0;
  const isLow = remaining <= 2 && remaining > 0;

  const bgColor = isOut
    ? 'rgba(239,68,68,0.08)'
    : isLow
    ? 'rgba(249,115,22,0.1)'
    : 'rgba(201,153,58,0.1)';
  const borderColor = isOut ? 'rgba(239,68,68,0.3)' : isLow ? 'rgba(249,115,22,0.35)' : 'rgba(201,153,58,0.3)';
  const textColor = isOut ? '#FCA5A5' : isLow ? '#FD8C4E' : '#C9993A';

  const message = isOut
    ? 'All chats used — your Saathi will be ready in 48 hours'
    : `${remaining} chat${remaining === 1 ? '' : 's'} remaining today`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="px-4 py-2.5 flex items-center justify-between text-sm"
        style={{ background: bgColor, borderBottom: `0.5px solid ${borderColor}` }}
      >
        <span style={{ color: textColor }}>
          {isOut ? '🔒 ' : isLow ? '⚠️ ' : '💬 '}
          {message}
        </span>
        {isOut && (
          <a
            href="/pricing"
            className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
            style={{ background: 'rgba(201,153,58,0.15)', border: '0.5px solid #C9993A', color: '#C9993A' }}
          >
            Upgrade →
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
