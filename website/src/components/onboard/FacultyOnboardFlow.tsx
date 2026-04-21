'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toVerticalUuid } from '@/constants/verticalIds'
import { validateFacultyEmail } from '@/lib/faculty-email-validation'
import { validateDisplayName } from '@/lib/validation/nameValidation'
import CollegeAutocomplete from '@/components/ui/CollegeAutocomplete'

// ─── Types ────────────────────────────────────────────────────────────────────

type EmploymentStatus = 'active' | 'retired' | 'independent' | 'professional'

type Affiliation = {
  id:   string
  org:  string
  role: string
  year: string
}

type FacultyFormData = {
  // Identity
  fullName:              string
  city:                  string
  employment:            EmploymentStatus
  // Active
  institution:           string
  designation:           string
  department:            string
  qualification:         string
  yearsTeaching:         string
  // Retired
  formerInstitution:     string
  retirementYear:        string
  // Independent
  credentials:           string
  independentFirm:       string
  independentLinkedin:   string
  independentScholar:    string
  // Resume
  resumeFile:            File | null
  resumeUrl:             string
  // Shared
  specialities:          string[]
  researchArea:          string
  linkedin:              string
  googleScholar:         string
  // Affiliations
  affiliations:          Affiliation[]
  // Saathis
  primarySaathiSlug:     string
  additionalSaathiSlugs: string[]
  // Agreement
  agreedTerms:           boolean
  agreedEarnings:        boolean
  agreedContent:         boolean
  agreedDPDP:            boolean
}

type Step = 'employment' | 'profile' | 'affiliations' | 'saathi' | 'invitation' | 'agreement'

type Props = {
  profile:    { id: string; role: string | null }
  onComplete: () => void
}

// ─── Department → Saathi auto-suggestion ─────────────────────────────────────

const DEPT_SAATHI_MAP: Array<[string[], string]> = [
  [['physics', 'astrophysics', 'optics', 'quantum'], 'physicsaathi'],
  [['math', 'maths', 'mathematics', 'statistics', 'stat'], 'maathsaathi'],
  [['chemistry', 'biochemistry', 'organic', 'inorganic'], 'chemsaathi'],
  [['biology', 'botany', 'zoology', 'life science', 'microbiology'], 'biosaathi'],
  [['computer', 'cs', 'cse', 'it', 'information technology', 'software'], 'compsaathi'],
  [['electrical', 'power', 'energy systems'], 'elecsaathi'],
  [['electronics', 'vlsi', 'signal', 'communication'], 'electronicssaathi'],
  [['mechanical', 'thermal', 'manufacturing', 'automobile'], 'mechsaathi'],
  [['civil', 'structural', 'construction', 'geotechnical'], 'civilsaathi'],
  [['chemical engineering', 'process', 'petroleum'], 'chemengg-saathi'],
  [['aerospace', 'aeronautical', 'avionics'], 'aerospacesaathi'],
  [['biotech', 'biotechnology', 'genetic', 'bioinformatics'], 'biotechsaathi'],
  [['environmental', 'ecology', 'climate', 'sustainability'], 'envirosaathi'],
  [['law', 'legal', 'jurisprudence', 'llb', 'llm', 'constitutional'], 'kanoonsaathi'],
  [['history', 'archaeology', 'heritage', 'ancient'], 'historysaathi'],
  [['political science', 'political', 'public administration', 'governance'], 'polscisaathi'],
  [['economics', 'econometrics', 'development economics'], 'econsaathi'],
  [['accounting', 'accountancy', 'financial accounting', 'cost'], 'accountsaathi'],
  [['finance', 'banking', 'investment', 'capital markets'], 'finsaathi'],
  [['management', 'business', 'mba', 'strategy', 'operations'], 'bizsaathi'],
  [['marketing', 'brand', 'consumer behaviour', 'advertising'], 'mktsaathi'],
  [['hr', 'human resource', 'organisational', 'organizational behaviour'], 'hrsaathi'],
  [['psychology', 'cognitive', 'clinical psychology', 'counselling'], 'psychsaathi'],
  [['architecture', 'urban', 'design', 'planning'], 'archsaathi'],
  [['geography', 'cartography', 'geopolitics', 'gis'], 'geosaathi'],
  [['agriculture', 'agronomy', 'horticulture', 'soil science', 'crop'], 'agrisaathi'],
  [['pharmacy', 'pharmacology', 'drug', 'pharmaceutical'], 'pharmasaathi'],
  [['medicine', 'mbbs', 'clinical', 'anatomy', 'physiology', 'pathology'], 'medicosaathi'],
  [['nursing', 'gnm', 'anm', 'midwifery', 'community health'], 'nursingsaathi'],
  [['statistics', 'data science', 'probability', 'biostatistics'], 'statssaathi'],
]

function suggestSaathi(department: string): string {
  const d = department.toLowerCase()
  for (const [keywords, slug] of DEPT_SAATHI_MAP) {
    if (keywords.some((k) => d.includes(k))) return slug
  }
  return ''
}

const PERSONAL_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'ymail.com']
function isPersonalEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return PERSONAL_EMAIL_DOMAINS.includes(domain)
}

// ─── Shared tokens ────────────────────────────────────────────────────────────

const GREEN   = '#4ADE80'
const GOLD    = '#C9993A'
const NAVY    = '#060F1D'
const CARD_BG = 'rgba(255,255,255,0.04)'
const BORDER  = '0.5px solid rgba(255,255,255,0.08)'

const inp = {
  background:   'rgba(255,255,255,0.05)',
  border:       '0.5px solid rgba(255,255,255,0.1)',
  color:        '#fff',
  borderRadius: '12px',
  padding:      '12px 16px',
  fontSize:     '16px',
  width:        '100%',
  outline:      'none',
  fontFamily:   'DM Sans, sans-serif',
} as const

const CITIES = [
  'Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Pune', 'Kolkata', 'Jaipur', 'Surat', 'Vadodara', 'Rajkot', 'Nagpur',
  'Lucknow', 'Bhopal', 'Indore', 'Chandigarh', 'Kochi', 'Other',
]

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: Step[]    = ['employment', 'profile', 'affiliations', 'saathi', 'invitation', 'agreement']
const STEP_LABELS      = ['You', 'Profile', 'Standing', 'Saathis', 'How it works', 'Begin']

function StepDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.div
              animate={{
                background:  i < idx ? GOLD : i === idx ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.06)',
                borderColor: i <= idx ? GOLD : 'rgba(255,255,255,0.1)',
                color:       i < idx ? NAVY : i === idx ? GOLD : 'rgba(255,255,255,0.2)',
              }}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: '1.5px solid', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
              }}
            >
              {i < idx ? '✓' : i + 1}
            </motion.div>
            <span style={{
              fontSize: '9px', letterSpacing: '0.04em',
              color: i === idx ? GOLD : 'rgba(255,255,255,0.2)',
            }}>
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <motion.div
              animate={{ background: i < idx ? GOLD : 'rgba(255,255,255,0.08)' }}
              style={{ width: '24px', height: '1px', marginBottom: '12px' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Employment status ────────────────────────────────────────────────

function EmploymentStep({
  value,
  onChange,
  onNext,
}: {
  value:    EmploymentStatus
  onChange: (v: EmploymentStatus) => void
  onNext:   () => void
}) {
  const options = [
    {
      id:    'active' as const,
      emoji: '📚',
      title: 'Currently teaching',
      desc:  'Active at a university, college, or institution',
      color: GREEN,
    },
    {
      id:    'retired' as const,
      emoji: '✦',
      title: 'Retired faculty',
      desc:  'Decades of wisdom, ready to teach again — on your own terms',
      color: GOLD,
    },
    {
      id:    'independent' as const,
      emoji: '🌐',
      title: 'Independent professional',
      desc:  'Practitioner, consultant, or researcher outside an institution',
      color: '#60A5FA',
    },
    {
      id:    'professional' as const,
      emoji: '💼',
      title: 'Working professional',
      desc:  'Industry expert, corporate trainer, or domain specialist with hands-on field experience',
      color: '#A78BFA',
    },
  ]

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '40px' }}
      >
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 900, color: '#fff',
          lineHeight: 1.1, margin: '0 0 12px',
        }}>
          Welcome, Professor.
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          EdUsaathiAI partners with faculty to reach students who need you.
          <br />Tell us where you teach from.
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {options.map((opt, i) => {
          const active = value === opt.id
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }}
              onClick={() => onChange(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '20px',
                padding: '20px 24px', borderRadius: '16px', textAlign: 'left',
                background: active ? `${opt.color}12` : CARD_BG,
                border: active ? `1.5px solid ${opt.color}60` : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                boxShadow: active ? `0 0 32px ${opt.color}15` : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '32px', flexShrink: 0 }}>{opt.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '15px', fontWeight: 700,
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                  margin: '0 0 3px',
                  fontFamily: 'Playfair Display, serif',
                }}>
                  {opt.title}
                </p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {opt.desc}
                </p>
              </div>
              {active && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: opt.color, color: NAVY,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, flexShrink: 0,
                  }}
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {value === 'retired' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            padding: '16px 20px', borderRadius: '12px', marginBottom: '24px',
            background: 'rgba(201,153,58,0.08)',
            border: '0.5px solid rgba(201,153,58,0.25)',
          }}
        >
          <p style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: '#C9993A', margin: '0 0 10px' }}>
            Your role is not to explain the subject.
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', margin: '0 0 10px', lineHeight: 1.7 }}>
            Your role is to show students what it opens.
            The Saathi handles the curriculum. You handle the possibility.
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
            ✦ No institutional email needed. Your career speaks for itself.
            We verify retired faculty via a retirement letter, pension slip, or
            appointment letter — uploaded after you complete this form.
            Our team reviews within 48 hours.
          </p>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        style={{
          width: '100%', padding: '16px', borderRadius: '14px',
          background: GOLD, color: NAVY,
          fontSize: '15px', fontWeight: 700,
          border: 'none', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Continue as{' '}
        {value === 'active'
          ? 'teaching faculty'
          : value === 'retired'
            ? 'retired professor'
            : value === 'professional'
              ? 'working professional'
              : 'independent professional'} →
      </motion.button>
    </div>
  )
}

// ─── Step 2: Professional profile ────────────────────────────────────────────

function ProfileStep({
  form, set, onNext, onBack, userEmail,
}: {
  form:      FacultyFormData
  set:       (k: keyof FacultyFormData, v: unknown) => void
  onNext:    () => void
  onBack:    () => void
  userEmail: string
}) {
  const [tagInput,    setTagInput]    = useState('')
  const [error,       setError]       = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  const isActive        = form.employment === 'active'
  const isRetired       = form.employment === 'retired'
  const isIndependent   = form.employment === 'independent'
  const isPersonalEmail = isPersonalEmailDomain(userEmail)
  const linkedinValue   = (isIndependent ? form.independentLinkedin : form.linkedin).trim()

  const nameTyped = form.fullName.trim().length > 0
  const { valid: nameValid, error: nameValidationError } = nameTyped
    ? validateDisplayName(form.fullName)
    : { valid: false, error: null }
  const showNameError = nameTouched && nameTyped && !nameValid
  const showNameValid = nameTouched && nameValid
  const nameFieldBorderColor = showNameError
    ? 'rgba(239,68,68,0.6)'
    : showNameValid
      ? 'rgba(74,222,128,0.5)'
      : 'rgba(255,255,255,0.1)'

  function validate() {
    const nameCheck = validateDisplayName(form.fullName)
    if (!nameCheck.valid)                              return nameCheck.error ?? 'Please enter your full name'
    if (!form.city)                                    return 'Please select your city'
    if (isActive && !form.institution.trim())          return 'Please enter your institution'
    if (isActive && !form.designation)                 return 'Please select your designation'
    if (isActive && !form.department.trim())           return 'Please enter your department'
    if (isRetired && !form.formerInstitution.trim())   return 'Please enter your former institution'
    if (isIndependent && !form.credentials.trim())     return 'Please describe your credentials'
    if (isPersonalEmail && !linkedinValue)             return 'LinkedIn URL is required when using a personal email address'
    return ''
  }

  function handleNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (!form.primarySaathiSlug && form.department) {
      const suggested = suggestSaathi(form.department)
      if (suggested) set('primarySaathiSlug', suggested)
    }
    onNext()
  }

  function addTag(val: string) {
    const trimmed = val.trim()
    if (!trimmed || form.specialities.length >= 6) return
    if (!form.specialities.includes(trimmed)) {
      set('specialities', [...form.specialities, trimmed])
    }
    setTagInput('')
  }

  const Label = ({ children }: { children: ReactNode }) => (
    <label style={{
      display: 'block', marginBottom: '6px',
      fontSize: '13px', fontWeight: 600,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.35)',
    }}>
      {children}
    </label>
  )

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800, color: '#fff', margin: '0 0 8px',
        }}>
          Your professional profile
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Students see this when they find you on Faculty Finder. Make it yours.
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Name + City */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <Label>Full name *</Label>
            <div style={{ position: 'relative' }}>
              <input
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="Prof. Jayant Narlikar"
                style={{ ...inp, borderColor: nameFieldBorderColor, paddingRight: '2rem' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = showNameError
                  ? 'rgba(239,68,68,0.8)'
                  : showNameValid
                    ? 'rgba(74,222,128,0.7)'
                    : `${GOLD}80`)}
              />
              {showNameValid && (
                <span style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)', color: '#4ADE80',
                  fontWeight: 700, fontSize: '13px', pointerEvents: 'none',
                }}>✓</span>
              )}
            </div>
            {showNameError && (
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#F87171' }}>
                {nameValidationError}
              </p>
            )}
          </div>
          <div>
            <Label>City *</Label>
            <select
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              style={{ ...inp, color: form.city ? '#fff' : 'rgba(255,255,255,0.3)', appearance: 'none' }}
            >
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c} style={{ background: '#0D1B2A' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active: Institution + Designation + Qualification */}
        {isActive && (
          <>
            <div>
              <Label>Institution *</Label>
              <CollegeAutocomplete
                value={form.institution}
                onChange={(v) => set('institution', v)}
                placeholder="Start typing your institution…"
                className=""
                inputStyle={inp}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label>Designation *</Label>
                <select
                  value={form.designation}
                  onChange={(e) => set('designation', e.target.value)}
                  style={{ ...inp, appearance: 'none', color: form.designation ? '#fff' : 'rgba(255,255,255,0.3)' }}
                >
                  <option value="">Select</option>
                  {['Professor', 'Associate Professor', 'Assistant Professor',
                    'Lecturer', 'Senior Lecturer', 'Visiting Faculty',
                    'Research Fellow', 'Adjunct Faculty'].map((d) => (
                    <option key={d} value={d} style={{ background: '#0D1B2A' }}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Highest qualification</Label>
                <select
                  value={form.qualification}
                  onChange={(e) => set('qualification', e.target.value)}
                  style={{ ...inp, appearance: 'none', color: form.qualification ? '#fff' : 'rgba(255,255,255,0.3)' }}
                >
                  <option value="">Select</option>
                  {['PhD', 'M.Phil', 'Masters', 'Post-Doctoral',
                    'Professional (MD/LLM/MBA/CA)'].map((q) => (
                    <option key={q} value={q} style={{ background: '#0D1B2A' }}>{q}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Retired: Former institution + year */}
        {isRetired && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <Label>Former institution *</Label>
              <CollegeAutocomplete
                value={form.formerInstitution}
                onChange={(v) => set('formerInstitution', v)}
                placeholder="e.g. Gujarat University"
                className=""
                inputStyle={inp}
              />
            </div>
            <div>
              <Label>Retired in</Label>
              <input
                type="number" min="1970" max="2026"
                value={form.retirementYear}
                onChange={(e) => set('retirementYear', e.target.value)}
                placeholder="Year"
                style={inp}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>
        )}

        {/* Independent: Firm + Credentials */}
        {isIndependent && (
          <>
            <div>
              <Label>Practising at / Firm name</Label>
              <input
                value={form.independentFirm}
                onChange={(e) => set('independentFirm', e.target.value)}
                placeholder="e.g. Practising CA at Buch & Associates"
                style={inp}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <Label>Your credentials *</Label>
              <textarea
                value={form.credentials}
                onChange={(e) => set('credentials', e.target.value.slice(0, 400))}
                placeholder="PhD IIT Bombay · 15 years industry at ISRO · SEBI-registered advisor…"
                rows={3}
                style={{ ...inp, resize: 'none' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                {400 - form.credentials.length} characters remaining
              </p>
            </div>
          </>
        )}

        {/* Department — active + retired */}
        {(isActive || isRetired) && (
          <div>
            <Label>Department / Subject area *</Label>
            <input
              value={form.department}
              onChange={(e) => {
                set('department', e.target.value)
                const slug = suggestSaathi(e.target.value)
                if (slug && !form.primarySaathiSlug) set('primarySaathiSlug', slug)
              }}
              placeholder="e.g. Physics, Constitutional Law, Pharmacology"
              style={inp}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        )}

        {/* Years + Specialities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <div>
            <Label>Years teaching</Label>
            <input
              type="number" min="0" max="60"
              value={form.yearsTeaching}
              onChange={(e) => set('yearsTeaching', e.target.value)}
              placeholder="e.g. 22"
              style={inp}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
          <div>
            <Label>Speciality areas (Enter to add · max 6)</Label>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="e.g. Quantum Mechanics, Fluid Dynamics…"
              style={inp}
              disabled={form.specialities.length >= 6}
            />
            {form.specialities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {form.specialities.map((s) => (
                  <button key={s}
                    onClick={() => set('specialities', form.specialities.filter((x) => x !== s))}
                    style={{
                      fontSize: '13px', fontWeight: 600, color: GREEN,
                      padding: '3px 10px',
                      background: 'rgba(74,222,128,0.1)',
                      border: '0.5px solid rgba(74,222,128,0.3)',
                      borderRadius: '100px', cursor: 'pointer',
                    }}>
                    {s} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Research area */}
        <div>
          <Label>Current research focus (optional)</Label>
          <textarea
            value={form.researchArea}
            onChange={(e) => set('researchArea', e.target.value.slice(0, 500))}
            placeholder="What are you currently investigating, publishing, or exploring? Students looking for research guidance will see this."
            rows={2}
            style={{ ...inp, resize: 'none' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Academic links */}
        <div>
          <Label>
            Academic links{isPersonalEmail ? '' : ' (optional — speeds up verification)'}
          </Label>

          {/* Personal email warning */}
          {isPersonalEmail && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '10px',
                background: 'rgba(245,158,11,0.08)',
                border: '0.5px solid rgba(245,158,11,0.35)',
              }}
            >
              <p style={{ fontSize: '13px', color: '#FCD34D', margin: 0, lineHeight: 1.6 }}>
                ⚠️ Personal email detected. LinkedIn URL is required for verification. You can add it below.
              </p>
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  LinkedIn URL{isPersonalEmail ? '' : ' (optional)'}
                </span>
                {isPersonalEmail && (
                  <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>*</span>
                )}
              </div>
              {isPersonalEmail && (
                <p style={{ fontSize: '10px', color: 'rgba(245,158,11,0.6)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  Required if using a personal email address
                </p>
              )}
              <input
                value={isIndependent ? form.independentLinkedin : form.linkedin}
                onChange={(e) => set(isIndependent ? 'independentLinkedin' : 'linkedin', e.target.value)}
                placeholder="https://linkedin.com/in/your-profile"
                style={{
                  ...inp,
                  borderColor: isPersonalEmail && !linkedinValue
                    ? 'rgba(245,158,11,0.45)'
                    : 'rgba(255,255,255,0.1)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                onBlur={(e)  => (e.currentTarget.style.borderColor = isPersonalEmail && !linkedinValue
                  ? 'rgba(245,158,11,0.45)'
                  : 'rgba(255,255,255,0.1)')}
              />
            </div>
            <input
              value={isIndependent ? form.independentScholar : form.googleScholar}
              onChange={(e) => set(isIndependent ? 'independentScholar' : 'googleScholar', e.target.value)}
              placeholder="Google Scholar URL (optional)"
              style={inp}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </div>

        {/* Resume upload */}
        <div>
          <Label>Resume / CV (PDF, optional — helps verification)</Label>
          <div
            onClick={() => document.getElementById('faculty-resume-upload')?.click()}
            style={{
              padding: '20px 16px', borderRadius: '12px', textAlign: 'center',
              background: form.resumeFile ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
              border: form.resumeFile
                ? '1px solid rgba(74,222,128,0.3)'
                : '1px dashed rgba(255,255,255,0.15)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {form.resumeFile ? (
              <div>
                <p style={{ fontSize: '13px', color: GREEN, fontWeight: 600, margin: '0 0 2px' }}>
                  📄 {form.resumeFile.name}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  {(form.resumeFile.size / 1024).toFixed(0)} KB · Click to replace
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>
                  Click to upload PDF
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                  Max 5 MB · PDF only
                </p>
              </div>
            )}
          </div>
          <input
            id="faculty-resume-upload"
            type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 5 * 1024 * 1024) { setError('Resume must be under 5 MB.'); return }
              set('resumeFile', file)
              set('resumeUrl', '')
            }}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            Your resume is only visible to EdUsaathiAI admin for verification. It is never shared with students.
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              fontSize: '13px', color: '#FCA5A5',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)',
              border: '0.5px solid rgba(239,68,68,0.25)',
              margin: 0,
            }}>
            ⚠️ {error}
          </motion.p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button onClick={onBack}
            style={{
              padding: '14px 20px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)', border: BORDER,
              color: 'rgba(255,255,255,0.4)', fontSize: '14px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
            ← Back
          </button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleNext}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: GOLD, color: NAVY,
              fontSize: '15px', fontWeight: 700,
              border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
            Continue to Saathi selection →
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Affiliations ────────────────────────────────────────────────────

function AffiliationsStep({
  form, set, onNext, onBack,
}: {
  form:   FacultyFormData
  set:    (k: keyof FacultyFormData, v: unknown) => void
  onNext: () => void
  onBack: () => void
}) {
  function updateAffiliation(idx: number, field: 'org' | 'role' | 'year', value: string) {
    set('affiliations', form.affiliations.map((a, i) => i === idx ? { ...a, [field]: value } : a))
  }

  function removeAffiliation(idx: number) {
    const next = form.affiliations.filter((_, i) => i !== idx)
    set('affiliations', next.length > 0 ? next : [{ id: `aff-${Date.now()}`, org: '', role: '', year: '' }])
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800, color: '#fff', margin: '0 0 8px',
        }}>
          <span style={{ color: GOLD }}>✦</span> Your Professional Standing
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px', lineHeight: 1.6 }}>
          Add memberships, fellowships, alumni status, or council positions.
          These build trust with students instantly.
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          Optional — skip if not applicable
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Reorder.Group
          axis="y"
          values={form.affiliations}
          onReorder={(newOrder) => set('affiliations', newOrder)}
          as="div"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          {form.affiliations.map((aff, idx) => (
            <Reorder.Item key={aff.id} value={aff} as="div">
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '14px 16px', borderRadius: '12px',
                background: CARD_BG,
                border: BORDER,
              }}>
                {/* Drag handle */}
                <div style={{
                  cursor: 'grab', color: 'rgba(255,255,255,0.18)',
                  fontSize: '18px', paddingTop: '10px', flexShrink: 0,
                  userSelect: 'none', lineHeight: 1,
                }}>
                  ⠿
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    value={aff.org}
                    onChange={(e) => updateAffiliation(idx, 'org', e.target.value.slice(0, 100))}
                    placeholder="Organisation / Body name e.g. IIM Ahmedabad, ICAI, Ministry of Science"
                    style={inp}
                    onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 112px', gap: '6px' }}>
                    <input
                      value={aff.role}
                      onChange={(e) => updateAffiliation(idx, 'role', e.target.value.slice(0, 80))}
                      placeholder="Your role e.g. Alumni, Fellow (FCA), Chairman"
                      style={inp}
                      onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                    <input
                      value={aff.year}
                      onChange={(e) => updateAffiliation(idx, 'year', e.target.value.slice(0, 10))}
                      placeholder="Year or Current"
                      style={inp}
                      onFocus={(e) => (e.currentTarget.style.borderColor = `${GOLD}80`)}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeAffiliation(idx)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,255,255,0.2)', fontSize: '20px',
                    cursor: 'pointer', padding: '4px 2px', flexShrink: 0,
                    lineHeight: 1, marginTop: '6px', fontFamily: 'sans-serif',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  aria-label="Remove affiliation"
                >
                  ×
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {form.affiliations.length < 6 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => set('affiliations', [
              ...form.affiliations,
              { id: `aff-${Date.now()}`, org: '', role: '', year: '' },
            ])}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px dashed rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.4)', fontSize: '14px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              width: '100%', justifyContent: 'center',
            }}
          >
            + Add another affiliation
          </motion.button>
        )}

        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', lineHeight: 1.5 }}>
          Self-declared — EdUsaathiAI does not independently verify affiliations
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button onClick={onBack}
          style={{
            padding: '14px 20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)', border: BORDER,
            color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          ← Back
        </button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onNext}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: GOLD, color: NAVY,
            fontSize: '15px', fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          {form.affiliations.some(a => a.org.trim()) ? 'Continue →' : 'Skip for now →'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Step 4: Saathi selection ─────────────────────────────────────────────────

function SaathiStep({
  form, set, onNext, onBack,
}: {
  form:   FacultyFormData
  set:    (k: keyof FacultyFormData, v: unknown) => void
  onNext: () => void
  onBack: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? SAATHIS.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.tagline.toLowerCase().includes(search.toLowerCase())
      )
    : SAATHIS

  function toggleAdditional(slug: string) {
    if (slug === form.primarySaathiSlug) return
    const curr = form.additionalSaathiSlugs
    if (curr.includes(slug)) {
      set('additionalSaathiSlugs', curr.filter((s) => s !== slug))
    } else if (curr.length < 2) {
      set('additionalSaathiSlugs', [...curr, slug])
    }
  }

  const primarySaathi     = SAATHIS.find((s) => s.id === form.primarySaathiSlug)
  const additionalSaathis = form.additionalSaathiSlugs
    .map((slug) => SAATHIS.find((s) => s.id === slug))
    .filter(Boolean) as typeof SAATHIS

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800, color: '#fff', margin: '0 0 8px',
        }}>
          Your teaching Saathis
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          Your knowledge spans disciplines. Choose your{' '}
          <strong style={{ color: '#fff' }}>primary Saathi</strong> and up to{' '}
          <strong style={{ color: GOLD }}>2 additional Saathis</strong> — free.
          Students discover you across all selected subjects.
        </p>
      </motion.div>

      {/* Selected summary strip */}
      {(primarySaathi || additionalSaathis.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: '14px 18px', borderRadius: '14px', marginBottom: '20px',
            background: 'rgba(201,153,58,0.06)',
            border: '0.5px solid rgba(201,153,58,0.2)',
            display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
          }}
        >
          {primarySaathi && (
            <span style={{
              fontSize: '13px', fontWeight: 700, color: GOLD,
              padding: '4px 12px',
              background: 'rgba(201,153,58,0.12)',
              border: '0.5px solid rgba(201,153,58,0.35)',
              borderRadius: '100px',
            }}>
              {primarySaathi.emoji} {primarySaathi.name} · Primary
            </span>
          )}
          {additionalSaathis.map((s) => (
            <span key={s.id} style={{
              fontSize: '13px', fontWeight: 600, color: GREEN,
              padding: '4px 12px',
              background: 'rgba(74,222,128,0.08)',
              border: '0.5px solid rgba(74,222,128,0.25)',
              borderRadius: '100px',
            }}>
              {s.emoji} {s.name}
            </span>
          ))}
          {additionalSaathis.length < 2 && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
              {2 - additionalSaathis.length} more additional Saathi
              {additionalSaathis.length < 1 ? 's' : ''} available
            </span>
          )}
        </motion.div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search Saathis by subject…"
        style={{ ...inp, marginBottom: '14px' }}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px', marginBottom: '24px',
        maxHeight: '360px', overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {filtered.map((s) => {
          const isPrimary    = form.primarySaathiSlug === s.id
          const isAdditional = form.additionalSaathiSlugs.includes(s.id)
          const isDisabled   = !isPrimary && !isAdditional
            && form.additionalSaathiSlugs.length >= 2
            && !!form.primarySaathiSlug

          return (
            <motion.button
              key={s.id}
              whileHover={!isDisabled ? { y: -2 } : {}}
              onClick={() => {
                if (!form.primarySaathiSlug) {
                  set('primarySaathiSlug', s.id)
                } else if (isPrimary) {
                  set('primarySaathiSlug', '')
                } else {
                  toggleAdditional(s.id)
                }
              }}
              style={{
                padding: '14px 12px', borderRadius: '14px', textAlign: 'left',
                background: isPrimary
                  ? `${GOLD}15`
                  : isAdditional
                    ? 'rgba(74,222,128,0.1)'
                    : CARD_BG,
                border: isPrimary
                  ? `1.5px solid ${GOLD}60`
                  : isAdditional
                    ? '1.5px solid rgba(74,222,128,0.4)'
                    : '0.5px solid rgba(255,255,255,0.07)',
                opacity: isDisabled ? 0.3 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s',
                position: 'relative',
              }}
            >
              {(isPrimary || isAdditional) && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: isPrimary ? GOLD : GREEN,
                  color: NAVY, fontSize: '9px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  ✓
                </div>
              )}
              <span style={{ fontSize: '22px', display: 'block', marginBottom: '6px' }}>
                {s.emoji}
              </span>
              <p style={{
                fontSize: '12px', fontWeight: 700, color: '#fff',
                margin: '0 0 2px', lineHeight: 1.2,
                fontFamily: 'Playfair Display, serif',
              }}>
                {s.name}
              </p>
              {isPrimary && (
                <p style={{ fontSize: '9px', color: GOLD, margin: 0, fontWeight: 600 }}>Primary</p>
              )}
              {isAdditional && (
                <p style={{ fontSize: '9px', color: GREEN, margin: 0, fontWeight: 600 }}>Additional</p>
              )}
            </motion.button>
          )
        })}
      </div>

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', marginBottom: '20px', textAlign: 'center' }}>
        Click to set primary · click another to add · click again to remove
      </p>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onBack}
          style={{
            padding: '14px 20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)', border: BORDER,
            color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          ← Back
        </button>
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={onNext}
          disabled={!form.primarySaathiSlug}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: form.primarySaathiSlug ? GOLD : 'rgba(255,255,255,0.08)',
            color: form.primarySaathiSlug ? NAVY : 'rgba(255,255,255,0.3)',
            fontSize: '15px', fontWeight: 700,
            border: 'none',
            cursor: form.primarySaathiSlug ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
          }}>
          {form.primarySaathiSlug ? 'Continue →' : 'Select at least one Saathi'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Step 4: Teaching invitation ─────────────────────────────────────────────

function InvitationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const features = [
    {
      icon:  '🎙️',
      title: 'Live Sessions',
      desc:  'Host a group lecture for students from your Saathi. You set the topic, price, and time. Students register and attend live. Sessions are recorded for enrolled students.',
    },
    {
      icon:  '📬',
      title: 'Lecture Requests',
      desc:  'Students post what they need. You browse requests that match your Saathis and offer a session. No cold outreach — students come to you.',
    },
    {
      icon:  '🔍',
      title: 'Faculty Finder',
      desc:  'Your profile appears when students search for subject experts. Verified badge builds trust. Students book a 1:1 session directly.',
    },
    {
      icon:  '💰',
      title: 'Earnings — 80 / 20',
      desc:  null,
    },
  ]

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800, color: '#fff', margin: '0 0 8px',
        }}>
          How EdUsaathiAI works with you
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Three ways students reach you. One platform that handles everything else.
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0, transition: { delay: i * 0.09 } }}
            style={{ padding: '18px 20px', borderRadius: '14px', background: CARD_BG, border: BORDER }}
          >
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                  {f.title}
                </p>
                {f.desc ? (
                  <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '4px 0 10px' }}>
                      <div style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(201,153,58,0.12)',
                        border: '0.5px solid rgba(201,153,58,0.3)',
                        textAlign: 'center',
                      }}>
                        <p style={{ fontSize: '22px', fontWeight: 800, color: GOLD, margin: '0 0 2px' }}>80%</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>to you</p>
                      </div>
                      <div style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        textAlign: 'center',
                      }}>
                        <p style={{ fontSize: '22px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>20%</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>platform fee</p>
                      </div>
                      <div style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(74,222,128,0.08)',
                        border: '0.5px solid rgba(74,222,128,0.2)',
                        textAlign: 'center',
                      }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: GREEN, margin: '0 0 2px' }}>₹400 you earn</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>from every ₹500 session</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
                      You set your session price. We handle payments, receipts, and transfers.
                      Any changes to the earnings model are communicated{' '}
                      <strong style={{ color: 'rgba(255,255,255,0.6)' }}>30 days in advance</strong>{' '}
                      by email and in-app notification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onBack}
          style={{
            padding: '14px 20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)', border: BORDER,
            color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          ← Back
        </button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onNext}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: GOLD, color: NAVY, fontSize: '15px', fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          I want to teach on EdUsaathiAI →
        </motion.button>
      </div>
    </div>
  )
}

// ─── Step 5: Agreement ────────────────────────────────────────────────────────

function AgreementStep({
  form, set, onSubmit, onBack, saving, error,
}: {
  form:     FacultyFormData
  set:      (k: keyof FacultyFormData, v: unknown) => void
  onSubmit: () => void
  onBack:   () => void
  saving:   boolean
  error:    string
}) {
  const allChecked = form.agreedTerms && form.agreedEarnings && form.agreedContent && form.agreedDPDP

  // eslint-disable-next-line react-hooks/static-components
  // eslint-disable-next-line react-hooks/static-components
  const CheckBox = ({
    field, label, sub,
  }: {
    field: 'agreedTerms' | 'agreedEarnings' | 'agreedContent' | 'agreedDPDP'
    label: string
    sub?:  string
  }) => (
    <button
      onClick={() => set(field, !form[field])}
      style={{
        display: 'flex', gap: '14px', alignItems: 'flex-start',
        padding: '16px 20px', borderRadius: '14px', textAlign: 'left', width: '100%',
        background: form[field] ? 'rgba(74,222,128,0.06)' : CARD_BG,
        border: form[field]
          ? '1px solid rgba(74,222,128,0.3)'
          : '0.5px solid rgba(255,255,255,0.08)',
        cursor: 'pointer', transition: 'all 0.18s',
      }}
    >
      <motion.div
        animate={{
          background:  form[field] ? GREEN : 'rgba(255,255,255,0.08)',
          borderColor: form[field] ? GREEN : 'rgba(255,255,255,0.15)',
        }}
        style={{
          width: '20px', height: '20px', borderRadius: '6px',
          border: '1.5px solid', flexShrink: 0, marginTop: '1px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: NAVY, fontWeight: 800,
        }}
      >
        {form[field] ? '✓' : ''}
      </motion.div>
      <div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
            {sub}
          </p>
        )}
      </div>
    </button>
  )

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800, color: '#fff', margin: '0 0 8px',
        }}>
          One last step
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Four agreements. All transparent. No surprises.
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <CheckBox
          field="agreedTerms"
          label="I have read and accept the Faculty Terms of Service"
          sub="Covers session standards, student conduct expectations, and your rights as a faculty partner."
        />
        <CheckBox
          field="agreedEarnings"
          label="I agree to the 80% / 20% earnings model"
          sub="You earn 80% of each session fee. Any changes to this split will be communicated 30 days in advance by email and in-app notification — never applied without notice."
        />
        <CheckBox
          field="agreedContent"
          label="I agree to the Content and Quality Policy"
          sub="Sessions must be educational, accurate, and respectful. EdUsaathiAI reserves the right to review sessions for quality standards."
        />
        <CheckBox
          field="agreedDPDP"
          label="I consent to EdUsaathiAI collecting my professional data"
          sub="Per India DPDP Act 2023. You can request deletion anytime from your dashboard."
        />
      </div>

      {/* Verification timeline */}
      <div style={{
        padding: '16px 20px', borderRadius: '14px', marginBottom: '24px',
        background: 'rgba(201,153,58,0.06)',
        border: '0.5px solid rgba(201,153,58,0.2)',
      }}>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px', fontWeight: 600 }}>
          ✦ What happens after you submit
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            ['Immediately',       'Your profile is created. You can access the faculty dashboard.'],
            ['Within 48 hours',   'Our team reviews your profile and issues your Faculty Verified badge.'],
            ['After verification','Your profile appears on Faculty Finder. Students can book sessions.'],
          ].map(([time, desc]) => (
            <div key={time} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '12px', fontWeight: 700, color: GOLD,
                minWidth: '116px', paddingTop: '2px',
              }}>
                {time}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            fontSize: '13px', color: '#FCA5A5',
            padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
            background: 'rgba(239,68,68,0.08)',
            border: '0.5px solid rgba(239,68,68,0.25)',
            margin: '0 0 16px',
          }}>
          ⚠️ {error}
        </motion.p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onBack}
          style={{
            padding: '14px 20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)', border: BORDER,
            color: 'rgba(255,255,255,0.4)', fontSize: '14px',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
          ← Back
        </button>
        <motion.button
          whileTap={allChecked ? { scale: 0.98 } : {}}
          onClick={allChecked ? onSubmit : undefined}
          disabled={!allChecked || saving}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: allChecked ? GOLD : 'rgba(255,255,255,0.08)',
            color: allChecked ? NAVY : 'rgba(255,255,255,0.25)',
            fontSize: '15px', fontWeight: 700,
            border: 'none',
            cursor: allChecked && !saving ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
          }}>
          {saving ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: `2px solid rgba(0,0,0,0.2)`,
                borderTopColor: NAVY,
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
              Submitting for verification…
            </span>
          ) : allChecked ? (
            'Submit for verification →'
          ) : (
            'Agree to all three to continue'
          )}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Main FacultyOnboardFlow ──────────────────────────────────────────────────

export function FacultyOnboardFlow({ profile, onComplete }: Props) {
  const [step,      setStep]      = useState<Step>('employment')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  const [form, setFormState] = useState<FacultyFormData>({
    fullName: '', city: '', employment: 'active',
    institution: '', designation: '', department: '', qualification: '',
    yearsTeaching: '', formerInstitution: '', retirementYear: '',
    credentials: '', independentFirm: '', independentLinkedin: '', independentScholar: '',
    resumeFile: null, resumeUrl: '',
    specialities: [], researchArea: '',
    affiliations: [{ id: 'aff-0', org: '', role: '', year: '' }],
    linkedin: '', googleScholar: '',
    primarySaathiSlug: '', additionalSaathiSlugs: [],
    agreedTerms: false, agreedEarnings: false, agreedContent: false, agreedDPDP: false,
  })

  const set = useCallback((k: keyof FacultyFormData, v: unknown) => {
    setFormState((prev) => ({ ...prev, [k]: v }))
  }, [])

  function next() { setStep((s) => STEPS[STEPS.indexOf(s) + 1] as Step) }
  function back() { setStep((s) => STEPS[STEPS.indexOf(s) - 1] as Step) }

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const userId   = profile.id

      // Verify session is still live
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Session expired. Please sign in again.')

      // Personal email + no LinkedIn guard
      if (isPersonalEmailDomain(user.email)) {
        const linkedinFilled = (form.linkedin || form.independentLinkedin).trim()
        if (!linkedinFilled) {
          throw new Error('LinkedIn URL is required for personal email accounts. Please go back and add your LinkedIn profile.')
        }
      }

      // Email domain validation
      const validation = await validateFacultyEmail(user.email, form.employment, supabase)
      if (!validation.allowed) throw new Error(validation.message)

      // Resolve primary slug → UUID
      const primaryUuid = toVerticalUuid(form.primarySaathiSlug)
      if (!primaryUuid) throw new Error('Invalid primary Saathi selection.')

      const additionalUuids = form.additionalSaathiSlugs
        .map((s) => toVerticalUuid(s))
        .filter(Boolean) as string[]

      const autoVerified   = validation.status === 'auto_verify'
      const expertiseTags  = [
        ...(form.department.trim() ? [form.department.trim()] : []),
        ...form.specialities,
      ].slice(0, 8)

      const institutionName =
        form.employment === 'active'
          ? form.institution.trim() || null
          : form.employment === 'retired'
            ? form.formerInstitution.trim() || null
            : form.independentFirm.trim() || null

      // ── Resume upload ────────────────────────────────────────────────────
      let resumeUrl = form.resumeUrl || null
      if (form.resumeFile) {
        const ext  = form.resumeFile.name.split('.').pop() ?? 'pdf'
        const path = `resumes/${userId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('faculty-docs')
          .upload(path, form.resumeFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('faculty-docs').getPublicUrl(path)
          resumeUrl = urlData.publicUrl
        }
      }

      // ── Update profiles ──────────────────────────────────────────────────
      const { error: profileErr } = await supabase.from('profiles').update({
        full_name:               form.fullName.trim(),
        city:                    form.city,
        role:                    'faculty',
        primary_saathi_id:       primaryUuid,
        institution_name:        institutionName,
        is_active:               true,
        last_profile_updated_at: new Date().toISOString(),
      }).eq('id', userId)
      if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`)

      // ── Upsert faculty_profiles ──────────────────────────────────────────
      const { error: fpErr } = await supabase.from('faculty_profiles').upsert({
        user_id:                userId,
        institution_name:       validation.institution_name ?? institutionName,
        department:             form.department.trim() || 'General',
        designation:            form.designation.trim() || null,
        subject_expertise:      expertiseTags,
        years_experience:       parseInt(form.yearsTeaching) || 0,
        highest_qualification:  form.qualification || null,
        linkedin_url:           form.linkedin.trim() || form.independentLinkedin.trim() || null,
        google_scholar_url:     form.googleScholar.trim() || form.independentScholar.trim() || null,
        current_research:       form.researchArea.trim() || null,
        speciality_areas:       form.specialities,
        employment_status:      form.employment,
        retirement_year:        form.employment === 'retired' && form.retirementYear
          ? parseInt(form.retirementYear) : null,
        former_institution:     form.employment === 'retired'
          ? form.formerInstitution.trim() || null : null,
        independent_credential: form.employment === 'independent'
          ? form.credentials.trim() || null : null,
        independent_firm:       form.employment === 'independent'
          ? form.independentFirm.trim() || null : null,
        resume_url:             resumeUrl,
        verification_status:    autoVerified ? 'verified' : 'pending',
        badge_type:             autoVerified ? 'faculty_verified' : 'pending',
        ...(autoVerified ? { verified_at: new Date().toISOString() } : {}),
        additional_saathi_ids:  additionalUuids,
        affiliations: form.affiliations
          .filter(a => a.org.trim() && a.role.trim())
          .map(a => ({ org: a.org.trim(), role: a.role.trim(), year: a.year.trim() })),
        agreed_terms:           true,
        agreed_earnings:        true,
        agreed_content:         true,
      }, { onConflict: 'user_id' })
      if (fpErr) throw new Error(`Faculty profile save failed: ${fpErr.message}`)

      // ── Upsert student_soul for primary Saathi ───────────────────────────
      await supabase.from('student_soul').upsert({
        user_id:          userId,
        vertical_id:      primaryUuid,
        display_name:     form.fullName.trim(),
        preferred_tone:   'formal',
        enrolled_subjects: expertiseTags,
        future_subjects:  [],
        top_topics:       [],
        struggle_topics:  [],
        session_count:    0,
      }, { onConflict: 'user_id,vertical_id' })

      // ── Additional Saathis — upsert soul rows so they appear in sidebar ──
      for (const uuid of additionalUuids) {
        await supabase.from('student_soul').upsert({
          user_id:         userId,
          vertical_id:     uuid,
          display_name:    form.fullName.trim(),
          preferred_tone:  'formal',
          enrolled_subjects: expertiseTags,
          future_subjects: [],
          top_topics:      [],
          struggle_topics: [],
          session_count:   0,
        }, { onConflict: 'user_id,vertical_id' })
      }

      // ── Welcome email — send now that full_name is known ────────────────────
      // Auth callback skips this for faculty (name was null at that point).
      // welcome_email_sent is still false, so the Edge Function will send it.
      try {
        const { data: { session: welcomeSession } } = await supabase.auth.getSession()
        if (welcomeSession?.access_token) {
          void fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-welcome-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type':  'application/json',
                apikey:          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
                Authorization:   `Bearer ${welcomeSession.access_token}`,
              },
              body: JSON.stringify({ name: form.fullName.trim() }),
            }
          )
        }
      } catch { /* fire-and-forget — never block onComplete */ }

      // Log DPDP consent (fire-and-forget)
      void supabase.from('consent_log').insert({
        user_id: userId,
        consent_type: 'dpdp_data_collection',
        consent_version: '1.0',
        accepted: true,
        accepted_at: new Date().toISOString(),
        metadata: { source: 'faculty_onboarding' },
      })

      onComplete()
    } catch (err) {
      console.error('[FacultyOnboardFlow] Submit failed:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(`${msg}. If this persists, contact admin@edusaathiai.in with this error.`)
      setSaving(false)
    }
  }

  const slideVariants = {
    enter: { x: 40,  opacity: 0 },
    center:{ x: 0,   opacity: 1, transition: { duration: 0.28 } },
    exit:  { x: -40, opacity: 0, transition: { duration: 0.2  } },
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D1B2A',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        pointerEvents: 'none', position: 'absolute',
        width: 700, height: 700,
        top: '25%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(201,153,58,0.05) 0%, transparent 70%)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', maxWidth: '680px', margin: '0 auto',
        position: 'relative', zIndex: 10,
      }}>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '20px', fontWeight: 700, color: GOLD,
        }}>
          EdUsaathiAI
        </span>
        <StepDots current={step} />
      </div>

      {/* Step content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">
          {step === 'employment' && (
            <motion.div key="employment" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <EmploymentStep
                value={form.employment}
                onChange={(v) => set('employment', v)}
                onNext={next}
              />
            </motion.div>
          )}
          {step === 'profile' && (
            <motion.div key="profile" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <ProfileStep form={form} set={set} onNext={next} onBack={back} userEmail={userEmail} />
            </motion.div>
          )}
          {step === 'affiliations' && (
            <motion.div key="affiliations" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <AffiliationsStep form={form} set={set} onNext={next} onBack={back} />
            </motion.div>
          )}
          {step === 'saathi' && (
            <motion.div key="saathi" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <SaathiStep form={form} set={set} onNext={next} onBack={back} />
            </motion.div>
          )}
          {step === 'invitation' && (
            <motion.div key="invitation" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <InvitationStep onNext={next} onBack={back} />
            </motion.div>
          )}
          {step === 'agreement' && (
            <motion.div key="agreement" variants={slideVariants}
              initial="enter" animate="center" exit="exit">
              <AgreementStep
                form={form} set={set}
                onSubmit={handleSubmit} onBack={back}
                saving={saving} error={error}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin keyframe — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
