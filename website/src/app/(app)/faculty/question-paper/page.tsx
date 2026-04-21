'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { getSubjectChips } from '@/constants/subjectChips'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

const TOTAL_MARKS = [50, 75, 100]
const DURATIONS = ['1 hour', '2 hours', '3 hours']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed']
const UNIVERSITY_STYLES = [
  'Gujarat University',
  'Mumbai University',
  'GTU',
  'Delhi University',
  'VTU',
  'Anna University',
  'Generic',
]

const Q_TYPES = [
  { id: 'mcq', label: 'MCQ (1 mark each)', defaultCount: 10 },
  { id: 'short', label: 'Short Answer (5 marks)', defaultCount: 5 },
  { id: 'long', label: 'Long Answer (10 marks)', defaultCount: 3 },
  { id: 'case', label: 'Case Study (15 marks)', defaultCount: 1 },
]

export default function QuestionPaperPage() {
  const { profile } = useAuthStore()

  const saathiId = toSlug(profile?.primary_saathi_id) ?? ''
  const subjectOptions = getSubjectChips(saathiId)

  const [subject, setSubject] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [marks, setMarks] = useState(100)
  const [duration, setDuration] = useState('3 hours')
  const [difficulty, setDifficulty] = useState('Mixed')
  const [style, setStyle] = useState('Generic')
  const [qTypes, setQTypes] = useState<
    Record<string, { enabled: boolean; count: number }>
  >({
    mcq: { enabled: true, count: 10 },
    short: { enabled: true, count: 5 },
    long: { enabled: true, count: 3 },
    case: { enabled: false, count: 1 },
  })
  const [generating, setGenerating] = useState(false)
  const [paper, setPaper] = useState('')

  function toggleTopic(t: string) {
    setTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  async function generate() {
    if (!subject.trim() && topics.length === 0) return
    setGenerating(true)
    setPaper('')

    const enabledTypes = Object.entries(qTypes)
      .filter(([, v]) => v.enabled)
      .map(([k, v]) => {
        const label = Q_TYPES.find((q) => q.id === k)?.label ?? k
        return `${v.count} ${label}`
      })
      .join(', ')

    const topicStr = topics.length > 0 ? topics.join(', ') : subject

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/board-draft`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({
          questionText: `Generate a professional ${marks}-mark question paper for: ${topicStr}.

Question types: ${enabledTypes}
Time allowed: ${duration}
Difficulty: ${difficulty}
University/Board style: ${style}

Include:
- Header with university name, subject, time, total marks
- Clear section numbering
- Marks in brackets after each question
- Instructions at the top
- Mix of recall, application, and analysis questions`,
          saathiSlug: saathiId,
        }),
      }
    )

    const data = await res.json()
    setPaper(data.draft ?? 'Failed to generate. Please try again.')
    setGenerating(false)
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(paper)
  }

  if (!profile) return null

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          'var(--bg-base)',
      }}
    >
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
        <h1 className="font-playfair mb-2 text-3xl font-bold text-[var(--text-primary)]">
          Question Paper Generator
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Generate professional exam papers in seconds
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Form */}
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Constitutional Law, Thermodynamics"
                className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
            </div>

            {/* Topics */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Topics ({topics.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {subjectOptions.map((t) => {
                  const sel = topics.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTopic(t)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{
                        background: sel
                          ? 'rgba(201,153,58,0.2)'
                          : 'var(--bg-elevated)',
                        border: `1px solid ${sel ? 'rgba(201,153,58,0.5)' : 'var(--border-subtle)'}`,
                        color: sel ? '#C9993A' : 'var(--text-secondary)',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Marks + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Total marks
                </label>
                <div className="flex gap-2">
                  {TOTAL_MARKS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarks(m)}
                      className="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
                      style={{
                        background:
                          marks === m
                            ? 'rgba(201,153,58,0.2)'
                            : 'var(--bg-elevated)',
                        border: `1px solid ${marks === m ? 'rgba(201,153,58,0.5)' : 'var(--border-subtle)'}`,
                        color:
                          marks === m ? '#C9993A' : 'var(--text-secondary)',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d} style={{ background: 'var(--bg-elevated)' }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Difficulty + Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{
                        background:
                          difficulty === d
                            ? 'rgba(201,153,58,0.2)'
                            : 'var(--bg-elevated)',
                        border: `1px solid ${difficulty === d ? 'rgba(201,153,58,0.5)' : 'var(--border-subtle)'}`,
                        color:
                          difficulty === d
                            ? '#C9993A'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="mb-2 block text-xs font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  University style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {UNIVERSITY_STYLES.map((s) => (
                    <option key={s} value={s} style={{ background: 'var(--bg-elevated)' }}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question types */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Question types
              </label>
              <div className="space-y-2">
                {Q_TYPES.map((qt) => (
                  <div key={qt.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={qTypes[qt.id].enabled}
                      onChange={(e) =>
                        setQTypes((prev) => ({
                          ...prev,
                          [qt.id]: {
                            ...prev[qt.id],
                            enabled: e.target.checked,
                          },
                        }))
                      }
                      className="accent-[#C9993A]"
                    />
                    <span className="flex-1 text-xs text-[var(--text-secondary)]">
                      {qt.label}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={qTypes[qt.id].count}
                      onChange={(e) =>
                        setQTypes((prev) => ({
                          ...prev,
                          [qt.id]: {
                            ...prev[qt.id],
                            count: parseInt(e.target.value) || 1,
                          },
                        }))
                      }
                      className="w-14 rounded-lg px-2 py-1 text-center text-xs text-[var(--text-primary)] outline-none"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={generate}
              disabled={generating || (!subject.trim() && topics.length === 0)}
              className="w-full rounded-xl py-4 text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: '#C9993A', color: '#060F1D' }}
            >
              {generating ? 'Generating paper...' : 'Generate Question Paper'}
            </button>
          </div>

          {/* Preview */}
          <div>
            {paper ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Generated Paper
                  </h2>
                  <button
                    onClick={copyToClipboard}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: 'rgba(201,153,58,0.15)',
                      color: '#C9993A',
                    }}
                  >
                    Copy
                  </button>
                </div>
                <div
                  className="overflow-y-auto rounded-xl p-6 text-sm leading-relaxed"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    maxHeight: '70vh',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {paper}
                </div>
              </motion.div>
            ) : (
              <div
                className="flex h-full items-center justify-center rounded-xl"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px dashed var(--bg-elevated)',
                  minHeight: '300px',
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Paper preview will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
