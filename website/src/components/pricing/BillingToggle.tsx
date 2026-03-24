'use client';

import { motion } from 'framer-motion';

type BillingCycle = 'monthly' | 'annual';

interface BillingToggleProps {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}

export default function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center rounded-full p-1 gap-1"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => {
          const active = value === cycle;
          return (
            <button
              key={cycle}
              onClick={() => onChange(cycle)}
              className="relative z-10 px-5 py-2 rounded-full text-sm font-semibold transition-colors duration-200 capitalize"
              style={{ color: active ? '#060F1D' : 'rgba(255,255,255,0.45)' }}
            >
              {active && (
                <motion.div
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#C9993A' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{cycle === 'monthly' ? 'Monthly' : 'Annual'}</span>
            </button>
          );
        })}
      </div>

      {/* Annual savings badge */}
      <motion.div
        initial={false}
        animate={{ opacity: value === 'annual' ? 1 : 0.5, scale: value === 'annual' ? 1 : 0.95 }}
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}
      >
        {value === 'annual' ? '🎉 You\'re saving up to 37%' : 'Save up to 37% with Annual'}
      </motion.div>
    </div>
  );
}
