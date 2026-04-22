'use client'

// ─────────────────────────────────────────────────────────────────────────────
// FacultyToolDock
//
// Right-side collapsible dock that gives faculty users direct access to
// free, open-source research tools for their Saathi — PubMed, RCSB, UniProt,
// India Code, GeoGebra, PhET, SageMathCell, etc. Scaffold only in this phase:
// the collapsed rail + expanded card view render, but clicking a tool does
// not yet open a working panel (those land in the next phase).
//
// Mounted only when profile.role === 'faculty' && viewAs === 'faculty'.
// Listens for the `faculty-dock:toggle` window event so the top-bar 🔧 button
// can open/close it without prop-drilling.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getFacultyBasket, type FacultyTool } from '@/lib/faculty-solo/pluginRegistry'
import { FacultyPanelRouter } from './panels/FacultyPanelRouter'
import { FacultyArtifactRail } from './FacultyArtifactRail'

type Props = {
  saathiSlug: string
}

const RAIL_WIDTH     = 56
const EXPANDED_WIDTH = 420
const FIRST_VISIT_KEY = 'faculty_tools_seen_v1'

export function FacultyToolDock({ saathiSlug }: Props) {
  const basket = getFacultyBasket(saathiSlug)

  const [expanded, setExpanded]         = useState(false)
  const [hoveredId, setHoveredId]       = useState<string | null>(null)
  const [sparkle, setSparkle]           = useState(false)
  const [selectedTool, setSelectedTool] = useState<FacultyTool | null>(null)
  const [zoomed, setZoomed]             = useState(false)

  // Returning to the basket or closing the dock also exits zoom — nothing to
  // zoom into when no tool is active.
  useEffect(() => {
    if (!selectedTool || !expanded) setZoomed(false)
  }, [selectedTool, expanded])

  // If the faculty switches Saathis while a panel is open, drop the selection —
  // that tool may not be in the new basket.
  useEffect(() => {
    setSelectedTool(null)
  }, [saathiSlug])

  // First-visit sparkle on the collapsed rail
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY)) {
        setSparkle(true)
        const t = setTimeout(() => {
          setSparkle(false)
          localStorage.setItem(FIRST_VISIT_KEY, '1')
        }, 3000)
        return () => clearTimeout(t)
      }
    } catch { /* storage unavailable — ignore */ }
  }, [])

  // Listen for the top-bar button toggle event
  useEffect(() => {
    const onToggle = () => setExpanded((prev) => !prev)
    window.addEventListener('faculty-dock:toggle', onToggle)
    return () => window.removeEventListener('faculty-dock:toggle', onToggle)
  }, [])

  // Escape → if zoomed, exit zoom first; otherwise close the expanded panel.
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (zoomed) setZoomed(false)
      else        setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, zoomed])

  const handleToolClick = useCallback((tool: FacultyTool) => {
    setExpanded(true)
    setSelectedTool(tool)
  }, [])

  return (
    <div
      className="hidden xl:flex"
      style={{
        flexShrink: 0,
        position:   'relative',
        height:     '100%',
      }}
      aria-label="Faculty research tools"
    >
      {/* ── Collapsed rail — always visible on xl+ screens ──────────────── */}
      <div
        style={{
          width:        RAIL_WIDTH,
          height:       '100%',
          background:   'var(--bg-surface)',
          borderLeft:   '1px solid var(--border-subtle)',
          display:      'flex',
          flexDirection:'column',
          alignItems:   'center',
          paddingTop:   12,
          gap:          4,
          flexShrink:   0,
          overflowY:    'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Vertical basket label */}
        <span
          style={{
            writingMode:      'vertical-rl',
            transform:        'rotate(180deg)',
            fontSize:         10,
            fontWeight:       600,
            letterSpacing:    1.2,
            textTransform:    'uppercase',
            color:            'var(--text-ghost)',
            padding:          '4px 0 12px',
            fontFamily:       'var(--font-body)',
            whiteSpace:       'nowrap',
          }}
        >
          Your Saathi&apos;s toolkit →
        </span>

        {basket.tools.map((tool) => {
          const isHovered = hoveredId === tool.id
          return (
            <div
              key={tool.id}
              style={{ position: 'relative', width: '100%' }}
              onMouseEnter={() => setHoveredId(tool.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => handleToolClick(tool)}
                aria-label={`${tool.name} — ${tool.description}`}
                style={{
                  width:        '100%',
                  display:      'flex',
                  flexDirection:'column',
                  alignItems:   'center',
                  gap:          2,
                  padding:      '8px 0',
                  background:   isHovered ? 'var(--bg-elevated)' : 'transparent',
                  border:       'none',
                  borderLeft:   isHovered ? '2px solid var(--saathi-primary)' : '2px solid transparent',
                  cursor:       'pointer',
                  transition:   'background 0.15s ease, border-color 0.15s ease',
                  position:     'relative',
                }}
              >
                <span
                  className={sparkle ? 'faculty-dock-sparkle' : ''}
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    display:  'inline-flex',
                    alignItems:'center',
                    justifyContent:'center',
                    width:    32,
                    height:   32,
                    borderRadius: 16,
                    background: isHovered ? 'var(--saathi-light)' : 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {tool.emoji}
                </span>
                <span
                  style={{
                    fontSize:   9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color:      isHovered ? 'var(--text-primary)' : 'var(--text-ghost)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tool.shortLabel}
                </span>
              </button>

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  style={{
                    position:   'absolute',
                    right:      RAIL_WIDTH + 6,
                    top:        4,
                    width:      280,
                    padding:    '12px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-surface)',
                    border:     '1px solid var(--border-medium)',
                    boxShadow:  '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex:     50,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{tool.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {tool.name}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 8px',
                    lineHeight: 1.5,
                  }}>
                    {tool.description}
                  </p>
                  {tool.samplePrompt && (
                    <p style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      fontStyle: 'italic',
                      margin: '0 0 8px',
                      lineHeight: 1.5,
                    }}>
                      Try: &ldquo;{tool.samplePrompt}&rdquo;
                    </p>
                  )}
                  <p style={{
                    fontSize: 10,
                    color: 'var(--text-ghost)',
                    margin: 0,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {tool.sourceLabel}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Expanded panel — slides in from the right ──────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: zoomed ? '100vw' : EXPANDED_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              height:     zoomed ? '100vh' : '100%',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              overflow:   'hidden',
              display:    'flex',
              flexDirection: 'column',
              ...(zoomed ? {
                position: 'fixed',
                top:      0,
                right:    0,
                bottom:   0,
                left:     0,
                zIndex:   9999,
                boxShadow:'0 0 60px rgba(0,0,0,0.15)',
              } : {}),
            }}
          >
            {/* Header — shows breadcrumb when a tool is active */}
            <div
              style={{
                padding:      '14px 16px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink:   0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {selectedTool ? (
                  <button
                    onClick={() => setSelectedTool(null)}
                    aria-label="Back to basket"
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        6,
                      background: 'transparent',
                      border:     'none',
                      padding:    0,
                      cursor:     'pointer',
                      color:      'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize:   12,
                      fontWeight: 600,
                      minWidth:   0,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>←</span>
                    <span className="truncate" style={{ maxWidth: 300 }}>
                      {basket.headerLabel} <span style={{ color: 'var(--text-ghost)', margin: '0 4px' }}>▸</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedTool.name}</span>
                    </span>
                  </button>
                ) : (
                  <h3
                    style={{
                      fontSize:   15,
                      fontWeight: 700,
                      color:      'var(--text-primary)',
                      margin:     0,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {basket.headerLabel}
                  </h3>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {selectedTool && (
                    <button
                      onClick={() => setZoomed((z) => !z)}
                      aria-label={zoomed ? 'Shrink panel (Esc)' : 'Zoom panel to fullscreen'}
                      title={zoomed ? 'Shrink back to dock (Esc)' : 'Zoom to fullscreen (or double-click)'}
                      style={{
                        background:  'transparent',
                        border:      'none',
                        cursor:      'pointer',
                        fontSize:    15,
                        lineHeight:  1,
                        color:       zoomed ? 'var(--gold)' : 'var(--text-ghost)',
                        padding:     '4px 6px',
                        borderRadius: 6,
                        transition:  'background 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)'
                        e.currentTarget.style.color      = 'var(--saathi-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color      = zoomed ? 'var(--gold)' : 'var(--text-ghost)'
                      }}
                    >
                      {zoomed ? '⤏' : '⛶'}
                    </button>
                  )}
                  <button
                    onClick={() => { setZoomed(false); setSelectedTool(null); setExpanded(false) }}
                    aria-label="Close research basket"
                    style={{
                      background: 'transparent',
                      border:     'none',
                      cursor:     'pointer',
                      fontSize:   16,
                      lineHeight: 1,
                      color:      'var(--text-ghost)',
                      padding:    4,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {!selectedTool && (
                <p
                  style={{
                    fontSize:   12,
                    color:      'var(--gold)',
                    margin:     '6px 0 0',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  ✦ {basket.invitation}
                </p>
              )}
            </div>

            {/* Body — tool cards OR active panel. Double-click the panel
                to toggle zoom, matching the classroom FullscreenPanel pattern. */}
            {selectedTool ? (
              <div
                style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
                onDoubleClick={(e) => {
                  // Ignore double-clicks on form inputs (search boxes) — only
                  // treat empty-area dbl-clicks as zoom intent.
                  const target = e.target as HTMLElement
                  if (target.closest('input, textarea, button, a, select')) return
                  setZoomed((z) => !z)
                }}
              >
                <FacultyPanelRouter tool={selectedTool} saathiSlug={saathiSlug} />
              </div>
            ) : (
              <div
                style={{
                  flex:          1,
                  minHeight:     0,
                  overflowY:     'auto',
                  padding:       12,
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           10,
                }}
              >
                {basket.tools.map((tool, i) => {
                  const shouldDivide =
                    typeof basket.primaryCount === 'number' &&
                    i === basket.primaryCount &&
                    i > 0 &&
                    i < basket.tools.length
                  return (
                    <div key={tool.id}>
                      {shouldDivide && (
                        <div style={{
                          display:        'flex',
                          alignItems:     'center',
                          gap:            8,
                          margin:         '6px 2px 8px',
                        }}>
                          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                          <span style={{
                            fontSize:      9,
                            fontWeight:    700,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            color:         'var(--text-ghost)',
                            whiteSpace:    'nowrap',
                          }}>
                            ✦ Also in this basket
                          </span>
                          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                      >
                        <ToolCard tool={tool} onClick={() => handleToolClick(tool)} />
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Today's Work rail — only visible on the basket view to keep
                the active-panel area uncluttered. Returning to the basket
                after saving a few things reveals the rail full-height. */}
            {!selectedTool && <FacultyArtifactRail saathiSlug={saathiSlug} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-visit sparkle keyframes */}
      <style jsx>{`
        .faculty-dock-sparkle {
          box-shadow: 0 0 0 0 rgba(201, 153, 58, 0.55);
          animation: facultyDockPulse 1.6s ease-out 2;
        }
        @keyframes facultyDockPulse {
          0%   { box-shadow: 0 0 0 0 rgba(201, 153, 58, 0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(201, 153, 58, 0); }
          100% { box-shadow: 0 0 0 0 rgba(201, 153, 58, 0); }
        }
      `}</style>
    </div>
  )
}

// ── ToolCard — used inside the expanded dock ───────────────────────────────

function ToolCard({ tool, onClick }: { tool: FacultyTool; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:      14,
        borderRadius: 12,
        background:   hover ? 'var(--bg-elevated)' : 'var(--bg-base)',
        border:       `1px solid ${hover ? 'var(--saathi-border)' : 'var(--border-subtle)'}`,
        cursor:       'pointer',
        transition:   'all 0.15s ease',
        transform:    hover ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{tool.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize:   14,
            fontWeight: 700,
            color:      'var(--text-primary)',
            margin:     0,
            lineHeight: 1.3,
          }}>
            {tool.name}
          </p>
          <p style={{
            fontSize:   12,
            color:      'var(--text-secondary)',
            margin:     '3px 0 0',
            lineHeight: 1.45,
          }}>
            {tool.description}
          </p>
          {tool.samplePrompt && (
            <p style={{
              fontSize:   11,
              color:      'var(--text-tertiary)',
              fontStyle:  'italic',
              margin:     '8px 0 0',
              lineHeight: 1.45,
            }}>
              ✨ Try: &ldquo;{tool.samplePrompt}&rdquo;
            </p>
          )}
          <p style={{
            fontSize:      10,
            color:         'var(--text-ghost)',
            margin:        '8px 0 0',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            fontWeight:    600,
          }}>
            {tool.sourceLabel}{' '}
            <a
              href={tool.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'var(--gold)', textDecoration: 'none' }}
            >
              ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
