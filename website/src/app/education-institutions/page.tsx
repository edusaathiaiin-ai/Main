// ─────────────────────────────────────────────────────────────────────────────
// /education-institutions — public landing page for schools, colleges, and
// universities joining EdUsaathiAI's classroom layer. Distinct from the older
// "Institution" role surface (/institution) used for B2B internship posting.
//
// Hero → 3 benefit cards → 9-tile subject grid → how-it-works → pricing.
// Static content, Server Component. Primary CTA routes to
// /education-institutions/register (public); "See pricing" uses a hash anchor
// with smooth-scroll already set globally on html in globals.css.
//
// Middleware exposes the whole /education-institutions tree so no login bounce.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'EdUsaathiAI for Education Institutions — A research-grade classroom for every subject',
  description:
    'Bring AI-powered interactive classrooms to your entire institution. 30 subject companions, permanent Research Archive, principal analytics + NAAC report. ₹89 per student per month. 7-day free trial, no credit card.',
}

// ── 9 showcase Saathis for the subject grid (3×3) ───────────────────────────
// Picked for visual punch + mainstream recognition; the "+ 21 more" line
// below the grid flags breadth without overwhelming the page.
type ShowcaseTile = {
  emoji: string
  name:  string
  subject: string
  tools: string[]
}

const SHOWCASE: ShowcaseTile[] = [
  { emoji: '⚛️', name: 'PhysicsSaathi',   subject: 'Physics',           tools: ['GeoGebra', 'PhET sims', 'Wolfram Alpha'] },
  { emoji: '🧪', name: 'ChemSaathi',      subject: 'Chemistry',         tools: ['PubChem', '3Dmol.js', 'Ketcher'] },
  { emoji: '🧬', name: 'BioSaathi',       subject: 'Biology',           tools: ['RCSB PDB', 'UniProt', 'PubMed'] },
  { emoji: '🏥', name: 'MedicoSaathi',    subject: 'Medicine',          tools: ['Anatomy viewer', 'openFDA', 'PubMed'] },
  { emoji: '⚖️', name: 'KanoonSaathi',    subject: 'Law',               tools: ['Indian Kanoon', 'BNS 2023', 'PDF annotations'] },
  { emoji: '💻', name: 'CompSaathi',      subject: 'Computer Science',  tools: ['Monaco editor', 'Piston runtime', 'Live code'] },
  { emoji: '📐', name: 'MaathSaathi',     subject: 'Mathematics',       tools: ['GeoGebra CAS', 'Wolfram Alpha', 'SageMath'] },
  { emoji: '🚀', name: 'AerospaceSaathi', subject: 'Aerospace',         tools: ['NASA datasets', 'ISRO Bhuvan', 'Orbit tools'] },
  { emoji: '📈', name: 'BizSaathi',       subject: 'Commerce',          tools: ['Case studies', 'data.gov.in', 'FRED series'] },
]

const BENEFITS = [
  {
    eyebrow: 'Interactive classroom',
    title: '30 subjects. One platform.',
    body: '3D protein structures, live code editors, chemistry simulators, legal research — each subject gets tools built for it. Faculty teach. The platform handles the rest.',
    emoji: '🎓',
  },
  {
    eyebrow: 'Research Archive',
    title: 'Every session, a scientific record.',
    body: 'Not a screenshot. A permanent, reconstructable notebook of everything explored — queries run, molecules viewed, papers cited. Students can reopen any past session, live.',
    emoji: '📒',
  },
  {
    eyebrow: 'Principal + NAAC',
    title: 'One dashboard. One-click NAAC report.',
    body: 'Session hours, student engagement, subject-level usage. Aggregate-only — never individual student data. Generate your NAAC compliance report in a single click.',
    emoji: '📊',
  },
]

const STEPS = [
  { n: '01', title: 'Register in 3 minutes',      body: 'Short form, no credit card, no commitment. Just tell us about your institution.' },
  { n: '02', title: 'We call you within 48 hours', body: 'Site Admin personally walks your team through the platform. Questions answered before trial starts.' },
  { n: '03', title: 'Free 7-day trial',           body: 'Full access to every Saathi, every tool, every classroom feature. Nothing gated.' },
  { n: '04', title: 'Students never leave the app', body: 'Chat, classroom, notes, research — all under one roof. No tab-switching, no context loss.' },
]

const PRICING_INCLUDES = [
  'All 30 Saathis',
  'Interactive classroom for every subject',
  'Research Archive for every student',
  'AI Teaching Assistant in every session',
  'Principal dashboard + NAAC report',
  '3 hours/day classroom window (weekdays)',
  'WhatsApp notifications',
]

export default function InstitutionsLandingPage() {
  return (
    <main style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(56px, 10vw, 112px) 20px clamp(48px, 8vw, 80px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--gold)', margin: 0,
          }}>
            For institutions
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5.5vw, 56px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            margin: '14px 0 20px',
            color: 'var(--text-primary)',
          }}>
            Your faculty&apos;s knowledge deserves better tools.
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            maxWidth: 720,
            margin: '0 auto 36px',
          }}>
            EdUsaathiAI gives every professor in your institution a
            research-grade interactive classroom. No training required.
            No new hardware. Just better teaching.
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Link
              href="/education-institutions/register"
              className="btn btn-primary btn-large"
              style={{
                padding: '16px 28px',
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Start Free Trial — 7 Days →
            </Link>
            <a
              href="#pricing"
              className="btn btn-secondary btn-large"
              style={{
                padding: '16px 24px',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              See Pricing →
            </a>
          </div>

          <p style={{
            fontSize: 12, color: 'var(--text-tertiary)',
            margin: '20px 0 0',
            letterSpacing: 0.2,
          }}>
            ✦ No credit card · Personal call from Site Admin · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── BENEFITS (3 cards) ─────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(56px, 8vw, 88px) 20px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}>
            {BENEFITS.map((b) => (
              <article
                key={b.eyebrow}
                className="card"
                style={{ padding: 28 }}
              >
                <span style={{
                  display: 'inline-flex',
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--saathi-light)',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 16,
                }} aria-hidden="true">
                  {b.emoji}
                </span>
                <p style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                  textTransform: 'uppercase', color: 'var(--gold)',
                  margin: '0 0 6px',
                }}>
                  {b.eyebrow}
                </p>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20, fontWeight: 700,
                  lineHeight: 1.3, letterSpacing: '-0.01em',
                  margin: '0 0 10px',
                  color: 'var(--text-primary)',
                }}>
                  {b.title}
                </h3>
                <p style={{
                  fontSize: 14, lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}>
                  {b.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECT GRID (3×3) ─────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(56px, 8vw, 88px) 20px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--gold)',
              margin: 0,
            }}>
              Subjects covered
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              margin: '10px 0 10px',
              color: 'var(--text-primary)',
            }}>
              Built for your real curriculum.
            </h2>
            <p style={{
              fontSize: 15, color: 'var(--text-secondary)',
              margin: 0, maxWidth: 560, marginInline: 'auto',
            }}>
              Each Saathi is a subject specialist with the tools professionals
              in that field actually use.
            </p>
          </header>

          {/* Tile + CTA hover styles — local to this section so the rest of
              the marketing page stays unaffected. CSS-only hover keeps the
              page a Server Component (no React state required). */}
          <style>{`
            .saathi-tile{
              transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            }
            .saathi-tile:hover{
              transform: translateY(-3px);
              border-color: var(--gold);
              box-shadow: var(--elevation-3-hover);
            }
            .saathi-more-cta{
              transition: color 0.2s ease, border-color 0.2s ease;
              border-bottom: 1px dashed transparent;
            }
            .saathi-more-cta:hover{
              color: var(--gold);
              border-bottom-color: var(--gold);
            }
          `}</style>

          <div style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}>
            {SHOWCASE.map((t) => (
              <Link
                key={t.name}
                href="/#saathis"
                className="saathi-tile"
                style={{
                  padding: 20,
                  borderRadius: 'var(--radius-std)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--elevation-2)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{t.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: 11, letterSpacing: 0.6, fontWeight: 700,
                      textTransform: 'uppercase', color: 'var(--text-ghost)',
                      margin: 0,
                    }}>
                      {t.subject}
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16, fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: '2px 0 0',
                    }}>
                      {t.name}
                    </p>
                  </div>
                </div>
                <p style={{
                  fontSize: 12, color: 'var(--text-secondary)',
                  lineHeight: 1.55, margin: 0,
                }}>
                  {t.tools.join(' · ')}
                </p>
              </Link>
            ))}
          </div>

          <div style={{
            marginTop: 28,
            textAlign: 'center',
          }}>
            <Link
              href="/#saathis"
              className="saathi-more-cta"
              style={{
                display: 'inline-block',
                fontSize: 14,
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                textDecoration: 'none',
                paddingBottom: 1,
              }}
            >
              + 21 more subjects covered — see the full 30 Saathi library →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (4 steps) ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(56px, 8vw, 88px) 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--gold)',
              margin: 0,
            }}>
              How it works
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              margin: '10px 0 0',
              color: 'var(--text-primary)',
            }}>
              From signup to live classroom in a week.
            </h2>
          </header>

          <ol style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}>
            {STEPS.map((s) => (
              <li
                key={s.n}
                style={{
                  padding: 24,
                  borderRadius: 'var(--radius-std)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
                  color: 'var(--gold)', display: 'block', marginBottom: 8,
                }}>
                  {s.n}
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 17, fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 6px', lineHeight: 1.3,
                }}>
                  {s.title}
                </h3>
                <p style={{
                  fontSize: 13.5,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6, margin: 0,
                }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          padding: 'clamp(56px, 8vw, 88px) 20px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-subtle)',
          scrollMarginTop: 24,
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--gold)',
              margin: 0,
            }}>
              Pricing
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              margin: '10px 0 0',
              color: 'var(--text-primary)',
            }}>
              Simple, institution-wide.
            </h2>
          </header>

          <div
            className="card"
            style={{
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: 'var(--elevation-3-hover)',
            }}
          >
            {/* Price row */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 6vw, 56px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                margin: 0,
              }}>
                ₹89
                <span style={{
                  fontSize: 18, fontWeight: 500, color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)', marginLeft: 8,
                  letterSpacing: 0,
                }}>
                  per student · per month
                </span>
              </p>
              <p style={{
                fontSize: 13, color: 'var(--text-tertiary)',
                margin: '10px 0 0', letterSpacing: 0.2,
              }}>
                Minimum 200 students · Annual commitment
              </p>
            </div>

            {/* Includes checklist */}
            <ul style={{
              listStyle: 'none', padding: 0, margin: '0 0 24px',
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}>
              {PRICING_INCLUDES.map((line) => (
                <li
                  key={line}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    fontSize: 14, color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  <span style={{
                    flexShrink: 0,
                    color: 'var(--success)',
                    fontWeight: 800,
                    width: 18, height: 18, borderRadius: 999,
                    background: 'var(--success-bg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, marginTop: 1,
                  }} aria-hidden="true">
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {/* Fine print */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-std)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              <p style={{ margin: '0 0 6px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Additional classroom hours:</strong>{' '}
                ₹250 / hour (beyond the 3-hour weekday window).
              </p>
              <p style={{ margin: 0 }}>
                Annual commitment. Invoice provided. Payment via Razorpay.
              </p>
            </div>

            {/* Final CTA */}
            <Link
              href="/education-institutions/register"
              className="btn btn-primary btn-large"
              style={{
                width: '100%',
                padding: '16px 28px',
                fontSize: 16,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Start Free Trial →
            </Link>
          </div>

          <p style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            margin: '20px 0 0',
            lineHeight: 1.6,
          }}>
            Questions? Email{' '}
            <a href="mailto:admin@edusaathiai.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              admin@edusaathiai.in
            </a>
            {' '}— we respond within a working day.
          </p>
        </div>
      </section>
    </main>
  )
}
