'use client'

import { useCallback, useRef } from 'react'

type Props = {
  onDrag: (deltaX: number) => void
}

export function ColumnResizer({ onDrag }: Props) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      lastX.current = e.clientX
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    []
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - lastX.current
      lastX.current = e.clientX
      onDrag(delta)
    },
    [onDrag]
  )

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--saathi-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
      style={{
        width: '4px',
        cursor: 'col-resize',
        background: 'var(--border-subtle)',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    />
  )
}
