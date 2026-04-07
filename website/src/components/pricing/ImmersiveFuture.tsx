'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Old way vs EdUsaathiAI way ──────────────────────────────────────────────

const CONTRAST = [
  {
    saathi:   'BioSaathi',
    emoji:    '🧬',
    old:      'Read about coral reefs in a textbook',
    new:      'Dive into the ocean floor and observe marine life in 360°',
    color:    '#10B981',
  },
  {
    saathi:   'MechSaathi',
    emoji:    '⚙️',
    old:      'Study gear ratios from an instruction manual',
    new:      'Draw a gear on paper — watch it rotate with live torque equations',
    color:    '#0EA5E9',
  },
  {
    saathi:   'MedicoSaathi',
    emoji:    '🏥',
    old:      'Memorise heart anatomy from a diagram',
    new:      'Stand inside a beating heart and watch valves open and close',
    color:    '#F43F5E',
  },
  {
    saathi:   'KanoonSaathi',
    emoji:    '⚖️',
    old:      'Read courtroom procedure from bare acts',
    new:      'Walk into Supreme Court Courtroom No. 1 and observe the bench',
    color:    '#3B82F6',
  },
  {
    saathi:   'AerospaceSaathi',
    emoji:    '✈️',
    old:      'Learn orbital mechanics from equations on a page',
    new:      'Float through the ISS Cupola with Earth curving beneath you',
    color:    '#6366F1',
  },
  {
    saathi:   'ArchSaathi',
    emoji:    '🏛️',
    old:      'Sketch a floor plan and wait for feedback',
    new:      'Upload your sketch — see it render as a navigable 3D model',
    color:    '#D97706',
  },
  {
    saathi:   'PhysicsSaathi',
    emoji:    '⚛️',
    old:      'Read about quantum mechanics from equations on a page',
    new:      'Visualise electron orbitals rotating in 3D in your chat window',
    color:    '#818CF8',
  },
  {
    saathi:   'AgriSaathi',
    emoji:    '🌾',
    old:      'Study soil science from a textbook diagram',
    new:      'Walk through a virtual farm field and examine soil layers in 360°',
    color:    '#84CC16',
  },
]

// ─── Roadmap stages ───────────────────────────────────────────────────────────

const ROADMAP = [
  {
    year:        'Today',
    label:       'Text + Voice + 3D',
    description: 'Soul-matched AI conversations with 3D models, diagrams, animations, and voice in 8 languages',
    icon:        '💬',
    active:      true,
  },
  {
    year:        '2025–26',
    label:       '360° Immersive Scenes',
    description: 'Step inside a coral reef, a courtroom, the ISS — directly from your chat window',
    icon:        '🌐',
    active:      true,
    new:         true,
  },
  {
    year:        '2026',
    label:       'Sketch to Life',
    description: 'Draw a gear, a circuit, a floor plan — upload it and watch it animate with live equations',
    icon:        '📷',
    active:      true,
    new:         true,
  },
  {
    year:        '2026–27',
    label:       'AR on Your Phone',
    description: 'Point your camera at your desk — molecules, mechanisms, and models appear on your table',
    icon:        '📱',
    active:      false,
  },
  {
    year:        '2027–28',
    label:       'WebXR Spatial Classroom',
    description: 'Your Saathi\'s world becomes a 3D space — no headset needed, just a browser',
    icon:        '🥽',
    active:      false,
  },
  {
    year:        '2030',
    label:       'Holographic Saathi',
    description: 'Your Saathi stands beside you. Gesture to interact. Learning becomes indistinguishable from experience',
    icon:        '✨',
    active:      false,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ImmersiveFuture() {
  const [activeContrast, setActiveContrast] = useState(0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mb-20"
    >
      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="mb-14 text-center">
        <p
          className="mb-3 text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          The future of learning
        </p>
        <h2 className="font-playfair mb-5 text-4xl font-bold text-white md:text-5xl">
          There is a world of difference
          <br />
          <span style={{ color: '#C9993A' }}>between reading and living it.</span>
        </h2>
        <p
          className="mx-auto max-w-2xl text-base leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          A pilot who learned to fly only from instruction manuals and a pilot
          who trained in a simulator are not the same pilot. EdUsaathiAI is
          building the simulator — one soul at a time.
        </p>
      </div>

      {/* ── Contrast cards ─────────────────────────────────────────────────── */}
      <div className="mb-16">
        {/* Tab selector */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {CONTRAST.map((c, i) => (
            <button
              key={i}
              onClick={() => setActiveContrast(i)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: activeContrast === i
                  ? `${c.color}20`
                  : 'rgba(255,255,255,0.04)',
                border: activeContrast === i
                  ? `1px solid ${c.color}60`
                  : '1px solid rgba(255,255,255,0.08)',
                color: activeContrast === i
                  ? c.color
                  : 'rgba(255,255,255,0.4)',
              }}
            >
              {c.emoji} {c.saathi}
            </button>
          ))}
        </div>

        {/* Active contrast panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeContrast}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* Old way */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xl">📖</span>
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  The old way
                </span>
              </div>
              <p
                className="text-lg font-medium leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                {CONTRAST[activeContrast].old}
              </p>
            </div>

            {/* EdUsaathiAI way */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: `${CONTRAST[activeContrast].color}08`,
                border: `1.5px solid ${CONTRAST[activeContrast].color}35`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `${CONTRAST[activeContrast].color}15`,
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xl">{CONTRAST[activeContrast].emoji}</span>
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: CONTRAST[activeContrast].color }}
                >
                  EdUsaathiAI way
                </span>
              </div>
              <p className="relative z-10 text-lg font-medium leading-relaxed text-white">
                {CONTRAST[activeContrast].new}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Roadmap timeline ────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl p-8 md:p-12"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="mb-8 text-center">
          <p
            className="mb-2 text-xs font-bold tracking-widest uppercase"
            style={{ color: '#C9993A' }}
          >
            The roadmap
          </p>
          <h3 className="font-playfair text-2xl font-bold text-white md:text-3xl">
            Every conversation today is a step
            <br />
            toward the classroom of tomorrow.
          </h3>
        </div>

        <div className="relative">
          {/* Connecting line — desktop */}
          <div
            className="absolute top-8 hidden h-px w-full md:block"
            style={{ background: 'linear-gradient(90deg, rgba(201,153,58,0.4), rgba(201,153,58,0.05))' }}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
            {ROADMAP.map((stage, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Icon circle */}
                <div
                  className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl"
                  style={{
                    background: stage.active
                      ? 'rgba(201,153,58,0.15)'
                      : 'rgba(255,255,255,0.04)',
                    border: stage.active
                      ? '1.5px solid rgba(201,153,58,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: stage.active
                      ? '0 0 20px rgba(201,153,58,0.15)'
                      : 'none',
                  }}
                >
                  {stage.icon}
                  {stage.new && (
                    <span
                      className="absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      NEW
                    </span>
                  )}
                  {i === 0 && (
                    <span
                      className="absolute -bottom-2 whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-bold"
                      style={{ background: 'rgba(201,153,58,0.9)', color: '#060F1D' }}
                    >
                      ← You are here
                    </span>
                  )}
                </div>

                <p
                  className="mb-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: stage.active ? '#C9993A' : 'rgba(255,255,255,0.25)' }}
                >
                  {stage.year}
                </p>
                <p
                  className="mb-2 text-sm font-bold"
                  style={{ color: stage.active ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}
                >
                  {stage.label}
                </p>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: stage.active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}
                >
                  {stage.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div
          className="mt-10 pt-8 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p
            className="mx-auto max-w-2xl text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            We are building the world&apos;s first{' '}
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              soul-matched immersive learning platform.
            </span>{' '}
            No other platform in India — or the world — is walking this path
            for students. Every Saathi conversation today lays one more brick
            in the foundation of tomorrow&apos;s classroom.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              '🧬 BioSaathi dives into oceans',
              '⚙️ MechSaathi animates your sketches',
              '⚖️ KanoonSaathi enters courtrooms',
              '✈️ AerospaceSaathi reaches orbit',
            ].map((tag, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1.5 text-xs font-medium"
                style={{
                  background: 'rgba(201,153,58,0.08)',
                  border: '0.5px solid rgba(201,153,58,0.2)',
                  color: 'rgba(201,153,58,0.8)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
