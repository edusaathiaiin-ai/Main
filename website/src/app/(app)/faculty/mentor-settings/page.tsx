'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

/**
 * Mentor Settings — opt-in surface for faculty who want to take mock
 * interviews / placement prep / HR sessions during placement season.
 *
 * Writes directly via the faculty_own RLS policy on faculty_profiles
 * (migration 055). No API route needed — capability values are
 * DB-validated by the CHECK constraints added in migration 151.
 */

const CAPABILITIES = [
  { id: 'mock_technical',  label: 'Technical mock interviews', sub: 'DSA, system design, language fundamentals' },
  { id: 'mock_hr',         label: 'HR rounds',                 sub: 'Behavioural, situational, motivation' },
  { id: 'mock_case',       label: 'Case interviews',           sub: 'Consulting, product, strategy' },
  { id: 'cv_review',       label: 'CV / resume review',        sub: 'Tighten, format, position' },
  { id: 'aptitude_prep',   label: 'Aptitude prep',             sub: 'Quant, logical, verbal' },
  { id: 'gd_prep',         label: 'Group discussion prep',     sub: 'Frameworks, rebuttal, anchoring' },
] as const

const ROLE_FOCUS = [
  { id: 'swe',         label: 'Software engineering' },
  { id: 'data',        label: 'Data / ML' },
  { id: 'pm',          label: 'Product management' },
  { id: 'qa',          label: 'QA / testing' },
  { id: 'banking',     label: 'Banking / finance' },
  { id: 'consulting',  label: 'Consulting' },
  { id: 'sales',       label: 'Sales' },
  { id: 'design',      label: 'Design' },
] as const

type Saved = {
  available_for_mentoring: boolean
  mentor_capabilities: string[]
  mentor_role_focus: string[]
  mentor_hourly_rate_paise: number | null
}

export default function MentorSettingsPage() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [available, setAvailable] = useState(false)
  const [caps, setCaps] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [rateRupees, setRateRupees] = useState('')

  // Role guard
  useEffect(() => {
    if (profile && profile.role !== 'faculty') router.replace('/chat')
  }, [profile, router])

  // Initial fetch
  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('faculty_profiles')
      .select('available_for_mentoring, mentor_capabilities, mentor_role_focus, mentor_hourly_rate_paise')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Saved
          setAvailable(d.available_for_mentoring ?? false)
          setCaps(Array.isArray(d.mentor_capabilities) ? d.mentor_capabilities : [])
          setRoles(Array.isArray(d.mentor_role_focus) ? d.mentor_role_focus : [])
          setRateRupees(d.mentor_hourly_rate_paise != null ? String(Math.round(d.mentor_hourly_rate_paise / 100)) : '')
        }
        setLoading(false)
      })
  }, [profile])

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)

    let ratePaise: number | null = null
    if (rateRupees.trim()) {
      const n = Number(rateRupees.trim())
      if (!Number.isFinite(n) || n < 100 || n > 50_000) {
        setError('Hourly rate must be between ₹100 and ₹50,000.')
        setSaving(false)
        return
      }
      ratePaise = Math.round(n * 100)
    }

    // Faculty can't be available without picking at least one capability —
    // otherwise students see "mock-ready" with no actual offering.
    if (available && caps.length === 0) {
      setError('Pick at least one capability before turning availability on.')
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { error: upErr } = await supabase
      .from('faculty_profiles')
      .update({
        available_for_mentoring: available,
        mentor_capabilities: caps,
        mentor_role_focus: roles,
        mentor_hourly_rate_paise: ratePaise,
      })
      .eq('user_id', profile.id)

    if (upErr) {
      console.error('[mentor-settings] update failed', upErr.message)
      setError('Could not save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setSavedAt(Date.now())
  }

  if (loading) {
    return (
      <main style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ height: '24px', width: '180px', background: 'var(--bg-elevated)', borderRadius: '6px' }} />
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link
          href="/faculty"
          style={{
            display: 'inline-block',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          ← Back to dashboard
        </Link>

        <h1
          className="font-display"
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 6px',
          }}
        >
          Mentor settings
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}
        >
          Tell EdUsaathiAI what kind of placement / mock-interview help you can offer. Students preparing for interviews see your card with a “Mocks” badge — and during the urgency window (interview within 7 days) you’re prioritised in matches.
        </p>

        {/* Availability toggle */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Available for mentoring this season
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                When this is on and you have at least one capability picked, your card surfaces in the Faculty Finder “Mock-ready” filter.
              </p>
            </div>
            <Toggle checked={available} onChange={setAvailable} />
          </div>
        </Card>

        {/* Capabilities */}
        <SectionLabel>Capabilities</SectionLabel>
        <Card>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
            Pick everything you’re comfortable doing. You can turn availability off anytime — capabilities are kept for next season.
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {CAPABILITIES.map((c) => (
              <CheckRow
                key={c.id}
                checked={caps.includes(c.id)}
                onChange={() => setCaps(toggle(caps, c.id))}
                title={c.label}
                sub={c.sub}
              />
            ))}
          </div>
        </Card>

        {/* Role focus */}
        <SectionLabel>Role focus (optional)</SectionLabel>
        <Card>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
            Helps the matching engine pick students whose target roles fit your background.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ROLE_FOCUS.map((r) => (
              <Chip
                key={r.id}
                selected={roles.includes(r.id)}
                onClick={() => setRoles(toggle(roles, r.id))}
              >
                {r.label}
              </Chip>
            ))}
          </div>
        </Card>

        {/* Hourly rate */}
        <SectionLabel>Hourly rate (optional)</SectionLabel>
        <Card>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
            Used for mock-interview pricing only. If left blank, your existing session fees apply. Students see the final price including a 1.5× surge if their interview is within 7 days.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-secondary)' }}>₹</span>
            <input
              type="number"
              min={100}
              max={50000}
              step={50}
              value={rateRupees}
              onChange={(e) => setRateRupees(e.target.value)}
              placeholder="500"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-ghost)' }}>per hour</span>
          </div>
        </Card>

        {error && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--error)', margin: '16px 0 0' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', marginTop: '24px' }}>
          {savedAt && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)' }}>
              ✓ Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'var(--saathi-primary)',
              color: 'var(--bg-surface)',
              border: 'none',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}

// ─── small inline UI primitives ────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-tertiary)',
        margin: '24px 0 8px 4px',
      }}
    >
      {children}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '18px 20px',
      }}
    >
      {children}
    </div>
  )
}

function CheckRow({
  checked, onChange, title, sub,
}: {
  checked: boolean
  onChange: () => void
  title: string
  sub: string
}) {
  return (
    <label
      onClick={onChange}
      style={{
        display: 'flex',
        gap: '12px',
        cursor: 'pointer',
        padding: '12px 14px',
        borderRadius: '10px',
        border: checked ? '1.5px solid var(--saathi-primary)' : '1px solid var(--border-subtle)',
        background: checked ? 'var(--saathi-bg)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="checkbox"
        readOnly
        checked={checked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
        style={{ accentColor: 'var(--saathi-primary)' }}
      />
      <div>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
          {sub}
        </p>
      </div>
    </label>
  )
}

function Chip({
  selected, onClick, children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: '999px',
        border: selected ? '1.5px solid var(--saathi-primary)' : '1px solid var(--border-medium)',
        background: selected ? 'var(--saathi-bg)' : 'var(--bg-surface)',
        color: selected ? 'var(--saathi-text)' : 'var(--text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: selected ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function Toggle({
  checked, onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '48px',
        height: '28px',
        borderRadius: '999px',
        border: 'none',
        background: checked ? 'var(--saathi-primary)' : 'var(--border-medium)',
        cursor: 'pointer',
        transition: 'background 0.18s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '23px' : '3px',
          width: '22px',
          height: '22px',
          borderRadius: '999px',
          background: '#fff',
          transition: 'left 0.18s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}
