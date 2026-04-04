'use client'

import { motion } from 'framer-motion'

const STARTERS: Record<string, [string, string, string]> = {
  kanoonsaathi: [
    'Explain promissory estoppel',
    'What is the difference between IPC and BNSS?',
    'How does bail work in India?',
  ],
  mathsaathi: [
    'Explain the chain rule with an example',
    'How do I solve differential equations?',
    'What is the intuition behind Bayesian probability?',
  ],
  sciencesaathi: [
    'Explain quantum entanglement simply',
    'How does CRISPR gene editing work?',
    'What is the difference between fission and fusion?',
  ],
  historysaathi: [
    'What caused the fall of the Mughal Empire?',
    'Explain the significance of the 1857 revolt',
    'How did partition shape modern India?',
  ],
}

const DEFAULT_STARTERS: [string, string, string] = [
  "Help me understand today's topic",
  'Create a study plan for me',
  'Quiz me on what I know',
]

type Props = {
  saathiId: string
  saathiEmoji: string
  botName: string
  onStarterClick: (text: string) => void
}

export function EmptyState({
  saathiId,
  saathiEmoji,
  botName,
  onStarterClick,
}: Props) {
  const starters = STARTERS[saathiId] ?? DEFAULT_STARTERS

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-6"
      >
        <span className="block text-[64px] leading-none">{saathiEmoji}</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="font-playfair mb-8 text-xl text-white/50"
      >
        Start a conversation with {botName}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="flex w-full max-w-sm flex-col gap-2.5"
      >
        {starters.map((starter, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
            onClick={() => onStarterClick(starter)}
            className="rounded-xl px-4 py-3 text-left text-sm transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.55)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          >
            &quot;{starter}&quot;
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
