'use client'
import { useEffect, useRef } from 'react'

type Room = {
  name: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export type FloorPlanData = {
  rooms: Room[]
  scale?: string
  title?: string
}

const ROOM_FILLS: Record<string, string> = {
  warm: '#FFF3E0',
  cool: '#E3F2FD',
  neutral: '#F5F5F5',
  blue: '#E1F5FE',
  green: '#E8F5E9',
}

export function FloorPlanViewer({
  data,
  saathiColor = '#D97706',
}: {
  data: FloorPlanData
  saathiColor?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const padding = 60
    const scale = 60

    const maxX = Math.max(...data.rooms.map(r => r.x + r.width))
    const maxY = Math.max(...data.rooms.map(r => r.y + r.height))

    canvas.width = maxX * scale + padding * 2
    canvas.height = maxY * scale + padding * 2 + 30

    ctx.fillStyle = '#F5F0E8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Title
    if (data.title) {
      ctx.fillStyle = '#333'
      ctx.font = 'bold 13px DM Sans, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(data.title, canvas.width / 2, 22)
    }

    data.rooms.forEach(room => {
      const rx = padding + room.x * scale
      const ry = (data.title ? 30 : 0) + padding + room.y * scale
      const rw = room.width * scale
      const rh = room.height * scale

      ctx.fillStyle = ROOM_FILLS[room.color ?? 'neutral'] ?? '#F5F5F5'
      ctx.fillRect(rx, ry, rw, rh)

      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 3
      ctx.strokeRect(rx, ry, rw, rh)

      ctx.fillStyle = '#333'
      ctx.font = 'bold 11px DM Sans, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(room.name, rx + rw / 2, ry + rh / 2 - 6)

      ctx.fillStyle = '#888'
      ctx.font = '9px DM Sans, sans-serif'
      ctx.fillText(`${room.width}m × ${room.height}m`, rx + rw / 2, ry + rh / 2 + 8)
    })

    // North arrow
    const nx = canvas.width - 35
    const ny = (data.title ? 50 : 30)
    ctx.beginPath()
    ctx.moveTo(nx, ny - 10)
    ctx.lineTo(nx, ny + 10)
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#333'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('N', nx, ny - 14)

    // Scale label
    ctx.fillStyle = '#555'
    ctx.font = '9px DM Sans, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(data.scale ?? '1:100', padding, canvas.height - 10)
  }, [data])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = 'floorplan.png'
    a.href = canvas.toDataURL()
    a.click()
  }

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `0.5px solid ${saathiColor}30`,
    }}>
      <div style={{
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: `0.5px solid ${saathiColor}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          📐 Floor Plan
        </span>
        <button
          onClick={handleDownload}
          style={{
            background: 'none',
            border: 'none',
            color: saathiColor,
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          ⬇ Download PNG
        </button>
      </div>
      <div style={{ background: '#F5F0E8', overflowX: 'auto' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
