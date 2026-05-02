'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type TourStep = {
  target: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

type TooltipPosition = {
  top: number
  left: number
  arrow: 'top' | 'bottom' | 'left' | 'right'
}

export function TourTooltip({
  steps,
  onComplete,
  accentColor = '#C9993A',
}: {
  steps: TourStep[]
  onComplete: () => void
  accentColor?: string
}) {
  const [current, setCurrent] = useState(0)
  const [pos, setPos] = useState<TooltipPosition | null>(null)
  const [highlight, setHighlight] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = steps[current]
  const isLast = current === steps.length - 1

  useEffect(() => {
    positionTooltip()
    window.addEventListener('resize', positionTooltip)
    return () => window.removeEventListener('resize', positionTooltip)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  function positionTooltip() {
    const el = document.querySelector(step.target)
    if (!el) {
      handleNext()
      return
    }

    const rect = el.getBoundingClientRect()
    const tooltip = tooltipRef.current
    const tw = tooltip?.offsetWidth ?? 280
    const th = tooltip?.offsetHeight ?? 120
    const margin = 12
    const vw = window.innerWidth
    const vh = window.innerHeight

    setHighlight(rect)

    let arrow: TooltipPosition['arrow'] = 'top'
    let top = 0
    let left = 0

    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    const spaceRight = vw - rect.right

    if (spaceBelow > th + margin + 20) {
      arrow = 'top'
      top = rect.bottom + margin
      left = rect.left + rect.width / 2 - tw / 2
    } else if (spaceAbove > th + margin + 20) {
      arrow = 'bottom'
      top = rect.top - th - margin
      left = rect.left + rect.width / 2 - tw / 2
    } else if (spaceRight > tw + margin + 20) {
      arrow = 'left'
      top = rect.top + rect.height / 2 - th / 2
      left = rect.right + margin
    } else {
      arrow = 'right'
      top = rect.top + rect.height / 2 - th / 2
      left = rect.left - tw - margin
    }

    left = Math.max(12, Math.min(left, vw - tw - 12))
    top = Math.max(12, Math.min(top, vh - th - 12))

    setPos({ top, left, arrow })
  }

  function handleNext() {
    if (isLast) {
      onComplete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  function handleSkip() {
    onComplete()
  }

  function getArrowStyle(arrow: TooltipPosition['arrow']): React.CSSProperties {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: '10px',
      height: '10px',
      background: 'var(--bg-surface)',
      transform: 'rotate(45deg)',
    }
    switch (arrow) {
      case 'top':
        return {
          ...base,
          top: '-5px',
          left: '20px',
          borderTop: `0.5px solid ${accentColor}66`,
          borderLeft: `0.5px solid ${accentColor}66`,
        }
      case 'bottom':
        return {
          ...base,
          bottom: '-5px',
          left: '20px',
          borderBottom: `0.5px solid ${accentColor}66`,
          borderRight: `0.5px solid ${accentColor}66`,
        }
      case 'left':
        return {
          ...base,
          left: '-5px',
          top: '16px',
          borderBottom: `0.5px solid ${accentColor}66`,
          borderLeft: `0.5px solid ${accentColor}66`,
        }
      case 'right':
        return {
          ...base,
          right: '-5px',
          top: '16px',
          borderTop: `0.5px solid ${accentColor}66`,
          borderRight: `0.5px solid ${accentColor}66`,
        }
    }
  }

  return (
    <AnimatePresence>
      <>
        {/* Overlay with cutout */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            pointerEvents: 'none',
          }}
        >
          {highlight && (
            <>
              {/* Top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, highlight.top - 4),
                  background: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Bottom */}
              <div
                style={{
                  position: 'absolute',
                  top: highlight.bottom + 4,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Left */}
              <div
                style={{
                  position: 'absolute',
                  top: highlight.top - 4,
                  left: 0,
                  width: Math.max(0, highlight.left - 4),
                  height: highlight.height + 8,
                  background: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Right */}
              <div
                style={{
                  position: 'absolute',
                  top: highlight.top - 4,
                  left: highlight.right + 4,
                  right: 0,
                  height: highlight.height + 8,
                  background: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Highlight ring */}
              <div
                style={{
                  position: 'absolute',
                  top: highlight.top - 4,
                  left: highlight.left - 4,
                  width: highlight.width + 8,
                  height: highlight.height + 8,
                  borderRadius: '10px',
                  border: `2px solid ${accentColor}`,
                  boxShadow: `0 0 0 4px ${accentColor}20`,
                }}
              />
            </>
          )}
        </div>

        {/* Tooltip card */}
        {pos && (
          <motion.div
            ref={tooltipRef}
            key={current}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: '280px',
              background: 'var(--bg-surface)',
              border: `0.5px solid ${accentColor}60`,
              borderRadius: '14px',
              padding: '14px 16px',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Arrow */}
            <div style={getArrowStyle(pos.arrow)} />

            {/* Close ✕ */}
            <button
              onClick={handleSkip}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-ghost)',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1,
                padding: '2px',
              }}
            >
              ✕
            </button>

            {/* Title */}
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 6px',
                paddingRight: '20px',
                lineHeight: 1.3,
              }}
            >
              {step.title}
            </p>

            {/* Description */}
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '0 0 14px',
                lineHeight: 1.6,
              }}
            >
              {step.description}
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === current ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background:
                      i === current ? accentColor : 'var(--border-strong)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                onClick={handleSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-ghost)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Skip tour
              </button>

              <button
                onClick={handleNext}
                style={{
                  background: accentColor,
                  color: '#0B1F3A',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isLast ? 'Get started! 🎉' : 'Next →'}
              </button>
            </div>
          </motion.div>
        )}
      </>
    </AnimatePresence>
  )
}
