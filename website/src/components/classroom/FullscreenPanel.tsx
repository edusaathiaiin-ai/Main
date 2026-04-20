'use client'

import { useState, useEffect, type ReactNode } from 'react'

export function FullscreenPanel({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      inset: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      background: 'var(--bg-base)',
      borderRadius: isFullscreen ? 0 : undefined,
      transition: 'all 200ms ease',
      width: '100%',
      height: isFullscreen ? '100vh' : '100%',
    }}>
      {isFullscreen && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {label}
          </span>
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              fontSize: '18px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {!isFullscreen && (
        <button
          onClick={() => setIsFullscreen(true)}
          title="Expand to fullscreen"
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
            fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1,
          }}
        >
          ⛶
        </button>
      )}

      <div
        style={{ height: isFullscreen ? 'calc(100vh - 41px)' : '100%', width: '100%' }}
        onDoubleClick={() => !isFullscreen && setIsFullscreen(true)}
      >
        {children}
      </div>
    </div>
  )
}
