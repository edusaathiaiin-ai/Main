'use client'

// ─────────────────────────────────────────────────────────────────────────────
// /education-institutions/register — public registration form for schools,
// colleges, and universities joining EdUsaathiAI's classroom layer.
//
// Four sections, single page, light theme, warm tone. Writes to
// /api/education-institutions/register (no auth). On success →
// /education-institutions/register/thank-you. On error → inline banner above
// the submit button; form state preserved so the visitor doesn't retype anything.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SAATHIS } from '@/constants/saathis'

const AFFILIATIONS = [
  'Gujarat University',
  'Saurashtra University',
  'Veer Narmad South Gujarat University',
  'Hemchandracharya North Gujarat University',
  'Krantiguru Shyamji Krishna Verma University',
  'Gujarat Technological University (GTU)',
  'Autonomous',
  'Other',
] as const

const CONTACT_ROLES = [
  'Principal',
  'Vice Principal',
  'Faculty',
  'IT Head',
  'Other',
] as const

const STRENGTHS = [
  'Up to 200',
  '200–500',
  '500–1,000',
  '1,000+',
] as const

type FormState = {
  name:                 string
  city:                 string
  affiliation:          string
  contactName:          string
  contactRole:          string
  email:                string
  phone:                string
  strength:             string
  saathis:              string[]
  declareInstitution:   boolean
  declareTrial:         boolean
  declareTerms:         boolean
}

const INITIAL: FormState = {
  name: '', city: '', affiliation: '',
  contactName: '', contactRole: '', email: '', phone: '',
  strength: '', saathis: [],
  declareInstitution: false, declareTrial: false, declareTerms: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Permissive but sensible: strip punctuation/spaces, require 7+ digits.
// We don't region-lock because the form is open to any Indian educational body.
const phoneDigits = (s: string) => s.replace(/[^\d]/g, '')

export default function InstitutionRegisterPage() {
  const router = useRouter()
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [error, setError]     = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Derived: validity + disabled state ────────────────────────────────────
  const valid = useMemo(() => {
    if (form.name.trim().length < 2)          return false
    if (form.city.trim().length < 2)          return false
    if (!form.affiliation)                    return false
    if (form.contactName.trim().length < 2)   return false
    if (!form.contactRole)                    return false
    if (!EMAIL_RE.test(form.email.trim()))    return false
    if (phoneDigits(form.phone).length < 7)   return false
    if (!form.strength)                       return false
    if (form.saathis.length < 1)              return false
    if (!form.declareInstitution)             return false
    if (!form.declareTrial)                   return false
    if (!form.declareTerms)                   return false
    return true
  }, [form])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleSaathi(slug: string) {
    setForm((prev) => ({
      ...prev,
      saathis: prev.saathis.includes(slug)
        ? prev.saathis.filter((s) => s !== slug)
        : [...prev.saathis, slug],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/education-institutions/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                 form.name.trim(),
          city:                 form.city.trim(),
          affiliation:          form.affiliation,
          principal_name:       form.contactName.trim(),
          contact_role:         form.contactRole,
          principal_email:      form.email.trim().toLowerCase(),
          contact_phone:        form.phone.trim(),
          approximate_strength: form.strength,
          active_saathi_slugs:  form.saathis,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg =
          data?.error === 'valid_principal_email_required' ? 'Please enter a valid email address.' :
          data?.error === 'name_required'                  ? 'Institution name is required.' :
          data?.error === 'city_required'                  ? 'City is required.' :
          data?.error === 'slug_generation_failed'         ? 'Couldn\'t generate a URL for your institution — please try a slightly different spelling.' :
          data?.error === 'insert_failed'                  ? 'We couldn\'t save your registration. Try again in a moment.' :
          'Something went wrong. Try again, or email admin@edusaathiai.in.'
        setError(msg)
        setSubmitting(false)
        return
      }

      router.push('/education-institutions/register/thank-you')
    } catch {
      setError('Network error — please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <main style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px' }}>
        {/* Header */}
        <header style={{ marginBottom: 32, textAlign: 'center' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
          }}>
            Institution partnership
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: '10px 0 12px',
            color: 'var(--text-primary)',
          }}>
            Bring EdUsaathiAI to your students.
          </h1>
          <p style={{
            fontSize: 16, lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: 560, margin: '0 auto',
          }}>
            Seven-day fully-featured trial. No credit card. Jaydeep personally
            reaches out within 48 hours to set up a short demo for your team.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Section 1: Your Institution ──────────────────────────── */}
          <section className="card" style={{ padding: 24, marginBottom: 16 }}>
            <SectionHeader index={1} title="Your institution" />
            <Field label="Institution name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. St. Xavier's College, Ahmedabad"
                autoFocus
                required
              />
            </Field>
            <Field label="City" required>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Ahmedabad"
                required
              />
            </Field>
            <Field label="Affiliation" required>
              <select
                value={form.affiliation}
                onChange={(e) => set('affiliation', e.target.value)}
                required
              >
                <option value="">Select affiliation…</option>
                {AFFILIATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </section>

          {/* ── Section 2: Your Contact ──────────────────────────────── */}
          <section className="card" style={{ padding: 24, marginBottom: 16 }}>
            <SectionHeader index={2} title="Your contact" />
            <Field label="Your name" required>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Full name"
                required
              />
            </Field>
            <Field label="Your role" required>
              <select
                value={form.contactRole}
                onChange={(e) => set('contactRole', e.target.value)}
                required
              >
                <option value="">Select role…</option>
                {CONTACT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Email address" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@example.edu.in"
                required
              />
            </Field>
            <Field
              label="Phone number"
              required
              helper="WhatsApp preferred — we use it for quick follow-ups."
            >
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                required
              />
            </Field>
          </section>

          {/* ── Section 3: Your Students ─────────────────────────────── */}
          <section className="card" style={{ padding: 24, marginBottom: 16 }}>
            <SectionHeader index={3} title="Your students" />
            <Field label="Approximate student strength" required>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STRENGTHS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => set('strength', s)}
                    className={`chip ${form.strength === s ? 'selected' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Subjects you teach"
              required
              helper={`Select at least one. ${form.saathis.length > 0 ? `${form.saathis.length} selected.` : ''}`}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SAATHIS.map((s) => {
                  const on = form.saathis.includes(s.id)
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSaathi(s.id)}
                      className={`chip ${on ? 'selected' : ''}`}
                      style={{ gap: 6 }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{s.emoji}</span>
                      <span>{s.name.replace(/Saathi$/, '')}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
          </section>

          {/* ── Section 4: Declaration ───────────────────────────────── */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <SectionHeader index={4} title="Declaration" />
            <CheckboxRow
              checked={form.declareInstitution}
              onChange={(v) => set('declareInstitution', v)}
              label="This is a registered educational institution."
            />
            <CheckboxRow
              checked={form.declareTrial}
              onChange={(v) => set('declareTrial', v)}
              label="I understand the 7-day free trial is fully featured with no credit card required."
            />
            <CheckboxRow
              checked={form.declareTerms}
              onChange={(v) => set('declareTerms', v)}
              label={<>I agree to EdUsaathiAI&apos;s <Link href="/terms" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Terms of Service</Link>.</>}
            />
          </section>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-std)',
                background: 'var(--error-bg)',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                fontSize: 13,
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!valid || submitting}
            className="btn btn-primary btn-large"
            style={{
              width:   '100%',
              padding: '16px 28px',
              fontSize: 16,
              fontWeight: 700,
              opacity: (!valid || submitting) ? 0.55 : 1,
              cursor:  (!valid || submitting) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : 'Request Free Trial →'}
          </button>

          <p style={{
            fontSize: 12, color: 'var(--text-tertiary)',
            textAlign: 'center', margin: '18px 0 0', lineHeight: 1.65,
          }}>
            We&apos;ll verify your institution within 48 hours.
            Questions? <a href="mailto:admin@edusaathiai.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>admin@edusaathiai.in</a>
          </p>
        </form>
      </div>
    </main>
  )
}

// ── Primitives ──────────────────────────────────────────────────────────────

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
      <span style={{
        fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
        color: 'var(--gold)', fontFamily: 'var(--font-mono)',
      }}>
        0{index}
      </span>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0, lineHeight: 1.3,
      }}>
        {title}
      </h2>
    </div>
  )
}

function Field({
  label, required, helper, children,
}: {
  label: string
  required?: boolean
  helper?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label" style={{ marginBottom: 6 }}>
        {label}
        {required && <span aria-hidden="true" style={{ color: 'var(--gold)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {helper && (
        <p style={{
          fontSize: 11, color: 'var(--text-tertiary)',
          margin: '6px 2px 0', lineHeight: 1.5,
        }}>
          {helper}
        </p>
      )}
    </div>
  )
}

function CheckboxRow({
  checked, onChange, label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 4px', cursor: 'pointer',
      borderRadius: 8, transition: 'background 0.15s ease',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        style={{
          width: 18, height: 18, marginTop: 2, flexShrink: 0,
          accentColor: 'var(--gold)', cursor: 'pointer',
        }}
      />
      <span style={{
        fontSize: 14, color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        {label}
      </span>
    </label>
  )
}
