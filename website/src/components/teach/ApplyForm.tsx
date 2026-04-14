'use client'

/**
 * /teach Section 6 — faculty application form.
 *
 * Posts to /api/faculty-apply. Dark theme matching the rest of /teach.
 * All validation mirrors the server-side rules in the API route; client
 * validation is UX polish only — server is the source of truth.
 */

import { useMemo, useState } from 'react'
import { SAATHIS } from '@/constants/saathis'

const GOLD       = '#C9993A'
const GOLD_LIGHT = '#E5B86A'
const TEXT_HIGH  = '#FFFFFF'
const TEXT_MID   = 'rgba(255, 255, 255, 0.60)'
const TEXT_LOW   = 'rgba(255, 255, 255, 0.40)'
const TEXT_GHOST = 'rgba(255, 255, 255, 0.30)'
const FIELD_BG   = 'rgba(255, 255, 255, 0.04)'
const FIELD_BRD  = 'rgba(255, 255, 255, 0.10)'

type FormState = {
  full_name:               string
  email:                   string
  wa_phone:                string
  primary_saathi_slug:     string
  additional_saathi_slugs: string[]
  highest_qualification:   string
  current_institution:     string
  years_experience:        string
  session_fee_rupees:      string
  short_bio:               string
  linkedin_url:            string
  areas_of_expertise:      string
}

const INITIAL: FormState = {
  full_name:               '',
  email:                   '',
  wa_phone:                '',
  primary_saathi_slug:     '',
  additional_saathi_slugs: [],
  highest_qualification:   '',
  current_institution:     '',
  years_experience:        '',
  session_fee_rupees:      '',
  short_bio:               '',
  linkedin_url:            '',
  areas_of_expertise:      '',
}

// Styles — extracted so every field renders identically
const labelStyle: React.CSSProperties = {
  display:        'block',
  fontSize:       '12px',
  fontWeight:     600,
  letterSpacing:  '0.02em',
  color:          TEXT_MID,
  marginBottom:   '8px',
  textTransform:  'uppercase',
}

const fieldStyle: React.CSSProperties = {
  width:          '100%',
  background:     FIELD_BG,
  border:         `1px solid ${FIELD_BRD}`,
  borderRadius:   '10px',
  padding:        '12px 14px',
  color:          TEXT_HIGH,
  fontSize:       '14.5px',
  fontFamily:     'inherit',
  outline:        'none',
  transition:     'border-color 0.15s',
}

const hintStyle: React.CSSProperties = {
  fontSize:    '11.5px',
  color:       TEXT_LOW,
  marginTop:   '6px',
  lineHeight:  1.5,
}

export function ApplyForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Sort SAATHIS alphabetically for dropdown — easier scan than categorical
  const sortedSaathis = useMemo(
    () => [...SAATHIS].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (error) setError(null)
  }

  function toggleAdditional(slug: string) {
    setForm((f) => {
      const set = new Set(f.additional_saathi_slugs)
      if (set.has(slug)) set.delete(slug)
      else              set.add(slug)
      // Can't be same as primary
      if (slug === f.primary_saathi_slug) set.delete(slug)
      return { ...f, additional_saathi_slugs: Array.from(set) }
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/faculty-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          years_experience:  form.years_experience,
          session_fee_rupees: form.session_fee_rupees,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────
  if (done) {
    return (
      <div
        style={{
          background:   'rgba(201, 153, 58, 0.06)',
          border:       `1px solid ${GOLD}55`,
          borderRadius: '20px',
          padding:      '48px 36px',
          textAlign:    'center',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>✦</div>
        <h3
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      '24px',
            fontWeight:    500,
            marginBottom:  '12px',
          }}
        >
          Application received
        </h3>
        <p style={{ color: TEXT_MID, fontSize: '15px', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto' }}>
          Thank you. We&rsquo;ll review every detail personally and get
          back to you on <span style={{ color: GOLD_LIGHT }}>WhatsApp and email within 48 hours</span>.
        </p>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={onSubmit}
      style={{
        background:   'rgba(255, 255, 255, 0.02)',
        border:       `1px solid ${FIELD_BRD}`,
        borderRadius: '20px',
        padding:      '40px 32px',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        {/* Full name */}
        <Field label="Full name" required>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            style={fieldStyle}
            placeholder="As you'd like students to see it"
          />
        </Field>

        {/* Email */}
        <Field label="Email" required>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            style={fieldStyle}
            placeholder="you@institution.ac.in"
          />
        </Field>

        {/* WhatsApp */}
        <Field label="WhatsApp number" required>
          <input
            type="tel"
            required
            value={form.wa_phone}
            onChange={(e) => update('wa_phone', e.target.value)}
            style={fieldStyle}
            placeholder="+91 98255 12345"
          />
          <p style={hintStyle}>
            Required for session notifications. Never shared with students.
          </p>
        </Field>

        {/* Primary subject */}
        <Field label="Primary subject" required>
          <select
            required
            value={form.primary_saathi_slug}
            onChange={(e) => update('primary_saathi_slug', e.target.value)}
            style={{ ...fieldStyle, appearance: 'none', background: FIELD_BG + ' url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path fill="%23C9993A" d="M6 8L0 0h12z"/></svg>\') no-repeat right 14px center' }}
          >
            <option value="" disabled>Select your primary subject</option>
            {sortedSaathis.map((s) => (
              <option key={s.id} value={s.id} style={{ background: '#0F1923', color: '#fff' }}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Highest qualification */}
        <Field label="Highest qualification" required>
          <input
            type="text"
            required
            value={form.highest_qualification}
            onChange={(e) => update('highest_qualification', e.target.value)}
            style={fieldStyle}
            placeholder="e.g. PhD Chemistry (IIT Bombay)"
          />
        </Field>

        {/* Current institution */}
        <Field label="Current institution / organisation">
          <input
            type="text"
            value={form.current_institution}
            onChange={(e) => update('current_institution', e.target.value)}
            style={fieldStyle}
            placeholder="Optional"
          />
        </Field>

        {/* Years of experience */}
        <Field label="Years of experience" required>
          <input
            type="number"
            min={0}
            max={70}
            required
            value={form.years_experience}
            onChange={(e) => update('years_experience', e.target.value)}
            style={fieldStyle}
            placeholder="e.g. 12"
          />
        </Field>

        {/* Session fee */}
        <Field label="Session fee per hour (₹)" required>
          <input
            type="number"
            min={100}
            max={10000}
            step={50}
            required
            value={form.session_fee_rupees}
            onChange={(e) => update('session_fee_rupees', e.target.value)}
            style={fieldStyle}
            placeholder="e.g. 800"
          />
          <p style={hintStyle}>
            Suggested range: ₹300 &ndash; ₹2,000. You can change this later.
          </p>
        </Field>

        {/* LinkedIn */}
        <Field label="LinkedIn profile URL">
          <input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => update('linkedin_url', e.target.value)}
            style={fieldStyle}
            placeholder="https://linkedin.com/in/…  (optional)"
          />
        </Field>

        {/* Additional subjects — full width */}
        <div className="md:col-span-2">
          <Field label="Additional subjects (optional)">
            <p style={{ ...hintStyle, marginTop: 0, marginBottom: '12px' }}>
              Tick up to a few more subjects you&rsquo;re comfortable teaching.
            </p>
            <div className="flex flex-wrap gap-2">
              {sortedSaathis.map((s) => {
                const isPrimary = s.id === form.primary_saathi_slug
                const isChecked = form.additional_saathi_slugs.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isPrimary}
                    onClick={() => toggleAdditional(s.id)}
                    className="transition-all"
                    style={{
                      background: isChecked
                        ? 'rgba(201, 153, 58, 0.18)'
                        : FIELD_BG,
                      border: isChecked
                        ? `1px solid ${GOLD}`
                        : `1px solid ${FIELD_BRD}`,
                      color:      isPrimary
                                    ? TEXT_GHOST
                                    : isChecked ? GOLD_LIGHT : TEXT_MID,
                      borderRadius:'999px',
                      padding:    '6px 12px',
                      fontSize:   '12.5px',
                      fontWeight: 500,
                      cursor:     isPrimary ? 'not-allowed' : 'pointer',
                      opacity:    isPrimary ? 0.35 : 1,
                    }}
                  >
                    {s.emoji} {s.name}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {/* Short bio — full width */}
        <div className="md:col-span-2">
          <Field label="Short bio" required>
            <textarea
              required
              rows={3}
              maxLength={400}
              value={form.short_bio}
              onChange={(e) => update('short_bio', e.target.value)}
              style={{ ...fieldStyle, resize: 'vertical', minHeight: '90px' }}
              placeholder="What can you help a student with?"
            />
            <p style={hintStyle}>
              {form.short_bio.length}/400 characters.
              The first sentence is what students see on Faculty Finder.
            </p>
          </Field>
        </div>

        {/* Areas of expertise — full width */}
        <div className="md:col-span-2">
          <Field label="Areas of expertise beyond your primary subject">
            <textarea
              rows={2}
              maxLength={300}
              value={form.areas_of_expertise}
              onChange={(e) => update('areas_of_expertise', e.target.value)}
              style={{ ...fieldStyle, resize: 'vertical', minHeight: '70px' }}
              placeholder="e.g. Patent filing, Drug delivery systems, IPR, Startup advisory"
            />
            <p style={hintStyle}>
              {form.areas_of_expertise.length}/300 characters.
              This is what makes your profile interesting &mdash; the crossover.
            </p>
          </Field>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            marginTop:    '24px',
            padding:      '12px 16px',
            background:   'rgba(239, 68, 68, 0.08)',
            border:       '1px solid rgba(239, 68, 68, 0.30)',
            borderRadius: '10px',
            color:        '#FCA5A5',
            fontSize:     '13.5px',
            lineHeight:   1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: '32px' }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background:   GOLD,
            color:        '#0F1923',
            padding:      '16px 32px',
            borderRadius: '14px',
            fontSize:     '15px',
            fontWeight:   700,
            border:       'none',
            cursor:       submitting ? 'not-allowed' : 'pointer',
            opacity:      submitting ? 0.6 : 1,
            boxShadow:    '0 10px 30px rgba(201,153,58,0.20)',
            transition:   'all 0.2s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit application →'}
        </button>
      </div>

      <p
        style={{
          marginTop:    '20px',
          fontSize:     '12.5px',
          color:        TEXT_GHOST,
          lineHeight:   1.6,
        }}
      >
        We review every application personally.<br />
        You&rsquo;ll hear from us within 48 hours on WhatsApp and email.
      </p>
    </form>
  )
}

// Small helper so each field renders consistently
function Field({
  label,
  required,
  children,
}: {
  label:    string
  required?:boolean
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>
        {label}
        {required && <span style={{ color: GOLD, marginLeft: '4px' }}>*</span>}
      </span>
      {children}
    </label>
  )
}
