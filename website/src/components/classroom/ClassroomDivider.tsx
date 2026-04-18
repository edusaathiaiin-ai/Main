'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

const SNAP_POINTS = [0, 20, 40, 50, 60, 80, 100]
const SNAP_THRESHOLD = 5
const CYCLE_POINTS = [40, 50, 0] // double-click cycles through these

type Props = {
  sessionId: string
  onRatioChange: (leftPercent: number) => void
  initialRatio?: number
}

function snapToNearest(value: number): number {
  let closest = SNAP_POINTS[0]
  let minDist = Math.abs(value - closest)
  for (const p of SNAP_POINTS) {
    const dist = Math.abs(value - p)
    if (dist < minDist) {
      minDist = dist
      closest = p
    }
  }
  return minDist <= SNAP_THRESHOLD ? closest : value
}

export function ClassroomDivider({ sessionId, onRatioChange, initialRatio = 40 }: Props) {
  const dragging = useRef(false)
  const containerRef = useRef<Element | null>(null)
  const [cycleIndex, setCycleIndex] = useState(0)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`classroom-panel-ratio-${sessionId}`)
      if (saved) {
        const ratio = parseInt(saved, 10)
        if (ratio >= 0 && ratio <= 100) onRatioChange(ratio)
      }
    } catch { /* ignore */ }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveRatio = useCallback((ratio: number) => {
    try {
      localStorage.setItem(`classroom-panel-ratio-${sessionId}`, String(Math.round(ratio)))
    } catch { /* ignore */ }
  }, [sessionId])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    containerRef.current = (e.target as HTMLElement).parentElement
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    onRatioChange(Math.round(percent))
  }, [onRatioChange])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return
    dragging.current = false
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = (x / rect.width) * 100
    const snapped = snapToNearest(percent)
    onRatioChange(Math.round(snapped))
    saveRatio(snapped)
  }, [onRatioChange, saveRatio])

  const onDoubleClick = useCallback(() => {
    const nextIndex = (cycleIndex + 1) % CYCLE_POINTS.length
    setCycleIndex(nextIndex)
    const ratio = CYCLE_POINTS[nextIndex]
    onRatioChange(ratio)
    saveRatio(ratio)
  }, [cycleIndex, onRatioChange, saveRatio])

  return (
    <div
      className="hidden md:flex"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      style={{
        width: '8px',
        alignSelf: 'stretch',
        cursor: 'col-resize',
        background: 'var(--border-subtle, #e5e5e0)',
        flexShrink: 0,
        transition: 'background 0.15s',
        zIndex: 20,
        position: 'relative',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--saathi-primary, #C9993A)')}
      onMouseLeave={(e) => {
        if (!dragging.current) e.currentTarget.style.background = 'var(--border-subtle, #e5e5e0)'
      }}
    >
      {/* Grip dots */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        pointerEvents: 'none',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'var(--text-ghost, #a8a49e)',
          }} />
        ))}
      </div>
    </div>
  )
}
