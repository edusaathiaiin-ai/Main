'use client'

/**
 * SaathiHorizon
 *
 * Aspirational career panel docked below the chat input. Gives the student
 * a real destination (UN role, certification, crossover field, startup,
 * research path) plus a one-tap prompt that drops today_prompt into the
 * chat input — they're already in chat, no separate "How to start" page.
 *
 * Placement: below <InputArea />, always present during a chat session.
 * Default state: collapsed on mobile, expanded on desktop.
 *
 * Visual: intentionally a dark island inside the light chat surface, so
 * the Horizon moment feels distinct from the conversation itself.
 *
 * Filtering:
 *   • saathi_slug = current Saathi
 *   • is_active = true
 *   • student's academic_level ∈ row.academic_levels (null academic_levels
 *     on a row = visible to everyone)
 *   • Category pill filter (client-side, all by default)
 *
 * Two-layer content model (migration 116):
 *   • Layer 1 (evergreen): title, description, inspiration — shown always
 *   • Layer 2 (refreshable): deadlines, external_links — suppressed when
 *     `needs_verification = true` (weekly cron flips this after 90 days)
 */

import { useEffect, useMemo, useState } from 'react'
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
  /** If provided, skips the self-fetch for academic_level. */
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

// ── Palette (self-contained dark island) ─────────────────────────────────
const BG_SURFACE = '#0F1923'
const BG_CARD    = 'rgba(255, 255, 255, 0.03)'
const BRD_SOFT   = 'rgba(255, 255, 255, 0.08)'
const TEXT_HIGH  = '#FFFFFF'
const TEXT_MID   = 'rgba(255, 255, 255, 0.60)'
const TEXT_LOW   = 'rgba(255, 255, 255, 0.35)'
const GOLD       = '#C9993A'
const GOLD_LIGHT = '#E5B86A'

// ── Component ────────────────────────────────────────────────────────────
export function SaathiHorizon({
  saathiSlug,
  saathiName,
  onPromptSelect,
  academicLevel,
}: Props) {
  const [horizons, setHorizons]   = useState<Horizon[] | null>(null)
  const [level, setLevel]         = useState<string | null>(academicLevel ?? null)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<Filter>('all')
  const [isOpen, setIsOpen]       = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })

  // Data fetch — horizons + (if needed) academic_level
  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()

      // Horizons (the main payload)
      const horizonsP = supabase
        .from('saathi_horizons')
        .select('*')
        .eq('saathi_slug', saathiSlug)
        .eq('is_active', true)
        .order('difficulty', { ascending: true })

      // Academic level — only fetch if the parent didn't pass one in
      const levelP =
        academicLevel !== undefined
          ? Promise.resolve({ data: null })
          : supabase
              .from('student_soul')
              .select('academic_level')
              .limit(1)
              .maybeSingle()

      const [{ data: horizonRows, error }, { data: soulRow }] = await Promise.all([
        horizonsP,
        levelP,
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

  // Apply academic_level filter first — do NOT hide rows that have no
  // academic_levels constraint (null/empty = visible to everyone).
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

  if (loading) return null
  if (scoped.length === 0) return null

  return (
    <section
      style={{
        margin:       '16px auto',
        maxWidth:     '760px',
        background:   BG_SURFACE,
        borderRadius: '16px',
        fontFamily:   'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        overflow:     'hidden',
      }}
    >
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        style={{
          display:        'flex',
          width:          '100%',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            '12px',
          padding:        '14px 20px',
          background:     'transparent',
          border:         'none',
          cursor:         'pointer',
          fontFamily:     'inherit',
          textAlign:      'left',
        }}
      >
        <div>
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '8px',
              color:         GOLD,
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
              margin:    '2px 0 0',
              fontSize:  '13px',
              color:     TEXT_MID,
              lineHeight:1.4,
            }}
          >
            What{' '}
            <strong style={{ color: TEXT_HIGH, fontWeight: 600 }}>
              {saathiName}
            </strong>{' '}
            students achieve
          </p>
        </div>

        <Chevron open={isOpen} />
      </button>

      {/* Collapsible body */}
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
            <div style={{ padding: '4px 20px 20px' }}>
              {/* Filter pills */}
              {availablePills.length > 0 && (
                <div
                  style={{
                    display:      'flex',
                    flexWrap:     'wrap',
                    gap:          '8px',
                    marginBottom: '16px',
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

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
    </section>
  )
}

// ── Filter pill ──────────────────────────────────────────────────────────
function FilterPill({
  emoji,
  label,
  active,
  onClick,
}: {
  emoji: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background:    active ? 'rgba(201, 153, 58, 0.15)' : BG_CARD,
        border:        active ? `1px solid ${GOLD}` : `1px solid ${BRD_SOFT}`,
        color:         active ? GOLD : TEXT_MID,
        borderRadius:  '999px',
        padding:       '6px 13px',
        fontSize:      '12.5px',
        fontWeight:    active ? 600 : 500,
        fontFamily:    'inherit',
        cursor:        'pointer',
        transition:    'all 160ms ease',
        whiteSpace:    'nowrap',
      }}
    >
      {emoji && <span style={{ marginRight: '5px' }}>{emoji}</span>}
      {label}
    </button>
  )
}

// ── Chevron ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display:     'inline-block',
        transform:   open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition:  'transform 180ms ease',
        color:       GOLD,
        fontSize:    '14px',
        flexShrink:  0,
        lineHeight:  1,
      }}
    >
      ▾
    </span>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────
function HorizonCard({
  horizon,
  onPromptSelect,
}: {
  horizon: Horizon
  onPromptSelect: (prompt: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stale = horizon.needs_verification

  const freshDeadline = stale ? undefined : horizon.deadlines?.[0]
  const freshLink     = stale ? undefined : horizon.external_links?.[0]

  function handleClick() {
    const prompt = horizon.today_prompt?.trim() || horizon.today_action.trim()
    if (prompt) onPromptSelect(prompt)
  }

  return (
    <article
      style={{
        background:   BG_CARD,
        border:       `1px solid ${BRD_SOFT}`,
        borderRadius: '12px',
        padding:      '16px 18px',
      }}
    >
      <h4
        style={{
          margin:     '0 0 6px',
          fontSize:   '15px',
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
            color:      GOLD_LIGHT,
            lineHeight: 1.5,
          }}
        >
          {horizon.inspiration}
        </p>
      )}

      <p
        style={{
          margin:              '0 0 12px',
          fontSize:            '13px',
          color:               TEXT_MID,
          lineHeight:          1.6,
          display:             expanded ? 'block' : '-webkit-box',
          WebkitBoxOrient:     'vertical' as const,
          WebkitLineClamp:     expanded ? 'unset' : 2,
          overflow:            expanded ? 'visible' : 'hidden',
        }}
      >
        {horizon.description}
      </p>

      {horizon.description.length > 140 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background:    'transparent',
            border:        'none',
            color:         TEXT_LOW,
            fontSize:      '11.5px',
            padding:       0,
            margin:        '0 0 12px',
            cursor:        'pointer',
            fontFamily:    'inherit',
            textDecoration:'underline',
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
            gap:          '12px',
            marginBottom: '12px',
            fontSize:     '11.5px',
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
                color:          GOLD,
                textDecoration: 'none',
                borderBottom:   `1px dotted ${GOLD}`,
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
            margin:    '0 0 12px',
            fontSize:  '11.5px',
            color:     TEXT_LOW,
            fontStyle: 'italic',
          }}
        >
          Verify current details directly.
        </p>
      )}

      <button
        type="button"
        onClick={handleClick}
        style={{
          background:    GOLD,
          color:         '#0F1923',
          border:        'none',
          borderRadius:  '10px',
          padding:       '9px 16px',
          fontSize:      '13px',
          fontWeight:    700,
          fontFamily:    'inherit',
          cursor:        'pointer',
          transition:    'opacity 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        Start this conversation →
      </button>

      {horizon.author_display_name && (
        <p
          style={{
            margin:     '12px 0 0',
            fontSize:   '11px',
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
