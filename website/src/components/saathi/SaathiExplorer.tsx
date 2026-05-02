'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { SAATHIS } from '@/constants/saathis'

// ─── Crossover discovery data — all 30 Saathis ───────────────────────────────

type SaathiMeta = {
  primary:    string[]   // compact always-visible tags
  crossover:  string[]   // shown on hover
  lure:       string     // the one sentence that makes them click
}

const SAATHI_META: Record<string, SaathiMeta> = {

  maathsaathi: {
    primary:   ['B.Sc / M.Sc Maths', 'JEE', 'IIT JAM', 'GATE MA'],
    crossover: ['Every B.Tech student', 'CA students (quant methods)',
                'UPSC Maths optional', 'Data Science aspirants'],
    lure: 'If numbers appear in your exam — this Saathi belongs in your life.',
  },

  physicsaathi: {
    primary:   ['B.Sc / M.Sc Physics', 'JEE Advanced', 'GATE PH'],
    crossover: ['Every B.Tech first year (Engineering Physics)',
                'Medical Physics students', 'UPSC Physics optional',
                'Aerospace & Mech students'],
    lure: 'Physics is behind every engineering branch. Most students just never had it explained properly.',
  },

  chemsaathi: {
    primary:   ['B.Sc / M.Sc Chemistry', 'NEET', 'CSIR-NET'],
    crossover: ['B.Pharm students', 'B.Tech Chemical / Biotech',
                'Agriculture students', 'NEET Chemistry paper'],
    lure: 'If your course has a chemistry paper — you need a Saathi who only thinks in molecules.',
  },

  biosaathi: {
    primary:   ['B.Sc / M.Sc Biology', 'NEET', 'CSIR-NET Life Sciences'],
    crossover: ['MBBS Year 1–2 (Anatomy, Physiology)', 'B.Pharm students',
                'Biotech students', 'Nursing students'],
    lure: 'Life science is the fastest-growing field in India. Start understanding it at cell level.',
  },

  statssaathi: {
    primary:   ['B.Sc / M.Sc Statistics', 'IIT JAM', 'GATE ST'],
    crossover: ['B.Com students (Quantitative Methods)',
                'CS students (ML foundations)',
                'UPSC (data interpretation in CSAT)',
                'Research students across all subjects'],
    lure: 'Every field now runs on data. StatsSaathi is the most underestimated Saathi in this grid.',
  },

  compsaathi: {
    primary:   ['B.Tech CS / IT', 'BCA', 'GATE CS', 'Placements'],
    crossover: ['B.Sc Physics / Maths (computational methods)',
                'MBA students (digital transformation)',
                'Any student learning to code',
                'Fintech & data science aspirants'],
    lure: "You don't have to be a CS student to think like one. CompSaathi opens that door.",
  },

  elecsaathi: {
    primary:   ['B.Tech Electrical', 'GATE EE', 'ESE', 'State PSE'],
    crossover: ['B.Tech Mech (electrical machines paper)',
                'Electronics students (power electronics)',
                'Energy sector aspirants',
                'EV technology students'],
    lure: "India's power sector is the largest infrastructure story of this decade. Understand it from inside.",
  },

  electronicssaathi: {
    primary:   ['B.Tech Electronics', 'GATE EC', 'BARC', 'VLSI'],
    crossover: ['B.Tech CS (embedded systems, IoT)',
                'Physics students (semiconductor theory)',
                'Aerospace students (avionics)',
                'Anyone building hardware products'],
    lure: 'Every smart device runs on a chip someone designed. That someone could be you.',
  },

  mechsaathi: {
    primary:   ['B.Tech Mechanical', 'GATE ME', 'ESE', 'PSU exams'],
    crossover: ['Civil students (structural mechanics)',
                'Aerospace students (propulsion)',
                'EV enthusiasts (thermal systems)',
                'Manufacturing industry aspirants'],
    lure: 'The physical world is built by mechanical engineers. Every product you use started here.',
  },

  civilsaathi: {
    primary:   ['B.Tech Civil', 'GATE CE', 'ESE', 'State PWD'],
    crossover: ['Architecture students (structural systems)',
                'Geography students (infrastructure planning)',
                'UPSC Engineering Services aspirants',
                'Urban planning students'],
    lure: 'India is building ₹100 lakh crore of infrastructure this decade. Civil engineers are at the centre.',
  },

  'chemengg-saathi': {
    primary:   ['B.Tech Chemical Engineering', 'GATE CH', 'PSU exams'],
    crossover: ['Chemistry students (industrial application)',
                'Pharma students (drug manufacturing)',
                'Biotech students (bioprocessing)',
                'Petroleum / refinery aspirants'],
    lure: 'Chemistry in a lab is science. Chemistry at scale is chemical engineering — and it feeds the world.',
  },

  aerospacesaathi: {
    primary:   ['B.Tech Aerospace', 'IIST', 'GATE AE', 'DRDO / ISRO'],
    crossover: ['Mechanical students (aerodynamics, propulsion)',
                'Physics students (orbital mechanics)',
                'Electronics students (avionics)',
                'Defence aspirants'],
    lure: 'India is building its own rockets. AerospaceSaathi is where that journey starts.',
  },

  biotechsaathi: {
    primary:   ['B.Tech Biotechnology', 'GATE BT', 'CSIR-NET', 'NIPER'],
    crossover: ['Biology students (applied research direction)',
                'Pharma students (drug development)',
                'Agriculture students (GM crops, ICAR)',
                'Medical students (research track)'],
    lure: 'Biotechnology is where biology stops being theoretical and starts changing the world.',
  },

  envirosathi: {
    primary:   ['B.Sc / M.Sc Environmental Science', 'GATE EY', 'NET'],
    crossover: ['Geography students (climate systems)',
                'Agriculture students (sustainable farming)',
                'UPSC aspirants — all streams (Environment = highest Prelims scorer)',
                'Civil students (environmental clearances)'],
    lure: 'The UPSC Prelims Environment section can make or break your score. EnviroSaathi fixes that.',
  },

  agrisaathi: {
    primary:   ['B.Sc Agriculture', 'ICAR NET', 'State PSC Agriculture'],
    crossover: ['Biology students (applied ecology)',
                'Geography students (agricultural geography)',
                'Rural management students',
                'Horticulture and forestry students'],
    lure: '750 agricultural universities. No AI Saathi until now. This one was built for you.',
  },

  medicosaathi: {
    primary:   ['MBBS', 'NEET PG', 'NEXT', 'USMLE'],
    crossover: ['Nursing students (clinical understanding)',
                'Pharma students (clinical pharmacology)',
                'Biology students exploring medicine',
                'Public health students'],
    lure: 'Medicine is the hardest curriculum in India. MedicoSaathi is the study partner MBBS students never had.',
  },

  pharmasaathi: {
    primary:   ['B.Pharm / M.Pharm', 'GPAT', 'NIPER', 'Drug Inspector'],
    crossover: ['MBBS students (pharmacology paper)',
                'Chemistry students (medicinal chemistry)',
                'Biotech students (biopharma)',
                'Regulatory affairs aspirants'],
    lure: 'Every medicine has a story. PharmaSaathi tells you the science behind what heals.',
  },

  nursingsaathi: {
    primary:   ['B.Sc Nursing', 'GNM', 'ANM', 'NCLEX', 'AIIMS Nursing'],
    crossover: ['MBBS students (clinical care context)',
                'Public health students',
                'Allied health courses (OT, Radiology)',
                'Community health workers'],
    lure: 'Nurses make more decisions per hour than any other healthcare professional. This Saathi prepares you for that.',
  },

  kanoonsaathi: {
    primary:   ['LLB / LLM', 'CLAT', 'Judiciary', 'Bar Exam'],
    crossover: ['UPSC aspirants (Constitutional law, GS2)',
                'MBA students (corporate law, contracts)',
                'B.Com students (business law paper)',
                'Journalism students (media law)'],
    lure: 'In India, knowing the law is knowing power. KanoonSaathi is for every citizen, not just lawyers.',
  },

  historysaathi: {
    primary:   ['B.A / M.A History', 'UPSC History optional', 'NET History'],
    crossover: ['UPSC GS1 aspirants — all streams (Ancient, Medieval, Modern India)',
                'Political Science students (historical context)',
                'Architecture students (heritage)',
                'Journalism students'],
    lure: 'History is the highest-scoring GS1 section for most UPSC toppers. Every aspirant needs this.',
  },

  polscisaathi: {
    primary:   ['B.A / M.A Political Science', 'UPSC optional', 'NET Pol Sci'],
    crossover: ['LLB students (Constitutional law context)',
                'Journalism students (political reporting)',
                'UPSC GS2 aspirants — all streams',
                'Public policy students'],
    lure: 'Political Science is how you understand why India works the way it does. Every citizen benefits.',
  },

  econsaathi: {
    primary:   ['B.A / M.A Economics', 'UPSC Economics optional', 'NET Economics'],
    crossover: ['MBA / BBA students (macroeconomics)',
                'B.Com students (economic environment paper)',
                'CA students (Indian economy)',
                'UPSC GS3 aspirants — all streams'],
    lure: 'The RBI, the Budget, the rupee — EconSaathi makes every headline make sense.',
  },

  accountsaathi: {
    primary:   ['B.Com', 'CA Foundation / Inter', 'CMA', 'Class 11–12 Accounts'],
    crossover: ['MBA Finance students (financial reporting)',
                'BBA students (accounting fundamentals)',
                'B.Com students (all papers touch accounts)',
                'Anyone starting a business'],
    lure: "CA is India's most respected professional qualification. AccountSaathi is where that journey begins.",
  },

  finsaathi: {
    primary:   ['B.Com Finance', 'CA / CFA', 'MBA Finance', 'SEBI Grade A'],
    crossover: ['B.Com students (financial management paper)',
                'Economics students (monetary economics)',
                'Engineering students interested in fintech',
                'Stock market aspirants'],
    lure: 'Money moves through systems most people never understand. FinSaathi changes that.',
  },

  bizsaathi: {
    primary:   ['BBA', 'MBA', 'CAT / XAT / MAT preparation'],
    crossover: ['B.Com students (business environment paper)',
                'Engineering students building startups',
                'B.Sc students interested in management',
                'Anyone thinking of entrepreneurship'],
    lure: 'Every engineer who wants to build a company eventually needs to think like a business person.',
  },

  mktsaathi: {
    primary:   ['MBA Marketing', 'BBA Marketing', 'Digital Marketing'],
    crossover: ['B.Com students (marketing management paper)',
                'CS students (growth hacking, product management)',
                'Anyone running a social media presence',
                'Journalism / media students'],
    lure: 'Marketing is how ideas reach people. In the digital age, every professional needs to understand this.',
  },

  hrsaathi: {
    primary:   ['MBA HR', 'BBA HR', 'NET Management', 'Labour Law'],
    crossover: ['B.Com students (human resource management paper)',
                'Psychology students (organisational behaviour)',
                'Public Administration students',
                'Anyone entering the corporate world'],
    lure: 'Every organisation runs on people. HRSaathi is for anyone who will ever work in one.',
  },

  psychsaathi: {
    primary:   ['B.A / M.A Psychology', 'NET Psychology', 'NIMHANS'],
    crossover: ['UPSC GS4 Ethics (emotional intelligence is tested)',
                'MBA students (organisational behaviour)',
                'Medical students (psychiatry rotation)',
                'Anyone who wants to understand people better'],
    lure: "Psychology is the science of why people do what they do. It belongs in every student's toolkit.",
  },

  archsaathi: {
    primary:   ['B.Arch', 'NATA', 'GATE AR', 'Urban Design'],
    crossover: ['Civil students (architectural structures)',
                'History students (architectural heritage)',
                'Geography students (urban planning)',
                'Interior design students'],
    lure: 'Architecture is how civilisations express themselves. ArchSaathi is for those who design the future.',
  },

  geosaathi: {
    primary:   ['B.A / B.Sc Geography', 'UPSC Geography optional', 'NET Geography'],
    crossover: ['Environmental Science students (physical geography)',
                'Agriculture students (soil & agricultural geography)',
                'UPSC GS1 aspirants — all streams (geography is highest-scoring)',
                'Urban planning and GIS aspirants'],
    lure: 'Geography is the highest-scoring UPSC optional. And it explains every climate crisis in the news.',
  },
}

// ─── Curriculum groups ────────────────────────────────────────────────────────

type CurriculumGroup = {
  id:      string
  label:   string
  emoji:   string
  color:   string
  tagline: string
  slugs:   string[]
}

const CURRICULUM_GROUPS: CurriculumGroup[] = [
  {
    id: 'all', label: 'All 30', emoji: '✦', color: '#C9993A',
    tagline: 'Every Saathi. Every subject.',
    slugs: SAATHIS.map((s) => s.id),
  },
  {
    id: 'btech', label: 'B.Tech / B.E', emoji: '⚙️', color: '#0EA5E9',
    tagline: 'Engineering across every branch',
    slugs: ['compsaathi','maathsaathi','physicsaathi','chemsaathi','mechsaathi',
            'elecsaathi','civilsaathi','electronicssaathi','chemengg-saathi',
            'aerospacesaathi','biotechsaathi','envirosaathi'],
  },
  {
    id: 'bsc', label: 'B.Sc / M.Sc', emoji: '🔬', color: '#10B981',
    tagline: 'Pure sciences from cell to cosmos',
    slugs: ['physicsaathi','chemsaathi','biosaathi','maathsaathi',
            'statssaathi','envirosaathi','biotechsaathi','agrisaathi'],
  },
  {
    id: 'bcom', label: 'B.Com / MBA', emoji: '📊', color: '#F59E0B',
    tagline: 'Commerce, finance and business',
    slugs: ['accountsaathi','finsaathi','econsaathi','bizsaathi','mktsaathi','hrsaathi'],
  },
  {
    id: 'ba', label: 'B.A / M.A', emoji: '🏛️', color: '#A78BFA',
    tagline: 'Humanities, social sciences and beyond',
    slugs: ['historysaathi','polscisaathi','psychsaathi','geosaathi','econsaathi','kanoonsaathi'],
  },
  {
    id: 'medical', label: 'Medical', emoji: '🏥', color: '#F43F5E',
    tagline: 'MBBS, Nursing, Pharmacy and allied health',
    slugs: ['medicosaathi','pharmasaathi','nursingsaathi','biosaathi'],
  },
  {
    id: 'law', label: 'LLB / LLM', emoji: '⚖️', color: '#3B82F6',
    tagline: 'Indian law, courts and legal education',
    slugs: ['kanoonsaathi'],
  },
  {
    id: 'upsc', label: 'UPSC', emoji: '🎯', color: '#C9993A',
    tagline: 'Every UPSC optional and GS subject covered',
    slugs: ['kanoonsaathi','historysaathi','polscisaathi','geosaathi','econsaathi',
            'envirosaathi','agrisaathi','maathsaathi','physicsaathi','psychsaathi','statssaathi'],
  },
  {
    id: 'agri', label: 'Agriculture', emoji: '🌾', color: '#84CC16',
    tagline: 'B.Sc Ag, ICAR NET, State PSC Agriculture',
    slugs: ['agrisaathi','biosaathi','envirosaathi','chemsaathi','statssaathi'],
  },
  {
    id: 'arch', label: 'Architecture', emoji: '🏗️', color: '#D97706',
    tagline: 'B.Arch, urban design and heritage',
    slugs: ['archsaathi','civilsaathi'],
  },
]

// ─── Saathi card ──────────────────────────────────────────────────────────────

function SaathiCard({
  saathi,
  dimmed,
  index,
}: {
  saathi:  typeof SAATHIS[0]
  dimmed:  boolean
  index:   number
}) {
  const [hovered, setHovered] = useState(false)
  const meta = SAATHI_META[saathi.id]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: dimmed ? 0.15 : 1, y: 0 }}
      transition={{
        opacity: { duration: 0.25 },
        y: { duration: 0.4, delay: (index % 10) * 0.035 },
        layout: { duration: 0.3 },
      }}
      onMouseEnter={() => !dimmed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <Link
        href={`/login?role=student&saathi=${saathi.id}`}
        tabIndex={dimmed ? -1 : 0}
        aria-hidden={dimmed}
        style={{
          display: 'block',
          borderRadius: '16px',
          padding: '18px 16px',
          background: hovered ? `${saathi.primary}28` : `${saathi.primary}0E`,
          border: hovered
            ? `1px solid ${saathi.accent ?? saathi.primary}65`
            : `0.5px solid ${saathi.primary}28`,
          textDecoration: 'none',
          transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
          boxShadow: hovered ? `0 16px 48px ${saathi.primary}18` : 'none',
          cursor: dimmed ? 'default' : 'pointer',
          pointerEvents: dimmed ? 'none' : 'auto',
        }}
      >
        {/* Live dot */}
        {saathi.isLive && !dimmed && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#4ADE80',
            animation: 'saathi-pulse 2.5s ease infinite',
          }} />
        )}

        {/* Emoji */}
        <div style={{ fontSize: '26px', marginBottom: '8px', lineHeight: 1 }}>
          {saathi.emoji}
        </div>

        {/* Name */}
        <p style={{
          fontSize: '13px', fontWeight: 700, margin: '0 0 3px',
          color: hovered ? '#FFFFFF' : 'rgba(255,255,255,0.88)',
          fontFamily: 'var(--font-display)',
          lineHeight: 1.25, transition: 'color 0.2s',
        }}>
          {saathi.name}
        </p>

        {/* Tagline */}
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.38)',
          margin: '0 0 10px', lineHeight: 1.4,
        }}>
          {saathi.tagline}
        </p>

        {/* Primary audience tags — always visible */}
        {meta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: hovered ? '10px' : '0' }}>
            {meta.primary.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                fontSize: '9px', fontWeight: 600,
                color: saathi.accent ?? saathi.primary,
                background: `${saathi.primary}18`,
                border: `0.5px solid ${saathi.primary}35`,
                borderRadius: '100px', padding: '2px 7px',
                whiteSpace: 'nowrap',
              }}>
                {tag}
              </span>
            ))}
            {meta.primary.length > 3 && !hovered && (
              <span style={{
                fontSize: '9px', fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                borderRadius: '100px', padding: '2px 4px',
              }}>
                +{meta.primary.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Hover reveal: crossover + lure */}
        <AnimatePresence>
          {hovered && meta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ height: '0.5px', background: `${saathi.primary}30`, margin: '8px 0' }} />

              <p style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                margin: '0 0 5px',
              }}>
                Also for
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                {meta.crossover.map((tag) => (
                  <p key={tag} style={{
                    fontSize: '10px', color: 'rgba(255,255,255,0.55)',
                    margin: 0, lineHeight: 1.4,
                    display: 'flex', alignItems: 'flex-start', gap: '5px',
                  }}>
                    <span style={{ color: saathi.accent ?? saathi.primary, flexShrink: 0, marginTop: '1px' }}>›</span>
                    {tag}
                  </p>
                ))}
              </div>

              <div style={{ height: '0.5px', background: `${saathi.primary}25`, margin: '8px 0' }} />

              <p style={{
                fontSize: '11px', fontStyle: 'italic',
                color: 'rgba(255,255,255,0.7)',
                margin: '0 0 10px', lineHeight: 1.55,
              }}>
                &ldquo;{meta.lure}&rdquo;
              </p>

              <p style={{ fontSize: '11px', fontWeight: 700, color: saathi.accent ?? saathi.primary, margin: 0 }}>
                Click to join free →
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SaathiExplorer() {
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const gridRef = useRef<HTMLDivElement>(null)

  const group = CURRICULUM_GROUPS.find((g) => g.id === activeGroup)
    ?? CURRICULUM_GROUPS[0]
  const activeSlugs = new Set(group.slugs)

  function handleTabChange(id: string) {
    setActiveGroup(id)
    if (typeof window !== 'undefined' && window.innerWidth < 768 && gridRef.current) {
      setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '24px', marginBottom: '36px',
      }}>
        <div>
          <div className="section-eyebrow">The 30 Saathis</div>
          <h2 className="section-title">
            Every Indian curriculum.
            <br />
            <em>One soul partner each.</em>
          </h2>
        </div>
        <p className="section-subtitle" style={{ maxWidth: '320px' }}>
          Filter by your stream. Hover any card to see who else benefits —
          you may find a Saathi you didn&apos;t know you needed.
        </p>
      </div>

      {/* Curriculum tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '20px' }}>
        {CURRICULUM_GROUPS.map((g) => {
          const active = activeGroup === g.id
          return (
            <button
              key={g.id}
              onClick={() => handleTabChange(g.id)}
              aria-pressed={active}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '100px',
                border: active
                  ? `1px solid ${g.color}60`
                  : '0.5px solid rgba(255,255,255,0.1)',
                background: active ? `${g.color}14` : 'rgba(255,255,255,0.03)',
                color: active ? g.color : 'rgba(255,255,255,0.45)',
                fontSize: '13px', fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.18s',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span>{g.emoji}</span>
              {g.label}
              {g.id !== 'all' && (
                <span style={{
                  fontSize: '9px', fontWeight: 700,
                  background: active ? `${g.color}22` : 'rgba(255,255,255,0.06)',
                  color: active ? g.color : 'rgba(255,255,255,0.28)',
                  borderRadius: '100px', padding: '1px 6px',
                }}>
                  {g.slugs.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active group tagline */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeGroup}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}
        >
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: group.color,
          }}>
            {group.emoji} {group.label}
          </span>
          <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>{group.tagline}</span>
          {activeGroup !== 'all' && (
            <>
              <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: group.color, fontWeight: 600 }}>
                {group.slugs.length} Saathis highlighted · hover to discover crossovers
              </span>
            </>
          )}
          {activeGroup === 'all' && (
            <>
              <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                Hover any card to see who else benefits
              </span>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Grid */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
          gap: '10px',
          alignItems: 'start',
        }}
      >
        {SAATHIS.map((saathi, i) => (
          <SaathiCard
            key={saathi.id}
            saathi={saathi}
            dimmed={activeGroup !== 'all' && !activeSlugs.has(saathi.id)}
            index={i}
          />
        ))}
      </div>

      {/* Bottom CTA strip */}
      <div style={{
        marginTop: '40px',
        padding: '28px 36px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(201,153,58,0.07), rgba(201,153,58,0.02))',
        border: '0.5px solid rgba(201,153,58,0.18)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '20px',
      }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px',
          }}>
            Your Saathi is in this grid.
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Click any card to begin. First 60 days completely free.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/login?role=student" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#C9993A', color: '#060F1D',
            fontSize: '13px', fontWeight: 700,
            padding: '11px 24px', borderRadius: '10px',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Start free as a Student →
          </Link>
          <Link href="/login?role=faculty" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'transparent', color: 'rgba(255,255,255,0.55)',
            fontSize: '13px', fontWeight: 500,
            padding: '11px 20px', borderRadius: '10px',
            border: '0.5px solid rgba(255,255,255,0.14)',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Join as Faculty
          </Link>
        </div>
      </div>

      {/* Curriculum coverage pills */}
      <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
        {([
          ['B.Tech / B.E', '#0EA5E9'], ['MBBS', '#F43F5E'],
          ['B.Com / CA', '#F59E0B'], ['B.Sc / M.Sc', '#10B981'],
          ['LLB / LLM', '#3B82F6'], ['B.A / M.A', '#A78BFA'],
          ['UPSC', '#C9993A'], ['B.Arch', '#D97706'],
          ['Agriculture', '#84CC16'], ['Masters / PhD', '#EC4899'],
        ] as [string, string][]).map(([label, color]) => (
          <span key={label} style={{
            fontSize: '10px', fontWeight: 600, color,
            background: `${color}10`, border: `0.5px solid ${color}28`,
            borderRadius: '100px', padding: '3px 10px',
          }}>
            {label}
          </span>
        ))}
      </div>

    </div>
  )
}
