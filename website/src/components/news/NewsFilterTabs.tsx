'use client'

import { motion } from 'framer-motion'

export type NewsTab = 'all' | 'news' | 'research' | 'exams' | 'announcements'

type Props = {
  active: NewsTab
  onChange: (tab: NewsTab) => void
  primaryColor: string
}

const TABS: { id: NewsTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'research', label: 'Research' },
  { id: 'exams', label: 'Exams' },
  { id: 'announcements', label: 'Announcements' },
]

export function NewsFilterTabs({ active, onChange, primaryColor }: Props) {
  return (
    <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto pb-1">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            whileTap={{ scale: 0.96 }}
            className="relative shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none"
            style={{
              color: isActive ? primaryColor : 'var(--text-tertiary)',
              background: 'transparent',
            }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="news-tab-underline"
                className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full"
                style={{ background: primaryColor }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
