'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

type LiveSession = {
  id: string
  faculty_id: string
  vertical_id: string
  title: string
  description: string
  session_format: string
  price_per_seat_paise: number
  bundle_price_paise: number | null
  early_bird_price_paise: number | null
  early_bird_seats: number | null
  total_seats: number
  seats_booked: number
  tags: string[]
  status: string
  created_at: string
  faculty_name?: string
  faculty_verified?: boolean
  faculty_emeritus?: boolean
}

type LectureRow = { session_id: string; scheduled_at: string; title: string }

const FORMAT_LABELS: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  single: { label: 'Lecture', emoji: '\u{1F4C5}', color: '#60A5FA' },
  series: { label: 'Series', emoji: '\u{1F4DA}', color: '#C084FC' },
  workshop: { label: 'Workshop', emoji: '\u{1F528}', color: '#FB923C' },
  recurring: { label: 'Recurring', emoji: '\u{1F504}', color: '#34D399' },
  qa: { label: 'Q&A', emoji: '\u{1F4AC}', color: '#F472B6' },
}

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

function seatUrgency(
  booked: number,
  total: number
): { color: string; label: string } {
  const pct = (booked / total) * 100
  if (pct >= 80) return { color: '#F87171', label: 'Almost full!' }
  if (pct >= 50)
    return { color: '#FBBF24', label: `${total - booked} seats left` }
  return { color: '#4ADE80', label: `${total - booked} seats available` }
}

export default function LivePage() {
  const { profile } = useAuthStore()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [lectures, setLectures] = useState<LectureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSaathi, setFilterSaathi] = useState('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: sessData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      const rows = (sessData ?? []) as LiveSession[]

      // Fetch faculty names
      const facultyIds = [...new Set(rows.map((s) => s.faculty_id))]
      if (facultyIds.length > 0) {
        const { data: fData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', facultyIds)
        const { data: fpData } = await supabase
          .from('faculty_profiles')
          .select('user_id, verification_status, is_emeritus')
          .in('user_id', facultyIds)

        const nameMap: Record<string, string> = {}
        const verMap: Record<string, boolean> = {}
        const emeritusMap: Record<string, boolean> = {}
        ;(fData ?? []).forEach((f: { id: string; full_name: string }) => {
          nameMap[f.id] = f.full_name
        })
        ;(fpData ?? []).forEach(
          (f: {
            user_id: string
            verification_status: string
            is_emeritus: boolean
          }) => {
            verMap[f.user_id] = f.verification_status === 'verified'
            emeritusMap[f.user_id] = f.is_emeritus === true
          }
        )

        rows.forEach((s) => {
          s.faculty_name = nameMap[s.faculty_id]
          s.faculty_verified = verMap[s.faculty_id]
          s.faculty_emeritus = emeritusMap[s.faculty_id]
        })
      }

      setSessions(rows)

      // Fetch next lectures for scheduling info
      const sessionIds = rows.map((s) => s.id)
      if (sessionIds.length > 0) {
        const { data: lecData } = await supabase
          .from('live_lectures')
          .select('session_id, scheduled_at, title')
          .in('session_id', sessionIds)
          .eq('status', 'scheduled')
          .order('scheduled_at')
          .limit(100)
        setLectures((lecData ?? []) as LectureRow[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filterSaathi !== 'all' && s.vertical_id !== filterSaathi) return false
      if (filterFormat !== 'all' && s.session_format !== filterFormat)
        return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !s.title.toLowerCase().includes(q) &&
          !(s.faculty_name ?? '').toLowerCase().includes(q) &&
          !s.tags?.some((t) => t.toLowerCase().includes(q))
        )
          return false
      }
      return true
    })
  }, [sessions, filterSaathi, filterFormat, search])

  // Soul-matched: sessions matching student's Saathi
  const forYou = useMemo(() => {
    if (!profile?.primary_saathi_id) return []
    return filtered
      .filter((s) => s.vertical_id === profile.primary_saathi_id)
      .slice(0, 4)
  }, [filtered, profile])

  const nextLecture = (sessionId: string): LectureRow | undefined =>
    lectures.find((l) => l.session_id === sessionId)

  // Selects render on the light `--bg-elevated` surface below the hero.
  // Text must be dark so the option label reads; white was a dark-theme
  // remnant. Same fix pattern as commit 4797c19 — rely on the platform
  // theme tokens instead of hex-coding whites.
  const selectStyle: React.CSSProperties = {
    padding: '8px 14px',
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0B1F3A 0%, #060F1D 100%)',
          padding: '40px 24px 32px',
          borderBottom: '0.5px solid var(--bg-elevated)',
        }}
      >
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <p
                  className="text-[11px] font-bold tracking-[2px] uppercase"
                  style={{ color: '#F87171' }}
                >
                  EdUsaathiAI Live
                </p>
              </div>
              <h1
                className="font-playfair mb-2 font-black text-white"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.15 }}
              >
                Learn live from
                <br />
                <span style={{ color: '#C9993A' }}>
                  India&apos;s best faculty.
                </span>
              </h1>
              <p
                className="max-w-[500px] text-sm"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
              >
                Group lectures, workshops, and Q&amp;A sessions. Book your seat.
                Show up. Learn deeply.
              </p>
            </div>
            <div className="flex gap-6">
              {[
                { num: sessions.length, label: 'Sessions' },
                {
                  num: sessions.reduce((a, s) => a + s.seats_booked, 0),
                  label: 'Seats Booked',
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p
                    className="font-playfair text-[28px] font-bold"
                    style={{ color: '#C9993A' }}
                  >
                    {s.num}
                  </p>
                  <p
                    className="text-[10px] tracking-wider uppercase"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-[500px]">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-lg opacity-40">
              {'\u{1F50D}'}
            </span>
            {/* Input floats on the dark hero gradient but its own background
                is the light `--bg-elevated` cream. Text + placeholder must
                be dark on dark-ish-bg; white text here was a dark-theme
                carry-over that turned invisible after the platform-wide
                light-first fix (commit 4797c19). The placeholder uses an
                arbitrary Tailwind token to route through the ghost color. */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions, topics, faculty..."
              className="w-full rounded-[14px] py-3 pr-4 pl-12 text-sm outline-none placeholder:text-[var(--text-ghost)]"
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-medium)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <select
            value={filterSaathi}
            onChange={(e) => setFilterSaathi(e.target.value)}
            style={selectStyle}
          >
            <option value="all" style={{ background: 'var(--bg-surface)' }}>
              All Subjects
            </option>
            {SAATHIS.map((s) => (
              <option key={s.id} value={s.id} style={{ background: 'var(--bg-surface)' }}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            style={selectStyle}
          >
            <option value="all" style={{ background: 'var(--bg-surface)' }}>
              All Formats
            </option>
            {Object.entries(FORMAT_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ background: 'var(--bg-surface)' }}>
                {v.emoji} {v.label}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} sessions
          </p>
        </div>

        {/* For You section */}
        {forYou.length > 0 && (
          <section className="mb-10">
            <h2
              className="font-playfair mb-4 text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              For You
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {forYou.map((s, i) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  index={i}
                  nextLecture={nextLecture(s.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All sessions */}
        <section>
          <h2
            className="font-playfair mb-4 text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            All Upcoming
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[240px] animate-pulse rounded-2xl"
                  style={{ background: 'var(--bg-elevated)' }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-3 text-4xl">{'\u{1F3AC}'}</p>
              <p
                className="font-playfair mb-1 text-xl"
                style={{ color: 'var(--text-tertiary)' }}
              >
                No live sessions yet
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-ghost)' }}
              >
                Check back soon — faculty announce new sessions every week.
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((s, i) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    index={i}
                    nextLecture={nextLecture(s.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  )
}

function SessionCard({
  session: s,
  index,
  nextLecture,
}: {
  session: LiveSession
  index: number
  nextLecture?: LectureRow
}) {
  const saathi = SAATHIS.find((sa) => sa.id === toSlug(s.vertical_id))
  const color = saathi?.primary ?? '#C9993A'
  const format = FORMAT_LABELS[s.session_format] ?? FORMAT_LABELS.single
  const urgency = seatUrgency(s.seats_booked, s.total_seats)
  const isFull = s.seats_booked >= s.total_seats
  const isEmeritus = s.faculty_emeritus === true
  const borderDefault = isEmeritus
    ? 'rgba(201,153,58,0.3)'
    : 'var(--bg-elevated)'
  const borderHover = isEmeritus ? 'rgba(201,153,58,0.5)' : `${color}40`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="flex flex-col overflow-hidden rounded-[18px]"
      style={{
        background: isEmeritus
          ? 'rgba(201,153,58,0.03)'
          : 'var(--bg-elevated)',
        border: `${isEmeritus ? '1px' : '0.5px'} solid ${borderDefault}`,
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = borderHover)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderDefault)}
    >
      <div
        style={{
          height: isEmeritus ? '5px' : '4px',
          background: isEmeritus
            ? 'linear-gradient(90deg, #C9993A, #E5B86A)'
            : `linear-gradient(90deg, ${format.color}, ${format.color}60)`,
        }}
      />

      <div className="flex-1 p-5">
        {/* Format + Saathi */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
            style={{ background: `${format.color}18`, color: format.color }}
          >
            {format.emoji} {format.label}
          </span>
          <span
            className="rounded-lg px-2 py-0.5 text-[10px]"
            style={{ background: `${color}12`, color }}
          >
            {saathi?.emoji} {saathi?.name}
          </span>
        </div>

        <h3
          className="mb-1 line-clamp-2 text-[15px] leading-tight font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {s.title}
        </h3>

        {/* Faculty */}
        <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {s.faculty_name ?? 'Faculty'}
          {isEmeritus && (
            <span
              className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}
            >
              {'\u2726'} Emeritus
            </span>
          )}
          {s.faculty_verified && !isEmeritus && (
            <span className="ml-1 text-[9px]" style={{ color: '#4ADE80' }}>
              {'\u2713'}
            </span>
          )}
        </p>

        {/* Next lecture date */}
        {nextLecture && (
          <p
            className="mb-3 text-xs"
            style={{ color: 'var(--text-ghost)' }}
          >
            {'\u{1F4C5}'}{' '}
            {new Date(nextLecture.scheduled_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Tags */}
        {s.tags?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {s.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[9px]"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Seat counter */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span
              className="text-[10px] font-semibold"
              style={{ color: urgency.color }}
            >
              {isFull ? '\u{1F525} Fully booked' : urgency.label}
            </span>
            <span
              className="text-[10px]"
              style={{ color: 'var(--text-ghost)' }}
            >
              {s.seats_booked}/{s.total_seats}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (s.seats_booked / s.total_seats) * 100)}%`,
                background: urgency.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{
          borderTop: '0.5px solid var(--bg-elevated)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div>
          <p
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatFee(s.bundle_price_paise ?? s.price_per_seat_paise)}
          </p>
          {s.bundle_price_paise &&
            s.bundle_price_paise < s.price_per_seat_paise * 3 && (
              <p className="text-[9px]" style={{ color: '#4ADE80' }}>
                Bundle saves {'\u20B9'}
                {(
                  (s.price_per_seat_paise * 3 - s.bundle_price_paise) /
                  100
                ).toLocaleString('en-IN')}
              </p>
            )}
        </div>
        <Link
          href={`/live/${s.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-xl px-5 py-2.5 text-xs font-bold"
          style={{
            background: isFull ? 'var(--border-medium)' : color,
            color: isFull ? 'var(--text-secondary)' : '#0B1F3A',
            textDecoration: 'none',
          }}
        >
          {isFull ? '\u{1F514} Notify me' : 'Book Seat \u2192'}
        </Link>
      </div>
    </motion.div>
  )
}
