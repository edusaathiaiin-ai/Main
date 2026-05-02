'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Explorer destinations ────────────────────────────────────────────────────

const DESTINATIONS = [
  {
    id:      'usa-edu',
    flag:    '🇺🇸',
    label:   'USA — Study in America',
    url:     'https://educationusa.state.gov',
    source:  'EducationUSA · U.S. State Dept.',
    desc:    'Official U.S. government portal for international students. University search, scholarship finder, visa information, and EducationUSA advising centres across India.',
    tags:    ['Universities', 'Scholarships', 'F-1 Visa'],
    color:   '#3B82F6',
  },
  {
    id:      'usa-visa',
    flag:    '🇺🇸',
    label:   'US Student Visa — F-1 Guide',
    url:     'https://travel.state.gov/content/travel/en/us-visas/study.html',
    source:  'U.S. Department of State · Official',
    desc:    'Official F-1 and J-1 student visa application process, SEVIS registration, interview preparation, and DS-160 form guidance from the U.S. government.',
    tags:    ['F-1 Visa', 'SEVIS', 'Interview prep'],
    color:   '#1D4ED8',
  },
  {
    id:      'canada',
    flag:    '🇨🇦',
    label:   'Canada — Study Permit',
    url:     'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html',
    source:  'IRCC · Government of Canada · Official',
    desc:    "Canada's official immigration portal for study permits, DLI (Designated Learning Institutions), PGWP post-graduation work permit, and Express Entry pathways for students.",
    tags:    ['Study Permit', 'PGWP', 'DLI List'],
    color:   '#DC2626',
  },
  {
    id:      'australia',
    flag:    '🇦🇺',
    label:   'Australia — Study in Oz',
    url:     'https://www.studyinaustralia.gov.au',
    source:  'Australian Government · Official',
    desc:    "Australia's official study abroad guide. University rankings, Student Visa (subclass 500), cost of living, scholarships including Australia Awards, and post-study work rights.",
    tags:    ['Student Visa 500', 'Australia Awards', 'Rankings'],
    color:   '#059669',
  },
  {
    id:      'germany',
    flag:    '🇩🇪',
    label:   'Germany — Study Free',
    url:     'https://www.study-in-germany.de/en',
    source:  'DAAD · German Academic Exchange Service',
    desc:    'Germany offers tuition-free education at public universities for international students. DAAD scholarships, German language courses, blocked account requirements, and visa guidance.',
    tags:    ['Free Tuition', 'DAAD Scholarship', 'Blocked Account'],
    color:   '#D97706',
  },
  {
    id:      'uk',
    flag:    '🇬🇧',
    label:   'UK — Student Route Visa',
    url:     'https://www.ukcisa.org.uk',
    source:  'UKCISA · UK Council for International Student Affairs',
    desc:    'The authoritative guide for international students in the UK. Student Route visa, CAS number, Graduate Route (2-year post-study work), IELTS requirements, and UCAS application.',
    tags:    ['Student Route', 'Graduate Route', 'UCAS'],
    color:   '#7C3AED',
  },
  {
    id:      'ets',
    flag:    '📝',
    label:   'GRE & TOEFL — ETS Official',
    url:     'https://www.ets.org',
    source:  'ETS · Educational Testing Service · Official',
    desc:    'Official portal for GRE and TOEFL. Register for exams, access free practice tests, score reports, and send scores directly to universities. Used for US, Canada, Germany, and Australia admissions.',
    tags:    ['GRE', 'TOEFL', 'Score Reports', 'Practice Tests'],
    color:   '#0891B2',
  },
  {
    id:      'ielts',
    flag:    '📝',
    label:   'IELTS — Official Registration',
    url:     'https://www.ielts.org',
    source:  'IELTS · British Council / IDP / Cambridge',
    desc:    'Official IELTS registration, test centre finder across India, Academic vs General Training guide, band score descriptors, and free preparation materials. Accepted by UK, Canada, Australia, and 11,000+ institutions worldwide.',
    tags:    ['IELTS Academic', 'IELTS GT', 'Band Score', 'India Centres'],
    color:   '#D97706',
  },
  {
    id:      'edumeetup',
    flag:    '🌐',
    label:   'EdUmeetup — India × World',
    url:     'https://edumeetup.com',
    source:  'EdUmeetup · EdUsaathiAI',
    desc:    'Connect Indian students directly with international universities. Free profile, university discovery, group sessions with admissions advisors, and direct application support.',
    tags:    ['Free Profile', 'University Connect', 'Ahmedabad'],
    color:   '#C9993A',
    featured: true,
  },
] as const

// ─── CTA card in sidebar ──────────────────────────────────────────────────────

export function WorldEducationExplorerCTA({
  primaryColor = '#C9993A',
}: {
  isLegalTheme?: boolean
  primaryColor?:  string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '12px',
          width:        '100%',
          padding:      '10px 14px',
          borderRadius: '12px',
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border-subtle)',
          cursor:       'pointer',
          textAlign:    'left',
          transition:   'all 0.18s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background  = 'var(--bg-sunken)'
          e.currentTarget.style.borderColor = `${primaryColor}50`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background  = 'var(--bg-elevated)'
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
        }}
      >
        <span style={{
          fontSize:       '20px',
          width:          '32px',
          height:         '32px',
          borderRadius:   '8px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     `${primaryColor}15`,
          flexShrink:     0,
        }}>
          🌍
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1px', lineHeight: 1.3 }}>
            World Education Explorer
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
            USA · Canada · UK · Germany · Australia
          </p>
        </div>
        <span style={{ fontSize: '14px', color: primaryColor, flexShrink: 0, opacity: 0.7 }}>→</span>
      </button>

      <AnimatePresence>
        {open && <WorldEducationExplorerPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

// ─── Full panel ───────────────────────────────────────────────────────────────

function WorldEducationExplorerPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         60,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'flex-end',
        background:     'rgba(6,15,29,0.7)',
        backdropFilter: 'blur(8px)',
        overflowY:      'auto',
        padding:        0,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width:         '100%',
          maxWidth:      '520px',
          minHeight:     '100vh',
          background:    '#0B1F3A',
          borderLeft:    '0.5px solid rgba(255,255,255,0.08)',
          display:       'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding:      '24px 24px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          position:     'sticky',
          top:          0,
          background:   '#0B1F3A',
          zIndex:       10,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>🌍</span>
                <p style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#C9993A', margin: 0,
                }}>
                  World Education Explorer
                </p>
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '22px',
                fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.2,
              }}>
                Thinking about studying abroad?
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                Every link below is an official government or trusted academic portal.
                Your Saathi helps you understand the academics —
                these resources help you understand the path.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close explorer"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: '20px',
                padding: '4px', flexShrink: 0, marginLeft: '12px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
              ⚠️{' '}
              <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Outside SaathiUniverse.</strong>{' '}
              These are third-party websites. EdUsaathiAI does not control their content,
              is not affiliated with them (except EdUmeetup), and is not responsible
              for visa outcomes or admission decisions. Always verify information
              directly with the institution or embassy.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DESTINATIONS.map((d, i) => (
            <motion.a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              style={{
                display:        'block',
                padding:        '16px 18px',
                borderRadius:   '14px',
                background:     'featured' in d && d.featured ? 'rgba(201,153,58,0.07)' : 'rgba(255,255,255,0.03)',
                border:         'featured' in d && d.featured ? '1px solid rgba(201,153,58,0.25)' : '0.5px solid rgba(255,255,255,0.07)',
                textDecoration: 'none',
                transition:     'all 0.18s',
                cursor:         'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background   = `${d.color}12`
                e.currentTarget.style.borderColor  = `${d.color}50`
                e.currentTarget.style.transform    = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background   = 'featured' in d && d.featured ? 'rgba(201,153,58,0.07)' : 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor  = 'featured' in d && d.featured ? 'rgba(201,153,58,0.25)' : 'rgba(255,255,255,0.07)'
                e.currentTarget.style.transform    = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{d.flag}</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px', fontFamily: 'var(--font-display)' }}>
                      {d.label}
                      {'featured' in d && d.featured && (
                        <span style={{
                          marginLeft: '8px', fontSize: '9px', fontWeight: 700,
                          color: '#C9993A', background: 'rgba(201,153,58,0.15)',
                          borderRadius: '4px', padding: '1px 6px', verticalAlign: 'middle',
                        }}>
                          INDIA CONNECTION
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                      {d.source}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '14px', color: d.color, opacity: 0.7, flexShrink: 0, marginTop: '2px' }}>↗</span>
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.6 }}>
                {d.desc}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {d.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '9px', fontWeight: 600, color: d.color,
                    background: `${d.color}15`, border: `0.5px solid ${d.color}30`,
                    borderRadius: '100px', padding: '2px 8px',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.a>
          ))}

          {/* Footer note */}
          <div style={{
            marginTop: '8px', padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(201,153,58,0.05)',
            border: '0.5px solid rgba(201,153,58,0.15)',
          }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px', lineHeight: 1.5 }}>
              💡{' '}
              <strong style={{ color: 'rgba(255,255,255,0.65)' }}>How your Saathi helps you prepare:</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
              Ask your Saathi to explain GRE Maths, IELTS Academic Writing,
              SOP structure, LOR guidance, country-specific education systems,
              or university ranking methodologies. Your Saathi is your academic
              preparation partner — these links are your destination planning tools.
            </p>
          </div>

          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', textAlign: 'center', margin: '4px 0 12px', lineHeight: 1.5 }}>
            Links open in a new tab · EdUsaathiAI is not responsible for
            third-party content · Always verify with official embassy sources
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
