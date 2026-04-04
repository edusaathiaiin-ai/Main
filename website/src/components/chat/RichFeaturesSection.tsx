'use client'

import { useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// ─── Mini Mermaid ─────────────────────────────────────────────────────────────
let _mermaidInit = false

function HeroMermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('')
  const id = useRef(`hero-m-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const m = (await import('mermaid')).default
      if (!_mermaidInit) {
        m.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#0B1F3A',
            primaryTextColor: '#fff',
            primaryBorderColor: '#6366F1',
            lineColor: '#6366F1',
            background: '#060F1D',
          },
        })
        _mermaidInit = true
      }
      try {
        const { svg: s } = await m.render(id.current, chart)
        if (!dead) setSvg(s)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      dead = true
    }
  }, [chart])

  if (!svg)
    return (
      <div
        style={{
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.3)',
            borderTopColor: '#6366F1',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    )

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ overflowX: 'auto' }}
    />
  )
}

// ─── Mock chat bubble ─────────────────────────────────────────────────────────
function MockUser({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          background: '#C9993A',
          color: '#060F1D',
          borderRadius: '14px 14px 3px 14px',
          padding: '8px 13px',
          fontSize: '12px',
          fontWeight: 500,
          maxWidth: '80%',
        }}
      >
        {text}
      </div>
    </div>
  )
}

function MockBot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          background: '#0F2847',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '3px 14px 14px 14px',
          padding: '10px 13px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.8)',
          maxWidth: '95%',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Individual feature cards ──────────────────────────────────────────────────
function MathCard() {
  const katexHtml = katex.renderToString(
    'x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
    { throwOnError: false, displayMode: true }
  )

  return (
    <div
      style={{
        background: 'rgba(201,153,58,0.06)',
        border: '0.5px solid rgba(201,153,58,0.2)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#C9993A',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        MaathSaathi · ChemSaathi · BioSaathi +8 more
      </div>
      <div style={{ flex: 1 }}>
        <MockUser text="Explain the quadratic formula" />
        <MockBot>
          <div>
            The quadratic formula gives the roots of{' '}
            <span style={{ fontFamily: 'monospace' }}>ax² + bx + c = 0</span>:
          </div>
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              padding: '8px',
              overflowX: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        </MockBot>
      </div>
      <div
        style={{
          borderTop: '0.5px solid rgba(201,153,58,0.15)',
          paddingTop: '12px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#C9993A' }}>
          ✦ Equations render beautifully
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            marginTop: '2px',
          }}
        >
          Powered by KaTeX — zero cost
        </div>
      </div>
    </div>
  )
}

function MoleculeCard() {
  return (
    <div
      style={{
        background: 'rgba(74,222,128,0.05)',
        border: '0.5px solid rgba(74,222,128,0.2)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#4ADE80',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        ChemSaathi · PharmaSaathi · BioSaathi
      </div>
      <div style={{ flex: 1 }}>
        <MockUser text="What is aspirin?" />
        <MockBot>
          <div>
            Aspirin (acetylsalicylic acid) works by irreversibly inhibiting COX
            enzymes...
          </div>
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/aspirin/PNG"
              alt="Aspirin molecular structure"
              style={{
                background: '#fff',
                padding: '6px',
                borderRadius: '8px',
                maxWidth: '120px',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{ fontSize: '12px', fontWeight: 600, color: '#4ADE80' }}
              >
                Aspirin
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace',
                }}
              >
                C₉H₈O₄
              </div>
            </div>
          </div>
        </MockBot>
      </div>
      <div
        style={{
          borderTop: '0.5px solid rgba(74,222,128,0.15)',
          paddingTop: '12px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#4ADE80' }}>
          ✦ Molecular structures appear inline
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            marginTop: '2px',
          }}
        >
          Via PubChem NIH — real scientific data
        </div>
      </div>
    </div>
  )
}

const BILL_CHART = `flowchart TD
  A[Bill Drafted] --> B[Lok Sabha]
  B --> C[Rajya Sabha]
  C --> D[President]
  D --> E[Law ✓]`

function DiagramCard() {
  return (
    <div
      style={{
        background: 'rgba(99,102,241,0.06)',
        border: '0.5px solid rgba(99,102,241,0.2)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#818CF8',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        ArchSaathi · CompSaathi · KanoonSaathi · BioSaathi +4 more
      </div>
      <div style={{ flex: 1 }}>
        <MockUser text="Show me how a bill becomes law" />
        <MockBot>
          <div>Here&apos;s the legislative process:</div>
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(99,102,241,0.08)',
              borderRadius: '8px',
              padding: '8px',
            }}
          >
            <HeroMermaid chart={BILL_CHART} />
          </div>
        </MockBot>
      </div>
      <div
        style={{
          borderTop: '0.5px solid rgba(99,102,241,0.15)',
          paddingTop: '12px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#818CF8' }}>
          ✦ Processes become visual flows
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            marginTop: '2px',
          }}
        >
          Powered by Mermaid — zero cost
        </div>
      </div>
    </div>
  )
}

// ─── Saathi pill badges ───────────────────────────────────────────────────────
const RICH_SAATHI_NAMES = [
  'MaathSaathi',
  'ChemSaathi',
  'PharmaSaathi',
  'BioSaathi',
  'ArchSaathi',
  'CompSaathi',
  'KanoonSaathi',
  'MechSaathi',
  'CivilSaathi',
  'PhysiSaathi',
  'BiotechSaathi',
  'AeroSaathi',
  'EconSaathi',
  'ElecSaathi',
]

// ─── Main export ──────────────────────────────────────────────────────────────
export function RichFeaturesSection() {
  return (
    <section
      id="rich-features"
      style={{
        padding: '80px 48px',
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 50%, #060F1D 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,153,58,0.06) 0%, transparent 70%)',
        }}
      />

      <div
        style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(201,153,58,0.1)',
              border: '0.5px solid rgba(201,153,58,0.3)',
              borderRadius: '100px',
              padding: '6px 16px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#C9993A',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            ✦ Not just text
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              margin: '0 0 16px',
              letterSpacing: '-1px',
            }}
          >
            Your Saathi shows,{' '}
            <em style={{ color: '#C9993A' }}>not just tells.</em>
          </h2>
          <p
            style={{
              fontSize: '17px',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: '500px',
              margin: '0 auto',
            }}
          >
            Some conversations go beyond words.
            <br />
            Equations render. Molecules appear. Diagrams draw themselves.
          </p>
        </div>

        {/* Three cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '56px',
          }}
        >
          <MathCard />
          <MoleculeCard />
          <DiagramCard />
        </div>

        {/* Saathi pills */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '16px',
            }}
          >
            Available in
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            {RICH_SAATHI_NAMES.map((name) => (
              <span
                key={name}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '100px',
                  background: 'rgba(201,153,58,0.1)',
                  border: '0.5px solid rgba(201,153,58,0.25)',
                  color: '#C9993A',
                }}
              >
                {name}
              </span>
            ))}
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: '32px',
            }}
          >
            These features activate automatically — no settings to configure.
          </p>
          <a
            href="/login?role=student"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#C9993A',
              color: '#060F1D',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '15px',
              fontWeight: 600,
              padding: '14px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.3s',
            }}
          >
            Experience it yourself →
          </a>
        </div>
      </div>

      {/* Spin animation for loading spinners */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  )
}
