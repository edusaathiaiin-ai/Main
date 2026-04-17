'use client'

import { useState } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

const TABS = ['Canvas', 'Sketchfab 3D', 'Maps', 'Spline / Media'] as const
type Tab = typeof TABS[number]

// Verified Sketchfab model IDs — real, downloadable, top-liked
const ARCH_MODELS = [
  { id: '8ce20ac5fc3a4af7ab223cdc0caa7d27', name: 'Pantheon, Rome' },
  { id: '6f2f6823edb74ca9badcc1580aa80743', name: 'Fallingwater — Frank Lloyd Wright' },
  { id: '5ef86f4c79d2418d95cd45d727f3f5b8', name: 'Sagrada Familia' },
  { id: '1c7e6ccc93d74681ae74c3d71c252789', name: 'Taj Mahal' },
  { id: '2a2421e2cafa4526aca31781e3fa7146', name: 'Colosseum, Rome' },
  { id: 'd1a0f65c217740ec800021b6771964f1', name: 'Notre-Dame de Paris' },
  { id: 'f246e36f6f7b4a6fb413c2f063946b82', name: 'Hagia Sophia' },
  { id: 'c1d6f5884c9c4a56b8d8f9c5555f1902', name: 'Burj Khalifa' },
  { id: '317b2d540f0a4f7e8d87dd3b0372712d', name: 'Sydney Opera House' },
  { id: '433212a9c4484d08a08ff6f905d652f0', name: 'Ancient Indian Temple' },
  { id: 'a210febbec4f454dbd0df1d142be06bc', name: 'Japanese Pagoda' },
  { id: '282f497334f64a589edee4e63ad7e428', name: 'Gothic Cathedral' },
  { id: '3a664dcd8baa499d8b4bbad8fbba3b33', name: 'Modernist House' },
  { id: '1cc3992c28c84f459554dfdef8444026', name: 'Islamic Mosque' },
  { id: '935f17a3824d49f7b2505a0686450d51', name: 'Roman Forum' },
]

// Landmark locations for map tab
const LANDMARKS: { name: string; lat: number; lng: number; desc: string }[] = [
  { name: 'Pantheon', lat: 41.8986, lng: 12.4769, desc: '125 AD — Roman concrete dome, unreinforced, 43m span' },
  { name: 'Colosseum', lat: 41.8902, lng: 12.4922, desc: '80 AD — 50,000 capacity amphitheatre, travertine + concrete' },
  { name: 'Taj Mahal', lat: 27.1751, lng: 78.0421, desc: '1653 — Mughal, white marble, symmetrical garden tomb' },
  { name: 'Hagia Sophia', lat: 41.0086, lng: 28.9802, desc: '537 AD — Pendentive dome, Byzantine masterpiece' },
  { name: 'Sagrada Familia', lat: 41.4036, lng: 2.1744, desc: '1882–present — Gaudí, organic Gothic + Art Nouveau' },
  { name: 'Fallingwater', lat: 39.9065, lng: -79.4681, desc: '1939 — Frank Lloyd Wright, cantilevered over waterfall' },
  { name: 'Notre-Dame', lat: 48.8530, lng: 2.3499, desc: '1345 — French Gothic, flying buttresses, rose windows' },
  { name: 'Sydney Opera', lat: -33.8568, lng: 151.2153, desc: '1973 — Jørn Utzon, expressionist shells' },
  { name: 'Burj Khalifa', lat: 25.1972, lng: 55.2744, desc: '2010 — 828m, buttressed core, world\'s tallest' },
]

function ArchPlugin({ role }: PluginProps) {
  const [tab, setTab] = useState<Tab>('Canvas')
  const [selectedModel, setSelectedModel] = useState(ARCH_MODELS[0].id)
  const [embedUrl, setEmbedUrl] = useState('')
  const [mapReady, setMapReady] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'Maps') setMapReady(true) }}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              fontSize: '12px', fontWeight: tab === t ? 700 : 500,
              background: tab === t ? 'var(--saathi-primary, #6B4A00)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              border: tab === t ? 'none' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* ── Canvas ── */}
        {tab === 'Canvas' && <CollaborativeCanvas role={role} />}

        {/* ── Sketchfab 3D ── */}
        {tab === 'Sketchfab 3D' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Select Architectural Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  fontSize: '13px', background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)', outline: 'none',
                }}
              >
                {ARCH_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <iframe
                title="Sketchfab 3D Model"
                src={`https://sketchfab.com/models/${selectedModel}/embed?autospin=1&ui_theme=dark&ui_infos=0&ui_watermark=0`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        )}

        {/* ── Maps (Leaflet via OpenStreetMap) ── */}
        {tab === 'Maps' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                🗺️ Architectural Landmarks — click to explore site context
              </p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {LANDMARKS.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => {
                      const mapFrame = document.getElementById('arch-map-frame') as HTMLIFrameElement
                      if (mapFrame) {
                        mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.01}%2C${l.lat - 0.005}%2C${l.lng + 0.01}%2C${l.lat + 0.005}&layer=mapnik&marker=${l.lat}%2C${l.lng}`
                      }
                    }}
                    style={{
                      padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500,
                      background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)', cursor: 'pointer',
                    }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <iframe
                id="arch-map-frame"
                title="OpenStreetMap"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 0.01}%2C${LANDMARKS[0].lat - 0.005}%2C${LANDMARKS[0].lng + 0.01}%2C${LANDMARKS[0].lat + 0.005}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── Spline / Media ── */}
        {tab === 'Spline / Media' && (
          <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              🎨 Embed External Content
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 12px', lineHeight: 1.6 }}>
              Paste a Spline scene URL, YouTube video, or any embeddable URL. Faculty can prepare 3D architectural walkthroughs in Spline and embed them live.
            </p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              <input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://my.spline.design/... or YouTube URL"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)', outline: 'none',
                }}
              />
            </div>
            {embedUrl && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)', height: '400px' }}>
                <iframe
                  title="Embedded content"
                  src={embedUrl.includes('youtube.com/watch?v=')
                    ? embedUrl.replace('watch?v=', 'embed/')
                    : embedUrl.includes('youtu.be/')
                      ? `https://www.youtube.com/embed/${embedUrl.split('youtu.be/')[1]}`
                      : embedUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            )}
            {!embedUrl && (
              <div style={{
                height: '300px', borderRadius: '12px',
                border: '2px dashed var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '8px',
              }}>
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🏛️</span>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>Paste a URL above to embed</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                  {['Spline 3D scene', 'YouTube walkthrough', 'ArchDaily project'].map((ex) => (
                    <span key={ex} style={{
                      fontSize: '10px', padding: '3px 10px', borderRadius: '100px',
                      background: 'var(--bg-elevated)', color: 'var(--text-ghost)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: ArchPlugin,
  sourceLabel: 'Sketchfab + OpenStreetMap + Spline',
}

export default plugin
