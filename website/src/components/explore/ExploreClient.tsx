'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toVerticalUuid } from '@/constants/verticalIds'

// ── Types ─────────────────────────────────────────────────────────────────────

type Resource = {
  id: string
  title: string
  description: string
  url: string
  resource_type: string
  emoji: string
  author: string | null
  publisher: string | null
  year: number | null
  is_free: boolean
  is_indian_context: boolean
  is_featured: boolean
  display_order: number
}

type TypeConfig = {
  label: string
  emoji: string
  color: string
}

// ── Type display config ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, TypeConfig> = {
  book: { label: 'Books', emoji: '📚', color: '#C9993A' },
  website: { label: 'Websites & Portals', emoji: '🌐', color: '#4ADE80' },
  youtube: { label: 'YouTube Channels', emoji: '▶️', color: '#F87171' },
  journal: { label: 'Journals', emoji: '🔬', color: '#A78BFA' },
  paper: { label: 'Papers & Docs', emoji: '📄', color: '#60A5FA' },
  tool: { label: 'Tools', emoji: '🛠️', color: '#FB923C' },
  article: { label: 'Articles', emoji: '📰', color: '#34D399' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = { saathiId: string }

// ── Component ─────────────────────────────────────────────────────────────────

export function ExploreClient({ saathiId }: Props) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeType, setActiveType] = useState<string>('all')
  const [week, setWeek] = useState(0)
  const [cached, setCached] = useState(false)
  const [updatedLabel, setUpdatedLabel] = useState('')
  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState(
    'Could not load resources. Try again.'
  )

  // saathiId is always a slug here (page.tsx converts UUID → slug)
  const saathi = SAATHIS.find((s) => s.id === saathiId)
  const color = saathi?.primary ?? '#C9993A'
  const saathiName = saathi?.name ?? 'Your Saathi'
  // UUID for DB operations
  const verticalUuid = toVerticalUuid(saathiId)

  const sortResources = (list: Resource[]) =>
    [...list].sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1
      if (!a.is_featured && b.is_featured) return 1
      return a.display_order - b.display_order
    })

  const fetchResources = useCallback(
    async (forceRefresh: boolean) => {
      if (forceRefresh) setRefreshing(true)
      else setLoading(true)
      setError(false)

      const supabase = createClient()

      // ── 1. Try edge function (AI-curated weekly refresh) ─────────────────────
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/curate-resources`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            // Send both UUID (for DB) and slug (for subject hints + fallback)
            body: JSON.stringify({
              saathiId: verticalUuid ?? saathiId,
              saathiSlug: saathiId,
              forceRefresh,
            }),
          }
        )

        if (res.ok) {
          const data = (await res.json()) as {
            resources: Resource[]
            cached: boolean
            week: number
          }

          if (data.resources && data.resources.length > 0) {
            setResources(sortResources(data.resources))
            setWeek(data.week ?? 0)
            setCached(data.cached ?? false)
            setUpdatedLabel(
              new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            )
            setLoading(false)
            setRefreshing(false)
            return
          }
        }
      } catch {
        // Edge function failed — try DB fallback below
      }

      // ── 2. DB fallback: query explore_resources directly ─────────────────────
      if (verticalUuid) {
        const { data: dbRows, error: dbErr } = await supabase
          .from('explore_resources')
          .select('*')
          .eq('vertical_id', verticalUuid)
          .order('display_order', { ascending: true })

        if (dbErr) {
          setErrorMsg(
            dbErr.code === '42P01'
              ? 'Explore Beyond is being set up. Check back soon!'
              : `Error: ${dbErr.message}`
          )
          setError(true)
        } else if (dbRows && dbRows.length > 0) {
          setResources(sortResources(dbRows as Resource[]))
          setUpdatedLabel(
            new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          )
        }
        // If dbRows is empty → shows empty state (not error)
      } else {
        setErrorMsg('Could not identify your Saathi. Try refreshing.')
        setError(true)
      }

      setLoading(false)
      setRefreshing(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saathiId, verticalUuid]
  )

  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResources(false)
  }, [fetchResources])

  // ── Derived state ───────────────────────────────────────────────────────────
  const featured = resources.filter((r) => r.is_featured)
  const typeSet = Array.from(new Set(resources.map((r) => r.resource_type)))
  const filtered =
    activeType === 'all'
      ? resources
      : resources.filter((r) => r.resource_type === activeType)
  const countByType = typeSet.reduce<Record<string, number>>((acc, t) => {
    acc[t] = resources.filter((r) => r.resource_type === t).length
    return acc
  }, {})

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#060F1D',
        color: '#fff',
        padding: '32px 24px 96px',
        maxWidth: '1040px',
        margin: '0 auto',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '40px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '30px' }}>🗺️</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color,
                }}
              >
                {saathiName} · Treasure Chest
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 4vw, 40px)',
                fontWeight: '900',
                color: '#fff',
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}
            >
              Explore Beyond
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.45)',
                margin: 0,
                maxWidth: '480px',
                lineHeight: 1.7,
              }}
            >
              Books, journals, tools, and channels — curated by your Saathi,
              refreshed every week. Everything you need beyond the chat.
            </p>
          </div>

          {/* Refresh button + meta */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <button
              onClick={() => fetchResources(true)}
              disabled={refreshing || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!refreshing && !loading) {
                  e.currentTarget.style.borderColor = `${color}50`
                  e.currentTarget.style.color = color
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              }}
            >
              {refreshing ? (
                <>
                  <Spinner size={11} color={color} />
                  Refreshing…
                </>
              ) : (
                <>🔄 Refresh</>
              )}
            </button>
            {updatedLabel && (
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.22)',
                  marginTop: '6px',
                  marginBottom: 0,
                }}
              >
                {cached ? 'Cached · ' : ''}
                {`Week ${week} · ${updatedLabel}`}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Loading state ───────────────────────────────────────────────── */}
      {loading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            gap: '18px',
          }}
        >
          <span style={{ fontSize: '44px', lineHeight: 1 }}>
            {saathi?.emoji ?? '🗺️'}
          </span>
          <Spinner size={28} color={color} />
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
            }}
          >
            Your Saathi is curating the best resources…
          </p>
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              margin: 0,
            }}
          >
            First load takes 15–20 seconds
          </p>
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {!loading && error && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️</p>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '16px',
              lineHeight: 1.6,
            }}
          >
            {errorMsg}
          </p>
          <button
            onClick={() => fetchResources(false)}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              background: color,
              color: '#0B1F3A',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {!loading && !error && resources.length > 0 && (
        <>
          {/* ── Featured picks ──────────────────────────────────────────── */}
          {featured.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <SectionHeading>
                ✦ Your Saathi&apos;s top picks this week
              </SectionHeading>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                  gap: '14px',
                }}
              >
                {featured.map((r, i) => (
                  <FeaturedCard
                    key={r.id}
                    resource={r}
                    color={color}
                    index={i}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Filter tabs ─────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <FilterPill
              label={`All (${resources.length})`}
              active={activeType === 'all'}
              color={color}
              onClick={() => setActiveType('all')}
            />
            {typeSet.map((type) => (
              <FilterPill
                key={type}
                label={`${TYPE_CONFIG[type]?.emoji ?? '📌'} ${
                  TYPE_CONFIG[type]?.label ?? type
                } (${countByType[type] ?? 0})`}
                active={activeType === type}
                color={TYPE_CONFIG[type]?.color ?? color}
                onClick={() => setActiveType(type)}
              />
            ))}
          </div>

          {/* ── Resource grid ───────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(295px, 1fr))',
              gap: '12px',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((resource, i) => (
                <ResourceCard
                  key={resource.id ?? `${resource.url}-${i}`}
                  resource={resource}
                  index={i}
                  color={color}
                />
              ))}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: '48px',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              No {activeType} resources this week.
            </p>
          )}

          {/* ── Footer note ─────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: '48px',
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.35)',
                margin: '0 0 6px',
              }}
            >
              ✦ These resources exist outside the EdUsaathiAI universe
            </p>
            <p
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.18)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Your Saathi curates them weekly using the latest knowledge. Click
              any card to open in a new tab. Resources refresh every Monday or
              when you tap Refresh.
            </p>
          </div>
        </>
      )}

      {/* No resources yet after load */}
      {!loading && !error && resources.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</p>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '8px',
            }}
          >
            Treasure chest being filled
          </p>
          <p style={{ fontSize: '12px', marginBottom: '20px', lineHeight: 1.6 }}>
            Curated resources for {saathiName} coming soon.
            <br />
            Tap below to generate now.
          </p>
          <button
            onClick={() => fetchResources(true)}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              background: color,
              color: '#0B1F3A',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Generate resources
          </button>
        </div>
      )}
    </main>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        margin: '0 0 14px',
      }}
    >
      {children}
    </h2>
  )
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 13px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: '600',
        background: active ? color : 'rgba(255,255,255,0.05)',
        color: active ? '#0B1F3A' : 'rgba(255,255,255,0.45)',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function Spinner({ size, color }: { size: number; color: string }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: `${size >= 20 ? 2.5 : 1.5}px solid ${color}30`,
        borderTopColor: color,
        animation: 'explore-spin 0.9s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

// ── Featured Card ──────────────────────────────────────────────────────────────

function FeaturedCard({
  resource,
  color,
  index,
}: {
  resource: Resource
  color: string
  index: number
}) {
  const typeConf = TYPE_CONFIG[resource.resource_type]

  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      style={{
        display: 'block',
        padding: '20px',
        borderRadius: '16px',
        background: `${color}0d`,
        border: `1px solid ${color}30`,
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-16px',
          right: '-16px',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: `${color}12`,
          filter: 'blur(18px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row: emoji + badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>
          {resource.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '5px',
              marginBottom: '5px',
            }}
          >
            <Badge bg={`${color}20`} fg={color}>
              ✦ Top Pick
            </Badge>
            {typeConf && (
              <Badge bg="rgba(255,255,255,0.06)" fg="rgba(255,255,255,0.4)">
                {typeConf.emoji} {typeConf.label}
              </Badge>
            )}
            {resource.is_free && (
              <Badge bg="rgba(74,222,128,0.1)" fg="#4ADE80">
                Free
              </Badge>
            )}
            {resource.is_indian_context && (
              <Badge bg="rgba(251,146,60,0.1)" fg="#FB923C">
                🇮🇳 India
              </Badge>
            )}
          </div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {resource.title}
          </h3>
        </div>
      </div>

      <p
        style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 10px',
          lineHeight: 1.65,
        }}
      >
        {resource.description}
      </p>

      {(resource.author ?? resource.year) && (
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.28)',
            margin: '0 0 10px',
          }}
        >
          {[resource.author, resource.year].filter(Boolean).join(' · ')}
        </p>
      )}

      <span
        style={{
          fontSize: '11px',
          fontWeight: '700',
          color,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        Explore →
        <span
          style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.2)',
            fontWeight: '400',
          }}
        >
          new tab
        </span>
      </span>
    </motion.a>
  )
}

// ── Regular Resource Card ──────────────────────────────────────────────────────

function ResourceCard({
  resource,
  index,
  color,
}: {
  resource: Resource
  index: number
  color: string
}) {
  const typeConf = TYPE_CONFIG[resource.resource_type] ?? {
    label: resource.resource_type,
    emoji: '📌',
    color: '#888',
  }

  return (
    <motion.a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      style={{
        display: 'block',
        padding: '14px 16px',
        borderRadius: '13px',
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}35`
        e.currentTarget.style.background = `${color}07`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
      }}
    >
      {/* Type badge row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '9px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '10px',
            background: `${typeConf.color}18`,
            color: typeConf.color,
          }}
        >
          {typeConf.emoji} {typeConf.label}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {resource.is_free && (
            <Badge bg="rgba(74,222,128,0.1)" fg="#4ADE80">
              Free
            </Badge>
          )}
          {resource.is_indian_context && (
            <Badge bg="rgba(251,146,60,0.1)" fg="#FB923C">
              🇮🇳
            </Badge>
          )}
        </div>
      </div>

      {/* Emoji + title */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          marginBottom: '7px',
        }}
      >
        <span style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1.2 }}>
          {resource.emoji}
        </span>
        <h3
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#fff',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {resource.title}
        </h3>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
          margin: '0 0 8px',
          lineHeight: 1.65,
        }}
      >
        {resource.description}
      </p>

      {/* Author / year */}
      {(resource.author ?? resource.year) && (
        <p
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.22)',
            margin: '0 0 8px',
          }}
        >
          {[resource.author, resource.year].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* CTA */}
      <span
        style={{ fontSize: '11px', fontWeight: '600', color, opacity: 0.85 }}
      >
        Explore →
      </span>
    </motion.a>
  )
}

// ── Badge helper ──────────────────────────────────────────────────────────────

function Badge({
  children,
  bg,
  fg,
}: {
  children: React.ReactNode
  bg: string
  fg: string
}) {
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: '600',
        padding: '2px 6px',
        borderRadius: '8px',
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  )
}

// ── Global keyframes (injected once) ─────────────────────────────────────────
// Using a style tag inside the component to avoid global CSS dependency
if (typeof document !== 'undefined') {
  const styleId = 'explore-keyframes'
  if (!document.getElementById(styleId)) {
    const el = document.createElement('style')
    el.id = styleId
    el.textContent =
      '@keyframes explore-spin { to { transform: rotate(360deg); } }'
    document.head.appendChild(el)
  }
}
