'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

type StudentProfile = {
  id: string
  full_name: string | null
  academic_level: string | null
  degree_programme: string | null
  current_semester: string | null
  institution_name: string | null
  city: string | null
  exam_target: string | null
}

type SoulData = {
  user_id: string
  depth_calibration: number | null
  flame_stage: string | null
  top_topics: string[] | null
  struggle_topics: string[] | null
  future_research_area: string | null
  session_count: number | null
  career_interest: string | null
}

type BookingData = {
  student_id: string
  booking_type: string
  lecture_ids: string[] | null
  attended_lecture_ids: string[] | null
}

type EnrichedStudent = {
  profile: StudentProfile
  soul: SoulData | null
  booking: BookingData
}

type LectureRow = {
  id: string
  lecture_number: number
  title: string
  scheduled_at: string
  status: string
}

type AiTips = {
  tips: { icon: string; title: string; detail: string }[]
  opening_suggestion: string
  depth_recommendation: string
} | null

// ── Helpers ────────────────────────────────────────────────────────────────────

const FLAME_EMOJI: Record<string, string> = {
  cold: '\u{1FAA8}',
  spark: '\u{2728}',
  flame: '\u{1F525}',
  fire: '\u{26A1}',
  wings: '\u{1F31F}',
}

function depthColor(d: number): string {
  if (d >= 65) return '#4ADE80'
  if (d >= 40) return '#C9993A'
  return 'var(--text-ghost)'
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AudienceIntelligencePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const { profile: myProfile } = useAuthStore()

  const [sessionTitle, setSessionTitle] = useState('')
  const [verticalId, setVerticalId] = useState('')
  const [students, setStudents] = useState<EnrichedStudent[]>([])
  const [lectures, setLectures] = useState<LectureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tips, setTips] = useState<AiTips>(null)
  const [tipsLoading, setTipsLoading] = useState(false)
  const [sortBy, setSortBy] = useState('depth_desc')
  const [filterExam, setFilterExam] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')

  // Attendance
  const [attendanceLecture, setAttendanceLecture] = useState<string | null>(
    null
  )
  const [attendanceChecked, setAttendanceChecked] = useState<Set<string>>(
    new Set()
  )
  const [attendanceSaving, setAttendanceSaving] = useState(false)

  useEffect(() => {
    if (!myProfile) return
    const supabase = createClient()

    async function load() {
      // Verify ownership
      const { data: sess } = await supabase
        .from('live_sessions')
        .select('faculty_id, title, vertical_id')
        .eq('id', sessionId)
        .single()

      if (!sess || sess.faculty_id !== myProfile!.id) {
        router.replace('/faculty/live')
        return
      }

      setSessionTitle(sess.title)
      setVerticalId(sess.vertical_id)

      // Get bookings
      const { data: bookings } = await supabase
        .from('live_bookings')
        .select('student_id, booking_type, lecture_ids, attended_lecture_ids')
        .eq('session_id', sessionId)
        .eq('payment_status', 'paid')

      if (!bookings || bookings.length === 0) {
        setLoading(false)
        return
      }

      const studentIds = bookings.map((b: BookingData) => b.student_id)

      // Fetch profiles + souls in parallel
      const [profilesRes, soulsRes, lecturesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, full_name, academic_level, degree_programme, current_semester, institution_name, city, exam_target'
          )
          .in('id', studentIds),
        supabase
          .from('student_soul')
          .select(
            'user_id, depth_calibration, flame_stage, top_topics, struggle_topics, future_research_area, session_count, career_interest'
          )
          .in('user_id', studentIds)
          .eq('vertical_id', sess.vertical_id),
        supabase
          .from('live_lectures')
          .select('id, lecture_number, title, scheduled_at, status')
          .eq('session_id', sessionId)
          .order('lecture_number'),
      ])

      const profileMap: Record<string, StudentProfile> = {}
      ;(profilesRes.data ?? []).forEach((p: StudentProfile) => {
        profileMap[p.id] = p
      })

      const soulMap: Record<string, SoulData> = {}
      ;(soulsRes.data ?? []).forEach((s: SoulData) => {
        soulMap[s.user_id] = s
      })

      const enriched: EnrichedStudent[] = (bookings as BookingData[]).map(
        (b) => ({
          profile: profileMap[b.student_id] ?? {
            id: b.student_id,
            full_name: null,
            academic_level: null,
            degree_programme: null,
            current_semester: null,
            institution_name: null,
            city: null,
            exam_target: null,
          },
          soul: soulMap[b.student_id] ?? null,
          booking: b,
        })
      )

      setStudents(enriched)
      setLectures((lecturesRes.data ?? []) as LectureRow[])
      setLoading(false)
    }
    load()
  }, [myProfile, sessionId, router])

  // AI tips
  async function generateTips() {
    if (students.length === 0) return
    setTipsLoading(true)
    const supabase = createClient()
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession()

    const studentSummary = students
      .slice(0, 20)
      .map((s) => {
        const p = s.profile
        const so = s.soul
        return `- ${p.full_name ?? 'Student'}: ${p.degree_programme ?? p.academic_level ?? '?'} at ${p.institution_name ?? '?'}. Depth: ${so?.depth_calibration ?? '?'}/100. Struggles: ${(so?.struggle_topics ?? []).join(', ') || 'none'}. Exam: ${p.exam_target ?? 'none'}.`
      })
      .join('\n')

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/board-draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            questionText: `You are helping a faculty member prepare for a live lecture. Session: "${sessionTitle}". ${students.length} students enrolled.\n\nStudent audience:\n${studentSummary}\n\nGenerate exactly 3 specific preparation tips. Be specific to THIS audience. Max 2 sentences each. Also suggest how to open the session and what depth level to pitch at.\n\nReturn ONLY valid JSON:\n{"tips":[{"icon":"emoji","title":"short","detail":"advice"}],"opening_suggestion":"...","depth_recommendation":"..."}`,
            saathiSlug: verticalId,
          }),
        }
      )
      const data = await res.json()
      if (data.draft) {
        const jsonMatch = data.draft.match(/\{[\s\S]*\}/)
        if (jsonMatch) setTips(JSON.parse(jsonMatch[0]) as AiTips)
      }
    } catch {
      /* silent */
    }
    setTipsLoading(false)
  }

  // Attendance save
  async function saveAttendance() {
    if (!attendanceLecture) return
    setAttendanceSaving(true)
    const supabase = createClient()

    for (const student of students) {
      const attended = attendanceChecked.has(student.profile.id)
      const existing = student.booking.attended_lecture_ids ?? []
      const updated = attended
        ? [...new Set([...existing, attendanceLecture])]
        : existing.filter((id) => id !== attendanceLecture)

      await supabase
        .from('live_bookings')
        .update({ attended_lecture_ids: updated })
        .eq('session_id', sessionId)
        .eq('student_id', student.profile.id)
    }

    setAttendanceSaving(false)
    setAttendanceLecture(null)
  }

  // ── Computed data ────────────────────────────────────────────────────────────

  const depths = students
    .map((s) => s.soul?.depth_calibration ?? 0)
    .filter((d) => d > 0)
  const avgDepth =
    depths.length > 0
      ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length)
      : 0
  const minDepth = depths.length > 0 ? Math.min(...depths) : 0
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0

  const levelCounts: Record<string, number> = {}
  students.forEach((s) => {
    const l = s.profile.academic_level ?? 'unknown'
    levelCounts[l] = (levelCounts[l] ?? 0) + 1
  })

  const examCounts: Record<string, number> = {}
  students.forEach((s) => {
    if (s.profile.exam_target && s.profile.exam_target !== 'None')
      examCounts[s.profile.exam_target] =
        (examCounts[s.profile.exam_target] ?? 0) + 1
  })
  const topExams = Object.entries(examCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const struggleMap: Record<string, number> = {}
  students.forEach((s) => {
    ;(s.soul?.struggle_topics ?? []).forEach((t) => {
      struggleMap[t] = (struggleMap[t] ?? 0) + 1
    })
  })
  const topStruggles = Object.entries(struggleMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxStruggle = topStruggles[0]?.[1] ?? 1

  const fullCount = students.filter(
    (s) => s.booking.booking_type === 'full'
  ).length
  const singleCount = students.length - fullCount

  // Filtered + sorted
  const displayed = useMemo(() => {
    let result = [...students]
    if (filterExam !== 'all')
      result = result.filter((s) => s.profile.exam_target === filterExam)
    if (filterLevel !== 'all')
      result = result.filter((s) => s.profile.academic_level === filterLevel)

    result.sort((a, b) => {
      const ad = a.soul?.depth_calibration ?? 0
      const bd = b.soul?.depth_calibration ?? 0
      if (sortBy === 'depth_desc') return bd - ad
      if (sortBy === 'depth_asc') return ad - bd
      if (sortBy === 'name')
        return (a.profile.full_name ?? '').localeCompare(
          b.profile.full_name ?? ''
        )
      if (sortBy === 'level')
        return (a.profile.academic_level ?? '').localeCompare(
          b.profile.academic_level ?? ''
        )
      return 0
    })
    return result
  }, [students, sortBy, filterExam, filterLevel])

  const saathi = SAATHIS.find((s) => s.id === verticalId)
  const color = saathi?.primary ?? '#C9993A'

  if (!myProfile) return null

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

  const selectStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--text-ghost)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link
          href="/faculty/live"
          className="font-display text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/faculty/live"
          className="text-sm"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          &larr; My Sessions
        </Link>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-2">
          <p
            className="mb-1 text-[13px] font-bold tracking-wider uppercase"
            style={{ color }}
          >
            {saathi?.emoji} {saathi?.name}
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {sessionTitle}
          </h1>
        </div>
        <p className="mb-1 text-xs" style={{ color: 'var(--text-ghost)' }}>
          Student profiles are shared to help you prepare. Do not share this
          information outside EdUsaathiAI.
        </p>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {students.length} students enrolled
        </p>

        {students.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-3 text-4xl">{'\u{1F465}'}</p>
            <p className="text-sm" style={{ color: 'var(--text-ghost)' }}>
              No bookings yet. Share your session link!
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary cards ──────────────────────────────────── */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {/* Total enrolled */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {students.length}
                </p>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  students enrolled
                </p>
                <p
                  className="mt-1 text-[9px]"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  {fullCount} full series &middot; {singleCount} single
                </p>
              </div>
              {/* Academic spread */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <p
                  className="mb-2 text-[13px] font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Academic levels
                </p>
                {Object.entries(levelCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([level, count]) => (
                    <div key={level} className="mb-1 flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(count / students.length) * 100}%`,
                          minWidth: '8px',
                          background: color,
                        }}
                      />
                      <span className="text-[9px] text-[var(--text-tertiary)] capitalize">
                        {level} ({count})
                      </span>
                    </div>
                  ))}
              </div>
              {/* Depth range */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <p
                  className="mb-1 text-[13px] font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Room depth
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {minDepth} &mdash; {maxDepth}
                </p>
                <p
                  className="text-[9px]"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Average: {avgDepth}/100
                </p>
              </div>
              {/* Exam targets */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <p
                  className="mb-1 text-[13px] font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Exam targets
                </p>
                {topExams.length === 0 ? (
                  <p
                    className="text-[9px]"
                    style={{ color: 'var(--text-ghost)' }}
                  >
                    No specific exams
                  </p>
                ) : (
                  topExams.map(([exam, count]) => (
                    <p key={exam} className="text-[13px] text-[var(--text-secondary)]">
                      {exam} ({count})
                    </p>
                  ))
                )}
              </div>
            </div>

            {/* ── AI Tips ────────────────────────────────────────── */}
            {!tips && !tipsLoading && (
              <button
                onClick={generateTips}
                className="mb-6 rounded-xl px-5 py-3 text-sm font-semibold"
                style={{
                  background: 'rgba(201,153,58,0.12)',
                  border: '1px solid rgba(201,153,58,0.3)',
                  color: '#C9993A',
                }}
              >
                {'\u2726'} Generate Preparation Tips
              </button>
            )}
            {tipsLoading && (
              <div
                className="mb-6 rounded-xl p-5"
                style={{
                  background: 'rgba(201,153,58,0.06)',
                  border: '0.5px solid rgba(201,153,58,0.2)',
                }}
              >
                <p className="text-sm" style={{ color: '#C9993A' }}>
                  {'\u2726'} Analysing your audience...
                </p>
              </div>
            )}
            {tips && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 rounded-xl p-5"
                style={{
                  background: 'rgba(201,153,58,0.06)',
                  border: '0.5px solid rgba(201,153,58,0.25)',
                }}
              >
                <h3
                  className="mb-4 text-sm font-semibold"
                  style={{ color: '#C9993A' }}
                >
                  {'\u2726'} Saathi Intelligence
                </h3>
                <div className="mb-4 space-y-3">
                  {tips.tips.map((tip, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-lg">{tip.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {tip.title}
                        </p>
                        <p
                          className="text-[13px]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {tip.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {tips.opening_suggestion && (
                  <div
                    className="mb-2 rounded-lg p-3"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <p
                      className="mb-1 text-[13px] font-semibold"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Opening suggestion
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {tips.opening_suggestion}
                    </p>
                  </div>
                )}
                {tips.depth_recommendation && (
                  <p
                    className="text-[13px]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {'\u{1F4CA}'} Depth: {tips.depth_recommendation}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Sort + Filter ──────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={selectStyle}
              >
                <option value="depth_desc" style={{ background: 'var(--bg-elevated)' }}>
                  Depth: High to Low
                </option>
                <option value="depth_asc" style={{ background: 'var(--bg-elevated)' }}>
                  Depth: Low to High
                </option>
                <option value="name" style={{ background: 'var(--bg-elevated)' }}>
                  Alphabetical
                </option>
                <option value="level" style={{ background: 'var(--bg-elevated)' }}>
                  Academic Level
                </option>
              </select>
              {topExams.length > 0 && (
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all" style={{ background: 'var(--bg-elevated)' }}>
                    All Exams
                  </option>
                  {topExams.map(([exam]) => (
                    <option
                      key={exam}
                      value={exam}
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      {exam}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={selectStyle}
              >
                <option value="all" style={{ background: 'var(--bg-elevated)' }}>
                  All Levels
                </option>
                {Object.keys(levelCounts).map((l) => (
                  <option
                    key={l}
                    value={l}
                    style={{ background: 'var(--bg-elevated)' }}
                    className="capitalize"
                  >
                    {l}
                  </option>
                ))}
              </select>
              <div className="flex-1" />
              <p
                className="text-[13px]"
                style={{ color: 'var(--text-ghost)' }}
              >
                {displayed.length} students
              </p>
            </div>

            {/* ── Student cards ──────────────────────────────────── */}
            <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              {displayed.map((s, i) => {
                const depth = s.soul?.depth_calibration ?? 0
                const flame = s.soul?.flame_stage ?? 'cold'
                const borderColor =
                  depth >= 65
                    ? '#4ADE80'
                    : depth >= 40
                      ? '#C9993A'
                      : 'var(--border-subtle)'

                return (
                  <motion.div
                    key={s.profile.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border-subtle)',
                      borderLeft: `3px solid ${borderColor}`,
                    }}
                  >
                    {/* Name + level */}
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {'\u{1F464}'} {s.profile.full_name ?? 'Student'}
                        </p>
                        <p
                          className="text-[13px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {s.profile.degree_programme ??
                            s.profile.academic_level ??
                            ''}
                          {s.profile.current_semester
                            ? ` \u00B7 Sem ${s.profile.current_semester}`
                            : ''}
                        </p>
                        <p
                          className="text-[13px]"
                          style={{ color: 'var(--text-ghost)' }}
                        >
                          {s.profile.institution_name ?? ''}
                          {s.profile.city ? ` \u00B7 ${s.profile.city}` : ''}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[13px]"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {s.booking.booking_type === 'full'
                          ? 'Full series'
                          : 'Single'}
                      </span>
                    </div>

                    {/* Depth bar */}
                    <div className="mb-2 flex items-center gap-3">
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color: 'var(--text-tertiary)',
                          width: '40px',
                        }}
                      >
                        Depth
                      </span>
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${depth}%`,
                            background: depthColor(depth),
                          }}
                        />
                      </div>
                      <span
                        className="text-[13px] font-bold"
                        style={{
                          color: depthColor(depth),
                          width: '35px',
                          textAlign: 'right',
                        }}
                      >
                        {depth}/100
                      </span>
                    </div>

                    {/* Flame */}
                    <p
                      className="mb-2 text-[13px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {FLAME_EMOJI[flame] ?? '\u{2728}'} {flame} stage
                      {s.soul?.session_count
                        ? ` \u00B7 ${s.soul.session_count} sessions with Saathi`
                        : ''}
                    </p>

                    {/* Topics */}
                    {(s.soul?.top_topics ?? []).length > 0 && (
                      <div className="mb-1.5">
                        <span
                          className="text-[9px] font-semibold"
                          style={{ color: '#4ADE80' }}
                        >
                          {'\u2705'} Knows well:{' '}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {(s.soul?.top_topics ?? []).slice(0, 3).join(', ')}
                        </span>
                      </div>
                    )}
                    {(s.soul?.struggle_topics ?? []).length > 0 && (
                      <div className="mb-1.5">
                        <span
                          className="text-[9px] font-semibold"
                          style={{ color: '#F87171' }}
                        >
                          {'\u{1F3AF}'} Working on:{' '}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {(s.soul?.struggle_topics ?? [])
                            .slice(0, 3)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Exam + dream */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {s.profile.exam_target &&
                        s.profile.exam_target !== 'None' && (
                          <p
                            className="text-[9px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {'\u{1F4DD}'} Exam: {s.profile.exam_target}
                          </p>
                        )}
                      {s.soul?.future_research_area && (
                        <p
                          className="text-[9px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {'\u{2728}'} Dream:{' '}
                          {s.soul.future_research_area.slice(0, 50)}
                          {s.soul.future_research_area.length > 50 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* ── Struggle cloud ─────────────────────────────────── */}
            {topStruggles.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Common struggle topics across your audience
                </h2>
                <div className="space-y-2">
                  {topStruggles.map(([topic, count]) => (
                    <div key={topic}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-primary)]">{topic}</span>
                        <span
                          className="text-[13px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {count} students
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / maxStruggle) * 100}%`,
                            background:
                              'linear-gradient(90deg, #F87171, #EF4444)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Exam breakdown ─────────────────────────────────── */}
            {topExams.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Your students are preparing for
                </h2>
                <div className="space-y-2">
                  {topExams.map(([exam, count]) => (
                    <div key={exam}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-primary)]">{exam}</span>
                        <span
                          className="text-[13px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {count} students
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / students.length) * 100}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Attendance Marking ────────────────────────────── */}
            {lectures.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Mark Attendance
                </h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  {lectures.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setAttendanceLecture(l.id)
                        setAttendanceChecked(
                          new Set(students.map((s) => s.profile.id))
                        )
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                      style={{
                        background:
                          attendanceLecture === l.id
                            ? `${color}20`
                            : 'var(--bg-elevated)',
                        border: `1px solid ${attendanceLecture === l.id ? `${color}50` : 'var(--border-subtle)'}`,
                        color:
                          attendanceLecture === l.id
                            ? color
                            : 'var(--text-secondary)',
                      }}
                    >
                      Lecture {l.lecture_number}
                    </button>
                  ))}
                </div>
                {attendanceLecture && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border-subtle)',
                    }}
                  >
                    <p className="mb-3 text-xs font-semibold text-[var(--text-primary)]">
                      {lectures.find((l) => l.id === attendanceLecture)
                        ?.title ?? 'Lecture'}
                    </p>
                    <div className="mb-4 space-y-2">
                      {students.map((s) => (
                        <label
                          key={s.profile.id}
                          className="flex cursor-pointer items-center gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={attendanceChecked.has(s.profile.id)}
                            onChange={() =>
                              setAttendanceChecked((prev) => {
                                const n = new Set(prev)
                                if (n.has(s.profile.id)) n.delete(s.profile.id)
                                else n.add(s.profile.id)
                                return n
                              })
                            }
                            className="accent-[#C9993A]"
                          />
                          <span className="text-xs text-[var(--text-secondary)]">
                            {s.profile.full_name ?? 'Student'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={saveAttendance}
                        disabled={attendanceSaving}
                        className="rounded-lg px-5 py-2 text-xs font-bold disabled:opacity-50"
                        style={{ background: '#C9993A', color: '#060F1D' }}
                      >
                        {attendanceSaving
                          ? 'Saving...'
                          : `Save Attendance (${attendanceChecked.size}/${students.length})`}
                      </button>
                      <button
                        onClick={() => setAttendanceLecture(null)}
                        className="text-xs"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
