'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CollaborativeCanvas } from './CollaborativeCanvas'

type Props = {
  role: 'faculty' | 'student'
  saathiColor: string
}

export function CanvasOverlay({ role, saathiColor }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating pen button — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 50,
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: open ? saathiColor : 'var(--bg-surface, #fff)',
          color: open ? '#fff' : saathiColor,
          border: open ? 'none' : `2px solid ${saathiColor}40`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.15s',
        }}
        title={open ? 'Hide annotation layer' : 'Draw annotations'}
      >
        {open ? '✕' : '✏️'}
      </button>

      {/* Overlay canvas */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 40,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <CollaborativeCanvas role={role} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
