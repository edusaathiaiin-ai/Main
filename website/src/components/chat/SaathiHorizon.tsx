'use client'

/**
 * SaathiHorizon — career-pathways panel docked below the chat input.
 *
 * Key behaviours:
 *   • Inline-docked surface (position: relative, full-width up to 820px,
 *     centred). Sits below <InputArea> in ChatWindow.
 *   • Default-expanded on desktop (≥ 768px), default-collapsed on mobile;
 *     toggleable via the chevron in the header.
 *   • Dismissible via the circular × button. Dismissed state is
 *     session-only — the sidebar "✦ Your Horizon" CTA fires a
 *     `horizon:open` window event that re-mounts the panel.
 *   • The header retains pointer handlers for drag (legacy from when the
 *     panel was a floating overlay). They are inert in the current
 *     inline-docked layout — kept so that if we ever flip back to
 *     floating mode, the persisted position + drag handlers light up
 *     without a rewrite.
 *   • Cards area scrolls internally (max-height 420px) so any filter
 *     combination lays out without clipping.
 *   • Palette is fully theme-token driven — every text and surface
 *     colour resolves from var(--text-*), var(--bg-*), var(--saathi-*).
 *     Adapts cleanly to each Saathi's tinted light surface (BioSaathi
 *     mint, KanoonSaathi gold-cream, ChemSaathi lavender, etc.) without
 *     a per-Saathi override.
 *   • Academic-level scoped: self-fetches student_soul.academic_level,
 *     hides rows whose `academic_levels` excludes the student.
 *
 * Content model (migration 116):
 *   Layer 1 (evergreen): title, description, inspiration — always shown
 *   Layer 2 (refreshable): deadlines, external_links — suppressed when
 *     `needs_verification = true`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────
type Category =
  | 'international'
  | 'certification'
  | 'crossover'
  | 'entrepreneurship'
  | 'research'
  | 'today'

type Difficulty = 'ambitious' | 'reachable' | 'today'

type Horizon = {
  id: string
  saathi_slug: string
  title: string
  category: Category
  difficulty: Difficulty
  description: string
  inspiration: string | null
  today_action: string
  today_prompt: string | null
  external_links: { label?: string; url?: string }[] | null
  deadlines: { label?: string; date?: string }[] | null
  academic_levels: string[] | null
  author_display_name: string | null
  author_credentials: string | null
  is_active: boolean
  needs_verification: boolean
}

type Props = {
  saathiSlug: string
  saathiName: string
  onPromptSelect: (prompt: string) => void
  academicLevel?: string | null
}

// ── Filter pills ─────────────────────────────────────────────────────────
const PILLS: { id: Category; emoji: string; label: string }[] = [
  { id: 'international',    emoji: '🌍', label: 'International'    },
  { id: 'certification',    emoji: '📜', label: 'Certifications'   },
  { id: 'crossover',        emoji: '⚡', label: 'Crossover'        },
  { id: 'entrepreneurship', emoji: '🌱', label: 'Entrepreneurship' },
  { id: 'research',         emoji: '🔬', label: 'Research'         },
]

type Filter = 'all' | Category

// ── Palette (light, Saathi-aware via theme tokens) ──────────────────────
// Migrated 2026-04-25 from the previous dark-island palette
// (BG_SURFACE='#0F1923', TEXT_HIGH='#FFFFFF') which clashed with the
// platform-wide light theme rule (website/CLAUDE.md: "platform is LIGHT
// THEME, not dark"). The panel now reads as a clean white card sitting
// on the Saathi-tinted base, with cards inside on a slightly raised
// elevated surface, and Saathi-coloured accents at the header + buttons.
const BG_SURFACE = 'var(--bg-surface)'      // panel — crisp white
const BG_CARD    = 'var(--bg-elevated)'     // each horizon card — cream
const BRD_SOFT   = 'var(--border-subtle)'   // hairline borders
const TEXT_HIGH  = 'var(--text-primary)'    // titles, strong copy
const TEXT_MID   = 'var(--text-secondary)'  // descriptions
const TEXT_LOW   = 'var(--text-ghost)'      // meta + show-more

// ── Layout constants ─────────────────────────────────────────────────────
const PANEL_WIDTH           = 420
const DEFAULT_OFFSET_PX     = 20
const POSITION_STORAGE_KEY  = 'horizon_panel_position'

type Pos = { x: number; y: number }

function readStoredPos(): Pos | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Pos
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p
    return null
  } catch {
    return null
  }
}

function defaultPos(): Pos {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Bottom-right corner, clamped to viewport.
  const w = Math.min(PANEL_WIDTH, vw - DEFAULT_OFFSET_PX * 2)
  return {
    x: Math.max(DEFAULT_OFFSET_PX, vw - w - DEFAULT_OFFSET_PX),
    y: Math.max(DEFAULT_OFFSET_PX, vh - 560), // leaves ~540px of panel height room
  }
}

// ── Component ────────────────────────────────────────────────────────────
export function SaathiHorizon({
  saathiSlug,
  saathiName,
  onPromptSelect,
  academicLevel,
}: Props) {
  const [horizons, setHorizons] = useState<Horizon[] | null>(null)
  const [level, setLevel]       = useState<string | null>(academicLevel ?? null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<Filter>('all')

  // Expanded = body visible. Dismissed = panel entirely hidden.
  const [isOpen, setIsOpen]           = useState<boolean>(false)
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  // Fixed position — initialised on mount to avoid SSR mismatch.
  const [pos, setPos] = useState<Pos | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Reset scroll to top whenever the filter changes — so the first
  // card of the chosen category is always visible (no perceived clip).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [filter])

  // ── Initial position + viewport-default collapse ──────────────────────
  useEffect(() => {
    setPos(readStoredPos() ?? defaultPos())
    if (typeof window !== 'undefined') {
      setIsOpen(window.matchMedia('(min-width: 768px)').matches)
    }
  }, [])

  // ── Sidebar CTA listener: `horizon:open` event ────────────────────────
  useEffect(() => {
    function handleOpen() {
      setIsDismissed(false)
      setIsOpen(true)
      // Snap back to default so it's on-screen, then scroll header into view
      const p = defaultPos()
      setPos(p)
      try {
        window.localStorage.removeItem(POSITION_STORAGE_KEY)
      } catch { /* ignore */ }
    }
    window.addEventListener('horizon:open', handleOpen)
    return () => window.removeEventListener('horizon:open', handleOpen)
  }, [])

  // ── Data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const horizonsP = supabase
        .from('saathi_horizons')
        .select('*')
        .eq('saathi_slug', saathiSlug)
        .eq('is_active', true)
        .order('difficulty', { ascending: true })

      const levelP =
        academicLevel !== undefined
          ? Promise.resolve({ data: null })
          : supabase
              .from('student_soul')
              .select('academic_level')
              .limit(1)
              .maybeSingle()

      const [{ data: horizonRows, error }, { data: soulRow }] = await Promise.all([
        horizonsP, levelP,
      ])

      if (cancelled) return
      if (error) {
        console.error('[SaathiHorizon] load failed:', error.message)
        setHorizons([])
      } else {
        setHorizons((horizonRows ?? []) as Horizon[])
      }
      if (academicLevel === undefined && soulRow && 'academic_level' in soulRow) {
        setLevel((soulRow as { academic_level: string | null }).academic_level ?? null)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [saathiSlug, academicLevel])

  // ── Drag handlers (pointer events — mouse + touch) ────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return
    // Don't start drag when clicking a button inside the header
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panelX: pos.x,
      panelY: pos.y,
    }
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const vw = window.innerWidth
    const vh = window.innerHeight
    const panelWidth = Math.min(PANEL_WIDTH, vw - 16)
    const nextX = Math.min(Math.max(0, drag.panelX + dx), vw - panelWidth)
    const nextY = Math.min(Math.max(0, drag.panelY + dy), vh - 80) // keep header in viewport
    setPos({ x: nextX, y: nextY })
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    // Persist only if the pointer actually moved (ignore plain clicks)
    const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4
    if (moved && pos) {
      try {
        window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos))
      } catch { /* ignore */ }
    }
  }, [pos])

  // Header double-click: reset to default, clear storage
  function handleHeaderDoubleClick() {
    setPos(defaultPos())
    try { window.localStorage.removeItem(POSITION_STORAGE_KEY) } catch { /* ignore */ }
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const scoped = useMemo(() => {
    if (!horizons) return []
    if (!level) return horizons
    return horizons.filter((h) => {
      if (!h.academic_levels || h.academic_levels.length === 0) return true
      return h.academic_levels.includes(level)
    })
  }, [horizons, level])

  const availablePills = useMemo(() => {
    const present = new Set(scoped.map((h) => h.category))
    return PILLS.filter((p) => present.has(p.id))
  }, [scoped])

  const visible = useMemo(() => {
    if (filter === 'all') return scoped
    return scoped.filter((h) => h.category === filter)
  }, [scoped, filter])

  // ── Early exits ───────────────────────────────────────────────────────
  if (loading || !pos || isDismissed) return null
  if (scoped.length === 0) return null

  return (
    <motion.section
      id="saathi-horizon-panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
      style={{
        position:      'relative',
        width:         '100%',
        margin:        '0 auto',
        maxWidth:      '820px',
        background:    BG_SURFACE,
        borderRadius:  '12px 12px 0 0',
        border:        `1px solid ${BRD_SOFT}`,
        borderBottom:  'none',
        boxShadow:     '0 -4px 20px rgba(0, 0, 0, 0.04)',
        fontFamily:    'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        overflow:      'visible', // let the close-button overflow
      }}
    >
      {/* Prominent close × (dismiss) — the sidebar "✦ Your Horizon" CTA
          re-opens the panel by dispatching a `horizon:open` window event,
          so dismissing here is non-destructive. */}
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss Horizon panel"
        style={{
          position:       'absolute',
          top:            '-10px',
          right:          '-10px',
          width:          '28px',
          height:         '28px',
          borderRadius:   '50%',
          background:     'var(--bg-elevated)',
          color:          'var(--text-primary)',
          border:         '1px solid var(--border-medium)',
          boxShadow:      'var(--shadow-md)',
          fontSize:       '14px',
          fontWeight:     700,
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          lineHeight:     1,
          padding:        0,
          zIndex:         2,
        }}
      >
        ×
      </button>

      {/* Header — drag handle + title + collapse chevron */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleHeaderDoubleClick}
        style={{
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          gap:           '12px',
          padding:       '14px 20px',
          cursor:        'grab',
          userSelect:    'none',
          touchAction:   'none',
          borderBottom:  isOpen ? `1px solid ${BRD_SOFT}` : 'none',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '8px',
              color:         'var(--saathi-primary, #C9993A)',
              fontSize:      '11px',
              fontWeight:    700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ fontSize: '13px' }}>✦</span>
            Your Horizon
          </div>
          <p
            style={{
              margin:     '2px 0 0',
              fontSize:   '13px',
              color:      TEXT_MID,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              overflow:   'hidden',
              textOverflow:'ellipsis',
            }}
          >
            What{' '}
            <strong style={{ color: TEXT_HIGH, fontWeight: 600 }}>{saathiName}</strong>{' '}
            students achieve
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v) }}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          aria-expanded={isOpen}
          style={{
            background:    'var(--bg-elevated)',
            border:        `1px solid ${BRD_SOFT}`,
            color:         'var(--saathi-primary, #C9993A)',
            borderRadius:  '8px',
            padding:       '4px 10px',
            fontSize:      '12px',
            fontWeight:    700,
            cursor:        'pointer',
            fontFamily:    'inherit',
            flexShrink:    0,
          }}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 20px 20px' }}>
              {/* Filter pills */}
              {availablePills.length > 0 && (
                <div
                  style={{
                    display:      'flex',
                    flexWrap:     'wrap',
                    gap:          '8px',
                    marginBottom: '14px',
                  }}
                >
                  <FilterPill
                    emoji=""
                    label="All"
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                  />
                  {availablePills.map((p) => (
                    <FilterPill
                      key={p.id}
                      emoji={p.emoji}
                      label={p.label}
                      active={filter === p.id}
                      onClick={() => setFilter(p.id)}
                    />
                  ))}
                </div>
              )}

              {/* Scrollable cards container — max 420px, internal scroll */}
              <div
                ref={scrollRef}
                className="horizon-scroll"
                style={{
                  maxHeight:      '420px',
                  overflowY:      'auto',
                  scrollBehavior: 'smooth',
                  display:        'flex',
                  flexDirection:  'column',
                  gap:            '10px',
                  paddingRight:   '4px',
                }}
              >
                {visible.map((h) => (
                  <HorizonCard
                    key={h.id}
                    horizon={h}
                    onPromptSelect={onPromptSelect}
                  />
                ))}
                {visible.length === 0 && (
                  <p
                    style={{
                      margin:    '8px 0',
                      fontSize:  '13px',
                      color:     TEXT_LOW,
                      fontStyle: 'italic',
                    }}
                  >
                    No horizons in this category yet.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

// ── Filter pill ──────────────────────────────────────────────────────────
function FilterPill({
  emoji, label, active, onClick,
}: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background:   active ? 'var(--saathi-bg, rgba(201,153,58,0.15))' : BG_CARD,
        border:       active
          ? `1px solid var(--saathi-primary, #C9993A)`
          : `1px solid ${BRD_SOFT}`,
        color:        active ? 'var(--saathi-primary, #C9993A)' : TEXT_MID,
        borderRadius: '999px',
        padding:      '6px 13px',
        fontSize:     '12.5px',
        fontWeight:   active ? 600 : 500,
        fontFamily:   'inherit',
        cursor:       'pointer',
        transition:   'all 160ms ease',
        whiteSpace:   'nowrap',
      }}
    >
      {emoji && <span style={{ marginRight: '5px' }}>{emoji}</span>}
      {label}
    </button>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────
function HorizonCard({
  horizon, onPromptSelect,
}: { horizon: Horizon; onPromptSelect: (prompt: string) => void }) {
  const [expanded, setExpanded]     = useState(false)
  const [clicked,  setClicked]      = useState(false)   // 0–300ms button transform
  const [confirming, setConfirming] = useState(false)   // 300–2300ms card dim + badge
  const stale = horizon.needs_verification
  const freshDeadline = stale ? undefined : horizon.deadlines?.[0]
  const freshLink     = stale ? undefined : horizon.external_links?.[0]

  function handleClick() {
    if (clicked || confirming) return
    const prompt = horizon.today_prompt?.trim() || horizon.today_action.trim()
    if (!prompt) return

    setClicked(true)

    // Moment 1 → Moment 2: button settles, then prompt is delivered.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('horizon:prompt', { detail: { prompt } }))
      // Keep the prop call as a fallback for any consumer that wires it
      // without listening to the event (e.g. tests).
      try { onPromptSelect(prompt) } catch { /* swallow */ }
      setClicked(false)
      setConfirming(true)
      window.setTimeout(() => setConfirming(false), 2000)
    }, 280)
  }

  return (
    <article
      style={{
        position:     'relative',
        background:   BG_CARD,
        border:       `1px solid ${BRD_SOFT}`,
        borderRadius: '12px',
        padding:      '14px 16px',
        opacity:      confirming ? 0.6 : 1,
        transition:   'opacity 240ms ease',
      }}
    >
      {/* Confirmation badge — fades in over the dimmed card for 2s */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              position:     'absolute',
              top:          '10px',
              right:        '12px',
              background:   'var(--saathi-primary, #C9993A)',
              // White text on Saathi-primary (always a deep colour like
              // #1A5C2E for BioSaathi, #1E3A5F for KanoonSaathi).
              color:        '#FFFFFF', // @allow-text-white
              fontSize:     '10.5px',
              fontWeight:   700,
              letterSpacing:'0.4px',
              padding:      '4px 8px',
              borderRadius: '999px',
              boxShadow:    '0 4px 12px rgba(0,0,0,0.25)',
              pointerEvents:'none',
              zIndex:       1,
            }}
          >
            ✓ Added to chat
          </motion.div>
        )}
      </AnimatePresence>
      <h4
        style={{
          margin:     '0 0 6px',
          fontSize:   '14.5px',
          fontWeight: 700,
          color:      TEXT_HIGH,
          lineHeight: 1.35,
        }}
      >
        {horizon.title}
      </h4>

      {horizon.inspiration && (
        <p
          style={{
            margin:     '0 0 10px',
            fontSize:   '12.5px',
            fontStyle:  'italic',
            color:      'var(--saathi-primary, #C9993A)',
            lineHeight: 1.5,
          }}
        >
          {horizon.inspiration}
        </p>
      )}

      <p
        style={{
          margin:          '0 0 10px',
          fontSize:        '12.5px',
          color:           TEXT_MID,
          lineHeight:      1.6,
          display:         expanded ? 'block' : '-webkit-box',
          WebkitBoxOrient: 'vertical' as const,
          WebkitLineClamp: expanded ? 'unset' : 2,
          overflow:        expanded ? 'visible' : 'hidden',
        }}
      >
        {horizon.description}
      </p>

      {horizon.description.length > 140 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background:     'transparent',
            border:         'none',
            color:          TEXT_LOW,
            fontSize:       '11px',
            padding:        0,
            margin:         '0 0 10px',
            cursor:         'pointer',
            fontFamily:     'inherit',
            textDecoration: 'underline',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {(freshDeadline || freshLink) && (
        <div
          style={{
            display:      'flex',
            flexWrap:     'wrap',
            gap:          '10px',
            marginBottom: '10px',
            fontSize:     '11px',
            color:        TEXT_LOW,
          }}
        >
          {freshDeadline?.label && (
            <span>
              📅 {freshDeadline.label}
              {freshDeadline.date ? ` · ${freshDeadline.date}` : ''}
            </span>
          )}
          {freshLink?.url && (
            <a
              href={freshLink.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color:          'var(--saathi-primary, #C9993A)',
                textDecoration: 'none',
                borderBottom:   `1px dotted var(--saathi-primary, #C9993A)`,
              }}
            >
              {freshLink.label ?? 'Learn more'} ↗
            </a>
          )}
        </div>
      )}

      {stale && (
        <p
          style={{
            margin:    '0 0 10px',
            fontSize:  '11px',
            color:     TEXT_LOW,
            fontStyle: 'italic',
          }}
        >
          Verify current details directly.
        </p>
      )}

      <motion.button
        type="button"
        onClick={handleClick}
        disabled={clicked || confirming}
        animate={
          clicked
            ? {
                scale:     0.96,
                boxShadow: [
                  '0 0 0 0   var(--saathi-primary, #C9993A)',
                  '0 0 0 10px rgba(201,153,58,0)',
                  '0 0 0 0   rgba(201,153,58,0)',
                ],
              }
            : { scale: 1, boxShadow: '0 0 0 0 rgba(201,153,58,0)' }
        }
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileHover={!clicked && !confirming ? { opacity: 0.88 } : {}}
        style={{
          background:    'var(--saathi-primary, #C9993A)',
          // White text on Saathi-primary. The previous '#0F1923' here
          // rendered the CTA invisible (dark-on-dark).
          color:         '#FFFFFF', // @allow-text-white
          border:        'none',
          borderRadius:  '10px',
          padding:       '8px 14px',
          fontSize:      '12.5px',
          fontWeight:    700,
          fontFamily:    'inherit',
          cursor:        clicked || confirming ? 'default' : 'pointer',
        }}
      >
        {clicked ? 'Opening…' : 'Start this conversation →'}
      </motion.button>

      {horizon.author_display_name && (
        <p
          style={{
            margin:     '10px 0 0',
            fontSize:   '10.5px',
            color:      TEXT_LOW,
            lineHeight: 1.45,
          }}
        >
          Written by{' '}
          <strong style={{ color: TEXT_MID, fontWeight: 600 }}>
            {horizon.author_display_name}
          </strong>
          {horizon.author_credentials ? ` · ${horizon.author_credentials}` : ''}
        </p>
      )}
    </article>
  )
}
