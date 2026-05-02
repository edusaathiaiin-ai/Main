'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'
import { BookmarkButton } from '@/components/faculty/BookmarkButton'

type FacultyRow = {
  id: string
  full_name: string
  city: string | null
  primary_saathi_id: string | null
}

type FacultyProfile = {
  institution_name: string
  department: string
  designation: string | null
  verification_status: string
  session_bio: string | null
  speciality_areas: string[]
  session_active: boolean
  session_fee_doubt: number
  session_fee_research: number
  session_fee_deepdive: number
  offers_doubt_session: boolean
  offers_research_session: boolean
  offers_deepdive_session: boolean
  total_sessions_completed: number
  average_rating: number
  total_reviews: number
  open_to_research: boolean
  availability_note: string | null
  faculty_slug: string | null
  years_experience: number
  response_rate: number
  is_emeritus: boolean
  employment_status: string | null
  former_institution: string | null
  retirement_year: number | null
  affiliations: { org: string; role: string; year: string }[]
  highest_qualification: string | null
}

type FacultyListing = FacultyRow & { faculty_profiles: FacultyProfile | null }

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

function getMinFee(fp: FacultyProfile): number {
  return Math.min(
    fp.offers_doubt_session ? fp.session_fee_doubt : Infinity,
    fp.offers_research_session ? fp.session_fee_research : Infinity,
    fp.offers_deepdive_session ? fp.session_fee_deepdive : Infinity
  )
}

function buildCredibilityLine(fp: FacultyProfile): string {
  const parts: string[] = []
  const currentAffil = fp.affiliations?.find((a) => a.year?.toLowerCase() === 'current')
  if (currentAffil) parts.push(`${currentAffil.role} at ${currentAffil.org}`)
  if (fp.highest_qualification) parts.push(fp.highest_qualification)
  if (fp.years_experience > 0) parts.push(`${fp.years_experience} yrs experience`)
  return parts.slice(0, 2).join(' \u00B7 ')
}

export default function FacultyFinderPage() {
  const [faculty, setFaculty] = useState<FacultyListing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSaathi, setFilterSaathi] = useState('all')
  const [filterSession, setFilterSession] = useState('all')
  const [filterTab, setFilterTab] = useState<'all' | 'verified' | 'emeritus'>(
    'all'
  )
  const [sortBy, setSortBy] = useState('rating')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select(
        `id, full_name, city, primary_saathi_id, faculty_profiles (
        institution_name, department, designation, verification_status,
        session_bio, speciality_areas, session_active,
        session_fee_doubt, session_fee_research, session_fee_deepdive,
        offers_doubt_session, offers_research_session, offers_deepdive_session,
        total_sessions_completed, average_rating, total_reviews,
        open_to_research, availability_note, faculty_slug, years_experience, response_rate,
        is_emeritus, employment_status, former_institution, retirement_year,
        affiliations, highest_qualification
      )`
      )
      .eq('role', 'faculty')
      .not('faculty_profiles', 'is', null)
      .order('full_name')
      .then(({ data }) => {
        setFaculty((data ?? []) as unknown as FacultyListing[])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    const result = faculty.filter((f) => {
      const fp = f.faculty_profiles
      if (!fp) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches =
          f.full_name.toLowerCase().includes(q) ||
          fp.institution_name?.toLowerCase().includes(q) ||
          fp.department?.toLowerCase().includes(q) ||
          fp.speciality_areas?.some((t) => t.toLowerCase().includes(q)) ||
          fp.affiliations?.some(
            (a) =>
              a.org?.toLowerCase().includes(q) ||
              a.role?.toLowerCase().includes(q)
          )
        if (!matches) return false
      }
      if (
        filterSaathi !== 'all' &&
        toSlug(f.primary_saathi_id) !== filterSaathi
      )
        return false
      if (filterSession === 'doubt' && !fp.offers_doubt_session) return false
      if (filterSession === 'research' && !fp.offers_research_session)
        return false
      if (filterSession === 'deepdive' && !fp.offers_deepdive_session)
        return false
      if (filterTab === 'verified' && fp.verification_status !== 'verified')
        return false
      if (filterTab === 'emeritus' && !fp.is_emeritus) return false
      return true
    })

    result.sort((a, b) => {
      const af = a.faculty_profiles!
      const bf = b.faculty_profiles!
      if (sortBy === 'rating')
        return (bf.average_rating ?? 0) - (af.average_rating ?? 0)
      if (sortBy === 'sessions')
        return (
          (bf.total_sessions_completed ?? 0) -
          (af.total_sessions_completed ?? 0)
        )
      if (sortBy === 'price_low') return getMinFee(af) - getMinFee(bf)
      if (sortBy === 'experience')
        return (bf.years_experience ?? 0) - (af.years_experience ?? 0)
      return 0
    })
    return result
  }, [faculty, search, filterSaathi, filterSession, filterTab, sortBy])

  // Emeritus faculty — for featured section
  const emeritusFaculty = useMemo(
    () =>
      faculty
        .filter((f) => f.faculty_profiles?.is_emeritus)
        .sort(
          (a, b) =>
            (b.faculty_profiles?.years_experience ?? 0) -
            (a.faculty_profiles?.years_experience ?? 0)
        ),
    [faculty]
  )

  const selectStyle: React.CSSProperties = {
    padding: '8px 14px',
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: '10px',
    color: '#fff',
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
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className="mb-2 text-[11px] font-bold tracking-[2px] uppercase"
                style={{ color: '#C9993A' }}
              >
                EdUsaathiAI &middot; Knowledge Marketplace
              </p>
              <h1
                className="font-playfair mb-2.5 font-black text-white"
                style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15 }}
              >
                Find your Expert.
                <br />
                <span style={{ color: '#C9993A' }}>Learn from the best.</span>
              </h1>
              <p
                className="max-w-[520px] text-base"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
              >
                Connect with verified Indian academics for 1:1 sessions. Doubt
                clearing, research guidance, deep dives.
              </p>
            </div>
            <div className="flex gap-6">
              {[
                { num: faculty.length, label: 'Faculty' },
                {
                  num: filtered.filter(
                    (f) =>
                      f.faculty_profiles?.verification_status === 'verified'
                  ).length,
                  label: 'Verified',
                },
                { num: 24, label: 'Subjects' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p
                    className="font-playfair text-[32px] font-bold"
                    style={{ color: '#C9993A' }}
                  >
                    {s.num}
                  </p>
                  <p
                    className="text-[11px] tracking-wider uppercase"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Search */}
          <div className="relative max-w-[600px]">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-lg opacity-40">
              &#x1F50D;
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, subject, institution..."
              className="w-full rounded-[14px] py-3.5 pr-4 pl-12 text-sm text-[var(--text-primary)] outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-medium)',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border-medium)')
              }
            />
          </div>
        </div>
      </div>

      {/* Filters + Results */}
      <div className="mx-auto max-w-[1100px] p-6">
        {/* Filter tabs: All / Verified / Emeritus */}
        <div
          className="mb-5 flex w-fit gap-1 rounded-xl p-1"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--bg-elevated)',
          }}
        >
          {[
            { id: 'all' as const, label: 'All Faculty' },
            { id: 'verified' as const, label: '\u2713 Verified' },
            { id: 'emeritus' as const, label: '\u2726 Emeritus' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className="rounded-lg px-5 py-2 text-xs font-semibold transition-all"
              style={{
                background:
                  filterTab === t.id
                    ? t.id === 'emeritus'
                      ? '#C9993A'
                      : 'var(--border-medium)'
                    : 'transparent',
                color:
                  filterTab === t.id
                    ? t.id === 'emeritus'
                      ? '#060F1D'
                      : '#fff'
                    : 'var(--text-tertiary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dropdowns row */}
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
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            style={selectStyle}
          >
            <option value="all" style={{ background: 'var(--bg-surface)' }}>
              All Session Types
            </option>
            <option value="doubt" style={{ background: 'var(--bg-surface)' }}>
              Doubt Clearing
            </option>
            <option value="research" style={{ background: 'var(--bg-surface)' }}>
              Research Guidance
            </option>
            <option value="deepdive" style={{ background: 'var(--bg-surface)' }}>
              Topic Deep Dive
            </option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="rating" style={{ background: 'var(--bg-surface)' }}>
              Top Rated
            </option>
            <option value="sessions" style={{ background: 'var(--bg-surface)' }}>
              Most Sessions
            </option>
            <option value="price_low" style={{ background: 'var(--bg-surface)' }}>
              Price: Low to High
            </option>
            <option value="experience" style={{ background: 'var(--bg-surface)' }}>
              Most Experienced
            </option>
          </select>
          <div className="flex-1" />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} faculty found
          </p>
        </div>

        {/* Emeritus featured section */}
        {filterTab === 'all' && emeritusFaculty.length > 0 && (
          <section className="mb-10">
            <div
              className="mb-4 rounded-2xl p-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201,153,58,0.08), rgba(201,153,58,0.02))',
                border: '1px solid rgba(201,153,58,0.2)',
              }}
            >
              <p
                className="mb-2 text-[10px] font-bold tracking-[2px] uppercase"
                style={{ color: '#C9993A' }}
              >
                {'\u2726'} Emeritus Faculty
              </p>
              <h2 className="font-playfair mb-1 text-xl font-bold text-[var(--text-primary)]">
                India&apos;s greatest professors never really retired.
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                They were just waiting for the right classroom.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emeritusFaculty.slice(0, 3).map((f) => {
                const fp = f.faculty_profiles!
                const saathi = SAATHIS.find(
                  (s) => s.id === toSlug(f.primary_saathi_id)
                )
                const slug = fp.faculty_slug ?? f.id
                return (
                  <Link
                    key={f.id}
                    href={`/faculty-finder/${slug}`}
                    className="block rounded-xl p-5 transition-all"
                    style={{
                      background: 'rgba(201,153,58,0.04)',
                      border: '1px solid rgba(201,153,58,0.25)',
                      textDecoration: 'none',
                    }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-xl"
                        style={{
                          background: 'rgba(201,153,58,0.2)',
                          border: '2px solid rgba(201,153,58,0.4)',
                        }}
                      >
                        {saathi?.emoji ?? '\u{1F393}'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {f.full_name}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Former {fp.designation}
                          {fp.former_institution
                            ? `, ${fp.former_institution}`
                            : fp.institution_name
                              ? `, ${fp.institution_name}`
                              : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: 'rgba(201,153,58,0.2)',
                          color: '#C9993A',
                        }}
                      >
                        {'\u2726'} Emeritus
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        {fp.years_experience}+ years experience
                      </span>
                    </div>
                    {fp.speciality_areas?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {fp.speciality_areas.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2 py-0.5 text-[9px]"
                            style={{
                              background: 'rgba(201,153,58,0.1)',
                              color: '#C9993A',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse rounded-2xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--bg-elevated)',
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mb-4 text-5xl">&#x1F50D;</p>
            <h3 className="font-playfair mb-2 text-2xl text-[var(--text-primary)]">
              No faculty found
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Try different filters or search terms
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((f, i) => {
                const fp = f.faculty_profiles!
                const saathi = SAATHIS.find(
                  (s) => s.id === toSlug(f.primary_saathi_id)
                )
                const color = saathi?.primary ?? '#C9993A'
                const minFee = getMinFee(fp)
                const isVerified = fp.verification_status === 'verified'
                const slug = fp.faculty_slug ?? f.id

                return (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -4 }}
                    className="flex cursor-pointer flex-col overflow-hidden rounded-[18px]"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--bg-elevated)',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = `${color}40`)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        'var(--bg-elevated)')
                    }
                    onClick={() => {
                      window.location.href = `/faculty-finder/${slug}`
                    }}
                  >
                    {/* Color bar */}
                    <div
                      style={{
                        height: '5px',
                        background: fp.is_emeritus
                          ? 'linear-gradient(90deg, #C9993A, #E5B86A)'
                          : `linear-gradient(90deg, ${color}, ${color}80)`,
                      }}
                    />

                    <div className="flex-1 p-5">
                      {/* Name + rating */}
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl"
                            style={{
                              background: `${color}20`,
                              border: `2px solid ${color}40`,
                            }}
                          >
                            {saathi?.emoji ?? '\u{1F393}'}
                          </div>
                          <div>
                            <p className="text-[15px] leading-tight font-bold text-[var(--text-primary)]">
                              {f.full_name}
                            </p>
                            <p
                              className="text-[11px]"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {buildCredibilityLine(fp) || fp.designation}
                            </p>
                          </div>
                        </div>
                        {fp.average_rating > 0 && (
                          <div className="text-right">
                            <p
                              className="text-[15px] font-bold"
                              style={{ color: '#FB923C' }}
                            >
                              {'\u2B50'} {fp.average_rating.toFixed(1)}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{ color: 'var(--text-ghost)' }}
                            >
                              {fp.total_reviews} reviews
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Institution */}
                      <p
                        className="mb-3 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {'\u{1F3DB}\u{FE0F}'} {fp.institution_name}
                        {f.city ? ` \u00B7 ${f.city}` : ''}
                      </p>

                      {/* Affiliations — max 2 on card */}
                      {fp.affiliations?.length > 0 && (
                        <div className="mb-2.5 flex flex-wrap gap-1.5">
                          {fp.affiliations.slice(0, 2).map((a, ai) => (
                            <span
                              key={ai}
                              className="rounded-lg px-2.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: 'rgba(201,153,58,0.1)',
                                border: '0.5px solid rgba(201,153,58,0.25)',
                                color: '#C9993A',
                              }}
                            >
                              {a.role?.toLowerCase().includes('alumni')
                                ? '\u{1F3DB}\u{FE0F}'
                                : '\u{1F3C5}'}{' '}
                              {a.org}
                              {a.role ? ` ${a.role}` : ''}
                            </span>
                          ))}
                          {fp.affiliations.length > 2 && (
                            <span
                              className="rounded-lg px-2 py-0.5 text-[10px]"
                              style={{ color: 'rgba(201,153,58,0.5)' }}
                            >
                              +{fp.affiliations.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {fp.is_emeritus && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: 'rgba(201,153,58,0.2)',
                              color: '#C9993A',
                            }}
                          >
                            {'\u2726'} Emeritus
                          </span>
                        )}
                        {isVerified && !fp.is_emeritus && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: 'rgba(74,222,128,0.12)',
                              color: '#4ADE80',
                            }}
                          >
                            Verified
                          </span>
                        )}
                        {fp.open_to_research && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: 'rgba(99,102,241,0.12)',
                              color: '#818CF8',
                            }}
                          >
                            Research
                          </span>
                        )}
                        {fp.years_experience > 0 && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px]"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {fp.years_experience}y exp
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {fp.speciality_areas?.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded-lg px-2 py-0.5 text-[10px]"
                            style={{
                              background: `${color}12`,
                              color,
                              border: `0.5px solid ${color}25`,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Bio */}
                      {fp.session_bio && (
                        <p
                          className="mb-3 line-clamp-2 text-xs"
                          style={{
                            color: 'var(--text-tertiary)',
                            lineHeight: 1.6,
                          }}
                        >
                          &ldquo;{fp.session_bio}&rdquo;
                        </p>
                      )}

                      {/* Session types */}
                      <div className="flex flex-wrap gap-1.5">
                        {fp.offers_doubt_session && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px]"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              color: '#818CF8',
                            }}
                          >
                            Doubt
                          </span>
                        )}
                        {fp.offers_research_session && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px]"
                            style={{
                              background: 'rgba(74,222,128,0.1)',
                              color: '#4ADE80',
                            }}
                          >
                            Research
                          </span>
                        )}
                        {fp.offers_deepdive_session && (
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px]"
                            style={{
                              background: 'rgba(251,146,60,0.1)',
                              color: '#FB923C',
                            }}
                          >
                            Deep Dive
                          </span>
                        )}
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
                        {minFee < Infinity && (
                          <>
                            <p
                              className="text-[10px]"
                              style={{ color: 'var(--text-ghost)' }}
                            >
                              From
                            </p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">
                              {formatFee(minFee)}
                              <span
                                className="text-[10px] font-normal"
                                style={{ color: 'var(--text-ghost)' }}
                              >
                                /session
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <BookmarkButton
                          facultyId={f.id}
                          facultyName={f.full_name}
                          size="sm"
                        />
                        <Link
                          href={`/faculty-finder/${slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-xl px-5 py-2.5 text-xs font-bold"
                          style={{
                            background: color,
                            color: '#0B1F3A',
                            textDecoration: 'none',
                          }}
                        >
                          View &amp; Book &rarr;
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  )
}
