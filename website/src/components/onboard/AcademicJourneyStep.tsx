'use client'

// ─────────────────────────────────────────────────────────────────────────────
// AcademicJourneyStep — curriculum-aware subject picker
//
// Student picks degree + specialisation + year. We hit the university_syllabi
// table via getCurriculum() (six-step waterfall: exact uni → AICTE/PCI/UGC/BCI
// model → manual_entry). Core subjects are pre-selected; electives are
// opt-in; a free-text add-a-subject catches anything we don't have.
//
// Soul pre-population + Saathi match happens at onComplete — the parent flow
// persists the payload to student_soul / student_subjects / profiles.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { getCurriculum, CurriculumResult } from '@/lib/curriculum'
import CollegeAutocomplete from '@/components/ui/CollegeAutocomplete'

const DEGREE_OPTIONS = [
  // Engineering
  { value: 'B.Tech', label: 'B.Tech / B.E.' },
  { value: 'B.Plan', label: 'B.Plan (Urban Planning)' },
  // Sciences
  { value: 'B.Sc', label: 'B.Sc' },
  { value: 'B.Pharm', label: 'B.Pharm' },
  // Commerce
  { value: 'B.Com', label: 'B.Com' },
  { value: 'BBA', label: 'BBA' },
  // Arts & Law
  { value: 'B.A.', label: 'B.A.' },
  { value: 'LLB', label: 'LLB (3-year)' },
  { value: 'BA LLB', label: 'BA LLB (5-year)' },
  // Medical
  { value: 'MBBS', label: 'MBBS' },
  { value: 'B.Sc Nursing', label: 'B.Sc Nursing' },
  // Post-grad
  { value: 'M.Tech', label: 'M.Tech' },
  { value: 'MBA', label: 'MBA' },
  { value: 'M.Sc', label: 'M.Sc' },
  { value: 'LLM', label: 'LLM' },
  // Other
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Other', label: 'Other / Not Listed' },
]

// B.Tech branches — the same list is reused for M.Tech since post-grad
// tracks typically extend the same AICTE branch taxonomy. Mechatronics,
// Automobile, and Industrial all collapse to MechSaathi via resolveSaathi().
const BTECH_SPECS: (string | null)[] = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electrical Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Automobile Engineering',
  'Industrial Engineering',
  'Robotics and Artificial Intelligence',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Aeronautical Engineering',
  'Other',
]

// B.Sc/M.Sc branches. Statistics promoted to a first-class branch so
// StatsSaathi gets found (previously only reachable via "Other").
const BSC_SPECS: (string | null)[] = [
  'Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Biology',
  'Botany', 'Zoology', 'Computer Science',
  'Biochemistry', 'Microbiology', 'Biotechnology', 'Other',
]

const MBA_SPECS: (string | null)[] = [
  'Finance', 'Marketing', 'HR', 'Operations',
  'IT', 'International Business', 'Other',
]

// `[null]` = no specialisation step. Degrees in the picker that aren't keys
// here used to stall the UI (needsSpec=true with zero chips); every degree
// the user can pick must appear below.
const SPECIALISATION_MAP: Record<string, (string | null)[]> = {
  'B.Tech': BTECH_SPECS,
  'M.Tech': BTECH_SPECS,
  'B.Sc': BSC_SPECS,
  'M.Sc': BSC_SPECS,
  'B.Com': [null],
  'BBA': [null],
  'MBA': MBA_SPECS,
  'B.A.': [
    'Economics', 'Political Science', 'History',
    'Psychology', 'Sociology', 'English Literature', 'Other',
  ],
  'LLB': [null],
  'BA LLB': [null],
  'LLM': [null],
  'B.Pharm': [null],
  'MBBS': [null],
  'B.Sc Nursing': [null],
  'B.Plan': [null],
  'Diploma': [null],
  'Other': [null],
}

const YEAR_OPTIONS = (degree: string) => {
  const maxYears: Record<string, number> = {
    'B.Tech': 4, 'B.E.': 4, 'B.Plan': 4, 'B.Pharm': 4,
    'B.Sc': 3, 'B.Com': 3, 'B.A.': 3, 'BBA': 3, 'LLB': 3,
    'BA LLB': 5, 'MBBS': 5, 'B.Sc Nursing': 4,
    'M.Tech': 2, 'MBA': 2, 'M.Sc': 2, 'LLM': 2,
    'Diploma': 3,
  }
  const max = maxYears[degree] ?? 4
  return Array.from({ length: max }, (_, i) => ({
    value: i + 1,
    label: `${['1st', '2nd', '3rd', '4th', '5th'][i]} Year`
  }))
}

type Props = {
  /** Pre-fill university if known (e.g. carried over from the profile step
      where the user already typed it, or returning student). */
  initialUniversity?: string
  onComplete: (data: {
    university: string
    degree: string
    specialisation: string | null
    year: number
    subjects: string[]
    saathiSlug: string
    curriculumSource: string
  }) => void
}

export default function AcademicJourneyStep({ initialUniversity, onComplete }: Props) {
  const [university, setUniversity]         = useState(initialUniversity ?? '')
  const [showCollegeSearch, setShowCollegeSearch] = useState(!initialUniversity)
  const [degree, setDegree]                 = useState('')
  const [specialisation, setSpecialisation] = useState<string | null>(null)
  const [year, setYear]                     = useState<number | null>(null)
  const [curriculum, setCurriculum]         = useState<CurriculumResult | null>(null)
  const [loading, setLoading]               = useState(false)
  const [confirmedSubjects, setConfirmedSubjects] = useState<string[]>([])
  const [manualSubject, setManualSubject]   = useState('')
  const [manualSubjects, setManualSubjects] = useState<string[]>([])

  // Defensive: if a degree ever ships without a SPECIALISATION_MAP entry,
  // treat it as "no spec needed" rather than stalling the UI with zero chips.
  const specList = degree ? SPECIALISATION_MAP[degree] : undefined
  const needsSpec = Boolean(specList && specList.length > 0 && specList[0] !== null)
  const specs = (specList ?? []) as string[]

  // Auto-fetch curriculum when university + degree + year are all set
  useEffect(() => {
    if (!university || !degree || !year) return
    if (needsSpec && !specialisation) return

    fetchCurriculum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [university, degree, specialisation, year])

  async function fetchCurriculum() {
    setLoading(true)
    const result = await getCurriculum(
      university,
      degree,
      specialisation,
      year!
    )
    setCurriculum(result)
    // Pre-select all core subjects
    setConfirmedSubjects(
      result.subjects
        .filter(s => s.paper_type === 'core')
        .map(s => s.paper_name)
    )
    setLoading(false)
  }

  function toggleSubject(name: string) {
    setConfirmedSubjects(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    )
  }

  function addManualSubject() {
    if (!manualSubject.trim()) return
    setManualSubjects(prev => [...prev, manualSubject.trim()])
    setManualSubject('')
  }

  const allSubjects = [...confirmedSubjects, ...manualSubjects]

  function handleConfirm() {
    if (!university || !degree || !year || allSubjects.length === 0) return
    onComplete({
      university,
      degree,
      specialisation,
      year,
      subjects: allSubjects,
      saathiSlug: curriculum?.saathiSlug ?? 'compsaathi',
      curriculumSource: curriculum?.source ?? 'manual_entry'
    })
  }

  const sourceLabel: Record<CurriculumResult['source'], string> = {
    university_specific: `✦ From ${university} official syllabus`,
    aicte_model: '✦ AICTE model curriculum — confirm what you actually study',
    ugc_model: '✦ UGC model curriculum — confirm what you actually study',
    pci_model: '✦ PCI model curriculum — confirm what you actually study',
    bci_model: '✦ Bar Council of India syllabus',
    manual_entry: '✦ We don\'t have your syllabus — add your subjects below'
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: '22px',
        marginBottom: '8px'
      }}>
        Your Academic Journey
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>
        Help your Saathi understand exactly where you are.
      </p>

      {/* Step 0 — University (shown if not pre-filled, or when user clicks "Change college") */}
      {(!university || showCollegeSearch) && (
        <div style={{ marginBottom: '24px' }}>
          <label className="label">Your College or University</label>
          <CollegeAutocomplete
            value={university}
            onChange={(val: string) => {
              setUniversity(val)
              setShowCollegeSearch(false)
              // Reset downstream if user switched universities
              setDegree('')
              setSpecialisation(null)
              setYear(null)
              setCurriculum(null)
              setConfirmedSubjects([])
              setManualSubjects([])
            }}
            placeholder="Search your college..."
          />
        </div>
      )}

      {/* Compact uni display + "change" affordance once picked */}
      {university && !showCollegeSearch && (
        <div style={{
          marginBottom: '24px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase', color: 'var(--text-ghost)',
              margin: '0 0 2px',
            }}>
              University
            </p>
            <p className="truncate" style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              margin: 0,
            }}>
              {university}
            </p>
          </div>
          <button
            onClick={() => setShowCollegeSearch(true)}
            style={{
              fontSize: '12px',
              color: 'var(--gold)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontWeight: 600,
            }}
          >
            Change
          </button>
        </div>
      )}

      {/* Step 1 — Degree (gated on university) */}
      {university && (
      <div style={{ marginBottom: '20px' }}>
        <label className="label">Degree Programme</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DEGREE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setDegree(opt.value)
                setSpecialisation(null)
                setYear(null)
                setCurriculum(null)
              }}
              className={`chip ${degree === opt.value ? 'selected' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Step 2 — Specialisation (if needed) */}
      {university && degree && needsSpec && (
        <div style={{ marginBottom: '20px' }}>
          <label className="label">Specialisation / Branch</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {specs.map(spec => (
              <button
                key={spec}
                onClick={() => setSpecialisation(spec)}
                className={`chip ${specialisation === spec ? 'selected' : ''}`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Year */}
      {university && degree && (!needsSpec || specialisation) && (
        <div style={{ marginBottom: '24px' }}>
          <label className="label">Current Year</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {YEAR_OPTIONS(degree).map(opt => (
              <button
                key={opt.value}
                onClick={() => setYear(opt.value)}
                className={`chip ${year === opt.value ? 'selected' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          Finding your syllabus...
        </div>
      )}

      {/* Curriculum results */}
      {!loading && curriculum && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--saathi-primary)',
            marginBottom: '12px',
            fontWeight: 600
          }}>
            {sourceLabel[curriculum.source]}
          </div>

          {curriculum.subjects.length > 0 ? (
            <>
              <label className="label">
                Your subjects this year
                <span style={{
                  fontWeight: 400,
                  textTransform: 'none',
                  marginLeft: '6px',
                  color: 'var(--text-tertiary)'
                }}>
                  — tap to deselect any you don&apos;t study
                </span>
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px'
              }}>
                {curriculum.subjects
                  .filter(s => s.paper_type === 'core')
                  .map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSubject(s.paper_name)}
                      className={`chip ${
                        confirmedSubjects.includes(s.paper_name)
                          ? 'selected'
                          : ''
                      }`}
                    >
                      {s.paper_name}
                    </button>
                  ))}
              </div>

              {/* Electives */}
              {curriculum.subjects.some(s => s.paper_type === 'elective') && (
                <>
                  <label className="label" style={{ marginTop: '12px' }}>
                    Electives — add if you study these
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {curriculum.subjects
                      .filter(s => s.paper_type === 'elective')
                      .map(s => (
                        <button
                          key={s.id}
                          onClick={() => toggleSubject(s.paper_name)}
                          className={`chip ${
                            confirmedSubjects.includes(s.paper_name)
                              ? 'selected'
                              : ''
                          }`}
                        >
                          {s.paper_name}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{
              padding: '16px',
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '16px'
            }}>
              We don&apos;t have {university}&apos;s {degree} syllabus yet.
              Add your subjects below — your Saathi will remember them.
            </div>
          )}

          {/* Manual subject entry — always available */}
          <label className="label" style={{ marginTop: '8px' }}>
            Add a subject not listed above
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              value={manualSubject}
              onChange={e => setManualSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManualSubject()}
              placeholder="e.g. Environmental Law"
              style={{ flex: 1 }}
            />
            <button
              onClick={addManualSubject}
              className="btn btn-secondary btn-small"
            >
              Add
            </button>
          </div>
          {manualSubjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {manualSubjects.map(s => (
                <span
                  key={s}
                  className="chip selected"
                  onClick={() => setManualSubjects(p => p.filter(x => x !== s))}
                >
                  {s} ×
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saathi match preview */}
      {curriculum?.saathiSlug && allSubjects.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          borderLeft: '3px solid var(--saathi-primary)'
        }}>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700
          }}>
            Your Saathi Match
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'Fraunces, serif'
          }}>
            {curriculum.saathiSlug
              .replace('saathi', 'Saathi')
              .replace(/^./, c => c.toUpperCase())}
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            marginTop: '4px'
          }}>
            Based on {allSubjects.length} subject
            {allSubjects.length !== 1 ? 's' : ''} confirmed
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!university || !degree || !year || allSubjects.length === 0}
        className="btn btn-primary btn-large"
        style={{ width: '100%' }}
      >
        Confirm my subjects →
      </button>
    </div>
  )
}
