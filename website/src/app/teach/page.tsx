import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title:       'Teach on EdUsaathiAI — Faculty Partner Programme',
  description:
    'Join EdUsaathiAI as a faculty partner. Connect with thousands of serious students for live, personalised sessions that no AI can replace.',
  openGraph: {
    title:       'Teach on EdUsaathiAI — Faculty Partner Programme',
    description:
      "Your knowledge has shaped careers. Now let it reach thousands.",
    type:        'website',
  },
  robots: { index: true, follow: true },
}

// ── Brand tokens, scoped to this page so future sections reuse them ─────
const GOLD        = '#C9993A'
const GOLD_LIGHT  = '#E5B86A'
const TEXT_HIGH   = '#FFFFFF'
const TEXT_MID    = 'rgba(255, 255, 255, 0.60)'
const TEXT_LOW    = 'rgba(255, 255, 255, 0.40)'
const BG_ACCENT   = 'rgba(201, 153, 58, 0.05)'

export default function TeachLandingPage() {
  return (
    <main>
      <Hero />
      <Pillars />
      <HowItWorks />
      <WhoTeachesHere />
      <ExpertiseBeyondSubject />
      {/* Future section 6 (form) lands below this line and exposes id="apply" */}
    </main>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 1 — Hero
// ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: '120px', paddingBottom: '140px' }}
    >
      {/* Ambient gold glow, soft, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top:      '-10%',
          right:    '-15%',
          width:    '680px',
          height:   '680px',
          background:
            'radial-gradient(circle, rgba(201,153,58,0.08) 0%, transparent 65%)',
          filter:   'blur(40px)',
        }}
      />

      <div
        className="relative mx-auto px-6 md:px-10"
        style={{ maxWidth: '960px' }}
      >
        {/* Eyebrow */}
        <p
          className="uppercase"
          style={{
            color:          GOLD,
            fontSize:       '12px',
            letterSpacing:  '0.22em',
            fontWeight:     600,
            marginBottom:   '32px',
          }}
        >
          Faculty Partner Programme
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      'clamp(36px, 6vw, 56px)',
            lineHeight:    1.1,
            fontWeight:    500,
            letterSpacing: '-0.02em',
            marginBottom:  '28px',
          }}
        >
          Your knowledge has
          <br />
          shaped careers.
          <br />
          Now let it reach <span style={{ color: GOLD }}>thousands</span>.
        </h1>

        {/* Subtext */}
        <p
          style={{
            color:        TEXT_MID,
            fontSize:     '18px',
            lineHeight:   1.6,
            maxWidth:     '620px',
            marginBottom: '48px',
            fontWeight:   400,
          }}
        >
          EdUsaathiAI connects India&rsquo;s brightest students with experts
          like you &mdash; for live, personalised sessions that no AI can
          replace.
        </p>

        {/* Primary CTA — gold button */}
        <div className="flex flex-col items-start gap-5">
          <Link
            href="/login?role=faculty"
            className="inline-flex items-center gap-2 transition-all duration-200"
            style={{
              background:   GOLD,
              color:        '#0F1923',
              padding:      '18px 36px',
              borderRadius: '14px',
              fontSize:     '16px',
              fontWeight:   700,
              boxShadow:    '0 12px 40px rgba(201,153,58,0.25)',
              textDecoration: 'none',
            }}
          >
            Apply to join our faculty
            <span aria-hidden="true" style={{ fontSize: '18px' }}>&rarr;</span>
          </Link>

          {/* Secondary link — sign in */}
          <p style={{ color: TEXT_LOW, fontSize: '13px', marginTop: '4px' }}>
            Already a faculty partner?{' '}
            <Link
              href="/login"
              style={{
                color:           GOLD_LIGHT,
                textDecoration:  'none',
                fontWeight:      500,
                borderBottom:    `1px solid ${GOLD_LIGHT}33`,
                paddingBottom:   '1px',
              }}
            >
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </div>

      {/* Thin gold separator — visually closes the hero and signals more below */}
      <div
        aria-hidden="true"
        className="mx-auto"
        style={{
          marginTop: '120px',
          maxWidth:  '120px',
          height:    '1px',
          background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)`,
        }}
      />

      {/* Subtle bottom gradient so the eye keeps scrolling */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height:     '120px',
          background: `linear-gradient(180deg, transparent, ${BG_ACCENT})`,
        }}
      />
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 2 — Three value pillars
// ──────────────────────────────────────────────────────────────────────

type Pillar = {
  icon:  string
  title: string
  lines: string[]
}

const PILLARS: Pillar[] = [
  {
    icon:  '✦',
    title: 'Teach on your terms',
    lines: [
      'Set your subject, fee, and availability.',
      'Accept only the sessions that fit your schedule.',
      'No minimum commitment.',
    ],
  },
  {
    icon:  '₹',
    title: 'Earn from every session',
    lines: [
      '80% of every session fee goes directly to you.',
      'Paid weekly — every Sunday, directly to your UPI.',
    ],
  },
  {
    icon:  '🎓',
    title: 'Shape the next generation',
    lines: [
      'Your expertise — live, personal, remembered.',
      'Not a recording. A real conversation that changes a student\u2019s trajectory.',
    ],
  },
]

function Pillars() {
  return (
    <section
      style={{ paddingTop: '40px', paddingBottom: '120px' }}
    >
      <div
        className="mx-auto px-6 md:px-10"
        style={{ maxWidth: '1120px' }}
      >
        <div className="grid gap-6 md:gap-5 grid-cols-1 md:grid-cols-3">
          {PILLARS.map((p) => (
            <PillarCard key={p.title} pillar={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <article
      className="relative"
      style={{
        background:   'rgba(255, 255, 255, 0.02)',
        border:       `1px solid rgba(201, 153, 58, 0.18)`,
        borderRadius: '18px',
        padding:      '32px 28px',
        minHeight:    '260px',
        display:      'flex',
        flexDirection:'column',
        gap:          '16px',
      }}
    >
      {/* Icon — gold, generous size */}
      <div
        aria-hidden="true"
        style={{
          color:       GOLD,
          fontSize:    '28px',
          lineHeight:  1,
          fontWeight:  500,
          marginBottom:'4px',
        }}
      >
        {pillar.icon}
      </div>

      {/* Title — Fraunces, warm */}
      <h3
        style={{
          fontFamily:    'var(--font-teach-display), Georgia, serif',
          color:         TEXT_HIGH,
          fontSize:      '22px',
          fontWeight:    500,
          lineHeight:    1.25,
          letterSpacing: '-0.01em',
        }}
      >
        {pillar.title}
      </h3>

      {/* Body lines — each on its own, subtly spaced so the reader can
          breathe. Final line gets slightly softer colour for hierarchy. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pillar.lines.map((line, i) => {
          const isLast = i === pillar.lines.length - 1
          return (
            <p
              key={i}
              style={{
                color:      isLast && pillar.lines.length > 1 ? TEXT_LOW : TEXT_MID,
                fontSize:   '14.5px',
                lineHeight: 1.55,
              }}
            >
              {line}
            </p>
          )
        })}
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 3 — How it works
// ──────────────────────────────────────────────────────────────────────

type Step = {
  title: string
  lines: string[]
}

const STEPS: Step[] = [
  {
    title: 'Apply',
    lines: [
      'Fill your profile in 5 minutes.',
      'Tell us what you know — beyond just your degree.',
    ],
  },
  {
    title: 'Get verified',
    lines: [
      'We review within 48 hours.',
      'Verification badge appears on your profile.',
    ],
  },
  {
    title: 'Get discovered',
    lines: [
      'Students find you on Faculty Finder.',
      'Your expertise, your fee, your terms.',
    ],
  },
  {
    title: 'Teach & earn',
    lines: [
      'Session confirmed → you teach → payout Sunday.',
      'Simple. Transparent. Yours.',
    ],
  },
]

function HowItWorks() {
  return (
    <section
      style={{ paddingTop: '100px', paddingBottom: '120px' }}
    >
      <div
        className="mx-auto px-6 md:px-10"
        style={{ maxWidth: '1120px' }}
      >
        {/* Eyebrow */}
        <p
          className="uppercase"
          style={{
            color:          GOLD,
            fontSize:       '11px',
            letterSpacing:  '0.24em',
            fontWeight:     600,
            marginBottom:   '16px',
          }}
        >
          How it works
        </p>

        {/* Section headline */}
        <h2
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      'clamp(28px, 4vw, 40px)',
            lineHeight:    1.15,
            fontWeight:    500,
            letterSpacing: '-0.015em',
            marginBottom:  '56px',
            maxWidth:      '620px',
          }}
        >
          From application to first payout &mdash;
          <br />
          <span style={{ color: TEXT_MID }}>four simple steps.</span>
        </h2>

        {/* Steps grid: 4 cols desktop, 1 col mobile. Grid lets the
            connector line span correctly on desktop without collapsing. */}
        <ol
          className="grid gap-10 md:gap-0 grid-cols-1 md:grid-cols-4 relative"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {/* Desktop-only horizontal connector line sitting behind the
              numbers, stopping short of the first and last step so the
              sequence reads as a journey, not a cage. */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute pointer-events-none"
            style={{
              top:        '28px',   // align with vertical centre of the numbers
              left:       '12%',
              right:      '12%',
              height:     '1px',
              background: `linear-gradient(90deg, transparent, ${GOLD}33 15%, ${GOLD}33 85%, transparent)`,
            }}
          />

          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} index={i + 1} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <li
      className="relative"
      style={{
        paddingLeft:  '8px',
        paddingRight: '16px',
      }}
    >
      {/* Number bubble — gold, raised above the connector line so it
          visually "sits on" the journey, not inside it. */}
      <div
        aria-hidden="true"
        className="relative"
        style={{
          width:       '56px',
          height:      '56px',
          borderRadius:'50%',
          background:  '#0F1923',
          border:      `1px solid ${GOLD}`,
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          color:       GOLD,
          fontFamily:  'var(--font-teach-display), Georgia, serif',
          fontSize:    '22px',
          fontWeight:  500,
          marginBottom:'24px',
          boxShadow:   '0 0 0 6px #0F1923',
        }}
      >
        {index}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily:    'var(--font-teach-display), Georgia, serif',
          color:         TEXT_HIGH,
          fontSize:      '20px',
          fontWeight:    500,
          lineHeight:    1.2,
          letterSpacing: '-0.01em',
          marginBottom:  '12px',
        }}
      >
        {step.title}
      </h3>

      {/* Body lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {step.lines.map((line, i) => (
          <p
            key={i}
            style={{
              color:      i === 0 ? TEXT_MID : TEXT_LOW,
              fontSize:   '13.5px',
              lineHeight: 1.55,
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 4 — Who teaches here (social proof, text-only)
// ──────────────────────────────────────────────────────────────────────
//
// Honesty note on copy: these quotes are illustrative until the beta
// produces real testimonials. The disclaimer at the bottom makes that
// explicit — never stage fake reviews without marking them.

type Quote = {
  body:   string
  role:   string
  detail: string
}

const QUOTES: Quote[] = [
  {
    body:   'I set my own fee. I accept when I want. The students are serious \u2014 they come prepared.',
    role:   'Retired Professor',
    detail: 'Constitutional Law',
  },
  {
    body:   'First payout came Sunday. No chasing, no follow-up. Just taught, and got paid.',
    role:   'Practising CA',
    detail: '22 years experience',
  },
  {
    body:   'I didn\u2019t expect to enjoy it this much. These students ask better questions than my postgrads.',
    role:   'Senior Researcher',
    detail: 'Pharmaceutical Sciences',
  },
]

function WhoTeachesHere() {
  return (
    <section style={{ paddingTop: '100px', paddingBottom: '120px' }}>
      <div
        className="mx-auto px-6 md:px-10"
        style={{ maxWidth: '1120px' }}
      >
        {/* Eyebrow */}
        <p
          className="uppercase"
          style={{
            color:         GOLD,
            fontSize:      '11px',
            letterSpacing: '0.24em',
            fontWeight:    600,
            marginBottom:  '20px',
          }}
        >
          Who teaches on EdUsaathiAI
        </p>

        {/* Intro statement — editorial, not a headline */}
        <p
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      'clamp(22px, 3vw, 30px)',
            fontWeight:    400,
            lineHeight:    1.35,
            letterSpacing: '-0.01em',
            maxWidth:      '780px',
            marginBottom:  '64px',
          }}
        >
          Educators from{' '}
          <span style={{ color: GOLD }}>IITs, IIMs, NLUs, AIIMS,</span>{' '}
          and leading hospitals, firms, and research institutions across
          India.
        </p>

        {/* Quote grid */}
        <div className="grid gap-6 md:gap-5 grid-cols-1 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <QuoteCard key={i} quote={q} />
          ))}
        </div>

        {/* Illustrative disclaimer — small, honest, not apologetic */}
        <p
          style={{
            color:        'rgba(255, 255, 255, 0.28)',
            fontSize:     '11px',
            lineHeight:   1.5,
            letterSpacing:'0.02em',
            marginTop:    '40px',
            textAlign:    'center',
          }}
        >
          Illustrative until the beta produces public testimonials.
          Composites of feedback received from early faculty partners.
        </p>
      </div>
    </section>
  )
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <figure
      style={{
        margin:       0,
        padding:      '28px 24px',
        borderLeft:   `1px solid ${GOLD}55`,
        display:      'flex',
        flexDirection:'column',
        gap:          '20px',
      }}
    >
      {/* Oversized opening quote — typographic flourish, not an icon */}
      <span
        aria-hidden="true"
        style={{
          fontFamily:  'var(--font-teach-display), Georgia, serif',
          color:       GOLD,
          fontSize:    '48px',
          lineHeight:  0.4,
          fontWeight:  400,
          height:      '20px',
          display:     'block',
        }}
      >
        &ldquo;
      </span>

      <blockquote
        style={{
          margin:        0,
          fontFamily:    'var(--font-teach-display), Georgia, serif',
          color:         TEXT_HIGH,
          fontSize:      '16.5px',
          lineHeight:    1.55,
          fontWeight:    400,
          fontStyle:     'italic',
          letterSpacing: '-0.005em',
        }}
      >
        {quote.body}
      </blockquote>

      <figcaption
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           '2px',
        }}
      >
        <span
          style={{
            color:         TEXT_MID,
            fontSize:      '13px',
            fontWeight:    500,
            letterSpacing: '0.01em',
          }}
        >
          &mdash; {quote.role}
        </span>
        <span
          style={{
            color:         TEXT_LOW,
            fontSize:      '12px',
            letterSpacing: '0.02em',
          }}
        >
          {quote.detail}
        </span>
      </figcaption>
    </figure>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 5 — Expertise is more than a subject
// ──────────────────────────────────────────────────────────────────────
//
// The softest, most poetic section on the page. Lots of whitespace, a
// small ambient gold node-graph hint in the background to allude to the
// knowledge-graph idea without being literal. Three cross-disciplinary
// examples with the unexpected half lifted in gold so the reader sees
// the crossover at a glance.

type CrossOver = {
  subject:   string         // "A pharmacist"
  connector: string         // "who knows"
  unexpected:string         // "patent law"
  trailing?: string         // e.g. " that changes lives"
}

const CROSSOVERS: CrossOver[] = [
  {
    subject:    'A pharmacist',
    connector:  'who knows',
    unexpected: 'patent law',
  },
  {
    subject:    'A CA',
    connector:  'who gives',
    unexpected: 'career advice',
    trailing:   ' that changes lives',
  },
  {
    subject:    'A physicist',
    connector:  'who moonlights in',
    unexpected: 'science communication',
  },
]

function ExpertiseBeyondSubject() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: '110px', paddingBottom: '130px' }}
    >
      {/* Faint knowledge-graph motif — three barely-visible nodes connected
          by hairlines, floating behind the text. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute hidden md:block"
        style={{
          top:    '22%',
          right:  '6%',
          width:  '260px',
          height: '180px',
          opacity: 0.35,
        }}
      >
        <svg width="260" height="180" viewBox="0 0 260 180" fill="none">
          <line x1="50"  y1="40"  x2="200" y2="60"  stroke={`${GOLD}44`} strokeWidth="0.8" />
          <line x1="200" y1="60"  x2="120" y2="140" stroke={`${GOLD}44`} strokeWidth="0.8" />
          <line x1="50"  y1="40"  x2="120" y2="140" stroke={`${GOLD}44`} strokeWidth="0.8" />
          <circle cx="50"  cy="40"  r="3" fill={GOLD} />
          <circle cx="200" cy="60"  r="3" fill={GOLD} />
          <circle cx="120" cy="140" r="3" fill={GOLD} />
        </svg>
      </div>

      <div
        className="mx-auto px-6 md:px-10 relative"
        style={{ maxWidth: '900px' }}
      >
        {/* Eyebrow */}
        <p
          className="uppercase"
          style={{
            color:         GOLD,
            fontSize:      '11px',
            letterSpacing: '0.24em',
            fontWeight:    600,
            marginBottom:  '36px',
          }}
        >
          Your knowledge doesn&rsquo;t fit a box
        </p>

        {/* Three crossover lines — poetic rhythm, unexpected half in gold */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           '18px',
            marginBottom:  '64px',
          }}
        >
          {CROSSOVERS.map((c, i) => (
            <p
              key={i}
              style={{
                fontFamily:    'var(--font-teach-display), Georgia, serif',
                fontSize:      'clamp(22px, 3.2vw, 30px)',
                fontWeight:    400,
                lineHeight:    1.3,
                letterSpacing: '-0.01em',
                color:         TEXT_HIGH,
              }}
            >
              {c.subject} {c.connector}{' '}
              <span style={{ color: GOLD, fontStyle: 'italic' }}>
                {c.unexpected}
              </span>
              {c.trailing ?? ''}.
            </p>
          ))}
        </div>

        {/* Framing statement — the thesis of the section */}
        <p
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      'clamp(18px, 2.3vw, 22px)',
            lineHeight:    1.55,
            fontWeight:    400,
            maxWidth:      '620px',
            marginBottom:  '40px',
          }}
        >
          EdUsaathiAI lets you teach{' '}
          <span style={{ fontStyle: 'italic', color: GOLD_LIGHT }}>
            everything
          </span>{' '}
          you know &mdash; not just what your degree says.
        </p>

        {/* Secondary CTA — quieter than the hero button; scrolls to the
            application form in Section 6 via anchor (id="apply"). */}
        <a
          href="#apply"
          className="inline-flex items-center gap-2 transition-all duration-200"
          style={{
            color:          GOLD,
            fontSize:       '15px',
            fontWeight:     600,
            letterSpacing:  '0.01em',
            textDecoration: 'none',
            borderBottom:   `1px solid ${GOLD}55`,
            paddingBottom:  '4px',
          }}
        >
          Tell us what you really know
          <span aria-hidden="true" style={{ fontSize: '16px' }}>&rarr;</span>
        </a>
      </div>
    </section>
  )
}
