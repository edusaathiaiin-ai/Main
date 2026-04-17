'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

const TABS = ['Canvas', 'Sketchfab 3D', 'NASA Data', 'NASA Eyes', 'JavaFoil'] as const
type Tab = typeof TABS[number]

// Real Sketchfab model IDs — verified via API search (downloadable, top-liked)
const SKETCHFAB_MODELS = [
  { id: '74c6aceed86b4a41aaad3b93afc3e262', name: 'Turbofan Jet Engine' },
  { id: '2292ce758e114a5f87626d81404d5f44', name: 'Space Shuttle' },
  { id: 'db8f1c8cba3b464993e216acbf4a69b9', name: 'International Space Station' },
  { id: '7a2c9709ff8144c8b3b18ec84b5e112e', name: 'Saturn V Rocket' },
  { id: 'a120ee56b05e4e01a40ab02fa8b29aeb', name: 'NACA Airfoil' },
  { id: '327154ad78154f8f9c0ec7169fd4820c', name: 'Boeing 747' },
  { id: '0696a383f3e841d2b5c7636ee8a58aba', name: 'Mars Rover' },
  { id: 'f709fc945bb2413faf2878aa613cde3d', name: 'SpaceX Falcon 9' },
  { id: 'c91467735c6743af872e65107a79beda', name: 'Wright Flyer 1903' },
  { id: '508de5c48845456bb033fb267ebe1d1e', name: 'F-22 Raptor' },
  { id: 'd6521362b37b48e3a82bce4911409303', name: 'Hubble Space Telescope' },
  { id: 'e957a9dbb45146e0946e16f2cb12c827', name: 'Rocket Engine Nozzle' },
  { id: '2370a0adb0a140fe962972effcd08cbb', name: 'Airbus A380' },
  { id: 'bd6ac084ae5645848a67597b17665579', name: 'Soyuz Spacecraft' },
  { id: '47756e4d8a1b43188109795177c00e55', name: 'Jet Engine Compressor' },
]

type ApodData = { title: string; url: string; explanation: string; media_type: string }
type NasaImage = { title: string; description: string; nasa_id: string; thumb: string }
type NtrsResult = { id: number; title: string; abstract: string; pdf: string | null }

function AerospacePlugin({ role }: PluginProps) {
  const [tab, setTab] = useState<Tab>('Canvas')
  const [selectedModel, setSelectedModel] = useState(SKETCHFAB_MODELS[0].id)

  // NASA Data state
  const [apod, setApod] = useState<ApodData | null>(null)
  const [nasaImages, setNasaImages] = useState<NasaImage[]>([])
  const [imageQuery, setImageQuery] = useState('')
  const [ntrsResults, setNtrsResults] = useState<NtrsResult[]>([])
  const [ntrsQuery, setNtrsQuery] = useState('')
  const [nasaLoading, setNasaLoading] = useState(false)

  // Load APOD on tab switch
  useEffect(() => {
    if (tab === 'NASA Data' && !apod) {
      fetch('/api/classroom/nasa?action=apod')
        .then((r) => r.json())
        .then((d) => setApod(d))
        .catch(() => {})
    }
  }, [tab, apod])

  async function searchNasaImages() {
    if (!imageQuery.trim()) return
    setNasaLoading(true)
    const res = await fetch(`/api/classroom/nasa?action=images&q=${encodeURIComponent(imageQuery)}`)
    const data = await res.json()
    setNasaImages(data.items ?? [])
    setNasaLoading(false)
  }

  async function searchNtrs() {
    if (!ntrsQuery.trim()) return
    setNasaLoading(true)
    const res = await fetch(`/api/classroom/nasa?action=ntrs&q=${encodeURIComponent(ntrsQuery)}`)
    const data = await res.json()
    setNtrsResults(data.results ?? [])
    setNasaLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        flexWrap: 'wrap',
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              fontSize: '12px', fontWeight: tab === t ? 700 : 500,
              background: tab === t ? 'var(--saathi-primary, #0A1628)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              border: tab === t ? 'none' : '1px solid var(--border-subtle)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* ── Canvas ── */}
        {tab === 'Canvas' && (
          <CollaborativeCanvas role={role} />
        )}

        {/* ── Sketchfab 3D ── */}
        {tab === 'Sketchfab 3D' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Select Aerospace Model
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
                {SKETCHFAB_MODELS.map((m) => (
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

        {/* ── NASA Data ── */}
        {tab === 'NASA Data' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
            {/* APOD */}
            {apod && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                  🌌 Astronomy Picture of the Day
                </h3>
                {apod.media_type === 'image' ? (
                  <img
                    src={apod.url}
                    alt={apod.title}
                    style={{ width: '100%', borderRadius: '10px', marginBottom: '8px' }}
                  />
                ) : (
                  <iframe src={apod.url} title={apod.title} style={{ width: '100%', height: '300px', borderRadius: '10px', border: 'none', marginBottom: '8px' }} />
                )}
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{apod.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{apod.explanation?.slice(0, 300)}…</p>
              </div>
            )}

            {/* Image Search */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                🔍 NASA Image Search
              </h3>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchNasaImages()}
                  placeholder="Search — e.g. Mars, ISS, nebula…"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px',
                    fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)', outline: 'none',
                  }}
                />
                <button
                  onClick={searchNasaImages}
                  disabled={nasaLoading}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 600,
                    background: 'var(--saathi-primary, #0A1628)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {nasaLoading ? '…' : 'Search'}
                </button>
              </div>
              {nasaImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {nasaImages.map((img) => (
                    <div key={img.nasa_id} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={img.thumb} alt={img.title} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                      <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', padding: '6px 8px', margin: 0, lineHeight: 1.3 }}>
                        {img.title.slice(0, 60)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NTRS Technical Reports */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                📄 NASA Technical Reports (NTRS)
              </h3>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  value={ntrsQuery}
                  onChange={(e) => setNtrsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchNtrs()}
                  placeholder="Search — e.g. aerodynamics, propulsion…"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px',
                    fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)', outline: 'none',
                  }}
                />
                <button
                  onClick={searchNtrs}
                  disabled={nasaLoading}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 600,
                    background: 'var(--saathi-primary, #0A1628)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {nasaLoading ? '…' : 'Search'}
                </button>
              </div>
              {ntrsResults.map((r) => (
                <div key={r.id} style={{
                  padding: '10px 14px', borderRadius: '10px', marginBottom: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    {r.title}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                    {r.abstract}
                  </p>
                  {r.pdf && (
                    <a href={r.pdf} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: 'var(--saathi-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      📥 Download PDF →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NASA Eyes ── */}
        {tab === 'NASA Eyes' && (
          <iframe
            title="NASA Eyes — Solar System"
            src="https://eyes.nasa.gov/apps/solar-system/"
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        )}

        {/* ── JavaFoil ── */}
        {tab === 'JavaFoil' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              JavaFoil — Airfoil analysis and design tool by Martin Hepperle
            </div>
            <div style={{ flex: 1 }}>
              <iframe
                title="JavaFoil Airfoil Analysis"
                src="http://www.mh-aerotools.de/airfoils/javafoil.htm"
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: AerospacePlugin,
  sourceLabel: 'NASA + NTRS + Sketchfab',
  toolbarItems: [
    {
      icon: '🚀',
      label: 'APOD',
      onClick: () => {},
    },
  ],
}

export default plugin
