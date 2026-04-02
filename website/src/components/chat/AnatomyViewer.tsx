'use client'

import { useState } from 'react'

export type AnatomyPart =
  | 'heart' | 'brain' | 'lungs'
  | 'kidney' | 'liver' | 'eye'
  | 'spine' | 'ear' | 'skull'
  | 'hand'  // legacy alias

type AnatomyConfig = {
  label: string
  emoji: string
  beId: string
  description: string
}

const ANATOMY_CONFIG: Record<AnatomyPart, AnatomyConfig> = {
  heart: {
    label:       'Human Heart',
    emoji:       '🫀',
    beId:        '2Owr',
    description: 'Cardiac chambers, valves, and coronary vessels',
  },
  brain: {
    label:       'Human Brain',
    emoji:       '🧠',
    beId:        '2Oye',
    description: 'Cerebral cortex, lobes, and neural structures',
  },
  lungs: {
    label:       'Respiratory System',
    emoji:       '🫁',
    beId:        '2dB6',
    description: 'Bronchi, alveoli, and pulmonary structure',
  },
  kidney: {
    label:       'Kidney',
    emoji:       '🫘',
    beId:        '2Owg',
    description: 'Nephrons, cortex, medulla, and collecting ducts',
  },
  liver: {
    label:       'Liver',
    emoji:       '🟫',
    beId:        '2Ows',
    description: 'Hepatic lobes, portal system, and bile ducts',
  },
  eye: {
    label:       'Human Eye',
    emoji:       '👁️',
    beId:        '2Owt',
    description: 'Retina, lens, cornea, and optic structures',
  },
  spine: {
    label:       'Vertebral Column',
    emoji:       '🦴',
    beId:        '2Oww',
    description: 'Cervical, thoracic, lumbar vertebrae and discs',
  },
  ear: {
    label:       'Human Ear',
    emoji:       '👂',
    beId:        '2Owv',
    description: 'Cochlea, ossicles, tympanic membrane, auditory canal',
  },
  skull: {
    label:       'Skull & Cranium',
    emoji:       '💀',
    beId:        '2Owx',
    description: 'Cranial bones, sutures, and foramina',
  },
  // legacy alias — maps to skull model
  hand: {
    label:       'Hand & Wrist',
    emoji:       '✋',
    beId:        '2Owx',
    description: 'Carpal bones, metacarpals, and phalanges',
  },
}

export function AnatomyViewer({
  part,
  saathiColor = '#EF4444',
}: {
  part: AnatomyPart
  saathiColor?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const config = ANATOMY_CONFIG[part] ?? ANATOMY_CONFIG.heart

  const embedUrl = `https://human.biodigital.com/widget/?be=${config.beId}&ui-anatomy-descriptions=true&ui-panel=false&initial.none=true`

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `0.5px solid ${saathiColor}30`,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: `0.5px solid ${saathiColor}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
            {config.emoji} {config.label} — 3D Anatomy
          </span>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
            {config.description}
          </p>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: '2px' }}>
          Rotate · Zoom · Click to explore
        </span>
      </div>

      {/* Loading placeholder — shown until iframe fires onLoad */}
      {!loaded && (
        <div style={{
          height: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          background: '#060F1D',
        }}>
          <span style={{ fontSize: '52px', lineHeight: 1 }}>{config.emoji}</span>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            border: `2px solid ${saathiColor}30`, borderTopColor: saathiColor,
            animation: 'anatomy-spin 0.9s linear infinite',
          }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Loading 3D anatomy…
          </span>
        </div>
      )}

      {/* BioDigital Human iframe */}
      <iframe
        src={embedUrl}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '400px',
          border: 'none',
          display: loaded ? 'block' : 'none',
        }}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        title={`3D ${config.label}`}
      />

      <div style={{
        padding: '5px 14px',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Click any structure to learn more
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Powered by BioDigital Human · Free
        </span>
      </div>

      <style>{`
        @keyframes anatomy-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
