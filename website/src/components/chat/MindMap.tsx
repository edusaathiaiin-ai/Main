'use client'

import { useEffect, useRef } from 'react'

type MindMapProps = {
  markdown: string
  saathiColor?: string
}

export function MindMap({ markdown, saathiColor = '#C9993A' }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<unknown>(null)

  useEffect(() => {
    if (!svgRef.current) return

    async function render() {
      const { Transformer } = await import('markmap-lib')
      const { Markmap } = await import('markmap-view')

      const transformer = new Transformer()
      const { root } = transformer.transform(markdown)

      if (mmRef.current) {
        ;(
          mmRef.current as { setData: (r: unknown) => void; fit: () => void }
        ).setData(root)
        ;(
          mmRef.current as { setData: (r: unknown) => void; fit: () => void }
        ).fit()
      } else {
        mmRef.current = Markmap.create(svgRef.current!, { duration: 500 }, root)
      }
    }

    void render()
  }, [markdown])

  return (
    <div
      style={{
        margin: '12px 0',
        background: 'var(--bg-surface, #FFFFFF)',
        border: `0.5px solid ${saathiColor}25`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          borderBottom: `0.5px solid ${saathiColor}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}
        >
          🗺️ Mind Map
        </span>
        <button
          onClick={() => {
            const svg = svgRef.current
            if (!svg) return
            const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'mindmap.svg'
            a.click()
            URL.revokeObjectURL(url)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: saathiColor,
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          ⬇ Export
        </button>
      </div>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '350px', display: 'block' }}
      />
    </div>
  )
}
