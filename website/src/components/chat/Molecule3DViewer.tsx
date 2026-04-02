'use client'

import { useEffect, useRef, useState } from 'react'

interface ThreeDMolViewer {
  addModel: (data: string, format: string) => void
  setStyle: (sel: object, style: object) => void
  setBackgroundColor: (color: string) => void
  zoomTo: () => void
  render: () => void
  spin: (axis: string, speed: number) => void
  clear: () => void
  removeAllModels: () => void
}

interface ThreeDMolLib {
  createViewer: (element: HTMLElement, config: object) => ThreeDMolViewer
}

declare global {
  interface Window { $3Dmol?: ThreeDMolLib }
}

type RenderStyle = 'stick' | 'sphere' | 'surface'

const STYLE_CONFIGS: Record<RenderStyle, object> = {
  stick: {
    stick: { radius: 0.15, colorscheme: 'Jmol' },
    sphere: { scale: 0.25, colorscheme: 'Jmol' },
  },
  sphere: {
    sphere: { scale: 0.5, colorscheme: 'Jmol' },
  },
  surface: {
    surface: { opacity: 0.75, colorscheme: 'Jmol' },
  },
}

export function Molecule3DViewer({
  molecule,
  saathiColor = '#C9993A',
}: {
  molecule: string
  saathiColor?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ThreeDMolViewer | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeStyle, setActiveStyle] = useState<RenderStyle>('stick')

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        // Load 3Dmol.js from CDN if not already loaded
        if (!window.$3Dmol) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[src*="3Dmol"]')
            if (existing) {
              const poll = setInterval(() => {
                if (window.$3Dmol) { clearInterval(poll); resolve() }
              }, 100)
              setTimeout(() => { clearInterval(poll); reject(new Error('timeout')) }, 10000)
              return
            }
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js'
            script.async = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('3Dmol failed to load'))
            document.head.appendChild(script)
          })
        }

        if (cancelled) return

        // Fetch 3D SDF from PubChem (NIH)
        const res = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(molecule)}/SDF?record_type=3d`,
          { signal: AbortSignal.timeout(10000) }
        )
        if (!res.ok) throw new Error(`PubChem: ${res.status}`)
        const sdf = await res.text()

        if (cancelled || !containerRef.current || !window.$3Dmol) return

        // Clear any previous viewer
        viewerRef.current?.clear?.()

        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#060F1D',
          antialias: true,
        })

        viewerRef.current = viewer
        viewer.addModel(sdf, 'sdf')
        viewer.setStyle({}, STYLE_CONFIGS['stick'])
        viewer.zoomTo()
        viewer.render()
        viewer.spin('y', 0.8)

        if (!cancelled) setStatus('ready')

      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void load()
    return () => { cancelled = true }
  }, [molecule])

  function switchStyle(s: RenderStyle) {
    setActiveStyle(s)
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.setStyle({}, STYLE_CONFIGS[s])
    viewer.render()
  }

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
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          🔬 {molecule} — 3D Structure
        </span>
        {status === 'ready' && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['stick', 'sphere', 'surface'] as RenderStyle[]).map(s => (
              <button
                key={s}
                onClick={() => switchStyle(s)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  background: activeStyle === s ? saathiColor : 'rgba(255,255,255,0.06)',
                  color: activeStyle === s ? '#0B1F3A' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Viewer area */}
      <div style={{ position: 'relative', height: '320px', background: '#060F1D' }}>
        {/* Loading */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              border: `2px solid ${saathiColor}30`, borderTopColor: saathiColor,
              animation: 'mol3d-spin 0.9s linear infinite',
            }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              Loading from PubChem…
            </span>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              3D data not found for &ldquo;{molecule}&rdquo;
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
              Try aspirin, glucose, caffeine, benzene, ethanol
            </span>
          </div>
        )}

        {/* 3Dmol container */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '320px', display: status === 'error' ? 'none' : 'block' }}
        />
      </div>

      <div style={{
        padding: '5px 14px',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Drag to rotate · Scroll to zoom
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Source: PubChem NIH · Free
        </span>
      </div>

      <style>{`
        @keyframes mol3d-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
