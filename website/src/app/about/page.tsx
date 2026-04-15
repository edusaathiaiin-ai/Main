import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | EdUsaathiAI',
  description:
    'We are not a company. We are a conviction. Built in Ahmedabad for every Indian student.',
}

// ── Palette ────────────────────────────────────────────────────────────────────
const GOLD         = '#B8860B'  // dark gold — titles, accents
const GOLD_SOFT    = '#D4A62E'  // highlight on dark-gold areas
const INK          = '#0A0A0A'  // near-black — primary body
const INK_MUTED    = '#3A3A3A'  // secondary body
const INK_SUBTLE   = '#6B6B6B'  // tertiary / captions
const CARD_BG      = '#FDFAF2'  // warm cream — subtle separation from white
const CARD_BORDER  = '1px solid rgba(184, 134, 11, 0.18)'
const RULE         = '1px solid rgba(0, 0, 0, 0.08)'

const TEAM = [
  {
    name: 'Jaydeep Buch',
    initials: 'JB',
    color: GOLD,
    role: 'Founder',
    desc: '25 years helping Indian students navigate TOEFL, GRE, SAT, ACT, and the path to US higher education. PearsonVUE Test Center Administrator. Student counsellor. The person who sat across the table from thousands of young Indians and built this platform as his answer.',
  },
  {
    name: 'Shlok Buch',
    initials: 'SB',
    color: '#1E3A5F',
    role: 'Co-creator, KanoonSaathi',
    desc: 'Final-year LLB, Gujarat University. He co-created the AI companion for law students because he lived the problem. KanoonSaathi speaks the language of Indian law because Shlok made sure of it.',
  },
  {
    name: 'Prarthi',
    initials: 'P',
    color: '#0F4C2A',
    role: 'Chief Critic & BioSaathi Catalyst',
    desc: "Just finished 12th standard. Aspiring biotechnologist. She has been testing EdUsaathiAI since its earliest days — breaking it, questioning it, demanding more. BioSaathi exists partly because of her curiosity and partly because of her refusal to accept answers that weren't good enough.",
  },
  {
    name: 'Jetri Mankad',
    initials: 'JM',
    color: '#0A1628',
    role: 'AerospaceSaathi Ambassador',
    desc: 'Final-year aerospace engineering, SilverOak University. She represents our belief that a student in Ahmedabad should be able to dream about designing spacecraft and working at ISRO. AerospaceSaathi carries her ambition in every conversation.',
  },
]

const FEATURES = [
  {
    icon: '🤖',
    title: '30 specialist Saathis',
    body: 'Each one a subject expert with a distinct personality, built for Indian students, aligned to Indian curricula, aware of Indian exams, and capable of holding a conversation that builds over time.',
  },
  {
    icon: '🧠',
    title: 'Soul memory',
    body: 'Your Saathi remembers you. Not just your name. Your subjects, your struggles, your ambitions, your flame. Every session builds on the last. You are never starting over.',
  },
  {
    icon: '✦',
    title: 'Saathi Horizon',
    body: "Because a student who can see where their subject can take them — the UN, Lincoln's Inn, ISRO, a forensic lab, a green hydrogen plant — is a student who studies with purpose, not just pressure.",
  },
  {
    icon: '👨\u200D🏫',
    title: 'Faculty partnership',
    body: "AI alone is not enough. We are bridging the gap between India's extraordinary educators and the students who need them most. Through verified, accessible, fairly-compensated live sessions.",
  },
  {
    icon: '💬',
    title: 'WhatsApp Saathi',
    body: "Because not every student has a laptop. Many of India's most motivated learners study on a phone with limited data. Your Saathi should be where you are.",
  },
]

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px' }}>
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 0',
          borderBottom: RULE,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: '22px',
            fontWeight: 700,
            color: GOLD,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/login?role=student"
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFFFFF',
            background: GOLD,
            textDecoration: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            transition: 'background 0.15s',
            letterSpacing: '0.01em',
          }}
        >
          Register →
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: '96px', paddingBottom: '64px' }}>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: GOLD,
            margin: '0 0 20px',
          }}
        >
          About Us
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(40px, 7vw, 68px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: INK,
            margin: '0 0 24px',
          }}
        >
          We are not a company.
          <br />
          <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 500 }}>
            We are a conviction.
          </span>
        </h1>
        <p
          style={{
            fontSize: 'clamp(17px, 2vw, 20px)',
            lineHeight: 1.6,
            color: INK_MUTED,
            margin: 0,
            maxWidth: '640px',
          }}
        >
          Built in Ahmedabad, by a small family of people who believe every Indian
          student deserves a learning companion that knows their name — and
          remembers where they are going.
        </p>
      </section>

      {/* Gold rule */}
      <GoldRule />

      {/* ── Who we are ───────────────────────────────────────────────── */}
      <Section title="Who we are">
        <P>
          We are a small group from Ahmedabad who believe that every Indian student
          deserves a learning companion that knows their name, remembers their
          journey, and genuinely cares about where they are going.
        </P>
        <P>
          EdUsaathiAI was built by{' '}
          <strong style={{ color: INK, fontWeight: 700 }}>Jaydeep Buch</strong> —
          25 years spent helping Indian students navigate TOEFL, GRE, SAT, ACT,
          and the path to US higher education. Founder. Test Center Administrator
          for PearsonVUE. Student counsellor. Someone who has sat across the table
          from thousands of young Indians and watched them shrink when they
          realised how much the world&apos;s best education costs — and how little
          of it was built for them.
        </P>
        <blockquote
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(22px, 3vw, 28px)',
            fontWeight: 500,
            fontStyle: 'italic',
            lineHeight: 1.4,
            color: INK,
            margin: '32px 0 0',
            padding: '0 0 0 20px',
            borderLeft: `3px solid ${GOLD}`,
          }}
        >
          This platform is his answer to that moment.
        </blockquote>
      </Section>

      {/* ── The family ───────────────────────────────────────────────── */}
      <Section title="The family that built it with him">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '18px',
            marginTop: '8px',
          }}
        >
          {TEAM.map((m) => (
            <div
              key={m.name}
              style={{
                padding: '26px',
                borderRadius: '16px',
                background: CARD_BG,
                border: CARD_BORDER,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: `${m.color}18`,
                    border: `2px solid ${m.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: m.color,
                    fontFamily: 'var(--font-about-display), serif',
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: INK,
                      margin: '0 0 2px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {m.name}
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: m.color,
                      margin: 0,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {m.role}
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: '15px',
                  color: INK_MUTED,
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── What we are building ─────────────────────────────────────── */}
      <Section title="What we are building — and why">
        <P>
          India has 1.4 billion people. Millions of students who are brilliant,
          hungry, and determined — but who study without reliable internet,
          without access to good mentors, without the money for coaching centres
          that charge ₹50,000 for a course, and without anyone who remembers
          their name from one session to the next.
        </P>
        <P>
          Generic AI exists. ChatGPT exists. But generic AI was not built for a
          first-year nursing student in a small Gujarat town who needs someone to
          explain pharmacology in a way that connects to her life. It was not
          built for a B.Com student in Surat who doesn&apos;t know that becoming
          a forensic accountant is even a possibility. It was not built for the
          LLB student who has never heard of Lincoln&apos;s Inn but could get
          there if someone just told them how.
        </P>
        <P
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: INK,
            lineHeight: 1.5,
            marginTop: '24px',
          }}
        >
          We built EdUsaathiAI for them.
        </P>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            margin: '32px 0 8px',
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                display: 'flex',
                gap: '18px',
                alignItems: 'flex-start',
                padding: '22px',
                borderRadius: '14px',
                background: CARD_BG,
                border: CARD_BORDER,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  flexShrink: 0,
                  lineHeight: 1,
                  marginTop: '2px',
                }}
              >
                {f.icon}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-about-display), serif',
                    fontSize: '19px',
                    fontWeight: 700,
                    color: INK,
                    margin: '0 0 6px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontSize: '15px',
                    color: INK_MUTED,
                    margin: 0,
                    lineHeight: 1.7,
                  }}
                >
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            margin: '40px 0 8px',
            padding: '28px 32px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${GOLD}14 0%, ${GOLD}06 100%)`,
            border: `1px solid ${GOLD}30`,
          }}
        >
          <p
            style={{
              fontSize: '16px',
              color: INK_MUTED,
              margin: '0 0 6px',
              lineHeight: 1.6,
            }}
          >
            All of this.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-about-display), serif',
              fontSize: 'clamp(30px, 4.5vw, 42px)',
              fontWeight: 700,
              color: GOLD,
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            ₹99 a month.
          </p>
          <p
            style={{
              fontSize: '15px',
              color: INK_MUTED,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            Less than a pizza. More than most students have ever had access to.
          </p>
        </div>
      </Section>

      {/* ── Philosophy — full-width band ─────────────────────────────── */}
      <div
        style={{
          margin: '32px -24px',
          padding: '72px 24px',
          background: `linear-gradient(180deg, ${GOLD}08 0%, ${GOLD}04 100%)`,
          borderTop: `1px solid ${GOLD}28`,
          borderBottom: `1px solid ${GOLD}28`,
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: GOLD,
              margin: '0 0 16px',
            }}
          >
            Our Philosophy
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-about-display), serif',
              fontSize: 'clamp(28px, 4.5vw, 40px)',
              fontWeight: 700,
              color: INK,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: '0 0 36px',
            }}
          >
            Three things we <span style={{ color: GOLD }}>believe</span>.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PhilosophyLine n={1}>
              We do not believe AI replaces teachers. We believe AI, used
              honestly, can give every student access to the kind of personalised
              guidance that used to be reserved for the privileged few.
            </PhilosophyLine>
            <PhilosophyLine n={2}>
              We do not believe in generic. We believe in knowing your
              student&apos;s name, their city, their dream, and their next exam —
              and showing up for all of it.
            </PhilosophyLine>
            <PhilosophyLine n={3}>
              We do not believe the gap between a student in South Mumbai and a
              student in a small town in Gujarat is about intelligence. It is
              about access. We are closing that gap — one Saathi at a time.
            </PhilosophyLine>
          </div>
        </div>
      </div>

      {/* ── Closing ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 0 48px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(22px, 3vw, 28px)',
            fontWeight: 500,
            fontStyle: 'italic',
            color: INK,
            lineHeight: 1.55,
            margin: '0 auto 32px',
            maxWidth: '620px',
            letterSpacing: '-0.01em',
          }}
        >
          We are early. We are small. We are building this like a family.
          <br />
          <span style={{ color: GOLD }}>
            And we are just getting started.
          </span>
        </p>

        <Link
          href="/login?role=student"
          style={{
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: 700,
            color: '#FFFFFF',
            background: GOLD,
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: '10px',
            letterSpacing: '0.01em',
            marginBottom: '48px',
          }}
        >
          Start with a Saathi →
        </Link>

        <div
          style={{
            borderTop: RULE,
            paddingTop: '32px',
            marginTop: '16px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-about-display), serif',
              fontSize: '16px',
              fontWeight: 700,
              color: GOLD,
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}
          >
            EdUsaathiAI
          </p>
          <p style={{ fontSize: '13px', color: INK_SUBTLE, margin: '0 0 4px' }}>
            Ahmedabad, Gujarat, India
          </p>
          <p
            style={{
              fontSize: '12px',
              color: INK_SUBTLE,
              margin: '12px 0 0',
              fontStyle: 'italic',
            }}
          >
            Built with love, urgency, and the stubborn belief that Indian
            students deserve better.
          </p>
        </div>
      </section>
    </div>
  )
}

/* ── Shared sub-components ──────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: '56px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-about-display), serif',
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: 700,
          color: GOLD,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          margin: '0 0 24px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function P({
  children,
  style: extraStyle,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <p
      style={{
        fontSize: '17px',
        lineHeight: 1.75,
        color: INK_MUTED,
        margin: '0 0 18px',
        ...extraStyle,
      }}
    >
      {children}
    </p>
  )
}

function PhilosophyLine({
  n,
  children,
}: {
  n: number
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <span
        style={{
          fontFamily: 'var(--font-about-display), serif',
          fontSize: '28px',
          fontWeight: 700,
          fontStyle: 'italic',
          color: GOLD_SOFT,
          lineHeight: 1,
          marginTop: '2px',
          minWidth: '32px',
        }}
      >
        {n}.
      </span>
      <p
        style={{
          fontSize: '17px',
          lineHeight: 1.75,
          color: INK,
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  )
}

function GoldRule() {
  return (
    <div
      style={{
        height: '1px',
        background: `linear-gradient(90deg, transparent 0%, ${GOLD}40 50%, transparent 100%)`,
        margin: '8px 0 56px',
      }}
    />
  )
}
