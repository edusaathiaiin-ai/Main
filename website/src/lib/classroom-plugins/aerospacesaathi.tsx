'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

const TABS = ['Canvas', 'Sketchfab 3D', 'NASA Data', 'NASA Eyes', 'JavaFoil'] as const
type Tab = typeof TABS[number]

const SKETCHFAB_MODELS = [
  { id: '9d6a0cca61c8480d9bfee6cc76055120', name: 'Turbofan Engine' },
  { id: '66f150e0e6234b3d8f3e5b90e7c0feaf', name: 'Space Shuttle' },
  { id: 'b58c93cb0c4f4ce5a8fe2a5b44e3c72d', name: 'ISS — International Space Station' },
  { id: '0a3ccf74f53e4e358d5a82e0a1e0d62f', name: 'Saturn V Rocket' },
  { id: '29dc6a7c6e1245a5a39c1e4b9b3d6f82', name: 'NACA 0012 Airfoil' },
  { id: 'f45c9e2b8b294dc6b1f5a3d7e8c9f012', name: 'F-22 Raptor' },
  { id: 'a1b2c3d4e5f647891234567890abcdef', name: 'Mars Rover Curiosity' },
  { id: '1234abcd5678efgh9012ijkl3456mnop', name: 'Hubble Space Telescope' },
  { id: 'b7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', name: 'Boeing 747 Cross-Section' },
  { id: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', name: 'Pratt & Whitney Turboshaft' },
  { id: 'd9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4', name: 'SpaceX Falcon 9' },
  { id: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', name: 'Jet Engine Compressor' },
  { id: 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6', name: 'Wright Flyer' },
  { id: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2', name: 'Rocket Nozzle — De Laval' },
  { id: 'b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', name: 'Spacecraft Re-entry Capsule' },
] as const

type ApodData = { title: string; url: string; explanation: string; media_type: string }
type NasaImage = { title: string; description: string; nasa_id: string; thumb: string }
type NtrsResult = { id: number; title: string; abstract: string; pdf: string | null }

function AerospacePlugin({ roomId, role }: PluginProps) {
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
          <CollaborativeCanvas roomId={roomId} role={role} />
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
