'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ArchStyle = {
  period: string
  year: number
  style: string
  emoji: string
  color: string
  key: string[]
  example: string
  region?: string
  description?: string
}

const ARCH_STYLES: ArchStyle[] = [
  {
    period: '3000 BCE',
    year: -3000,
    style: 'Ancient Egyptian',
    emoji: '🔺',
    color: '#C9993A',
    key: ['Pyramids', 'Post & lintel', 'Massive scale'],
    example: 'Great Pyramid of Giza',
    region: 'Africa',
    description:
      'Monumental architecture celebrating the afterlife. Precision geometry, massive stone blocks, and axial planning defined this era.',
  },
  {
    period: '700 BCE',
    year: -700,
    style: 'Ancient Greek',
    emoji: '🏛️',
    color: '#4ADE80',
    key: ['Doric / Ionic / Corinthian Orders', 'Symmetry', 'White marble'],
    example: 'Parthenon, Athens',
    region: 'Europe',
    description:
      'The birth of the classical orders. Harmony, proportion, and the human scale were central principles.',
  },
  {
    period: '200 BCE',
    year: -200,
    style: 'Roman',
    emoji: '⛩️',
    color: '#FB923C',
    key: ['Arch & vault', 'Concrete (opus caementicium)', 'Dome'],
    example: 'Pantheon, Rome',
    region: 'Europe',
    description:
      'Romans mastered the arch, vault, and dome using concrete. Infrastructure at an unprecedented scale.',
  },
  {
    period: '320 CE',
    year: 320,
    style: 'Gupta (Indian)',
    emoji: '🛕',
    color: '#F59E0B',
    key: ['Shikhara tower', 'Rock-cut caves', 'Ornate sculpture'],
    example: 'Ajanta Caves',
    region: 'India',
    description:
      "India's golden age of temple architecture. The shikhara emerged as a vertical expression of Mount Meru.",
  },
  {
    period: '800 CE',
    year: 800,
    style: 'Medieval Islamic',
    emoji: '🕌',
    color: '#A78BFA',
    key: ['Pointed arch', 'Geometric patterns', 'Muqarnas'],
    example: 'Alhambra, Spain',
    region: 'Middle East / India',
    description:
      'Geometric perfection, calligraphy as ornament, and sophisticated water features. The arch evolved beyond Rome.',
  },
  {
    period: '1100 CE',
    year: 1100,
    style: 'Gothic',
    emoji: '⛪',
    color: '#60A5FA',
    key: ['Flying buttress', 'Pointed arch', 'Stained glass'],
    example: 'Notre Dame, Paris',
    region: 'Europe',
    description:
      'Engineering breakthrough — the flying buttress freed walls from load. Cathedrals soared upward, flooded with light.',
  },
  {
    period: '1400 CE',
    year: 1400,
    style: 'Mughal',
    emoji: '🕌',
    color: '#C9993A',
    key: ['Bulbous dome', 'Char Bagh garden', 'White marble & pietra dura'],
    example: 'Taj Mahal, Agra',
    region: 'India',
    description:
      'Persian planning meets Indian craftsmanship. The char bagh (four-garden) plan and white marble defined Mughal grandeur.',
  },
  {
    period: '1750 CE',
    year: 1750,
    style: 'Baroque',
    emoji: '🏰',
    color: '#F87171',
    key: ['Dramatic curves', 'Theatrical spaces', 'Ornate decoration'],
    example: 'Palace of Versailles',
    region: 'Europe',
    description:
      'Architecture as power display. Curved forms, rich materials, and dramatic lighting created emotional experiences.',
  },
  {
    period: '1920 CE',
    year: 1920,
    style: 'Modernism',
    emoji: '🏢',
    color: '#4ADE80',
    key: ['Form follows function', 'Glass & steel', 'No ornament'],
    example: 'Fallingwater — Frank Lloyd Wright',
    region: 'Global',
    description:
      "Rejecting historical styles. Truth to materials, open plans, and industrial construction methods. Le Corbusier's five points.",
  },
  {
    period: '1950 CE',
    year: 1950,
    style: 'Brutalism',
    emoji: '🏗️',
    color: '#9CA3AF',
    key: ['Raw béton brut', 'Massive forms', 'Honesty of materials'],
    example: 'Chandigarh — Le Corbusier',
    region: 'Global / India',
    description:
      'India embraced Brutalism through Chandigarh. Raw concrete expressed socialist ideals and permanence.',
  },
  {
    period: '1980 CE',
    year: 1980,
    style: 'Postmodernism',
    emoji: '🏛️',
    color: '#F59E0B',
    key: ['Historical references', 'Irony & wit', 'Decoration returns'],
    example: 'AT&T Building, New York',
    region: 'Global',
    description:
      'Reaction against Modernist austerity. Historical quotes, colour, and meaning returned to façades.',
  },
  {
    period: '1990 CE',
    year: 1990,
    style: 'Deconstructivism',
    emoji: '🌀',
    color: '#818CF8',
    key: ['Fragmented forms', 'Non-linearity', 'Controlled chaos'],
    example: 'Guggenheim Bilbao — Gehry',
    region: 'Global',
    description:
      'Challenging the right angle. Computer-aided design enabled complex, expressive titanium and steel forms.',
  },
  {
    period: '2000 CE',
    year: 2000,
    style: 'Parametric',
    emoji: '💻',
    color: '#4ADE80',
    key: ['Algorithm-driven form', 'Complex curves', 'Digital fabrication'],
    example: 'Beijing Water Cube / Zaha Hadid',
    region: 'Global',
    description:
      'Mathematics and computation drive form. Every element optimised. Structures impossible without digital tools.',
  },
]

export function ArchTimeline({
  saathiColor = '#D97706',
}: {
  saathiColor?: string
}) {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div
      style={{
        margin: '12px 0',
        borderRadius: '14px',
        overflow: 'hidden',
        border: `0.5px solid ${saathiColor}30`,
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: `0.5px solid ${saathiColor}20`,
        }}
      >
        <span
          style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}
        >
          🏛️ Architectural Styles Timeline — Click any style to explore
        </span>
      </div>

      <div style={{ overflowX: 'auto', padding: '20px 16px' }}>
        <div
          style={{
            display: 'flex',
            gap: '0',
            minWidth: 'max-content',
            position: 'relative',
          }}
        >
          {/* Timeline line */}
          <div
            style={{
              position: 'absolute',
              top: '28px',
              left: '24px',
              right: '24px',
              height: '2px',
              background: 'rgba(255,255,255,0.1)',
            }}
          />

          {ARCH_STYLES.map((s, i) => (
            <div
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '90px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {/* Node */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: selected === i ? s.color : `${s.color}22`,
                  border: `2px solid ${s.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  zIndex: 1,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {s.emoji}
              </div>
              {/* Period */}
              <p
                style={{
                  fontSize: '9px',
                  color: s.color,
                  margin: '4px 0 2px',
                  fontWeight: '600',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.period}
              </p>
              {/* Style name */}
              <p
                style={{
                  fontSize: '9px',
                  color: selected === i ? '#fff' : 'rgba(255,255,255,0.5)',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: '1.3',
                  maxWidth: '80px',
                }}
              >
                {s.style}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '16px',
                background: `${ARCH_STYLES[selected].color}10`,
                borderTop: `0.5px solid ${ARCH_STYLES[selected].color}30`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '28px' }}>
                  {ARCH_STYLES[selected].emoji}
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      color: '#fff',
                      fontWeight: '700',
                    }}
                  >
                    {ARCH_STYLES[selected].style}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '11px',
                      color: ARCH_STYLES[selected].color,
                    }}
                  >
                    {ARCH_STYLES[selected].period} ·{' '}
                    {ARCH_STYLES[selected].region}
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.75)',
                  margin: '0 0 10px',
                  lineHeight: '1.6',
                }}
              >
                {ARCH_STYLES[selected].description}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                {ARCH_STYLES[selected].key.map((k, ki) => (
                  <span
                    key={ki}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      background: `${ARCH_STYLES[selected].color}20`,
                      border: `0.5px solid ${ARCH_STYLES[selected].color}50`,
                      color: ARCH_STYLES[selected].color,
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  fontStyle: 'italic',
                }}
              >
                Example: {ARCH_STYLES[selected].example}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
