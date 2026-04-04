'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

const LEVELS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Masters',
  'PhD',
]
const FORMATS = [
  { id: 'lecture', label: 'Lecture Notes', desc: 'Detailed structured notes' },
  { id: 'summary', label: 'Concept Summary', desc: '1-page quick reference' },
  {
    id: 'casestudy',
    label: 'Case Study',
    desc: 'Case with discussion questions',
  },
  {
    id: 'discussion',
    label: 'Discussion Questions',
    desc: 'Socratic questions only',
  },
]
const DURATIONS = ['30 minutes', '1 hour', '2 hours']

export default function CreateMaterialPage() {
  const { profile } = useAuthStore()

  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('2nd Year')
  const [format, setFormat] = useState('lecture')
  const [includeIndian, setIncludeIndian] = useState(true)
  const [lectureDuration, setLectureDuration] = useState('1 hour')
  const [generating, setGenerating] = useState(false)
  const [material, setMaterial] = useState('')

  async function generate() {
    if (!topic.trim()) return
    setGenerating(true)
    setMaterial('')

    const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? format

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
          questionText: `Create ${formatLabel} for: "${topic}"

Student level: ${level}
Lecture duration: ${lectureDuration}
${includeIndian ? 'Include examples from Indian context wherever possible.' : ''}

${
  format === 'lecture'
    ? `Create comprehensive lecture notes with:
- Learning objectives at the top
- Clear section headers
- Key definitions highlighted
- Worked examples
- Summary at the end
- 3-5 practice questions`
    : format === 'summary'
      ? `Create a 1-page concept summary with:
- Core concept in 2-3 sentences
- Key formulas/principles
- Quick reference table
- Common mistakes to avoid
- One-line memory aid`
      : format === 'casestudy'
        ? `Create a case study with:
- Realistic scenario (Indian context)
- Background information
- 5-7 discussion questions (easy to hard)
- Suggested answer framework`
        : `Create 10-15 Socratic discussion questions:
- Start from basic understanding
- Build to application
- Include "what if" scenarios
- End with open-ended research questions
- Ordered by difficulty`
}`,
          saathiSlug: toSlug(profile?.primary_saathi_id) ?? '',
        }),
      }
    )

    const data = await res.json()
    setMaterial(data.draft ?? 'Failed to generate. Please try again.')
    setGenerating(false)
  }

  if (!profile) return null

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)',
      }}
    >
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
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
          style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
        >
          &larr; Back to Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-playfair mb-2 text-3xl font-bold text-white">
          Create Study Material
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          AI-powered teaching material generation
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Form */}
          <div className="space-y-6">
            {/* Topic */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Topic
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Fundamental Rights under Indian Constitution"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* Level */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Student level
              </label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      background:
                        level === l
                          ? 'rgba(201,153,58,0.2)'
                          : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${level === l ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: level === l ? '#C9993A' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{
                      background:
                        format === f.id
                          ? 'rgba(201,153,58,0.12)'
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${format === f.id ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{
                        color:
                          format === f.id ? '#E5B86A' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {f.label}
                    </p>
                    <p
                      className="mt-0.5 text-[10px]"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {f.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label
                className="mb-2 block text-xs font-semibold"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                Lecture duration
              </label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setLectureDuration(d)}
                    className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
                    style={{
                      background:
                        lectureDuration === d
                          ? 'rgba(201,153,58,0.2)'
                          : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${lectureDuration === d ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color:
                        lectureDuration === d
                          ? '#C9993A'
                          : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Indian examples toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={includeIndian}
                onChange={(e) => setIncludeIndian(e.target.checked)}
                className="accent-[#C9993A]"
              />
              <span
                className="text-xs"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Include examples from Indian context
              </span>
            </label>

            {/* Generate */}
            <button
              onClick={generate}
              disabled={generating || !topic.trim()}
              className="w-full rounded-xl py-4 text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: '#C9993A', color: '#060F1D' }}
            >
              {generating
                ? 'Generating material...'
                : 'Generate Study Material'}
            </button>
          </div>

          {/* Preview */}
          <div>
            {material ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    Generated Material
                  </h2>
                  <button
                    onClick={() => navigator.clipboard.writeText(material)}
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
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    maxHeight: '70vh',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {material}
                </div>
              </motion.div>
            ) : (
              <div
                className="flex h-full items-center justify-center rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                  minHeight: '300px',
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  Material preview will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
