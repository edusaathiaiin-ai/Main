'use client'
import { useEffect, useRef } from 'react'

interface ThreeDMolViewer {
  addModel: (data: string, format: string) => void
  setStyle: (sel: object, style: object) => void
  zoomTo: () => void
  render: () => void
  spin: (axis: string, speed: number) => void
  clear: () => void
}

interface ThreeDMolLib {
  createViewer: (element: HTMLElement, config: object) => ThreeDMolViewer
}

declare global {
  interface Window { $3Dmol?: ThreeDMolLib }
}

export function Molecule3DViewer({
  molecule,
  saathiColor = '#C9993A',
}: {
  molecule: string
  saathiColor?: string
}) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstance = useRef<ThreeDMolViewer | null>(null)

  useEffect(() => {
    if (!viewerRef.current) return

    async function load3DMol() {
      if (!window.$3Dmol) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js'
          script.async = true
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      const res = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(molecule)}/SDF?record_type=3d`
      )
      if (!res.ok) return
      const sdf = await res.text()

      if (!viewerRef.current || !window.$3Dmol) return

      const viewer = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: 'transparent',
        antialias: true,
      })
      viewerInstance.current = viewer
      viewer.addModel(sdf, 'sdf')
      viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } })
      viewer.zoomTo()
      viewer.render()
      viewer.spin('y', 1)
    }

    void load3DMol()

    return () => {
      viewerInstance.current?.clear()
    }
  }, [molecule])

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `0.5px solid ${saathiColor}30`,
      background: 'rgba(0,0,0,0.3)',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: `0.5px solid ${saathiColor}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          🔬 {molecule} — 3D Structure
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          Drag to rotate · Scroll to zoom
        </span>
      </div>
      <div ref={viewerRef} style={{ width: '100%', height: '300px' }} />
    </div>
  )
}
