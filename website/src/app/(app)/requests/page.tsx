'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

type RequestRow = {
  id: string
  student_id: string
  faculty_id: string
  subject: string
  message: string
  upvote_count: number
  upvoter_ids: string[]
  status: string
  created_at: string
  faculty_name?: string
  faculty_saathi_id?: string
  student_name?: string
}

export default function PublicRequestsPage() {
  const { profile } = useAuthStore()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSaathi, setFilterSaathi] = useState('all')
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase
        .from('lecture_requests')
        .select(
          'id, student_id, faculty_id, subject, message, upvote_count, upvoter_ids, status, created_at'
        )
        .eq('is_public', true)
        .in('status', ['pending', 'acknowledged', 'accepted'])
        .order('upvote_count', { ascending: false })
        .limit(50)

      const rows = (data ?? []) as RequestRow[]
      if (rows.length > 0) {
        const fIds = [...new Set(rows.map((r) => r.faculty_id))]
        const sIds = [...new Set(rows.map((r) => r.student_id))]
        const [fRes, sRes, fpRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', fIds),
          supabase.from('profiles').select('id, full_name').in('id', sIds),
          supabase
            .from('profiles')
            .select('id, primary_saathi_id')
            .in('id', fIds),
        ])
        const fMap: Record<string, string> = {}
        const sMap: Record<string, string> = {}
        const saathiMap: Record<string, string> = {}
        ;(fRes.data ?? []).forEach((f: { id: string; full_name: string }) => {
          fMap[f.id] = f.full_name
        })
        ;(sRes.data ?? []).forEach((s: { id: string; full_name: string }) => {
          sMap[s.id] = s.full_name?.split(' ')[0] ?? 'Student'
        })
        ;(fpRes.data ?? []).forEach(
          (p: { id: string; primary_saathi_id: string | null }) => {
            if (p.primary_saathi_id)
              saathiMap[p.id] =
                toSlug(p.primary_saathi_id) ?? p.primary_saathi_id
          }
        )
        rows.forEach((r) => {
          r.faculty_name = fMap[r.faculty_id]
          r.student_name = sMap[r.student_id]
          r.faculty_saathi_id = saathiMap[r.faculty_id]
        })
      }
      setRequests(rows)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = requests
    if (filterSaathi !== 'all')
      result = result.filter((r) => r.faculty_saathi_id === filterSaathi)
    if (sortBy === 'newest')
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    return result
  }, [requests, filterSaathi, sortBy])

  async function upvote(requestId: string) {
    if (!profile) return
    const r = requests.find((x) => x.id === requestId)
    if (!r || r.upvoter_ids.includes(profile.id) || r.student_id === profile.id)
      return
    const supabase = createClient()
    await supabase
      .from('lecture_requests')
      .update({
        upvote_count: r.upvote_count + 1,
        upvoter_ids: [...r.upvoter_ids, profile.id],
      })
      .eq('id', requestId)
    setRequests((prev) =>
      prev.map((x) =>
        x.id === requestId
          ? {
              ...x,
              upvote_count: x.upvote_count + 1,
              upvoter_ids: [...x.upvoter_ids, profile.id],
            }
          : x
      )
    )
  }

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
      <div
        style={{
          background: 'linear-gradient(180deg, #0B1F3A 0%, #060F1D 100%)',
          padding: '40px 24px 32px',
          borderBottom: '0.5px solid var(--bg-elevated)',
        }}
      >
        <div className="mx-auto max-w-[900px]">
          <p
            className="mb-2 text-[10px] font-bold tracking-[2px] uppercase"
            style={{ color: '#C9993A' }}
          >
            {'\u{2709}'} Community Requests
          </p>
          <h1
            className="font-playfair mb-2 font-black text-white"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.15 }}
          >
            What students want to learn.
          </h1>
          <p
            className="max-w-[480px] text-sm"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            Browse lecture requests from students across India. Support topics
            you want too. Faculty see demand and create sessions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] p-6">
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <select
            value={filterSaathi}
            onChange={(e) => setFilterSaathi(e.target.value)}
            style={selectStyle}
          >
            <option value="all" style={{ background: '#0B1F3A' }}>
              All Subjects
            </option>
            {SAATHIS.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#0B1F3A' }}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'votes' | 'newest')}
            style={selectStyle}
          >
            <option value="votes" style={{ background: '#0B1F3A' }}>
              Most Wanted
            </option>
            <option value="newest" style={{ background: '#0B1F3A' }}>
              Newest
            </option>
          </select>
          <div className="flex-1" />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} requests
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
              style={{ borderTopColor: '#C9993A' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-3 text-4xl">{'\u{2709}'}</p>
            <p className="font-playfair mb-1 text-xl text-white/30">
              No requests yet
            </p>
            <p
              className="mb-4 text-xs"
              style={{ color: 'var(--text-ghost)' }}
            >
              Be the first to request a topic from a faculty member
            </p>
            <Link
              href="/faculty-finder"
              className="rounded-lg px-5 py-2.5 text-xs font-semibold"
              style={{
                background: '#C9993A',
                color: '#060F1D',
                textDecoration: 'none',
              }}
            >
              Find Faculty &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r, i) => {
              const saathi = SAATHIS.find((s) => s.id === r.faculty_saathi_id)
              const hasVoted = profile
                ? r.upvoter_ids.includes(profile.id)
                : false
              const isOwn = profile?.id === r.student_id

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl p-5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--bg-elevated)',
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-sm font-bold text-white">
                        {r.subject}
                      </h3>
                      <p
                        className="text-[10px]"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        Requested from{' '}
                        <Link
                          href={`/faculty-finder/${r.faculty_id}`}
                          style={{ color: '#C9993A', textDecoration: 'none' }}
                        >
                          {r.faculty_name ?? 'Faculty'}
                        </Link>
                        {saathi && (
                          <span className="ml-1.5">{saathi.emoji}</span>
                        )}
                        {' \u00B7 by '}
                        {r.student_name ?? 'Student'}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            r.upvote_count >= 5
                              ? '#FB923C'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {r.upvote_count >= 10
                          ? '\u{1F525}\u{1F525}'
                          : r.upvote_count >= 5
                            ? '\u{1F525}'
                            : '\u25B2'}{' '}
                        {r.upvote_count}
                      </span>
                      {profile && !hasVoted && !isOwn && (
                        <button
                          onClick={() => upvote(r.id)}
                          className="rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all"
                          style={{
                            background: 'rgba(201,153,58,0.1)',
                            border: '0.5px solid rgba(201,153,58,0.3)',
                            color: '#C9993A',
                          }}
                        >
                          + Me too
                        </button>
                      )}
                      {hasVoted && (
                        <span
                          className="rounded-lg px-2.5 py-1.5 text-[10px]"
                          style={{
                            background: 'rgba(74,222,128,0.08)',
                            color: '#4ADE80',
                          }}
                        >
                          {'\u2713'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className="line-clamp-2 text-xs"
                    style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}
                  >
                    &ldquo;{r.message.slice(0, 200)}
                    {r.message.length > 200 ? '...' : ''}&rdquo;
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
