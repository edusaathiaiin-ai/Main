'use client';

import { motion } from 'framer-motion';

type Filter = 'all' | 'unanswered' | 'mine' | 'faculty_verified';

type Props = {
  active: Filter;
  onChange: (f: Filter) => void;
  primaryColor: string;
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'mine', label: 'My Questions' },
  { id: 'faculty_verified', label: 'Faculty Verified' },
];

export function FilterBar({ active, onChange, primaryColor }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        return (
          <motion.button
            key={f.id}
            onClick={() => onChange(f.id)}
            whileTap={{ scale: 0.96 }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 outline-none"
            style={{
              background: isActive ? primaryColor : 'rgba(255,255,255,0.05)',
              border: `0.5px solid ${isActive ? primaryColor : 'rgba(255,255,255,0.1)'}`,
              color: isActive ? '#060F1D' : 'rgba(255,255,255,0.5)',
            }}
          >
            {f.label}
          </motion.button>
        );
      })}
    </div>
  );
}
