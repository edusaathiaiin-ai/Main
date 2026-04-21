'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import Link from 'next/link'

type AnswerRow = {
  id: string
  body: string
  created_at: string
  faculty_verified: boolean
}
type QuestionRow = { id: string; body: string; created_at: string }
type StruggleRow = { struggle_topics: string[] | null }

export default function FacultyAnalyticsPage() {
  const { profile } = useAuthStore()

  const [totalAnswers, setTotalAnswers] = useState(0)
  const [thisWeek, setThisWeek] = useState(0)
  const [topAnswers, setTopAnswers] = useState<AnswerRow[]>([])
  const [recentQuestions, setRecentQuestions] = useState<QuestionRow[]>([])
  const [struggles, setStruggles] = useState<[string, number][]>([])
  const [loading, setLoading] = useState(true)
  const [facultySaathiId, setFacultySaathiId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] =
    useState<string>('pending')

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      setLoading(true)

      // Get faculty profile to find their subject
      const { data: fac } = await supabase
        .from('faculty_profiles')
        .select('subject_expertise, verification_status')
        .eq('user_id', profile!.id)
        .maybeSingle()

      setVerificationStatus(fac?.verification_status ?? 'pending')

      // Find their Saathi based on expertise
      const expertise = (fac?.subject_expertise as string[]) ?? []
      const matchedSaathi = SAATHIS.find((s) =>
        expertise.some(
          (e) =>
            s.name.toLowerCase().includes(e.toLowerCase().split(' ')[0]) ||
            e
              .toLowerCase()
              .includes(s.name.toLowerCase().replace('saathi', '').trim())
        )
      )
      const saathiId =
        matchedSaathi?.id ?? profile!.primary_saathi_id ?? SAATHIS[0].id
      setFacultySaathiId(saathiId)

      // Total answers
      const { count: total } = await supabase
        .from('board_answers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('is_faculty_answer', true)
      setTotalAnswers(total ?? 0)

      // Answers this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count: week } = await supabase
        .from('board_answers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id)
        .eq('is_faculty_answer', true)
        .gte('created_at', weekAgo.toISOString())
      setThisWeek(week ?? 0)

      // Top answers
      const { data: answers } = await supabase
        .from('board_answers')
        .select('id, body, created_at, faculty_verified')
        .eq('user_id', profile!.id)
        .eq('is_faculty_answer', true)
        .order('created_at', { ascending: false })
        .limit(5)
      setTopAnswers((answers ?? []) as AnswerRow[])

      // Recent unanswered questions in their subject
      const { data: qs } = await supabase
        .from('board_questions')
        .select('id, body, created_at')
        .eq('vertical_id', saathiId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10)
      setRecentQuestions((qs ?? []) as QuestionRow[])

      // Student struggle topics
      const { data: soulData } = await supabase
        .from('student_soul')
        .select('struggle_topics')
        .eq('vertical_id', saathiId)
        .not('struggle_topics', 'eq', '{}')
        .limit(200)

      const struggleMap: Record<string, number> = {}
      ;(soulData ?? []).forEach((s: StruggleRow) => {
        ;(s.struggle_topics ?? []).forEach((t) => {
          struggleMap[t] = (struggleMap[t] ?? 0) + 1
        })
      })
      const sorted = Object.entries(struggleMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      setStruggles(sorted)

      setLoading(false)
    }

    load()
  }, [profile])

  const estimatedReach = useMemo(() => totalAnswers * 47, [totalAnswers]) // avg 47 views per answer

  if (!profile) return null

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-subtle)]"
          style={{ borderTopColor: '#C9993A' }}
        />
      </main>
    )
  }

  const saathi = SAATHIS.find((s) => s.id === facultySaathiId)
  const maxStruggle = struggles[0]?.[1] ?? 1

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          'var(--bg-base)',
      }}
    >
      {/* Nav */}
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link
          href="/faculty"
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/faculty"
          className="text-sm"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          &larr; Back to Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <h1 className="font-playfair mb-2 text-3xl font-bold text-[var(--text-primary)]">
          Your Impact
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {saathi?.emoji} {saathi?.name} &middot; Faculty Analytics
        </p>

        {/* Stats cards */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total answers', value: totalAnswers, color: '#C9993A' },
            {
              label: 'Students reached',
              value: estimatedReach.toLocaleString('en-IN'),
              color: '#4ADE80',
            },
            { label: 'This week', value: thisWeek, color: '#60A5FA' },
            {
              label: 'Status',
              value: verificationStatus === 'verified' ? 'Verified' : 'Pending',
              color: verificationStatus === 'verified' ? '#4ADE80' : '#FACC15',
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5"
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
              }}
            >
              <p
                className="mb-1 text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {stat.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Where students struggle most */}
        {struggles.length > 0 && (
          <section className="mb-10">
            <h2 className="font-playfair mb-1 text-xl font-bold text-[var(--text-primary)]">
              Where students struggle most
            </h2>
            <p
              className="mb-4 text-xs"
              style={{ color: 'var(--text-ghost)' }}
            >
              These concepts need the most attention in your subject
            </p>
            <div className="space-y-3">
              {struggles.map(([topic, count]) => (
                <div key={topic}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{topic}</span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {count} students
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxStruggle) * 100}%` }}
                      style={{
                        background: 'linear-gradient(90deg, #F87171, #EF4444)',
                      }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* What students are asking */}
        <section className="mb-10">
          <h2 className="font-playfair mb-1 text-xl font-bold text-[var(--text-primary)]">
            What students are asking
          </h2>
          <p
            className="mb-4 text-xs"
            style={{ color: 'var(--text-ghost)' }}
          >
            Recent questions in your subject area
          </p>
          {recentQuestions.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: 'var(--text-ghost)' }}
            >
              No recent questions
            </p>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-4 rounded-xl p-4"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--bg-elevated)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-[var(--text-primary)]">{q.body}</p>
                    <p
                      className="mt-1 text-[10px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      {new Date(q.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Link
                    href="/faculty"
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: 'rgba(201,153,58,0.15)',
                      color: '#C9993A',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Answer &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Your top answers */}
        <section className="mb-10">
          <h2 className="font-playfair mb-4 text-xl font-bold text-[var(--text-primary)]">
            Your recent answers
          </h2>
          {topAnswers.length === 0 ? (
            <p
              className="py-8 text-center text-sm"
              style={{ color: 'var(--text-ghost)' }}
            >
              No answers yet. Head to the Board to help students.
            </p>
          ) : (
            <div className="space-y-3">
              {topAnswers.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--bg-elevated)',
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {a.faculty_verified ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ADE80',
                        }}
                      >
                        Verified
                      </span>
                    ) : (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: 'rgba(234,179,8,0.12)',
                          color: '#FACC15',
                        }}
                      >
                        Pending
                      </span>
                    )}
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      {new Date(a.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-[var(--text-primary)]">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Motivational */}
        <div
          className="py-6 text-center"
          style={{ color: 'var(--text-ghost)' }}
        >
          <p className="font-playfair text-sm italic">
            &ldquo;Your answers reach students across India. Every explanation
            shapes a future.&rdquo;
          </p>
        </div>
      </div>
    </main>
  )
}
