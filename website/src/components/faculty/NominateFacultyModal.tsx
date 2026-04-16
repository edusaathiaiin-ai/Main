'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackFacultyNominated } from '@/lib/analytics'

const EXPERTISE_AREAS = [
  'Aerospace Engineering',
  'Agriculture',
  'Architecture',
  'Biotechnology',
  'Biology',
  'Business Management',
  'Chemical Engineering',
  'Chemistry',
  'Civil Engineering',
  'Commerce & Accounting',
  'Computer Science',
  'Economics',
  'Electrical Engineering',
  'Electronics Engineering',
  'Environmental Science',
  'Finance',
  'Geography',
  'History',
  'HR & Organisational Behaviour',
  'Law & Legal Studies',
  'Marketing',
  'Mathematics',
  'Mechanical Engineering',
  'Medicine & Healthcare',
  'Nursing',
  'Pharmacy',
  'Physics',
  'Political Science',
  'Psychology',
  'Statistics',
]

type Props = {
  isOpen: boolean
  onClose: () => void
  nominatorType: 'student' | 'faculty'
  nominatorId: string
  nominatorName: string
}

export default function NominateFacultyModal({
  isOpen,
  onClose,
  nominatorType,
  nominatorId,
  nominatorName,
}: Props) {
  const [form, setForm] = useState({
    faculty_name: '',
    faculty_email: '',
    faculty_phone: '',
    expertise_area: '',
    bio_note: '',
  })

  const [state, setState] = useState<
    'idle' | 'submitting' | 'success' | 'error' | 'cap_reached' | 'duplicate' | 'already_on_platform'
  >('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [existingFacultyName, setExistingFacultyName] = useState('')

  if (!isOpen) return null

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    // Basic validation
    if (!form.faculty_name.trim()) {
      setErrorMsg('Please enter the faculty name.')
      return
    }
    if (!form.faculty_email.trim() || !form.faculty_email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    if (!form.expertise_area) {
      setErrorMsg('Please select an area of expertise.')
      return
    }

    setState('submitting')
    setErrorMsg('')

    try {
      const supabase = createClient()

      // Check nomination cap (10 per student)
      if (nominatorType === 'student') {
        const { count } = await supabase
          .from('faculty_nominations')
          .select('*', { count: 'exact', head: true })
          .eq('nominated_by_user_id', nominatorId)
          .eq('counts_toward_cap', true)
          .neq('status', 'declined')

        if ((count ?? 0) >= 10) {
          setState('cap_reached')
          return
        }
      }

      // Check if faculty already on platform
      const { data: existingFaculty } = await supabase
        .rpc('check_faculty_email_exists', {
          check_email: form.faculty_email.trim().toLowerCase(),
        })
        .single() as { data: { exists_on_platform: boolean; display_name: string | null } | null }

      if (existingFaculty?.exists_on_platform) {
        setExistingFacultyName(existingFaculty.display_name ?? form.faculty_name)
        setState('already_on_platform')
        return
      }

      // Insert nomination
      const payload = {
        nominator_type: nominatorType,
        nominated_by_user_id: nominatorType === 'student' ? nominatorId : null,
        nominated_by_faculty_id: nominatorType === 'faculty' ? nominatorId : null,
        faculty_name: form.faculty_name.trim(),
        faculty_email: form.faculty_email.trim().toLowerCase(),
        faculty_phone: form.faculty_phone.trim() || null,
        expertise_area: form.expertise_area,
        bio_note: form.bio_note.trim() || null,
        status: 'invited',
      }

      const { data: inserted, error } = await supabase
        .from('faculty_nominations')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        // Duplicate email (unique index violation)
        if (error.code === '23505') {
          setState('duplicate')
          return
        }
        throw error
      }

      trackFacultyNominated(form.expertise_area, nominatorType, {
        has_phone: !!form.faculty_phone.trim(),
        has_bio: !!form.bio_note.trim(),
      })

      // Fire invitation email (fire-and-forget — don't block success)
      if (inserted?.id) {
        const { data: { session } } = await supabase.auth.getSession()
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-faculty-nomination`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            body: JSON.stringify({ nominationId: inserted.id }),
          },
        ).catch((e) => console.error('Nomination email error:', e))
      }

      setState('success')

    } catch (err) {
      console.error('Nomination error:', err)
      setState('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  // ── SUCCESS STATE ──────────────────────────────────────────
  if (state === 'success') {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🙏</div>
          <h2 style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontSize: '20px',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            Thank you, {nominatorName.split(' ')[0]}!
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            We will reach out to <strong>{form.faculty_name}</strong> shortly.
          </p>
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: '20px',
            borderLeft: '3px solid var(--saathi-primary)',
          }}>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              margin: 0,
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                One small request:
              </strong>{' '}
              Please let {form.faculty_name.split(' ')[0]} know personally that
              an invitation from{' '}
              <strong>edusaathiai.in</strong> is on its way. A familiar
              heads-up makes all the difference. 🙏
            </p>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            marginBottom: '20px',
          }}>
            We will notify you once they respond.
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'var(--saathi-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── CAP REACHED STATE ──────────────────────────────────────
  if (state === 'cap_reached') {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontSize: '20px',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            You have nominated 10 faculty members
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
          }}>
            That is the maximum. Thank you for building
            EdUsaathiAI's teacher network. You are one of our
            most valued contributors. 🙏
          </p>
          <button onClick={onClose} style={{
            marginTop: '20px',
            background: 'var(--saathi-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── DUPLICATE STATE ────────────────────────────────────────
  if (state === 'duplicate') {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>ℹ️</div>
          <h2 style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontSize: '20px',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            Already nominated
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
          }}>
            <strong>{form.faculty_email}</strong> has already been
            nominated. We will follow up with them shortly.
          </p>
          <button onClick={onClose} style={{
            marginTop: '20px',
            background: 'var(--saathi-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── ALREADY ON PLATFORM STATE ───────────────────────────────
  if (state === 'already_on_platform') {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎓</div>
          <h2 style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontSize: '20px',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            Already on EdUsaathiAI!
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            <strong>{existingFacultyName}</strong> is already a
            verified faculty member on EdUsaathiAI. 🙏
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            You can book a session with them directly
            through the Faculty Finder.
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'var(--saathi-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Find them in Faculty Finder →
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── MAIN FORM ──────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontSize: '20px',
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}>
          Suggest a Faculty or Professional
        </h2>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
        }}>
          You know great people. Help us find them.
          {nominatorType === 'student' && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              {' '}You can nominate up to 10 faculty members.
            </span>
          )}
        </p>
      </div>

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Full Name */}
        <Field label="Full Name *">
          <input
            name="faculty_name"
            value={form.faculty_name}
            onChange={handleChange}
            placeholder="Dr. Rajesh Sinha"
            maxLength={100}
          />
        </Field>

        {/* Email */}
        <Field label="Email Address *">
          <input
            name="faculty_email"
            type="email"
            value={form.faculty_email}
            onChange={handleChange}
            placeholder="rajesh.sinha@university.ac.in"
          />
        </Field>

        {/* Expertise */}
        <Field label="Area of Expertise *">
          <select
            name="expertise_area"
            value={form.expertise_area}
            onChange={handleChange}
          >
            <option value="">Select subject area...</option>
            {EXPERTISE_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </Field>

        {/* Bio */}
        <Field label="Brief Bio (what you know about them)">
          <textarea
            name="bio_note"
            value={form.bio_note}
            onChange={handleChange}
            placeholder={
              'e.g. "Mr. Sinha is currently HOD, Biology at VNSGU Surat. ' +
              'I attended his lectures for 2 years and he explains concepts ' +
              'with remarkable clarity."'
            }
            rows={3}
            maxLength={500}
            style={{ resize: 'vertical', minHeight: '72px' }}
          />
          <span style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            textAlign: 'right',
            display: 'block',
            marginTop: '2px',
          }}>
            {form.bio_note.length}/500
          </span>
        </Field>

        {/* Phone — optional */}
        <Field label="Phone / WhatsApp (optional)">
          <input
            name="faculty_phone"
            value={form.faculty_phone}
            onChange={handleChange}
            placeholder="+91 98XXX XXXXX"
            maxLength={20}
          />
          <span style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            marginTop: '2px',
            display: 'block',
          }}>
            If provided, we may send a WhatsApp invitation
            after admin review.
          </span>
        </Field>

      </div>

      {/* Error */}
      {errorMsg && (
        <p style={{
          color: 'var(--error, #EF4444)',
          fontSize: '13px',
          marginTop: '12px',
        }}>
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={state === 'submitting'}
        style={{
          marginTop: '20px',
          width: '100%',
          background: state === 'submitting'
            ? 'var(--bg-elevated)'
            : 'var(--saathi-primary)',
          color: state === 'submitting'
            ? 'var(--text-tertiary)'
            : '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '13px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {state === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </ModalShell>
  )
}

// ── SHARED SHELL ───────────────────────────────────────────────

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="nominate-modal"
        style={{
          background: 'var(--bg-base)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <style>{`
          .nominate-modal input,
          .nominate-modal select,
          .nominate-modal textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            background: var(--bg-elevated);
            color: var(--text-primary);
            font-size: 14px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            outline: none;
            box-sizing: border-box;
          }
          .nominate-modal input:focus,
          .nominate-modal select:focus,
          .nominate-modal textarea:focus {
            border-color: var(--saathi-primary);
          }
        `}</style>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--bg-elevated)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

// ── FIELD WRAPPER ──────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

