'use client'

import { useState, useEffect, useMemo } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

// ── NACA 4-digit airfoil generator (pure math) ──────────────────────────────

function generateNaca4(digits: string, numPoints: number = 80): { upper: [number, number][]; lower: [number, number][] } {
  const m = parseInt(digits[0] ?? '0') / 100
  const p = parseInt(digits[1] ?? '0') / 10
  const t = parseInt(digits.slice(2) ?? '12') / 100

  const upper: [number, number][] = []
  const lower: [number, number][] = []

  for (let i = 0; i <= numPoints; i++) {
    const x = (1 - Math.cos((i / numPoints) * Math.PI)) / 2

    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x)

    let yc = 0
    let dyc = 0
    if (p > 0) {
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x)
        dyc = (2 * m / (p * p)) * (p - x)
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x)
        dyc = (2 * m / ((1 - p) * (1 - p))) * (p - x)
      }
    }

    const theta = Math.atan(dyc)
    upper.push([x - yt * Math.sin(theta), yc + yt * Math.cos(theta)])
    lower.push([x + yt * Math.sin(theta), yc - yt * Math.cos(theta)])
  }

  return { upper, lower }
}

function NacaAirfoilGenerator() {
  const [digits, setDigits] = useState('2412')
  const [numPoints, setNumPoints] = useState(80)

  const airfoil = useMemo(() => generateNaca4(digits, numPoints), [digits, numPoints])

  const svgWidth = 600
  const svgHeight = 300
  const pad = 40
  const scaleX = svgWidth - pad * 2
  const scaleY = svgHeight * 2

  function toSvg(pt: [number, number]): string {
    return `${pad + pt[0] * scaleX},${svgHeight / 2 - pt[1] * scaleY}`
  }

  const upperPath = airfoil.upper.map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvg(p)}`).join(' ')
  const lowerPath = airfoil.lower.map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvg(p)}`).join(' ')

  const presets = [
    { label: 'NACA 0012 (Symmetric)', digits: '0012' },
    { label: 'NACA 2412 (General aviation)', digits: '2412' },
    { label: 'NACA 4412 (High lift)', digits: '4412' },
    { label: 'NACA 6412 (High camber)', digits: '6412' },
    { label: 'NACA 0006 (Thin symmetric)', digits: '0006' },
    { label: 'NACA 2424 (Thick cambered)', digits: '2424' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '16px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
        ✈️ NACA 4-Digit Airfoil Generator
      </h3>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-ghost)', display: 'block', marginBottom: '4px' }}>
            NACA Digits
          </label>
          <input
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            style={{
              width: '80px', padding: '8px 12px', borderRadius: '8px',
              fontSize: '16px', fontWeight: 700, fontFamily: 'monospace',
              background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)', outline: 'none', textAlign: 'center',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-ghost)', display: 'block', marginBottom: '4px' }}>
            Points
          </label>
          <input
            type="range" min={20} max={200} value={numPoints}
            onChange={(e) => setNumPoints(Number(e.target.value))}
            style={{ width: '120px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>{numPoints}</span>
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {presets.map((p) => (
          <button
            key={p.digits}
            onClick={() => setDigits(p.digits)}
            style={{
              padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 500,
              background: digits === p.digits ? 'var(--saathi-primary, #0A1628)' : 'var(--bg-elevated)',
              color: digits === p.digits ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)', cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* SVG Plot */}
      <div style={{
        background: '#fff', borderRadius: '12px', border: '1px solid var(--border-subtle)',
        padding: '12px', marginBottom: '16px',
      }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto' }}>
          {/* Grid */}
          <line x1={pad} y1={svgHeight / 2} x2={svgWidth - pad} y2={svgHeight / 2} stroke="#ddd" strokeWidth="1" />
          <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#ddd" strokeWidth="1" />
          {/* Chord line */}
          <line x1={pad} y1={svgHeight / 2} x2={svgWidth - pad} y2={svgHeight / 2} stroke="#ccc" strokeWidth="0.5" strokeDasharray="4 4" />
          {/* Airfoil */}
          <path d={upperPath} fill="none" stroke="#0A1628" strokeWidth="2" />
          <path d={lowerPath} fill="none" stroke="#60A5FA" strokeWidth="2" />
          {/* Fill */}
          <path d={`${upperPath} ${lowerPath.split(' ').reverse().join(' ')} Z`} fill="rgba(10,22,40,0.06)" />
          {/* Labels */}
          <text x={svgWidth / 2} y={svgHeight - 8} textAnchor="middle" fontSize="11" fill="#999">
            NACA {digits} — {numPoints} points
          </text>
          <text x={pad - 4} y={svgHeight / 2 - 4} fontSize="9" fill="#999" textAnchor="end">0</text>
        </svg>
      </div>

      {/* Properties */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px 18px',
        border: '1px solid var(--border-subtle)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Airfoil Properties
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>Max camber: <strong>{(parseInt(digits[0] ?? '0'))}%</strong> chord</div>
          <div>Camber position: <strong>{(parseInt(digits[1] ?? '0')) * 10}%</strong> chord</div>
          <div>Max thickness: <strong>{digits.slice(2)}%</strong> chord</div>
          <div>Points: <strong>{numPoints}</strong> per surface</div>
        </div>
      </div>
    </div>
  )
}

const TABS = ['Canvas', 'Sketchfab 3D', 'NASA Data', 'NASA Eyes', 'Airfoil Tools', 'Physics Lab', 'GeoGebra'] as const

// ── PhET simulations relevant to aerospace ──────────────────────────────────

const PHET_SIMS = [
  { id: 'projectile-motion', name: 'Projectile Motion', category: 'Mechanics' },
  { id: 'forces-and-motion-basics', name: 'Forces & Motion', category: 'Mechanics' },
  { id: 'gravity-and-orbits', name: 'Gravity & Orbits', category: 'Orbital Mechanics' },
  { id: 'energy-skate-park-basics', name: 'Energy Conservation', category: 'Thermodynamics' },
  { id: 'gas-properties', name: 'Gas Properties (PV=nRT)', category: 'Thermodynamics' },
  { id: 'wave-on-a-string', name: 'Wave Propagation', category: 'Vibrations' },
  { id: 'fluid-pressure-and-flow', name: 'Fluid Pressure & Flow', category: 'Fluid Dynamics' },
  { id: 'under-pressure', name: 'Under Pressure', category: 'Fluid Dynamics' },
  { id: 'balloons-and-buoyancy', name: 'Buoyancy', category: 'Fluid Dynamics' },
  { id: 'blackbody-spectrum', name: 'Blackbody Spectrum', category: 'Heat Transfer' },
]

const NIST_CONSTANTS = [
  { name: 'Speed of sound in air (20°C)', value: '343', unit: 'm/s' },
  { name: 'Standard atmosphere', value: '101 325', unit: 'Pa' },
  { name: 'Air density at sea level', value: '1.225', unit: 'kg/m³' },
  { name: 'Specific heat ratio (air)', value: '1.4', unit: 'γ' },
  { name: 'Gas constant (air)', value: '287.058', unit: 'J/(kg·K)' },
  { name: 'Gravitational acceleration', value: '9.80665', unit: 'm/s²' },
  { name: 'Boltzmann constant', value: '1.380649 × 10⁻²³', unit: 'J/K' },
  { name: 'Stefan–Boltzmann constant', value: '5.670374 × 10⁻⁸', unit: 'W/(m²·K⁴)' },
  { name: 'Universal gas constant', value: '8.31446', unit: 'J/(mol·K)' },
  { name: 'Mach 1 at sea level', value: '340.3', unit: 'm/s' },
]

function PhysicsLab() {
  const [selectedSim, setSelectedSim] = useState(PHET_SIMS[0].id)
  const [showConstants, setShowConstants] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedSim}
          onChange={(e) => setSelectedSim(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
            background: 'var(--bg-surface)', color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)', outline: 'none', flex: 1, minWidth: '180px',
          }}
        >
          {PHET_SIMS.map((s) => (
            <option key={s.id} value={s.id}>[{s.category}] {s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowConstants((v) => !v)}
          style={{
            padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
            background: showConstants ? 'var(--saathi-primary, #0A1628)' : 'var(--bg-elevated)',
            color: showConstants ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)', cursor: 'pointer',
          }}
        >
          {showConstants ? '✕ Hide Constants' : '📐 Constants'}
        </button>
      </div>

      {/* Constants panel */}
      {showConstants && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', maxHeight: '180px', overflowY: 'auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-ghost)', margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Aerospace Reference Constants
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '2px 12px', fontSize: '11px' }}>
            {NIST_CONSTANTS.map((c) => (
              <div key={c.name} style={{ display: 'contents' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{c.value}</span>
                <span style={{ color: 'var(--text-ghost)' }}>{c.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PhET simulation */}
      <div style={{ flex: 1 }}>
        <iframe
          title={`PhET — ${PHET_SIMS.find((s) => s.id === selectedSim)?.name}`}
          src={`https://phet.colorado.edu/sims/html/${selectedSim}/latest/${selectedSim}_all.html`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
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

        {/* ── Airfoil Generator (built-in NACA 4-digit) ── */}
        {tab === 'Airfoil Tools' && (
          <NacaAirfoilGenerator />
        )}

        {/* ── Physics Lab — PhET simulations for fluid dynamics + thermo ── */}
        {tab === 'Physics Lab' && (
          <PhysicsLab />
        )}

        {/* ── GeoGebra — engineering math, vector analysis, orbital mechanics ── */}
        {tab === 'GeoGebra' && (
          <div style={{ height: '100%' }}>
            <iframe
              title="GeoGebra Classic"
              src="https://www.geogebra.org/classic"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: AerospacePlugin,
  sourceLabel: 'NASA + NTRS + Sketchfab + PhET + GeoGebra',
  toolbarItems: [
    {
      icon: '🚀',
      label: 'APOD',
      onClick: () => {},
    },
  ],
}

export default plugin
