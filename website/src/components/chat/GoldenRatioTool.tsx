'use client'
import { useEffect, useRef, useState } from 'react'

const PHI = 1.618033988749895

function analyseRatio(w: number, h: number) {
  if (w <= 0 || h <= 0) return null
  const ratio = Math.max(w, h) / Math.min(w, h)
  const deviation = (Math.abs(ratio - PHI) / PHI) * 100
  return {
    ratio: ratio.toFixed(3),
    deviation: deviation.toFixed(1),
    isGolden: deviation < 5,
    verdict:
      deviation < 2
        ? '✦ Perfect golden ratio'
        : deviation < 5
          ? 'Very close to φ (phi)'
          : deviation < 15
            ? 'Near golden proportion'
            : 'Not a golden proportion',
    color:
      deviation < 2
        ? '#4ADE80'
        : deviation < 5
          ? '#86EFAC'
          : deviation < 15
            ? '#FCD34D'
            : '#F87171',
  }
}

export function GoldenRatioTool({
  initialWidth,
  initialHeight,
  saathiColor = '#D97706',
}: {
  initialWidth?: number
  initialHeight?: number
  saathiColor?: string
}) {
  const [width, setWidth] = useState(initialWidth ?? 8.5)
  const [height, setHeight] = useState(initialHeight ?? 5.3)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const result = analyseRatio(width, height)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 400
    canvas.height = 220
    ctx.fillStyle = '#060F1D'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const maxDim = Math.max(width, height) || 1
    const scale = 160 / maxDim
    const ox = 30
    const oy = 30

    const pw = width * scale
    const ph = height * scale

    // Rectangle
    ctx.fillStyle = `${saathiColor}18`
    ctx.fillRect(ox, oy, pw, ph)
    ctx.strokeStyle = saathiColor
    ctx.lineWidth = 2
    ctx.strokeRect(ox, oy, pw, ph)

    // Golden ratio rectangle overlay
    const goldenW = ph * PHI
    if (goldenW <= pw + 2) {
      ctx.strokeStyle = 'rgba(74,222,128,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(ox, oy, Math.min(goldenW, pw), ph)
      ctx.setLineDash([])
    }

    // Fibonacci spiral (approximate)
    ctx.strokeStyle = `${saathiColor}60`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    let a = Math.min(pw, ph)
    const cx = ox
    const cy = oy + ph
    ctx.moveTo(cx, cy)
    for (let i = 0; i < 6 && a > 2; i++) {
      const b = a / PHI
      const angle = (Math.PI / 2) * (i % 4)
      const startAngle = angle + Math.PI
      const endAngle = angle + Math.PI / 2
      ctx.arc(
        cx,
        cy,
        a,
        startAngle > endAngle ? endAngle : startAngle,
        startAngle > endAngle ? startAngle : endAngle
      )
      a = b
    }
    ctx.stroke()

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '10px DM Sans, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${width}m`, ox + pw / 2, oy + ph + 14)
    ctx.save()
    ctx.translate(ox - 12, oy + ph / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${height}m`, 0, 0)
    ctx.restore()

    // φ label
    ctx.fillStyle = saathiColor
    ctx.font = 'bold 24px Playfair Display, serif'
    ctx.textAlign = 'left'
    ctx.fillText('φ = 1.618', 220, 80)
    ctx.font = '11px DM Sans, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('The golden ratio', 220, 100)
    ctx.fillText('Found in: Parthenon,', 220, 118)
    ctx.fillText('Taj Mahal, Le Corbusier', 220, 134)
    ctx.fillText('Modulor, nautilus shell', 220, 150)
  }, [width, height, saathiColor])

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
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: `0.5px solid ${saathiColor}20`,
        }}
      >
        <span
          style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}
        >
          ✦ Golden Ratio Analyser — φ = 1.618
        </span>
      </div>

      <div style={{ padding: '16px', background: '#060F1D' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            maxWidth: '400px',
            display: 'block',
            margin: '0 auto 16px',
          }}
        />

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Width (m)
            <input
              type="number"
              value={width}
              step={0.1}
              min={0.1}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
              style={{
                width: '70px',
                background: 'rgba(255,255,255,0.06)',
                border: `0.5px solid ${saathiColor}40`,
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </label>
          <label
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Height (m)
            <input
              type="number"
              value={height}
              step={0.1}
              min={0.1}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
              style={{
                width: '70px',
                background: 'rgba(255,255,255,0.06)',
                border: `0.5px solid ${saathiColor}40`,
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </label>
        </div>

        {/* Result */}
        {result && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: '20px',
                fontFamily: 'Playfair Display',
                color: result.color,
                fontWeight: '700',
              }}
            >
              {result.verdict}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Ratio: {result.ratio} · Deviation from φ: {result.deviation}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
