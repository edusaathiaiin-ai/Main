import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | EdUsaathiAI',
  description:
    'We are not a company. We are a conviction. Built in Ahmedabad for every Indian student.',
}

const GOLD = '#C9993A'
const TEXT_MID = 'rgba(255, 255, 255, 0.60)'
const TEXT_LOW = 'rgba(255, 255, 255, 0.40)'
const CARD_BG = 'rgba(255, 255, 255, 0.03)'
const CARD_BORDER = '1px solid rgba(201, 153, 58, 0.15)'

const TEAM = [
  {
    name: 'Jaydeep Buch',
    initials: 'JB',
    color: '#C9993A',
    role: 'Founder',
    desc: '25 years helping Indian students navigate TOEFL, GRE, SAT, ACT, and the path to US higher education. PearsonVUE Test Center Administrator. Student counsellor. The person who sat across the table from thousands of young Indians and built this platform as his answer.',
  },
  {
    name: 'Shlok Buch',
    initials: 'SB',
    color: '#3B82F6',
    role: 'Co-creator, KanoonSaathi',
    desc: 'Final-year LLB, Gujarat University. He co-created the AI companion for law students because he lived the problem. KanoonSaathi speaks the language of Indian law because Shlok made sure of it.',
  },
  {
    name: 'Prarthi',
    initials: 'P',
    color: '#10B981',
    role: 'Chief Critic & BioSaathi Catalyst',
    desc: 'Just finished 12th standard. Aspiring biotechnologist. She has been testing EdUsaathiAI since its earliest days — breaking it, questioning it, demanding more. BioSaathi exists partly because of her curiosity and partly because of her refusal to accept answers that weren\'t good enough.',
  },
  {
    name: 'Jetri Mankad',
    initials: 'JM',
    color: '#60A5FA',
    role: 'AerospaceSaathi Ambassador',
    desc: 'Final-year aerospace engineering, SilverOak University. She represents our belief that a student in Ahmedabad should be able to dream about designing spacecraft and working at ISRO. AerospaceSaathi carries her ambition in every conversation.',
  },
]

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: '20px', fontWeight: 700, color: GOLD,
            textDecoration: 'none',
          }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/login?role=student"
          style={{
            fontSize: '13px', fontWeight: 600, color: GOLD,
            textDecoration: 'none', padding: '8px 20px',
            borderRadius: '8px', border: `1px solid ${GOLD}40`,
          }}
        >
          Register →
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <p
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 700, lineHeight: 1.1,
            color: '#fff', margin: '0 0 16px',
          }}
        >
          About Us
        </p>
        <p
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 400, fontStyle: 'italic',
            color: GOLD, margin: 0, lineHeight: 1.4,
          }}
        >
          We are not a company. We are a conviction.
        </p>
      </section>

      {/* ── Who we are ───────────────────────────────────────────────── */}
      <Section title="Who we are">
        <P>
          We are a small group of people from Ahmedabad who believe that every Indian
          student deserves a learning companion that knows their name, remembers their
          journey, and genuinely cares about where they are going.
        </P>
        <P>
          EdUsaathiAI was built by Jaydeep Buch — 25 years spent helping Indian students
          navigate TOEFL, GRE, SAT, ACT, and the path to US higher education. Founder.
          Test Center Administrator for PearsonVUE. Student counsellor. Someone who has sat
          across the table from thousands of young Indians and watched them shrink when they
          realised how much the world&apos;s best education costs — and how little of it was
          built for them.
        </P>
        <P>This platform is his answer to that moment.</P>
      </Section>

      {/* ── The family ───────────────────────────────────────────────── */}
      <Section title="The family that built it with him">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px', marginBottom: '32px',
          }}
        >
          {TEAM.map((m) => (
            <div
              key={m.name}
              style={{
                padding: '24px', borderRadius: '16px',
                background: CARD_BG, border: CARD_BORDER,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: `${m.color}20`, border: `2px solid ${m.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700, color: m.color,
                    fontFamily: 'var(--font-about-display), serif',
                    flexShrink: 0,
                  }}
                >
                  {m.initials}
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                    {m.name}
                  </p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: m.color, margin: 0 }}>
                    {m.role}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: TEXT_MID, margin: 0, lineHeight: 1.7 }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── What we are building ─────────────────────────────────────── */}
      <Section title="What we are building and why">
        <P>
          India has 1.4 billion people. Millions of students who are brilliant, hungry,
          and determined — but who study without reliable internet, without access to good
          mentors, without the money for coaching centres that charge ₹50,000 for a course,
          and without anyone who remembers their name from one session to the next.
        </P>
        <P>
          Generic AI exists. ChatGPT exists. But generic AI was not built for a first-year
          nursing student in a small Gujarat town who needs someone to explain pharmacology
          in a way that connects to her life. It was not built for a B.Com student in Surat
          who doesn&apos;t know that becoming a forensic accountant is even a possibility.
          It was not built for the LLB student who has never heard of Lincoln&apos;s Inn but
          could get there if someone just told them how.
        </P>
        <P style={{ color: '#fff', fontWeight: 600 }}>We built EdUsaathiAI for them.</P>

        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: '16px',
            margin: '32px 0',
          }}
        >
          {[
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
              body: 'Because a student who can see where their subject can take them — the UN, Lincoln\'s Inn, ISRO, a forensic lab, a green hydrogen plant — is a student who studies with purpose, not just pressure.',
            },
            {
              icon: '👨\u200D🏫',
              title: 'Faculty partnership',
              body: 'AI alone is not enough. We are bridging the gap between India\'s extraordinary educators and the students who need them most. Through verified, accessible, fairly-compensated live sessions.',
            },
            {
              icon: '💬',
              title: 'WhatsApp Saathi',
              body: 'Because not every student has a laptop. Many of India\'s most motivated learners study on a phone with limited data. Your Saathi should be where you are.',
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                padding: '20px', borderRadius: '14px',
                background: CARD_BG, border: CARD_BORDER,
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                  {f.title}
                </p>
                <p style={{ fontSize: '14px', color: TEXT_MID, margin: 0, lineHeight: 1.7 }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <P>
          All of this. At <strong style={{ color: GOLD }}>₹99 a month</strong>.
        </P>
        <P>Less than a pizza. More than most students have ever had access to.</P>
      </Section>

      {/* ── Philosophy — full-width block ────────────────────────────── */}
      <div
        style={{
          margin: '40px -24px', padding: '60px 24px',
          background: 'rgba(201, 153, 58, 0.06)',
          borderTop: '1px solid rgba(201, 153, 58, 0.18)',
          borderBottom: '1px solid rgba(201, 153, 58, 0.18)',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-about-display), serif',
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700, color: GOLD,
              margin: '0 0 28px',
            }}
          >
            Our philosophy
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PhilosophyLine>
              We do not believe AI replaces teachers. We believe AI, used honestly, can give
              every student access to the kind of personalised guidance that used to be reserved
              for the privileged few.
            </PhilosophyLine>
            <PhilosophyLine>
              We do not believe in generic. We believe in knowing your student&apos;s name, their
              city, their dream, and their next exam — and showing up for all of it.
            </PhilosophyLine>
            <PhilosophyLine>
              We do not believe the gap between a student in South Mumbai and a student in a small
              town in Gujarat is about intelligence. It is about access. We are closing that gap —
              one Saathi at a time.
            </PhilosophyLine>
          </div>
        </div>
      </div>

      {/* ── Closing ──────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 0 40px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-about-display), serif',
            fontSize: 'clamp(18px, 3vw, 22px)',
            fontWeight: 500, fontStyle: 'italic',
            color: TEXT_MID, lineHeight: 1.7,
            margin: '0 0 40px', maxWidth: '600px',
            marginLeft: 'auto', marginRight: 'auto',
          }}
        >
          We are early. We are small. We are building this like a family.
          <br />
          And we are just getting started.
        </p>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '32px',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 600, color: TEXT_LOW, margin: '0 0 6px' }}>
            EdUsaathiAI
          </p>
          <p style={{ fontSize: '13px', color: TEXT_LOW, margin: '0 0 4px' }}>
            Ahmedabad, Gujarat, India
          </p>
          <p
            style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.25)',
              margin: '12px 0 0', fontStyle: 'italic',
            }}
          >
            Built with love, urgency, and the stubborn belief that Indian students deserve better.
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
    <section style={{ marginBottom: '48px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-about-display), serif',
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontWeight: 700, color: GOLD,
          margin: '0 0 20px',
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
        fontSize: '16px', lineHeight: 1.8,
        color: TEXT_MID, margin: '0 0 16px',
        ...extraStyle,
      }}
    >
      {children}
    </p>
  )
}

function PhilosophyLine({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <span style={{ color: GOLD, fontSize: '18px', marginTop: '2px', flexShrink: 0 }}>
        ✦
      </span>
      <p
        style={{
          fontSize: '16px', lineHeight: 1.8,
          color: 'rgba(255, 255, 255, 0.70)',
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  )
}
