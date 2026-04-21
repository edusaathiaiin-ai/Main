'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const TITLES = ['Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.']
const EMPLOYMENT_STATUSES = ['Active Faculty', 'Retired', 'Independent Professional', 'Industry Expert']
const TEACHING_STYLES = ['Conceptual', 'Problem-solving', 'Case-based', 'Socratic', 'Visual', 'Research-oriented']
const SESSION_FORMATS = ['1:1 sessions', 'Group lectures', 'Workshop', 'Q&A only']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOTS = ['Morning (6-10am)', 'Afternoon (12-4pm)', 'Evening (5-8pm)', 'Night (8-10pm)']

type FacultyData = {
  title: string | null
  institution_name: string | null
  department: string | null
  designation: string | null
  subject_expertise: string[]
  speciality_areas: string[]
  years_experience: number | null
  employment_status: string | null
  teaching_style: string[]
  session_format_prefs: string[]
  current_research: string | null
  publications: string | null
  linkedin_url: string | null
  google_scholar_url: string | null
  payout_upi_id: string | null
  available_days: string[]
  available_slots: string[]
  session_fee_doubt: number | null
  bio: string | null
  why_edusaathiai: string | null
}

function ChipSelect({ options, selected, onChange, max }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; max?: number
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (isSelected) onChange(selected.filter(s => s !== opt))
              else if (!max || selected.length < max) onChange([...selected, opt])
            }}
            className="chip"
            data-selected={isSelected}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function getFacultyProfileCompleteness(d: FacultyData): number {
  const weights: [boolean, number][] = [
    [!!d.institution_name,                15],
    [!!d.subject_expertise?.length,       20],
    [!!d.years_experience,                10],
    [!!d.bio,                             15],
    [!!d.payout_upi_id,                   10],
    [!!d.session_fee_doubt,               10],
    [!!d.teaching_style?.length,           5],
    [!!d.linkedin_url,                     5],
    [!!d.google_scholar_url,               5],
    [!!d.designation,                      5],
  ]
  return weights.reduce((sum, [ok, w]) => sum + (ok ? w : 0), 0)
}

export function FacultyProfileTab() {
  const { profile } = useAuthStore()
  const [data, setData] = useState<FacultyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    async function load() {
      const { data: fp } = await supabase
        .from('faculty_profiles')
        .select('title, institution_name, department, designation, subject_expertise, speciality_areas, years_experience, employment_status, teaching_style, session_format_prefs, current_research, publications, linkedin_url, google_scholar_url, payout_upi_id, available_days, available_slots, session_fee_doubt, bio, why_edusaathiai')
        .eq('user_id', profile!.id)
        .maybeSingle()
      setData(fp as FacultyData | null)
      setLoading(false)
    }
    load()
  }, [profile])

  async function handleSave() {
    if (!profile || !data) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('faculty_profiles').update({
      title: data.title,
      institution_name: data.institution_name,
      department: data.department,
      designation: data.designation,
      subject_expertise: data.subject_expertise,
      speciality_areas: data.speciality_areas,
      years_experience: data.years_experience,
      employment_status: data.employment_status,
      teaching_style: data.teaching_style,
      session_format_prefs: data.session_format_prefs,
      current_research: data.current_research,
      publications: data.publications,
      linkedin_url: data.linkedin_url,
      google_scholar_url: data.google_scholar_url,
      payout_upi_id: data.payout_upi_id,
      available_days: data.available_days,
      available_slots: data.available_slots,
      session_fee_doubt: data.session_fee_doubt,
      bio: data.bio,
      why_edusaathiai: data.why_edusaathiai,
    }).eq('user_id', profile.id)

    // Also update full_name on profiles if changed
    if (profile.full_name !== data.title) {
      await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', profile.id)
    }

    setSaving(false)
    setToast('Profile saved!')
    setTimeout(() => setToast(''), 3000)
  }

  function update<K extends keyof FacultyData>(key: K, value: FacultyData[K]) {
    setData(prev => prev ? { ...prev, [key]: value } : prev)
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--saathi-primary)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {toast && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: '14px', fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* ── Profile completeness ── */}
      {(() => {
        const pct = getFacultyProfileCompleteness(data)
        return (
          <div style={{
            padding: '16px 20px', borderRadius: '12px',
            background: pct >= 80 ? 'var(--success-bg)' : 'var(--bg-elevated)',
            border: `1px solid ${pct >= 80 ? 'var(--success)' : 'var(--border-subtle)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Your profile is {pct}% complete
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: pct >= 80 ? 'var(--success)' : 'var(--saathi-primary)' }}>
                {pct}/100
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', transition: 'width 0.3s ease',
                width: `${pct}%`,
                background: pct >= 80 ? 'var(--success)' : 'var(--saathi-primary)',
              }} />
            </div>
            {pct < 80 && (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                Complete your profile to build trust with students. Add {!data.bio ? 'a bio' : !data.payout_upi_id ? 'UPI ID' : !data.linkedin_url ? 'LinkedIn' : 'missing fields'} to increase visibility.
              </p>
            )}
          </div>
        )
      })()}

      {/* ── Section 1: Professional Identity ── */}
      <Section title="Professional Identity">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Title">
            <select value={data.title ?? ''} onChange={e => update('title', e.target.value || null)}>
              <option value="">Select title</option>
              {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Full Name">
            <input value={profile?.full_name ?? ''} disabled style={{ opacity: 0.6 }} />
          </Field>
          <Field label="Institution / Organisation">
            <input value={data.institution_name ?? ''} onChange={e => update('institution_name', e.target.value)} placeholder="e.g. Gujarat University" />
          </Field>
          <Field label="Department">
            <input value={data.department ?? ''} onChange={e => update('department', e.target.value)} placeholder="e.g. Department of Biology" />
          </Field>
          <Field label="Designation">
            <input value={data.designation ?? ''} onChange={e => update('designation', e.target.value)} placeholder="e.g. Associate Professor, Senior Advocate" />
          </Field>
          <Field label="Years of Experience">
            <input type="number" value={data.years_experience ?? ''} onChange={e => update('years_experience', parseInt(e.target.value) || null)} placeholder="e.g. 12" />
          </Field>
        </div>
        <Field label="Employment Status" style={{ marginTop: '16px' }}>
          <ChipSelect options={EMPLOYMENT_STATUSES} selected={data.employment_status ? [data.employment_status] : []} onChange={v => update('employment_status', v[v.length - 1] ?? null)} max={1} />
        </Field>
      </Section>

      {/* ── Section 2: What You Teach ── */}
      <Section title="What You Teach">
        <Field label="Teaching Style">
          <ChipSelect options={TEACHING_STYLES} selected={data.teaching_style ?? []} onChange={v => update('teaching_style', v)} />
        </Field>
        <Field label="Preferred Session Format" style={{ marginTop: '16px' }}>
          <ChipSelect options={SESSION_FORMATS} selected={data.session_format_prefs ?? []} onChange={v => update('session_format_prefs', v)} />
        </Field>
      </Section>

      {/* ── Section 3: Research & Expertise ── */}
      <Section title="Research & Expertise">
        <Field label="Areas of Specialisation">
          <input value={(data.speciality_areas ?? []).join(', ')} onChange={e => update('speciality_areas', e.target.value.split(',').map(s => s.trim()).filter(Boolean) as string[])} placeholder="e.g. Constitutional Law, Criminal Procedure" />
        </Field>
        <Field label="Current Research / Work" style={{ marginTop: '16px' }}>
          <textarea value={data.current_research ?? ''} onChange={e => update('current_research', e.target.value)} placeholder="What are you currently working on or researching?" />
        </Field>
        <Field label="Notable Publications or Work" style={{ marginTop: '16px' }}>
          <textarea value={data.publications ?? ''} onChange={e => update('publications', e.target.value)} placeholder="Books, papers, cases, projects..." />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2" style={{ marginTop: '16px' }}>
          <Field label="LinkedIn Profile">
            <input type="url" value={data.linkedin_url ?? ''} onChange={e => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="Google Scholar / Portfolio">
            <input type="url" value={data.google_scholar_url ?? ''} onChange={e => update('google_scholar_url', e.target.value)} placeholder="https://scholar.google.com/..." />
          </Field>
        </div>
      </Section>

      {/* ── Section 4: Availability ── */}
      <Section title="Session Availability">
        <Field label="Session Fee (₹ per hour)">
          <input type="number" value={data.session_fee_doubt ?? ''} onChange={e => update('session_fee_doubt', parseInt(e.target.value) || null)} placeholder="e.g. 500" />
        </Field>
        <Field label="Payout UPI ID" style={{ marginTop: '16px' }}>
          <input value={data.payout_upi_id ?? ''} onChange={e => update('payout_upi_id', e.target.value)} placeholder="yourname@upi" />
        </Field>
        <Field label="Available Days" style={{ marginTop: '16px' }}>
          <ChipSelect options={DAYS} selected={data.available_days ?? []} onChange={v => update('available_days', v)} />
        </Field>
        <Field label="Preferred Time Slots" style={{ marginTop: '16px' }}>
          <ChipSelect options={SLOTS} selected={data.available_slots ?? []} onChange={v => update('available_slots', v)} />
        </Field>
      </Section>

      {/* ── Section 5: Your Story ── */}
      <Section title="Your Story">
        <Field label="Short Bio">
          <textarea value={data.bio ?? ''} onChange={e => update('bio', e.target.value)} placeholder="Tell students about yourself — your journey, expertise, and teaching philosophy. (Max 300 words)" style={{ minHeight: '140px' }} />
        </Field>
        <Field label="Why EdUsaathiAI?" style={{ marginTop: '16px' }}>
          <textarea value={data.why_edusaathiai ?? ''} onChange={e => update('why_edusaathiai', e.target.value)} placeholder="Why did you join EdUsaathiAI? What do you hope to give students?" />
        </Field>
      </Section>

      {/* Save button */}
      <div style={{ position: 'sticky', bottom: '16px', zIndex: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary btn-large"
          style={{ width: '100%' }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '20px' }}>{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
