'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import { resolveVerticalId } from '@/lib/resolveVerticalId'
import {
  RESEARCH_PROJECT_STATUS,
  RESEARCH_APPLICATION_STATUS,
} from '@/constants/db-enums'
import type {
  ResearchProjectStatus,
  ResearchApplicationStatus,
} from '@/constants/db-enums'

// ── Types ─────────────────────────────────────────────────────────────────────

type ResearchProject = {
  id: string
  vertical_id: string
  title: string
  description: string
  what_you_will_do: string
  what_you_will_get: string
  required_subjects: string[]
  preferred_academic_level: string | null
  duration_months: number | null
  is_remote: boolean
  seats_available: number
  includes_stipend: boolean
  stipend_amount: number | null
  includes_authorship: boolean
  includes_certificate: boolean
  includes_letter: boolean
  status: ResearchProjectStatus
  total_applicants: number
  created_at: string
}

type Applicant = {
  id: string
  project_id: string
  student_id: string
  statement: string
  status: ResearchApplicationStatus
  faculty_note: string | null
  created_at: string
  student?: {
    full_name: string | null
    city: string | null
    academic_level: string | null
  }
}

type View = 'projects' | 'post' | 'applicants'

const ACADEMIC_LEVELS = ['Any', 'UG', 'PG', 'PhD'] as const
const DURATIONS = [1, 2, 3, 6, 12] as const

// ── Status badge ──────────────────────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: ResearchProjectStatus }) {
  const cfg: Record<
    ResearchProjectStatus,
    { bg: string; border: string; color: string }
  > = {
    open: {
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.4)',
      color: '#4ADE80',
    },
    filled: {
      bg: 'rgba(14,165,233,0.12)',
      border: 'rgba(14,165,233,0.4)',
      color: '#38BDF8',
    },
    paused: {
      bg: 'rgba(234,179,8,0.12)',
      border: 'rgba(234,179,8,0.4)',
      color: '#FACC15',
    },
    closed: {
      bg: 'var(--bg-elevated)',
      border: 'var(--text-ghost)',
      color: 'var(--text-tertiary)',
    },
  }
  const s = cfg[status]
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
      style={{
        background: s.bg,
        border: `0.5px solid ${s.border}`,
        color: s.color,
      }}
    >
      {status}
    </span>
  )
}

function ApplicationStatusBadge({
  status,
}: {
  status: ResearchApplicationStatus
}) {
  const cfg: Record<
    ResearchApplicationStatus,
    { bg: string; border: string; color: string; label: string }
  > = {
    pending: {
      bg: 'rgba(234,179,8,0.1)',
      border: 'rgba(234,179,8,0.35)',
      color: '#FACC15',
      label: 'Pending',
    },
    shortlisted: {
      bg: 'rgba(14,165,233,0.12)',
      border: 'rgba(14,165,233,0.4)',
      color: '#38BDF8',
      label: 'Shortlisted',
    },
    accepted: {
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.4)',
      color: '#4ADE80',
      label: 'Accepted',
    },
    rejected: {
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.3)',
      color: '#F87171',
      label: 'Rejected',
    },
    withdrawn: {
      bg: 'var(--bg-elevated)',
      border: 'var(--border-subtle)',
      color: 'var(--text-tertiary)',
      label: 'Withdrawn',
    },
  }
  const s = cfg[status]
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-bold"
      style={{
        background: s.bg,
        border: `0.5px solid ${s.border}`,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}

// ── Post Form ─────────────────────────────────────────────────────────────────

function PostProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const { profile } = useAuthStore()
  const [form, setForm] = useState({
    vertical_id: SAATHIS[0].id,
    title: '',
    description: '',
    what_you_will_do: '',
    what_you_will_get: '',
    required_subjects: '',
    preferred_academic_level: 'Any' as (typeof ACADEMIC_LEVELS)[number],
    duration_months: 3 as (typeof DURATIONS)[number],
    is_remote: true,
    seats_available: 1,
    includes_stipend: false,
    stipend_amount: '',
    includes_authorship: false,
    includes_certificate: true,
    includes_letter: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!profile) return
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.what_you_will_do.trim() ||
      !form.what_you_will_get.trim()
    ) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const verticalUUID = await resolveVerticalId(form.vertical_id, supabase)
    if (!verticalUUID) {
      setError('Invalid Saathi selected.')
      setSubmitting(false)
      return
    }
    const { error: err } = await supabase.from('research_projects').insert({
      faculty_id: profile.id,
      vertical_id: verticalUUID,
      title: form.title.trim(),
      description: form.description.trim(),
      what_you_will_do: form.what_you_will_do.trim(),
      what_you_will_get: form.what_you_will_get.trim(),
      required_subjects: form.required_subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      preferred_academic_level:
        form.preferred_academic_level === 'Any'
          ? null
          : form.preferred_academic_level,
      duration_months: form.duration_months,
      is_remote: form.is_remote,
      seats_available: form.seats_available,
      includes_stipend: form.includes_stipend,
      stipend_amount:
        form.includes_stipend && form.stipend_amount
          ? parseInt(form.stipend_amount, 10)
          : null,
      includes_authorship: form.includes_authorship,
      includes_certificate: form.includes_certificate,
      includes_letter: form.includes_letter,
      status: RESEARCH_PROJECT_STATUS.OPEN,
    })
    setSubmitting(false)
    if (err) {
      setError('Something went wrong. Please try again.')
    } else {
      onSuccess()
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '0.5px solid var(--text-ghost)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    padding: '10px 14px',
    width: '100%',
    fontSize: '13px',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <div className="space-y-5">
      <h2 className="font-playfair text-xl font-bold text-[var(--text-primary)]">
        Post a Research Project
      </h2>

      {/* Saathi / vertical */}
      <div>
        <label style={labelStyle}>Subject area (Saathi)</label>
        <select
          value={form.vertical_id}
          onChange={(e) => set('vertical_id', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {SAATHIS.map((s) => (
            <option key={s.id} value={s.id} style={{ background: 'var(--bg-elevated)' }}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>
          Project title <span style={{ color: '#F87171' }}>*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Machine Learning for Drug Discovery"
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>
          Project overview <span style={{ color: '#F87171' }}>*</span>
        </label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What is this research about? What problem does it solve?"
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* What they'll do */}
      <div>
        <label style={labelStyle}>
          Student's tasks <span style={{ color: '#F87171' }}>*</span>
        </label>
        <textarea
          rows={3}
          value={form.what_you_will_do}
          onChange={(e) => set('what_you_will_do', e.target.value)}
          placeholder="Literature review, data collection, model training, manuscript writing…"
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* What they'll get */}
      <div>
        <label style={labelStyle}>
          What students will gain <span style={{ color: '#F87171' }}>*</span>
        </label>
        <textarea
          rows={3}
          value={form.what_you_will_get}
          onChange={(e) => set('what_you_will_get', e.target.value)}
          placeholder="Co-authorship on the submitted paper, weekly mentorship sessions, recommendation letter…"
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* Required subjects */}
      <div>
        <label style={labelStyle}>
          Required subject knowledge (comma-separated)
        </label>
        <input
          value={form.required_subjects}
          onChange={(e) => set('required_subjects', e.target.value)}
          placeholder="Pharmacokinetics, Python, Statistics"
          style={inputStyle}
        />
      </div>

      {/* Row: academic level + duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Academic level</label>
          <select
            value={form.preferred_academic_level}
            onChange={(e) =>
              set(
                'preferred_academic_level',
                e.target.value as (typeof ACADEMIC_LEVELS)[number]
              )
            }
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l} value={l} style={{ background: 'var(--bg-elevated)' }}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duration (months)</label>
          <select
            value={form.duration_months}
            onChange={(e) =>
              set(
                'duration_months',
                parseInt(e.target.value, 10) as (typeof DURATIONS)[number]
              )
            }
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d} style={{ background: 'var(--bg-elevated)' }}>
                {d} month{d > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: seats + remote */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Seats available</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.seats_available}
            onChange={(e) =>
              set('seats_available', parseInt(e.target.value, 10) || 1)
            }
            style={inputStyle}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <button
            onClick={() => set('is_remote', !form.is_remote)}
            className="relative h-6 w-10 rounded-full transition-all"
            style={{
              background: form.is_remote ? '#4ADE80' : 'var(--border-subtle)',
            }}
          >
            <div
              className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
              style={{ left: form.is_remote ? '22px' : '2px' }}
            />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Remote
          </span>
        </div>
      </div>

      {/* Benefits */}
      <div>
        <label style={labelStyle}>Benefits you offer</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'includes_authorship', label: '✍️ Co-authorship on paper' },
            {
              key: 'includes_certificate',
              label: '📜 Certificate of completion',
            },
            { key: 'includes_letter', label: '📄 Recommendation letter' },
            { key: 'includes_stipend', label: '💰 Monthly stipend' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() =>
                set(
                  key as keyof typeof form,
                  !form[key as keyof typeof form] as never
                )
              }
              className="flex items-center gap-2 rounded-xl p-3 text-left transition-all"
              style={{
                background: form[key as keyof typeof form]
                  ? 'rgba(201,153,58,0.12)'
                  : 'var(--bg-elevated)',
                border: `0.5px solid ${form[key as keyof typeof form] ? 'rgba(201,153,58,0.4)' : 'var(--border-subtle)'}`,
                color: form[key as keyof typeof form]
                  ? '#E5B86A'
                  : 'var(--text-tertiary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px]`}
                style={{
                  border: `1.5px solid ${form[key as keyof typeof form] ? '#C9993A' : 'var(--text-ghost)'}`,
                  background: form[key as keyof typeof form]
                    ? '#C9993A'
                    : 'transparent',
                  color: form[key as keyof typeof form]
                    ? '#000'
                    : 'transparent',
                }}
              >
                ✓
              </span>
              {label}
            </button>
          ))}
        </div>
        {form.includes_stipend && (
          <div className="mt-3">
            <label style={labelStyle}>Stipend amount (₹/month)</label>
            <input
              type="number"
              min={0}
              value={form.stipend_amount}
              onChange={(e) => set('stipend_amount', e.target.value)}
              placeholder="e.g. 3000"
              style={inputStyle}
            />
          </div>
        )}
      </div>

      {error && (
        <p
          className="rounded-xl px-3 py-2 text-xs"
          style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#F87171',
            border: '0.5px solid rgba(239,68,68,0.25)',
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl py-3 text-sm font-bold transition-all"
        style={{
          background: submitting
            ? 'rgba(168,85,247,0.2)'
            : 'linear-gradient(135deg, #A855F7, #7C3AED)',
          color: submitting ? 'var(--text-ghost)' : '#fff',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Publishing…' : 'Publish Research Project →'}
      </button>
    </div>
  )
}

// ── Applicants Panel ──────────────────────────────────────────────────────────

function ApplicantsPanel({
  project,
  applicants,
  onUpdateStatus,
}: {
  project: ResearchProject
  applicants: Applicant[]
  onUpdateStatus: (appId: string, status: ResearchApplicationStatus) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (applicants.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--bg-base)',
          border: '0.5px solid var(--bg-elevated)',
        }}
      >
        <p className="mb-3 text-3xl">📭</p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No applications yet for &ldquo;{project.title}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-playfair text-lg font-bold text-[var(--text-primary)]">
        {project.title}
      </h3>
      <p className="mb-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {applicants.length} application{applicants.length !== 1 ? 's' : ''} ·{' '}
        {project.seats_available} seat{project.seats_available !== 1 ? 's' : ''}
      </p>

      {applicants.map((app) => (
        <div
          key={app.id}
          className="overflow-hidden rounded-2xl"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-subtle)',
          }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {app.student?.full_name ?? 'Student'}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {app.student?.academic_level ?? 'Student'}
                  {app.student?.city ? ` · ${app.student.city}` : ''}
                  {' · '}Applied{' '}
                  {new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <ApplicationStatusBadge status={app.status} />
            </div>

            <button
              onClick={() =>
                setExpandedId(expandedId === app.id ? null : app.id)
              }
              className="mt-2 text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {expandedId === app.id ? '▲ Hide statement' : '▼ Read statement'}
            </button>
          </div>

          <AnimatePresence>
            {expandedId === app.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-4">
                  <p
                    className="mb-4 rounded-xl p-3 text-xs leading-relaxed"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '0.5px solid var(--border-subtle)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {app.statement}
                  </p>

                  {app.status === RESEARCH_APPLICATION_STATUS.PENDING && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            app.id,
                            RESEARCH_APPLICATION_STATUS.SHORTLISTED
                          )
                        }
                        className="flex-1 rounded-xl py-2 text-xs font-bold"
                        style={{
                          background: 'rgba(14,165,233,0.15)',
                          color: '#38BDF8',
                          border: '0.5px solid rgba(14,165,233,0.35)',
                        }}
                      >
                        ⭐ Shortlist
                      </button>
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            app.id,
                            RESEARCH_APPLICATION_STATUS.REJECTED
                          )
                        }
                        className="flex-1 rounded-xl py-2 text-xs font-bold"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#F87171',
                          border: '0.5px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}

                  {app.status === RESEARCH_APPLICATION_STATUS.SHORTLISTED && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            app.id,
                            RESEARCH_APPLICATION_STATUS.ACCEPTED
                          )
                        }
                        className="flex-1 rounded-xl py-2 text-xs font-bold"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ADE80',
                          border: '0.5px solid rgba(34,197,94,0.4)',
                        }}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            app.id,
                            RESEARCH_APPLICATION_STATUS.REJECTED
                          )
                        }
                        className="flex-1 rounded-xl py-2 text-xs font-bold"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#F87171',
                          border: '0.5px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacultyResearchPage() {
  const { profile } = useAuthStore()
  const [view, setView] = useState<View>('projects')
  const [projects, setProjects] = useState<ResearchProject[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selectedProject, setSelectedProject] =
    useState<ResearchProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [postSuccess, setPostSuccess] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadProjects()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProjects() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('research_projects')
      .select('*')
      .eq('faculty_id', profile!.id)
      .order('created_at', { ascending: false })
    setProjects((data ?? []) as ResearchProject[])
    setLoading(false)
  }

  async function loadApplicants(project: ResearchProject) {
    setSelectedProject(project)
    setView('applicants')
    const supabase = createClient()
    const { data } = await supabase
      .from('research_applications')
      .select(
        `
        *,
        student:profiles!research_applications_student_id_fkey(full_name, city, academic_level)
      `
      )
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    setApplicants((data ?? []) as Applicant[])
  }

  async function updateApplicationStatus(
    appId: string,
    status: ResearchApplicationStatus
  ) {
    const supabase = createClient()
    await supabase
      .from('research_applications')
      .update({ status })
      .eq('id', appId)
    setApplicants((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status } : a))
    )
  }

  async function toggleProjectStatus(project: ResearchProject) {
    const newStatus: ResearchProjectStatus =
      project.status === RESEARCH_PROJECT_STATUS.OPEN
        ? RESEARCH_PROJECT_STATUS.PAUSED
        : RESEARCH_PROJECT_STATUS.OPEN
    const supabase = createClient()
    await supabase
      .from('research_projects')
      .update({ status: newStatus })
      .eq('id', project.id)
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p))
    )
  }

  function handlePostSuccess() {
    setPostSuccess(true)
    setView('projects')
    loadProjects()
    setTimeout(() => setPostSuccess(false), 4000)
  }

  const totalApplicants = projects.reduce(
    (sum, p) => sum + p.total_applicants,
    0
  )
  const openProjects = projects.filter(
    (p) => p.status === RESEARCH_PROJECT_STATUS.OPEN
  ).length

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-2xl font-bold text-[var(--text-primary)]">
              Research Interns 🔬
            </h1>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Post projects · find your co-authors
            </p>
          </div>
          <button
            onClick={() => setView('post')}
            className="rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: 'var(--text-primary)',
            }}
          >
            + New Project
          </button>
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Projects', value: projects.length, color: '#C084FC' },
              { label: 'Open now', value: openProjects, color: '#4ADE80' },
              {
                label: 'Total applied',
                value: totalApplicants,
                color: '#38BDF8',
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <p
                  className="font-playfair text-2xl font-bold"
                  style={{ color }}
                >
                  {value}
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Success toast */}
        <AnimatePresence>
          {postSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                background: 'rgba(168,85,247,0.15)',
                border: '0.5px solid rgba(168,85,247,0.4)',
                color: '#C084FC',
              }}
            >
              ✓ Project published! Students can now apply.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar */}
        <div
          className="mb-6 flex gap-1 rounded-2xl p-1"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {[
            { id: 'projects', label: 'My Projects' },
            { id: 'post', label: '+ Post New' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as View)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all"
              style={{
                background:
                  view === tab.id ||
                  (view === 'applicants' && tab.id === 'projects')
                    ? 'rgba(168,85,247,0.2)'
                    : 'transparent',
                color:
                  view === tab.id ||
                  (view === 'applicants' && tab.id === 'projects')
                    ? '#C084FC'
                    : 'var(--text-tertiary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {view === 'post' && <PostProjectForm onSuccess={handlePostSuccess} />}

        {(view === 'projects' || view === 'applicants') && (
          <>
            {view === 'applicants' && selectedProject && (
              <div className="mb-5">
                <button
                  onClick={() => setView('projects')}
                  className="mb-4 flex items-center gap-2 text-xs font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ← Back to projects
                </button>
                <ApplicantsPanel
                  project={selectedProject}
                  applicants={applicants}
                  onUpdateStatus={updateApplicationStatus}
                />
              </div>
            )}

            {view === 'projects' &&
              (loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl p-5"
                      style={{
                        background: 'var(--bg-elevated)',
                        height: '160px',
                      }}
                    />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{
                    background: 'var(--bg-base)',
                    border: '0.5px solid var(--bg-elevated)',
                  }}
                >
                  <p className="mb-4 text-4xl">🔬</p>
                  <p className="font-playfair mb-2 text-xl text-[var(--text-primary)]">
                    No research projects yet
                  </p>
                  <p
                    className="mb-6 text-sm"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Post your first project and find motivated students to
                    collaborate with.
                  </p>
                  <button
                    onClick={() => setView('post')}
                    className="rounded-xl px-6 py-3 text-sm font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Post first project →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const saathi = SAATHIS.find(
                      (s) => s.id === toSlug(project.vertical_id)
                    )
                    return (
                      <div
                        key={project.id}
                        className="rounded-2xl p-5"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '0.5px solid var(--border-subtle)',
                        }}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              {saathi && (
                                <span
                                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                  style={{
                                    background: `${saathi.primary}20`,
                                    color: saathi.accent,
                                  }}
                                >
                                  {saathi.emoji} {saathi.name}
                                </span>
                              )}
                              <ProjectStatusBadge status={project.status} />
                            </div>
                            <h3 className="font-playfair text-base font-bold text-[var(--text-primary)]">
                              {project.title}
                            </h3>
                          </div>
                        </div>

                        <p
                          className="mb-3 text-xs leading-relaxed"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {project.description.slice(0, 160)}
                          {project.description.length > 160 ? '…' : ''}
                        </p>

                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {project.includes_authorship && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: 'rgba(201,153,58,0.12)',
                                color: '#E5B86A',
                                border: '0.5px solid rgba(201,153,58,0.3)',
                              }}
                            >
                              ✍️ Authorship
                            </span>
                          )}
                          {project.includes_stipend &&
                            project.stipend_amount && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  background: 'rgba(74,222,128,0.1)',
                                  color: '#4ADE80',
                                  border: '0.5px solid rgba(74,222,128,0.25)',
                                }}
                              >
                                💰 ₹
                                {project.stipend_amount.toLocaleString('en-IN')}
                                /mo
                              </span>
                            )}
                          {project.duration_months && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-tertiary)',
                                border: '0.5px solid var(--border-subtle)',
                              }}
                            >
                              🗓 {project.duration_months}m
                            </span>
                          )}
                          {project.is_remote && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-tertiary)',
                                border: '0.5px solid var(--border-subtle)',
                              }}
                            >
                              🌐 Remote
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => loadApplicants(project)}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                            style={{
                              background: 'rgba(14,165,233,0.12)',
                              color: '#38BDF8',
                              border: '0.5px solid rgba(14,165,233,0.3)',
                            }}
                          >
                            👥 {project.total_applicants} applicant
                            {project.total_applicants !== 1 ? 's' : ''} →
                          </button>
                          <button
                            onClick={() => toggleProjectStatus(project)}
                            className="rounded-xl px-3 py-1.5 text-xs font-medium"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-tertiary)',
                              border: '0.5px solid var(--border-subtle)',
                            }}
                          >
                            {project.status === RESEARCH_PROJECT_STATUS.OPEN
                              ? 'Pause'
                              : 'Reopen'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}
