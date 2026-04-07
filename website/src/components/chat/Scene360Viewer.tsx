'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// ─── Curated 360° scene library ───────────────────────────────────────────────
// Free, embeddable scenes matched to each Saathi subject.
// Sources: Google Arts & Culture, Matterport free tier, Kuula.co public scenes,
// and YouTube 360 embed (works in Chrome, Edge, Safari).

type Scene = {
  label:       string
  description: string
  embedUrl:    string
  credit:      string
}

const SCENES: Record<string, Scene[]> = {

  'ocean-floor': [{
    label:       'Coral Reef — Great Barrier Reef',
    description: 'Dive into the world\'s largest coral ecosystem. Observe reef structure, marine biodiversity, and symbiotic relationships in situ.',
    embedUrl:    'https://www.youtube.com/embed/Rd2ew7-yuno?autoplay=0&vq=hd1080',
    credit:      'Google Earth — Great Barrier Reef',
  }],

  'human-heart': [{
    label:       'Inside the Human Heart',
    description: 'A 360° journey through cardiac chambers, valves, and major vessels. See blood flow pathways that textbook diagrams can\'t convey.',
    embedUrl:    'https://www.youtube.com/embed/EVYZkHQ0iq4?autoplay=0',
    credit:      'Medical Education 360',
  }],

  'supreme-court': [{
    label:       'Supreme Court of India — Courtroom No. 1',
    description: 'Stand inside India\'s highest constitutional court. Observe the bench layout, bar seating, and the architecture of Indian justice.',
    embedUrl:    'https://www.youtube.com/embed/8Y9YaJwkNhs?autoplay=0',
    credit:      'Virtual India Heritage',
  }],

  'space-station': [{
    label:       'International Space Station — Live Tour',
    description: 'Float through the ISS modules. Observe microgravity conditions, scientific equipment, and Earth\'s curvature through the Cupola window.',
    embedUrl:    'https://www.youtube.com/embed/eAoHxptpy_s?autoplay=0',
    credit:      'NASA Johnson Space Center',
  }],

  'human-cell': [{
    label:       'Inside a Living Cell',
    description: 'An immersive journey through the cytoplasm — past mitochondria, ribosomes, the endoplasmic reticulum, and the nucleus at its centre.',
    embedUrl:    'https://www.youtube.com/embed/KuLnGGqBgEY?autoplay=0',
    credit:      'XVIVO Scientific Animation',
  }],

  'chemistry-lab': [{
    label:       'Research Chemistry Laboratory',
    description: 'Walk through a professional chemistry research lab. Identify equipment, understand safety protocols, and see how real experiments are set up.',
    embedUrl:    'https://www.youtube.com/embed/iA-Gdkje6pg?autoplay=0',
    credit:      'Virtual Lab Tours',
  }],

  'circuit-board': [{
    label:       'Inside a CPU — Nanoscale Journey',
    description: 'Shrink to nanometre scale and travel through a modern processor. See transistors, logic gates, and data pathways at silicon level.',
    embedUrl:    'https://www.youtube.com/embed/HpOsLLTn4ks?autoplay=0',
    credit:      'Intel Visual Experience',
  }],

  'construction-site': [{
    label:       'High-Rise Construction Site',
    description: 'Stand on an active construction floor 30 storeys up. Observe structural steel, formwork, rebar placement, and load-bearing principles in real scale.',
    embedUrl:    'https://www.youtube.com/embed/7TBgAWzBJEM?autoplay=0',
    credit:      'Engineering Insights 360',
  }],

  'ancient-rome': [{
    label:       'Ancient Rome — The Forum Reconstructed',
    description: 'Step into a photorealistic reconstruction of the Roman Forum at its peak. Experience the scale, architecture, and civic life of antiquity.',
    embedUrl:    'https://www.youtube.com/embed/QLEYmKDMvOM?autoplay=0',
    credit:      'Google Arts & Culture — Rome Reborn',
  }],

  'amazon-rainforest': [{
    label:       'Amazon Rainforest — Forest Floor',
    description: 'Immerse in the world\'s most biodiverse ecosystem. Observe canopy layers, epiphytes, decomposer systems, and the carbon cycle in action.',
    embedUrl:    'https://www.youtube.com/embed/4mBqPT-WNDE?autoplay=0',
    credit:      'BBC Earth — Planet Earth II',
  }],

  'stock-exchange': [{
    label:       'Bombay Stock Exchange — Trading Floor',
    description: 'Stand on the BSE trading floor and observe how financial markets physically operate — the infrastructure behind every trade.',
    embedUrl:    'https://www.youtube.com/embed/Xzid7-5QHMI?autoplay=0',
    credit:      'BSE India Virtual Tour',
  }],

  'operating-theatre': [{
    label:       'Hospital Operating Theatre',
    description: 'Observe a real surgical environment — sterile zones, instrument layout, team positioning, and the choreography of a clinical procedure.',
    embedUrl:    'https://www.youtube.com/embed/R4ByHE9Q1CE?autoplay=0',
    credit:      'Medical Education International',
  }],

  'moon-surface': [{
    label:       'Apollo 17 Landing Site — The Moon',
    description: 'Stand on the lunar surface at the last crewed Moon landing site. Experience regolith, crater topography, and Earth rise on the horizon.',
    embedUrl:    'https://www.youtube.com/embed/5e0j24W_hzk?autoplay=0',
    credit:      'NASA — Lunar Reconnaissance Orbiter',
  }],

  'bridge-construction': [{
    label:       'Cable-Stayed Bridge — Engineering Walkthrough',
    description: 'Walk the deck and pylon of a major cable-stayed bridge under construction. Understand tension forces, pylons, and deck cantilever sequencing.',
    embedUrl:    'https://www.youtube.com/embed/7GBjBnpyloM?autoplay=0',
    credit:      'Civil Engineering VR',
  }],

  'parliamentary-debate': [{
    label:       'Indian Parliament — Lok Sabha Chamber',
    description: 'Stand in the Lok Sabha chamber. Understand the spatial relationship between the Speaker\'s podium, treasury benches, opposition, and press gallery.',
    embedUrl:    'https://www.youtube.com/embed/GJjgqBEBzeA?autoplay=0',
    credit:      'Sansad TV Virtual Tour',
  }],
}

// ─── Saathi → default scene mapping ──────────────────────────────────────────

const SAATHI_DEFAULT_SCENE: Record<string, string> = {
  biosaathi:         'ocean-floor',
  medicosaathi:      'operating-theatre',
  nursingsaathi:     'operating-theatre',
  pharmasaathi:      'chemistry-lab',
  chemsaathi:        'chemistry-lab',
  compsaathi:        'circuit-board',
  elecsaathi:        'circuit-board',
  electronicssaathi: 'circuit-board',
  civilsaathi:       'bridge-construction',
  mechsaathi:        'construction-site',
  aerospacesaathi:   'space-station',
  envirosaathi:      'amazon-rainforest',
  historysaathi:     'ancient-rome',
  kanoonsaathi:      'supreme-court',
  econsaathi:        'stock-exchange',
  finsaathi:         'stock-exchange',
  psychsaathi:       'human-cell',
  bizsaathi:         'stock-exchange',
  mktsaathi:         'stock-exchange',
  hrsaathi:          'parliamentary-debate',
  archsaathi:        'ancient-rome',
  biotechsaathi:     'human-cell',
  maathsaathi:       'space-station',
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  scene:         string   // scene key from SCENES, or saathi slug as fallback
  saathiId?:     string   // used to pick default if scene key not found
  saathiColor?:  string
  isLegalTheme?: boolean
}

export function Scene360Viewer({
  scene,
  saathiId,
  saathiColor = '#C9993A',
  isLegalTheme = false,
}: Props) {
  const [entered,    setEntered]    = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Resolve scene — try direct key, then saathi default
  const sceneKey = SCENES[scene]
    ? scene
    : saathiId
      ? (SAATHI_DEFAULT_SCENE[saathiId] ?? 'ocean-floor')
      : 'ocean-floor'

  const sceneData = (SCENES[sceneKey] ?? SCENES['ocean-floor'])[0]

  const borderColor = isLegalTheme ? '#E0E0E0' : `${saathiColor}30`
  const bgColor     = isLegalTheme ? '#F8F8F8' : 'rgba(0,0,0,0.3)'
  const textColor   = isLegalTheme ? '#1A1A1A' : '#FFFFFF'
  const mutedColor  = isLegalTheme ? '#666666' : 'rgba(255,255,255,0.5)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        margin:       '12px 0',
        borderRadius: '16px',
        overflow:     'hidden',
        border:       `1px solid ${borderColor}`,
        background:   bgColor,
      }}
    >
      {/* Header */}
      <div style={{
        padding:        '12px 16px 10px',
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '14px' }}>🌐</span>
            <span style={{
              fontSize:      '9px',
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         saathiColor,
            }}>
              360° Immersive Scene
            </span>
          </div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: textColor, margin: '0 0 3px' }}>
            {sceneData.label}
          </p>
          <p style={{ fontSize: '11px', color: mutedColor, margin: 0, lineHeight: 1.5 }}>
            {sceneData.description}
          </p>
        </div>

        {/* Fullscreen toggle */}
        {entered && (
          <button
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{
              background:   'none',
              border:       `0.5px solid ${borderColor}`,
              borderRadius: '8px',
              padding:      '5px 8px',
              cursor:       'pointer',
              color:        mutedColor,
              fontSize:     '13px',
              flexShrink:   0,
            }}
          >
            {fullscreen ? '⤡' : '⤢'}
          </button>
        )}
      </div>

      {/* Scene embed or entry button */}
      {!entered ? (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            borderRadius: '12px',
            overflow:     'hidden',
            position:     'relative',
            background:   `linear-gradient(135deg, ${saathiColor}15, ${saathiColor}05)`,
            border:       `0.5px solid ${saathiColor}25`,
            padding:      '24px',
            textAlign:    'center',
          }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>🥽</p>
            <p style={{ fontSize: '12px', color: textColor, fontWeight: 600, margin: '0 0 6px' }}>
              Ready to step inside?
            </p>
            <p style={{ fontSize: '11px', color: mutedColor, margin: '0 0 16px', lineHeight: 1.5 }}>
              Click and drag to look around. Best experienced in full screen.<br />
              Works on any browser — no headset needed.
            </p>

            <button
              onClick={() => setEntered(true)}
              style={{
                background:   saathiColor,
                border:       'none',
                borderRadius: '10px',
                padding:      '10px 24px',
                color:        '#060F1D',
                fontSize:     '13px',
                fontWeight:   700,
                cursor:       'pointer',
                transition:   'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Enter Scene →
            </button>

            <p style={{
              fontSize:     '10px',
              color:        mutedColor,
              marginTop:    '12px',
              marginBottom: 0,
            }}>
              🥽 On a VR headset? Open this page in your headset browser for full immersion
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          position:   fullscreen ? 'fixed' : 'relative',
          inset:      fullscreen ? 0 : undefined,
          zIndex:     fullscreen ? 9999 : undefined,
          height:     fullscreen ? '100vh' : '360px',
          background: '#000',
        }}>
          <iframe
            src={sceneData.embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; web-share"
            allowFullScreen
            title={sceneData.label}
            style={{ display: 'block', border: 'none' }}
          />
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              style={{
                position:     'fixed',
                top:          '16px',
                right:        '16px',
                zIndex:       10000,
                background:   'rgba(0,0,0,0.7)',
                border:       '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding:      '8px 12px',
                color:        '#fff',
                fontSize:     '13px',
                cursor:       'pointer',
              }}
            >
              ✕ Exit fullscreen
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding:        '8px 16px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: mutedColor }}>
          Source: {sceneData.credit}
        </span>
        <span style={{
          fontSize:     '9px',
          color:        saathiColor,
          fontWeight:   600,
          background:   `${saathiColor}15`,
          borderRadius: '4px',
          padding:      '2px 7px',
        }}>
          PREVIEW · Full VR coming
        </span>
      </div>
    </motion.div>
  )
}
