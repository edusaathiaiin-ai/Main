'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type DepthPref = 'beginner' | 'intermediate' | 'advanced'
type FormatPref = 'lecture' | 'series' | 'workshop' | 'onetoone' | 'any'
type Urgency = 'this_month' | 'next_3_months' | 'anytime'
type IntentStatus = 'open' | 'fulfilled' | 'expired' | 'removed'

type LearningIntent = {
  id: string
  student_id: string
  vertical_id: string
  topic: string
  description: string | null
  depth_preference: DepthPref
  format_preference: FormatPref
  max_price_paise: number
  urgency: Urgency
  tags: string[]
  joiner_count: number
  status: IntentStatus
  expires_at: string
  created_at: string
  student_name?: string
  student_institution?: string
  student_semester?: string
  has_joined?: boolean
}

type SortOption = 'most_wanted' | 'newest' | 'expiring'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEPTH_LABEL: Record<DepthPref, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const FORMAT_LABEL: Record<FormatPref, string> = {
  lecture: 'Lecture',
  series: 'Series',
  workshop: 'Workshop',
  onetoone: '1:1 Session',
  any: 'Any format',
}

const URGENCY_LABEL: Record<Urgency, string> = {
  this_month: 'This month',
  next_3_months: 'Next 3 months',
  anytime: 'Anytime',
}

const DEPTH_COLOR: Record<DepthPref, string> = {
  beginner: '#4ADE80',
  intermediate: '#C9993A',
  advanced: '#F87171',
}

const PRICE_OPTIONS = [
  { label: '₹500', value: 50000 },
  { label: '₹1,000', value: 100000 },
  { label: '₹1,500', value: 150000 },
  { label: '₹2,000+', value: 200000 },
]

// ── Intent Card ───────────────────────────────────────────────────────────────

function IntentCard({
  intent,
  onJoin,
  currentUserId,
}: {
  intent: LearningIntent
  onJoin: (id: string) => void
  currentUserId: string
}) {
  const saathi = SAATHIS.find((s) => s.id === toSlug(intent.vertical_id))
  const isOwn = intent.student_id === currentUserId
  const hasJoined = intent.has_joined

  const daysLeft = Math.max(
    0,
    Math.round((new Date(intent.expires_at).getTime() - Date.now()) / 86400000)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--bg-elevated)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '12px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '10px',
        }}
      >
        <div style={{ flex: 1, marginRight: '12px' }}>
          {saathi && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '600',
                color: saathi.accent,
                background: `${saathi.accent}18`,
                border: `0.5px solid ${saathi.accent}40`,
                borderRadius: '100px',
                padding: '2px 8px',
                display: 'inline-block',
                marginBottom: '6px',
              }}
            >
              {saathi.emoji} {saathi.name}
            </span>
          )}
          <p
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#fff',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {intent.topic}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '14px' }}>🔥</span>
          <span
            style={{ fontSize: '18px', fontWeight: '800', color: '#FB923C' }}
          >
            {intent.joiner_count}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            want this
          </span>
        </div>
      </div>

      {/* Description */}
      {intent.description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          {intent.description}
        </p>
      )}

      {/* Student info */}
      {intent.student_name && (
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-ghost)',
            margin: '0 0 10px',
          }}
        >
          Posted by {intent.student_name.split(' ')[0]}
          {intent.student_institution ? ` · ${intent.student_institution}` : ''}
          {intent.student_semester ? ` · ${intent.student_semester}` : ''}
        </p>
      )}

      {/* Tags */}
      {intent.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          {intent.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-medium)',
                borderRadius: '100px',
                padding: '2px 8px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Depth + Format + Urgency chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: '600',
            color: DEPTH_COLOR[intent.depth_preference],
            background: `${DEPTH_COLOR[intent.depth_preference]}15`,
            border: `0.5px solid ${DEPTH_COLOR[intent.depth_preference]}40`,
            borderRadius: '100px',
            padding: '2px 8px',
          }}
        >
          {DEPTH_LABEL[intent.depth_preference]}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-medium)',
            borderRadius: '100px',
            padding: '2px 8px',
          }}
        >
          {FORMAT_LABEL[intent.format_preference]}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-medium)',
            borderRadius: '100px',
            padding: '2px 8px',
          }}
        >
          {URGENCY_LABEL[intent.urgency]}
        </span>
        {daysLeft <= 14 && (
          <span
            style={{
              fontSize: '10px',
              color: '#FBBF24',
              background: 'rgba(251,191,36,0.1)',
              border: '0.5px solid rgba(251,191,36,0.3)',
              borderRadius: '100px',
              padding: '2px 8px',
            }}
          >
            ⏳ {daysLeft}d left
          </span>
        )}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isOwn ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#C9993A',
              background: 'rgba(201,153,58,0.1)',
              border: '0.5px solid rgba(201,153,58,0.3)',
              borderRadius: '8px',
              padding: '8px 16px',
            }}
          >
            Your intent
          </span>
        ) : hasJoined ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#4ADE80',
              background: 'rgba(74,222,128,0.1)',
              border: '0.5px solid rgba(74,222,128,0.3)',
              borderRadius: '8px',
              padding: '8px 16px',
            }}
          >
            ✓ You want this
          </span>
        ) : (
          <button
            onClick={() => onJoin(intent.id)}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#FB923C',
              background: 'rgba(251,146,60,0.1)',
              border: '0.5px solid rgba(251,146,60,0.35)',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            + I want this too
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Declare Form ──────────────────────────────────────────────────────────────

function DeclareForm({
  onSuccess,
  defaultVerticalId,
}: {
  onSuccess: () => void
  defaultVerticalId: string
}) {
  const { profile } = useAuthStore()
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [depth, setDepth] = useState<DepthPref>('intermediate')
  const [format, setFormat] = useState<FormatPref>('any')
  const [maxPrice, setMaxPrice] = useState(150000)
  const [urgency, setUrgency] = useState<Urgency>('anytime')
  const [verticalId, setVerticalId] = useState(defaultVerticalId)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [newIntentId, setNewIntentId] = useState('')

  // verticalId comes from the parent's selector — if it doesn't resolve
  // (e.g. user hasn't picked yet), keep saathiName generic instead of
  // mailing it to the AI as "KanoonSaathi" by accident.
  const saathi = SAATHIS.find((s) => s.id === verticalId) ?? null
  const saathiName = saathi?.name ?? 'Saathi'

  async function fetchTagSuggestions() {
    if (!topic.trim() || topic.trim().length < 5) return
    setLoadingTags(true)
    try {
      const res = await fetch('/api/learn/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, saathiName }),
      })
      if (res.ok) {
        const data = (await res.json()) as { tags: string[] }
        setSuggestedTags(data.tags ?? [])
      }
    } catch {
      // suggestions are optional — silently fail
    } finally {
      setLoadingTags(false)
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags((prev) => [...prev, t])
      setTagInput('')
    }
  }

  async function handleSubmit() {
    if (!profile || !topic.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('learning_intents')
      .insert({
        student_id: profile.id,
        vertical_id: verticalId,
        topic: topic.trim().slice(0, 100),
        description: description.trim().slice(0, 300) || null,
        depth_preference: depth,
        format_preference: format,
        max_price_paise: maxPrice,
        urgency,
        tags,
        joiner_count: 1,
        status: 'open',
        is_public: true,
      })
      .select('id')
      .single()

    setSubmitting(false)
    if (!error && data) {
      setNewIntentId(data.id as string)
      setDone(true)
    }
  }

  if (done) {
    const shareText = encodeURIComponent(
      `I want to learn "${topic}" on EdUsaathiAI. Join my intent and let's get a professor to teach this! 🎓`
    )
    const shareUrl = encodeURIComponent(`https://edusaathiai.in/learn`)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '40px 20px' }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
        <h3
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '22px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 8px',
          }}
        >
          Your learning intent is live!
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '0 0 6px',
          }}
        >
          Faculty matching your subject have been notified.
        </p>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            margin: '0 0 28px',
          }}
        >
          Other students can join your intent to increase demand.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '280px',
            margin: '0 auto',
          }}
        >
          <button
            onClick={onSuccess}
            style={{
              background: '#C9993A',
              color: '#060F1D',
              fontWeight: '700',
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 24px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            View your intent →
          </button>
          <a
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#25D366',
              color: '#fff',
              fontWeight: '600',
              fontSize: '13px',
              borderRadius: '10px',
              padding: '12px 24px',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Share on WhatsApp →
          </a>
        </div>
      </motion.div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: '10px',
    padding: '12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const chipBtn = (
    active: boolean,
    color: string = '#C9993A'
  ): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: active ? '700' : '400',
    cursor: 'pointer',
    border: `0.5px solid ${active ? color : 'var(--border-medium)'}`,
    background: active ? `${color}20` : 'var(--bg-elevated)',
    color: active ? color : 'var(--text-secondary)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 4px' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '100px',
              background: s <= step ? '#C9993A' : 'var(--border-medium)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 */}
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <h3
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                margin: '0 0 6px',
              }}
            >
              What do you want to learn?
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: '0 0 20px',
              }}
            >
              Be specific — professors match on keywords.
            </p>

            {/* Subject */}
            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Subject (Saathi)
            </label>
            <select
              value={verticalId}
              onChange={(e) => setVerticalId(e.target.value)}
              style={{
                ...inputStyle,
                marginBottom: '16px',
                appearance: 'none',
              }}
            >
              {SAATHIS.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  style={{ background: '#0B1F3A' }}
                >
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>

            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Topic (max 100 chars)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 100))}
              placeholder="e.g. Jet Propulsion Systems and Advanced Thermodynamics"
              style={{ ...inputStyle, marginBottom: '4px' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
              }}
            />
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-ghost)',
                margin: '0 0 20px',
                textAlign: 'right',
              }}
            >
              {topic.length}/100
            </p>

            {/* Tag suggestions */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                >
                  Tags
                </label>
                <button
                  onClick={fetchTagSuggestions}
                  disabled={loadingTags || topic.length < 5}
                  style={{
                    fontSize: '11px',
                    color: '#C9993A',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: topic.length < 5 ? 0.4 : 1,
                  }}
                >
                  {loadingTags ? 'Suggesting…' : '✦ Suggest tags'}
                </button>
              </div>
              {suggestedTags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        fontSize: '11px',
                        borderRadius: '100px',
                        padding: '3px 10px',
                        cursor: 'pointer',
                        border: `0.5px solid ${tags.includes(tag) ? '#C9993A' : 'var(--border-strong)'}`,
                        background: tags.includes(tag)
                          ? 'rgba(201,153,58,0.15)'
                          : 'var(--bg-elevated)',
                        color: tags.includes(tag)
                          ? '#C9993A'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {tags.includes(tag) ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomTag()
                    }
                  }}
                  placeholder="Add custom tag + Enter"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              {tags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        fontSize: '11px',
                        color: '#C9993A',
                        background: 'rgba(201,153,58,0.12)',
                        border: '0.5px solid rgba(201,153,58,0.35)',
                        borderRadius: '100px',
                        padding: '3px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      {tag} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!topic.trim()}
              style={{
                width: '100%',
                background: '#C9993A',
                color: '#060F1D',
                fontWeight: '700',
                fontSize: '14px',
                borderRadius: '10px',
                padding: '13px',
                border: 'none',
                cursor: topic.trim() ? 'pointer' : 'not-allowed',
                opacity: topic.trim() ? 1 : 0.45,
              }}
            >
              Next →
            </button>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <h3
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                margin: '0 0 6px',
              }}
            >
              Tell us more
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: '0 0 20px',
              }}
            >
              What specifically? Exam prep, research, career, or just curious?
            </p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="e.g. I'm in 4th semester Chemical Engineering and need this for my minor project on aerospace propulsion. I want research-level depth, not just basics."
              rows={4}
              style={{ ...inputStyle, resize: 'none', marginBottom: '4px' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)'
              }}
            />
            <p
              style={{
                fontSize: '10px',
                color: 'var(--text-ghost)',
                margin: '0 0 20px',
                textAlign: 'right',
              }}
            >
              {description.length}/300
            </p>

            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Depth
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              {(['beginner', 'intermediate', 'advanced'] as DepthPref[]).map(
                (d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    style={chipBtn(depth === d)}
                  >
                    {DEPTH_LABEL[d]}
                  </button>
                )
              )}
            </div>

            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Format
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '28px',
                flexWrap: 'wrap',
              }}
            >
              {(
                [
                  'any',
                  'lecture',
                  'series',
                  'onetoone',
                  'workshop',
                ] as FormatPref[]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={chipBtn(format === f)}
                >
                  {FORMAT_LABEL[f]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(1)}
                style={{ ...chipBtn(false), flex: 1 }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  background: '#C9993A',
                  color: '#060F1D',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderRadius: '10px',
                  padding: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <h3
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                margin: '0 0 6px',
              }}
            >
              Budget and urgency
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: '0 0 20px',
              }}
            >
              Professors use this to price their sessions.
            </p>

            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Willing to pay up to
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}
            >
              {PRICE_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setMaxPrice(p.value)}
                  style={chipBtn(maxPrice === p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              When do you need this?
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '28px',
                flexWrap: 'wrap',
              }}
            >
              {(['this_month', 'next_3_months', 'anytime'] as Urgency[]).map(
                (u) => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    style={chipBtn(urgency === u)}
                  >
                    {URGENCY_LABEL[u]}
                  </button>
                )
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(2)}
                style={{ ...chipBtn(false), flex: 1 }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 2,
                  background: '#C9993A',
                  color: '#060F1D',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderRadius: '10px',
                  padding: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Preview →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Preview */}
        {step === 4 && (
          <motion.div
            key="s4"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <h3
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                margin: '0 0 6px',
              }}
            >
              This is how faculty will see your intent
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
                margin: '0 0 16px',
              }}
            >
              Review before publishing.
            </p>

            {/* Preview card */}
            <div
              style={{
                background: 'rgba(201,153,58,0.06)',
                border: '0.5px solid rgba(201,153,58,0.25)',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  color: '#fff',
                  margin: '0 0 6px',
                }}
              >
                {topic}
              </p>
              {description && (
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 10px',
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border-medium)',
                      borderRadius: '100px',
                      padding: '2px 8px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: DEPTH_COLOR[depth],
                    background: `${DEPTH_COLOR[depth]}15`,
                    border: `0.5px solid ${DEPTH_COLOR[depth]}40`,
                    borderRadius: '100px',
                    padding: '2px 8px',
                  }}
                >
                  {DEPTH_LABEL[depth]}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-medium)',
                    borderRadius: '100px',
                    padding: '2px 8px',
                  }}
                >
                  {FORMAT_LABEL[format]}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-medium)',
                    borderRadius: '100px',
                    padding: '2px 8px',
                  }}
                >
                  Up to ₹{(maxPrice / 100).toLocaleString('en-IN')}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-medium)',
                    borderRadius: '100px',
                    padding: '2px 8px',
                  }}
                >
                  {URGENCY_LABEL[urgency]}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep(3)}
                style={{ ...chipBtn(false), flex: 1 }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  background: '#C9993A',
                  color: '#060F1D',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderRadius: '10px',
                  padding: '13px',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Publishing…' : '📢 Declare Intent →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<'browse' | 'declare'>('browse')
  const [intents, setIntents] = useState<LearningIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('all')
  const [filterFormat, setFilterFormat] = useState<FormatPref | 'all'>('all')
  const [filterDepth, setFilterDepth] = useState<DepthPref | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('most_wanted')
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const saathiId = profile?.primary_saathi_id ?? null

  const loadIntents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('learning_intents')
      .select('*')
      .eq('status', 'open')
      .eq('is_public', true)

    if (filterVertical !== 'all')
      query = query.eq('vertical_id', filterVertical)
    if (filterFormat !== 'all')
      query = query.eq('format_preference', filterFormat)
    if (filterDepth !== 'all') query = query.eq('depth_preference', filterDepth)

    if (sortBy === 'most_wanted')
      query = query.order('joiner_count', { ascending: false })
    else if (sortBy === 'newest')
      query = query.order('created_at', { ascending: false })
    else query = query.order('expires_at', { ascending: true })

    const { data } = await query.limit(50)
    const rows = (data ?? []) as LearningIntent[]

    if (rows.length === 0) {
      setIntents([])
      setLoading(false)
      return
    }

    // Enrich with student profiles
    const studentIds = [...new Set(rows.map((r) => r.student_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, institution_name, current_semester')
      .in('id', studentIds)
    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p])
    )

    // Check which intents current user has joined
    let joinedSet = new Set<string>()
    if (profile) {
      const { data: joined } = await supabase
        .from('intent_joiners')
        .select('intent_id')
        .eq('student_id', profile.id)
      joinedSet = new Set((joined ?? []).map((j) => j.intent_id as string))
    }

    const enriched: LearningIntent[] = rows.map((r) => {
      const p = profileMap[r.student_id] as
        | {
            full_name: string | null
            institution_name: string | null
            current_semester: string | null
          }
        | undefined
      return {
        ...r,
        student_name: p?.full_name ?? undefined,
        student_institution: p?.institution_name ?? undefined,
        student_semester: p?.current_semester ?? undefined,
        has_joined: joinedSet.has(r.id),
      }
    })

    setIntents(enriched)
    setLoading(false)
  }, [filterVertical, filterFormat, filterDepth, sortBy, profile])

  useEffect(() => {
    async function run() {
      await loadIntents()
    }
    void run()
  }, [loadIntents])

  // Set default filter to own saathi on mount
  useEffect(() => {
    function run() {
      if (saathiId) setFilterVertical(saathiId)
    }
    run()
  }, [saathiId])

  async function handleJoin(intentId: string) {
    if (!profile) return
    setJoiningId(intentId)
    const supabase = createClient()
    await supabase
      .from('intent_joiners')
      .insert({ intent_id: intentId, student_id: profile.id })
    // Increment joiner_count
    const intent = intents.find((i) => i.id === intentId)
    if (intent) {
      await supabase
        .from('learning_intents')
        .update({ joiner_count: intent.joiner_count + 1 })
        .eq('id', intentId)
    }
    setIntents((prev) =>
      prev.map((i) =>
        i.id === intentId
          ? { ...i, joiner_count: i.joiner_count + 1, has_joined: true }
          : i
      )
    )
    setJoiningId(null)
  }

  const myIntents = intents.filter((i) => i.student_id === profile?.id)
  const otherIntents = intents.filter((i) => i.student_id !== profile?.id)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '32px 16px 80px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '24px' }}>📢</span>
            <h1
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '28px',
                fontWeight: '700',
                color: '#fff',
                margin: 0,
              }}
            >
              I Want to Learn
            </h1>
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-tertiary)',
              margin: '4px 0 0',
            }}
          >
            Declare what you want to learn. Matching professors find you.
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--bg-elevated)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '28px',
            gap: '4px',
          }}
        >
          {(
            [
              ['browse', '📢 Browse Intents'],
              ['declare', '+ Declare Intent'],
            ] as [string, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as 'browse' | 'declare')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: tab === id ? '600' : '400',
                background: tab === id ? '#fff' : 'transparent',
                color: tab === id ? '#0B1F3A' : 'var(--text-tertiary)',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Browse tab */}
        {tab === 'browse' && (
          <>
            {/* Filters */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <select
                value={filterVertical}
                onChange={(e) => setFilterVertical(e.target.value)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#0B1F3A' }}>
                  All subjects
                </option>
                {SAATHIS.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    style={{ background: '#0B1F3A' }}
                  >
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>

              <select
                value={filterFormat}
                onChange={(e) =>
                  setFilterFormat(e.target.value as FormatPref | 'all')
                }
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#0B1F3A' }}>
                  Any format
                </option>
                {(
                  ['lecture', 'series', 'workshop', 'onetoone'] as FormatPref[]
                ).map((f) => (
                  <option key={f} value={f} style={{ background: '#0B1F3A' }}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>

              <select
                value={filterDepth}
                onChange={(e) =>
                  setFilterDepth(e.target.value as DepthPref | 'all')
                }
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#0B1F3A' }}>
                  Any depth
                </option>
                {(['beginner', 'intermediate', 'advanced'] as DepthPref[]).map(
                  (d) => (
                    <option key={d} value={d} style={{ background: '#0B1F3A' }}>
                      {DEPTH_LABEL[d]}
                    </option>
                  )
                )}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="most_wanted" style={{ background: '#0B1F3A' }}>
                  Most wanted
                </option>
                <option value="newest" style={{ background: '#0B1F3A' }}>
                  Newest
                </option>
                <option value="expiring" style={{ background: '#0B1F3A' }}>
                  Expiring soon
                </option>
              </select>
            </div>

            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--text-ghost)',
                }}
              >
                Loading intents…
              </div>
            ) : intents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
                <p
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  No intents yet in this filter.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>
                  Be the first — declare what you want to learn.
                </p>
                <button
                  onClick={() => setTab('declare')}
                  style={{
                    marginTop: '16px',
                    background: '#C9993A',
                    color: '#060F1D',
                    fontWeight: '700',
                    fontSize: '13px',
                    borderRadius: '10px',
                    padding: '10px 24px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Declare an intent →
                </button>
              </div>
            ) : (
              <>
                {otherIntents.map((intent) => (
                  <IntentCard
                    key={intent.id}
                    intent={intent}
                    onJoin={handleJoin}
                    currentUserId={profile?.id ?? ''}
                  />
                ))}

                {myIntents.length > 0 && (
                  <>
                    <div style={{ marginTop: '32px', marginBottom: '16px' }}>
                      <p
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: 'var(--text-ghost)',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          margin: 0,
                        }}
                      >
                        Your intents
                      </p>
                    </div>
                    {myIntents.map((intent) => (
                      <IntentCard
                        key={intent.id}
                        intent={intent}
                        onJoin={handleJoin}
                        currentUserId={profile?.id ?? ''}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Declare tab */}
        {tab === 'declare' && (
          <DeclareForm
            defaultVerticalId={toSlug(saathiId) ?? ''}
            onSuccess={() => setTab('browse')}
          />
        )}
      </div>
    </div>
  )
}
