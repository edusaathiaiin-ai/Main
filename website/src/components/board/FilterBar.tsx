'use client'

import { motion } from 'framer-motion'

type Filter = 'all' | 'unanswered' | 'mine' | 'faculty_verified'

type Props = {
  active: Filter
  onChange: (f: Filter) => void
  primaryColor: string
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'mine', label: 'My Questions' },
  { id: 'faculty_verified', label: 'Faculty Verified' },
]

export function FilterBar({ active, onChange, primaryColor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const isActive = active === f.id
        return (
          <motion.button
            key={f.id}
            onClick={() => onChange(f.id)}
            whileTap={{ scale: 0.96 }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 outline-none"
            style={{
              background: isActive ? primaryColor : 'var(--bg-elevated)',
              border: `0.5px solid ${isActive ? primaryColor : 'var(--border-medium)'}`,
              color: isActive ? '#060F1D' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </motion.button>
        )
      })}
    </div>
  )
}
