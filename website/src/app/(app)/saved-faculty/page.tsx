'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import { BookmarkButton } from '@/components/faculty/BookmarkButton'

type SavedFaculty = {
  bookmark_id: string
  faculty_id: string
  full_name: string
  city: string | null
  primary_saathi_id: string | null
  institution_name: string
  department: string
  designation: string | null
  verification_status: string
  faculty_slug: string | null
  average_rating: number
  total_reviews: number
  years_experience: number
  session_fee_doubt: number
  session_fee_research: number
  session_fee_deepdive: number
  offers_doubt_session: boolean
  offers_research_session: boolean
  offers_deepdive_session: boolean
  speciality_areas: string[]
  is_emeritus: boolean
  affiliations: { org: string; role: string; year: string }[]
}

function formatFee(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function getMinFee(f: SavedFaculty): number {
  return Math.min(
    f.offers_doubt_session ? f.session_fee_doubt : Infinity,
    f.offers_research_session ? f.session_fee_research : Infinity,
    f.offers_deepdive_session ? f.session_fee_deepdive : Infinity
  )
}

export default function SavedFacultyPage() {
  const { profile } = useAuthStore()
  const [saved, setSaved] = useState<SavedFaculty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    supabase
      .from('faculty_bookmarks')
      .select(
        `
        id,
        faculty_id,
        profiles!faculty_bookmarks_faculty_id_fkey (
          full_name, city, primary_saathi_id,
          faculty_profiles (
            institution_name, department, designation, verification_status,
            faculty_slug, average_rating, total_reviews, years_experience,
            session_fee_doubt, session_fee_research, session_fee_deepdive,
            offers_doubt_session, offers_research_session, offers_deepdive_session,
            speciality_areas, is_emeritus, affiliations
          )
        )
      `
      )
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows: SavedFaculty[] = (data ?? []).map((b) => {
          const p = (b as Record<string, unknown>).profiles as Record<
            string,
            unknown
          >
          const fp = (p?.faculty_profiles ?? {}) as Record<string, unknown>
          return {
            bookmark_id: b.id as string,
            faculty_id: b.faculty_id as string,
            full_name: (p?.full_name as string) ?? '',
            city: (p?.city as string | null) ?? null,
            primary_saathi_id: (p?.primary_saathi_id as string | null) ?? null,
            institution_name: (fp.institution_name as string) ?? '',
            department: (fp.department as string) ?? '',
            designation: (fp.designation as string | null) ?? null,
            verification_status:
              (fp.verification_status as string) ?? 'pending',
            faculty_slug: (fp.faculty_slug as string | null) ?? null,
            average_rating: (fp.average_rating as number) ?? 0,
            total_reviews: (fp.total_reviews as number) ?? 0,
            years_experience: (fp.years_experience as number) ?? 0,
            session_fee_doubt: (fp.session_fee_doubt as number) ?? 0,
            session_fee_research: (fp.session_fee_research as number) ?? 0,
            session_fee_deepdive: (fp.session_fee_deepdive as number) ?? 0,
            offers_doubt_session: (fp.offers_doubt_session as boolean) ?? false,
            offers_research_session:
              (fp.offers_research_session as boolean) ?? false,
            offers_deepdive_session:
              (fp.offers_deepdive_session as boolean) ?? false,
            speciality_areas: (fp.speciality_areas as string[]) ?? [],
            is_emeritus: (fp.is_emeritus as boolean) ?? false,
            affiliations: (fp.affiliations as { org: string; role: string; year: string }[]) ?? [],
          }
        })
        setSaved(rows)
        setLoading(false)
      })
  }, [profile])

  // Remove from local list when unbookmarked (BookmarkButton handles DB)
  function handleUnbookmark(facultyId: string) {
    setSaved((prev) => prev.filter((f) => f.faculty_id !== facultyId))
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0B1F3A 0%, #060F1D 100%)',
          padding: '40px 24px 28px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-2 flex items-center gap-3">
            <Link
              href="/faculty-finder"
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              ← Faculty Finder
            </Link>
          </div>
          <h1
            className="font-playfair mb-2 font-black text-white"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}
          >
            Saved Faculty
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {saved.length > 0
              ? `${saved.length} saved — book when you're ready`
              : 'No saved faculty yet'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[220px] animate-pulse rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}
              />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="mb-4 text-5xl">🔖</p>
            <h2 className="font-playfair mb-2 text-2xl text-white">
              No saved faculty yet
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Bookmark faculty you want to revisit and book later.
            </p>
            <Link
              href="/faculty-finder"
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                background: '#C9993A',
                color: '#060F1D',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Browse Faculty →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {saved.map((f, i) => {
              const saathi = SAATHIS.find(
                (s) => s.id === toSlug(f.primary_saathi_id)
              )
              const color = saathi?.primary ?? '#C9993A'
              const slug = f.faculty_slug ?? f.faculty_id
              const minFee = getMinFee(f)

              return (
                <motion.div
                  key={f.faculty_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col overflow-hidden rounded-[18px]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Color bar */}
                  <div
                    style={{
                      height: '4px',
                      background: f.is_emeritus
                        ? 'linear-gradient(90deg, #C9993A, #E5B86A)'
                        : `linear-gradient(90deg, ${color}, ${color}80)`,
                    }}
                  />

                  <div className="flex-1 p-5">
                    <div className="mb-3 flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
                        style={{
                          background: `${color}20`,
                          border: `2px solid ${color}40`,
                        }}
                      >
                        {saathi?.emoji ?? '🎓'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] leading-tight font-bold text-white">
                          {f.full_name}
                        </p>
                        <p
                          className="truncate text-[11px]"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {f.designation} · {f.institution_name}
                        </p>
                      </div>
                    </div>

                    {f.average_rating > 0 && (
                      <p
                        className="mb-2 text-[11px]"
                        style={{ color: '#FB923C' }}
                      >
                        ⭐ {f.average_rating.toFixed(1)}{' '}
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                          ({f.total_reviews} reviews)
                        </span>
                      </p>
                    )}

                    {/* Affiliations — max 2 on card */}
                    {f.affiliations?.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {f.affiliations.slice(0, 2).map((a, ai) => (
                          <span
                            key={ai}
                            className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
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
                        {f.affiliations.length > 2 && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px]"
                            style={{ color: 'rgba(201,153,58,0.5)' }}
                          >
                            +{f.affiliations.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {f.is_emeritus && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                          style={{
                            background: 'rgba(201,153,58,0.2)',
                            color: '#C9993A',
                          }}
                        >
                          ✦ Emeritus
                        </span>
                      )}
                      {f.verification_status === 'verified' &&
                        !f.is_emeritus && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                            style={{
                              background: 'rgba(74,222,128,0.12)',
                              color: '#4ADE80',
                            }}
                          >
                            Verified
                          </span>
                        )}
                      {f.years_experience > 0 && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px]"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {f.years_experience}y exp
                        </span>
                      )}
                    </div>

                    {f.speciality_areas?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {f.speciality_areas.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2 py-0.5 text-[9px]"
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
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{
                      borderTop: '0.5px solid rgba(255,255,255,0.06)',
                      background: 'rgba(0,0,0,0.15)',
                    }}
                  >
                    <div>
                      {minFee < Infinity && (
                        <>
                          <p
                            className="text-[10px]"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                          >
                            From
                          </p>
                          <p className="text-base font-bold text-white">
                            {formatFee(minFee)}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div onClick={() => handleUnbookmark(f.faculty_id)}>
                        <BookmarkButton
                          facultyId={f.faculty_id}
                          facultyName={f.full_name}
                          size="sm"
                        />
                      </div>
                      <Link
                        href={`/faculty-finder/${slug}`}
                        className="rounded-xl px-4 py-2 text-xs font-bold"
                        style={{
                          background: color,
                          color: '#0B1F3A',
                          textDecoration: 'none',
                        }}
                      >
                        Book →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
