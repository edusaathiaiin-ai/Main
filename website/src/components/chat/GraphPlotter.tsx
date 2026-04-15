'use client'
import { useMemo, useRef, useState } from 'react'

// ── Safe expression compiler ─────────────────────────────────────────────
// Whitelist-based: rejects anything outside [a-z0-9 + - * / ^ ( ) . , _ space]
// Insert implicit multiplication (9.8t → 9.8*t), map allowed identifiers
// to Math.*, then compile with new Function. The variable becomes a single
// parameter '__x'. No eval of arbitrary input — every character and
// identifier is checked.

const ALLOWED: Record<string, string> = {
  sin:   'Math.sin',
  cos:   'Math.cos',
  tan:   'Math.tan',
  asin:  'Math.asin',
  acos:  'Math.acos',
  atan:  'Math.atan',
  sinh:  'Math.sinh',
  cosh:  'Math.cosh',
  tanh:  'Math.tanh',
  exp:   'Math.exp',
  ln:    'Math.log',
  log:   'Math.log10',
  log2:  'Math.log2',
  sqrt:  'Math.sqrt',
  cbrt:  'Math.cbrt',
  abs:   'Math.abs',
  pow:   'Math.pow',
  floor: 'Math.floor',
  ceil:  'Math.ceil',
  round: 'Math.round',
  sign:  'Math.sign',
  max:   'Math.max',
  min:   'Math.min',
  pi:    'Math.PI',
  e:     'Math.E',
}

export type CompiledFn = (x: number) => number

export function compileExpression(raw: string, varName: string): CompiledFn {
  if (!/^[\sa-zA-Z0-9_+\-*/^().,]+$/.test(raw)) {
    throw new Error('Expression contains disallowed characters')
  }
  if (varName.length !== 1 || !/[a-zA-Z]/.test(varName)) {
    throw new Error('Variable must be a single letter')
  }

  let s = raw.replace(/\^/g, '**')

  // Implicit multiplication: digit|) followed by ident|( → insert *
  // Apply twice for chains like (x+1)(x-1)2
  for (let i = 0; i < 2; i++) {
    s = s.replace(/(\d|\))\s*(\(|[a-zA-Z_])/g, '$1*$2')
  }

  s = s.replace(/[a-zA-Z_]\w*/g, (id) => {
    if (id === varName) return '__x'
    const mapped = ALLOWED[id.toLowerCase()]
    if (!mapped) throw new Error(`Unknown identifier: ${id}`)
    return mapped
  })

  const fn = new Function('__x', `"use strict"; return (${s})`) as (n: number) => unknown
  return (x: number): number => {
    try {
      const v = fn(x)
      return typeof v === 'number' ? v : NaN
    } catch {
      return NaN
    }
  }
}

// ── Plotter component ────────────────────────────────────────────────────

const W = 480
const H = 280
const M = { top: 18, right: 18, bottom: 36, left: 44 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

function niceTicks(lo: number, hi: number, target = 5): number[] {
  const span = hi - lo
  if (span <= 0 || !isFinite(span)) return [lo]
  const step0 = span / target
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const norm = step0 / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(lo / step) * step
  const out: number[] = []
  for (let v = start; v <= hi + step * 1e-9; v += step) {
    out.push(Math.round(v / step) * step)
  }
  return out
}

function fmt(n: number): string {
  if (!isFinite(n)) return ''
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1000 || abs < 0.01) return n.toExponential(1)
  return Number(n.toFixed(2)).toString()
}

export function GraphPlotter({
  expression,
  variable,
  min,
  max,
  label,
  saathiColor = '#C9993A',
}: {
  expression: string
  variable: string
  min: number
  max: number
  label?: string
  saathiColor?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  const plot = useMemo(() => {
    let fn: CompiledFn
    try {
      fn = compileExpression(expression, variable)
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not parse expression', samples: [] as Array<{ x: number; y: number }> }
    }
    if (!(min < max) || !isFinite(min) || !isFinite(max)) {
      return { error: 'Invalid range', samples: [] }
    }

    const N = 240
    const samples: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= N; i++) {
      const x = min + (i / N) * (max - min)
      const y = fn(x)
      samples.push({ x, y: isFinite(y) ? y : NaN })
    }
    const ys = samples.map((s) => s.y).filter((y) => isFinite(y))
    if (ys.length === 0) return { error: 'No finite values in range', samples: [] }

    let yMin = Math.min(...ys)
    let yMax = Math.max(...ys)
    if (yMin === yMax) {
      yMin -= 1
      yMax += 1
    }
    // Always include y=0 if it's near the data range (so sign changes are visible)
    if (yMin > 0 && yMin < (yMax - yMin) * 0.5) yMin = 0
    if (yMax < 0 && -yMax < (yMax - yMin) * 0.5) yMax = 0
    const pad = (yMax - yMin) * 0.08
    yMin -= pad
    yMax += pad
    return { error: null, samples, yMin, yMax }
  }, [expression, variable, min, max])

  if (plot.error) {
    return (
      <div
        style={{
          margin: '12px 0',
          padding: '14px 16px',
          background: '#0F1923',
          borderRadius: 12,
          border: '0.5px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.65)',
          fontSize: 13,
        }}
      >
        Could not plot <code style={{ color: saathiColor }}>{expression}</code> — {plot.error}
      </div>
    )
  }

  const { samples, yMin, yMax } = plot as { samples: Array<{ x: number; y: number }>; yMin: number; yMax: number }
  const xs = (x: number): number => M.left + ((x - min) / (max - min)) * PW
  const ys = (y: number): number => M.top + (1 - (y - yMin) / (yMax - yMin)) * PH

  // Build path with breaks at NaN
  const segments: string[] = []
  let cur = ''
  for (const s of samples) {
    if (!isFinite(s.y)) {
      if (cur) {
        segments.push(cur)
        cur = ''
      }
      continue
    }
    cur += (cur ? ' L ' : 'M ') + xs(s.x).toFixed(2) + ' ' + ys(s.y).toFixed(2)
  }
  if (cur) segments.push(cur)

  const xTicks = niceTicks(min, max, 5)
  const yTicks = niceTicks(yMin, yMax, 5)
  const zeroX = min < 0 && max > 0 ? xs(0) : null
  const zeroY = yMin < 0 && yMax > 0 ? ys(0) : null

  const handleMove = (e: React.PointerEvent<SVGSVGElement>): void => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    if (px < M.left || px > M.left + PW) {
      setHover(null)
      return
    }
    const x = min + ((px - M.left) / PW) * (max - min)
    try {
      const fn = compileExpression(expression, variable)
      const y = fn(x)
      if (isFinite(y)) setHover({ x, y })
      else setHover(null)
    } catch {
      setHover(null)
    }
  }

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '14px',
        background: '#0F1923',
        borderRadius: 12,
        border: '0.5px solid rgba(255,255,255,0.12)',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', touchAction: 'none' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Grid + tick labels */}
        {xTicks.map((t, i) => (
          <g key={`xt-${i}`}>
            <line
              x1={xs(t)}
              x2={xs(t)}
              y1={M.top}
              y2={M.top + PH}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={xs(t)}
              y={M.top + PH + 16}
              fontSize={11}
              fill="rgba(255,255,255,0.5)"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={M.left}
              x2={M.left + PW}
              y1={ys(t)}
              y2={ys(t)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={M.left - 6}
              y={ys(t) + 4}
              fontSize={11}
              fill="rgba(255,255,255,0.5)"
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {fmt(t)}
            </text>
          </g>
        ))}

        {/* Zero axes — emphasised */}
        {zeroY !== null && (
          <line
            x1={M.left}
            x2={M.left + PW}
            y1={zeroY}
            y2={zeroY}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1}
          />
        )}
        {zeroX !== null && (
          <line
            x1={zeroX}
            x2={zeroX}
            y1={M.top}
            y2={M.top + PH}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1}
          />
        )}

        {/* Frame */}
        <rect
          x={M.left}
          y={M.top}
          width={PW}
          height={PH}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />

        {/* Curve */}
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={saathiColor}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Hover marker + readout */}
        {hover && isFinite(hover.y) && hover.y >= yMin && hover.y <= yMax && (
          <>
            <line
              x1={xs(hover.x)}
              x2={xs(hover.x)}
              y1={M.top}
              y2={M.top + PH}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={xs(hover.x)}
              cy={ys(hover.y)}
              r={4}
              fill={saathiColor}
              stroke="#0F1923"
              strokeWidth={2}
            />
            <text
              x={xs(hover.x) > W / 2 ? xs(hover.x) - 8 : xs(hover.x) + 8}
              y={M.top + 14}
              fontSize={12}
              fill="rgba(255,255,255,0.9)"
              textAnchor={xs(hover.x) > W / 2 ? 'end' : 'start'}
              fontFamily="ui-monospace, monospace"
            >
              {variable} = {fmt(hover.x)},  y = {fmt(hover.y)}
            </text>
          </>
        )}
      </svg>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: 'rgba(255,255,255,0.65)',
          fontFamily: 'ui-monospace, monospace',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span>
          {label ?? `f(${variable}) = ${expression}`}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          hover to read values
        </span>
      </div>
    </div>
  )
}
