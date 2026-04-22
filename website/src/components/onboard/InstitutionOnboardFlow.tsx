'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InstitutionOnboardFlow
//
// Parallel to FacultyOnboardFlow — institutions get their own dedicated
// journey, NOT the student Saathi-picker. Light theme, institutional tone,
// one-page form. Writes to institution_profiles on submit and routes to
// /institution.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toVerticalUuid } from '@/constants/verticalIds'

type OrgType = 'university' | 'company' | 'ngo' | 'government' | 'other'

type Props = {
  profile: { id: string; role: string | null }
  onComplete?: () => void
}

const ORG_TYPES: Array<{ value: OrgType; label: string; desc: string }> = [
  { value: 'university', label: 'University / College / School', desc: 'Undergraduate, postgraduate, K-12, coaching' },
  { value: 'company',    label: 'Edtech / Corporate',          desc: 'Training, upskilling, corporate L&D' },
  { value: 'ngo',        label: 'NGO / Trust',                 desc: 'Educational non-profit, foundation' },
  { value: 'government', label: 'Government body',             desc: 'Ministry, board, public institution' },
  { value: 'other',      label: 'Other',                       desc: 'Something else' },
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Chandigarh', 'Puducherry', 'Andaman & Nicobar', 'Lakshadweep',
  'Dadra & Nagar Haveli', 'Daman & Diu',
]

export function InstitutionOnboardFlow({ profile, onComplete }: Props) {
  const router = useRouter()

  const [orgName, setOrgName]               = useState('')
  const [orgType, setOrgType]               = useState<OrgType>('university')
  const [website, setWebsite]               = useState('')
  const [contactPerson, setContactPerson]   = useState('')
  const [contactEmail, setContactEmail]     = useState('')
  const [city, setCity]                     = useState('')
  const [state, setState]                   = useState('')
  const [description, setDescription]       = useState('')
  const [subjects, setSubjects]             = useState<string[]>([])
  const [studentCount, setStudentCount]     = useState('')
  const [naacCode, setNaacCode]             = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const toggleSubject = (slug: string) => {
    setSubjects((s) => s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug])
  }

  const canSubmit =
    orgName.trim().length >= 2 &&
    contactPerson.trim().length >= 2 &&
    contactEmail.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) &&
    city.trim().length > 0

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      router.replace('/login')
      return
    }

    // Persist role on profiles row.
    await supabase
      .from('profiles')
      .update({
        role:         'institution',
        full_name:    contactPerson.trim(),
        city:         city.trim(),
        state:        state || null,
        is_active:    true,
      })
      .eq('id', user.id)

    // Upsert institution_profiles row (schema: migration 055).
    const { error: insErr } = await supabase
      .from('institution_profiles')
      .upsert(
        {
          user_id:             user.id,
          org_name:            orgName.trim(),
          org_type:            orgType,
          website:             website.trim() || null,
          contact_person:      contactPerson.trim(),
          contact_email:       contactEmail.trim(),
          city:                city.trim() || null,
          state:               state || null,
          description:         [
            description.trim(),
            studentCount.trim() ? `Student body: ${studentCount.trim()}` : null,
            naacCode.trim()     ? `NAAC/UGC: ${naacCode.trim()}`         : null,
            subjects.length     ? `Subjects offered: ${subjects.join(', ')}` : null,
          ].filter(Boolean).join('\n') || null,
          verification_status: 'pending',
        },
        { onConflict: 'user_id' },
      )

    // Optional: store primary subjects as Saathi mapping too. Non-fatal if it fails.
    if (subjects.length > 0) {
      try {
        const rows = subjects
          .map((slug) => ({ user_id: user.id, vertical_id: toVerticalUuid(slug) }))
          .filter((r) => r.vertical_id)
        if (rows.length > 0) {
          await supabase.from('saathi_enrollments').upsert(rows, {
            onConflict: 'user_id,vertical_id',
          })
        }
      } catch { /* ignore — enrollment is additive */ }
    }

    setSaving(false)

    if (insErr) {
      setError('We could not save right now. Please try again in a moment.')
      return
    }

    if (onComplete) onComplete()
    else router.replace('/institution')
  }, [
    canSubmit, saving, router, orgName, orgType, website, contactPerson,
    contactEmail, city, state, description, studentCount, naacCode, subjects, onComplete,
  ])

  return (
    <main
      className="min-h-screen w-full"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12,
          }}>
            Institution partnership
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--text-primary)',
          }}>
            Bring EdUsaathiAI to your students.
          </h1>
          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: '12px 0 0',
            maxWidth: 620,
          }}>
            Thirty subject companions, a live community board, and a soul that
            remembers each student. Tell us about your institution — we verify
            within 24 hours and walk your admins through setup.
          </p>
        </motion.header>

        {/* ── Form card ── */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <SectionLabel>About your institution</SectionLabel>

          <Field
            label="Institution name *"
            value={orgName}
            onChange={setOrgName}
            placeholder="e.g. St. Xavier's College, Ahmedabad"
            autoFocus
          />

          <div>
            <Label>What kind of institution?</Label>
            <div style={{
              display: 'grid', gap: 8,
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              marginBottom: 18,
            }}>
              {ORG_TYPES.map((t) => {
                const on = orgType === t.value
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setOrgType(t.value)}
                    style={{
                      textAlign: 'left',
                      padding:   '12px 14px',
                      borderRadius: 'var(--radius-std)',
                      border:     on ? `1.5px solid var(--saathi-primary)` : '1.5px solid var(--border-subtle)',
                      background: on ? 'var(--saathi-light)' : 'var(--bg-surface)',
                      color:      'var(--text-primary)',
                      cursor:     'pointer',
                      minHeight:  56,
                      display:    'flex',
                      flexDirection:'column',
                      alignItems: 'flex-start',
                      justifyContent:'center',
                      gap: 2,
                      boxShadow:  on ? 'var(--elevation-2)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {t.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <Field
            label="Website (optional)"
            value={website}
            onChange={setWebsite}
            placeholder="https://example.edu.in"
            type="url"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field
              label="City *"
              value={city}
              onChange={setCity}
              placeholder="Ahmedabad"
            />
            <div>
              <Label>State</Label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">Select…</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field
              label="Approx student body (optional)"
              value={studentCount}
              onChange={setStudentCount}
              placeholder="e.g. 1500"
              type="number"
            />
            <Field
              label="NAAC / UGC / AICTE code (optional)"
              value={naacCode}
              onChange={setNaacCode}
              placeholder="Helps us speed up verification"
            />
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <SectionLabel>Primary contact</SectionLabel>
          <p style={{
            fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55,
            margin: '0 0 14px',
          }}>
            The person we should reach for admin access, billing, and student
            onboarding. You can add more admins after verification.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field
              label="Full name *"
              value={contactPerson}
              onChange={setContactPerson}
              placeholder="e.g. Dr. Meera Shah, Registrar"
            />
            <Field
              label="Official email *"
              value={contactEmail}
              onChange={setContactEmail}
              placeholder="registrar@example.edu.in"
              type="email"
            />
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <SectionLabel>Subjects your students learn</SectionLabel>
          <p style={{
            fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55,
            margin: '0 0 14px',
          }}>
            Pick the subjects offered at your institution. Your students will
            land on these Saathis first when they join. Skip if you&apos;re
            unsure — your admins can configure later.
          </p>
          <div style={{
            display: 'grid', gap: 8,
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          }}>
            {SAATHIS.map((s) => {
              const on = subjects.includes(s.id)
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-std)',
                    background: on ? 'var(--saathi-light)' : 'var(--bg-surface)',
                    border: on ? '1.5px solid var(--saathi-primary)' : '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: on ? 'var(--elevation-2)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: on ? 'var(--saathi-text)' : 'var(--text-secondary)',
                  }}>
                    {s.name.replace(/Saathi$/, '')}
                  </span>
                </button>
              )
            })}
          </div>
          {subjects.length > 0 && (
            <p style={{
              fontSize: 12, fontWeight: 600, color: 'var(--gold)',
              margin: '12px 0 0',
            }}>
              ✦ {subjects.length} subject{subjects.length === 1 ? '' : 's'} selected
            </p>
          )}
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <SectionLabel>Anything else (optional)</SectionLabel>
          <p style={{
            fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.55,
            margin: '0 0 10px',
          }}>
            Special programs, accreditation, or anything our verification team
            should know.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Autonomous college under Gujarat University since 1985. NAAC A+ grade. Focus on sciences and humanities."
            rows={4}
            style={{ minHeight: 100, resize: 'vertical' }}
          />
        </div>

        {/* Submit */}
        {error && (
          <p style={{
            fontSize: 13, color: 'var(--error)', margin: '0 0 12px',
            padding: '10px 14px', borderRadius: 'var(--radius-std)',
            background: 'var(--error-bg)', border: '1px solid var(--error)',
          }}>
            {error}
          </p>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, flexWrap: 'wrap',
        }}>
          <p style={{
            fontSize: 12, color: 'var(--text-tertiary)', margin: 0, maxWidth: 440,
            lineHeight: 1.6,
          }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>✦</span>{' '}
            We verify every institution within 24 hours. You&apos;ll hear from
            us at <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{contactEmail || 'your email'}</span>.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              padding:  '14px 28px',
              fontSize: 15,
              fontWeight: 700,
              minWidth: 220,
              opacity:  (!canSubmit || saving) ? 0.5 : 1,
              cursor:   (!canSubmit || saving) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Submitting…' : 'Submit for verification →'}
          </button>
        </div>

        <p style={{
          fontSize: 11, color: 'var(--text-ghost)', margin: '24px 0 0',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          Questions? Email{' '}
          <a href="mailto:admin@edusaathiai.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            admin@edusaathiai.in
          </a>
          {' '}— our partnerships team responds within one working day.
        </p>

        {/* Hidden-ish sanity check so sign-out is always reachable in dev. */}
        {profile.id && (
          <p style={{
            fontSize: 10, color: 'var(--text-ghost)',
            textAlign: 'center', margin: '32px 0 0',
          }}>
            Signed in as institution admin · <span style={{ fontFamily: 'var(--font-mono)' }}>{profile.id.slice(0, 8)}…</span>
          </p>
        )}
      </div>
    </main>
  )
}

// ── Small internal primitives ──────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-label" style={{ marginBottom: 14 }}>
      {children}
    </p>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="label" style={{ marginBottom: 6 }}>
      {children}
    </label>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text', autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  )
}
