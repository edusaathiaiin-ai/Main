'use client'

import { useState, useEffect } from 'react'

const SAATHI_THINKING: Record<string, string[]> = {
  kanoonsaathi: [
    'KanoonSaathi is reviewing the law...',
    'Checking relevant sections and judgments...',
    'Preparing your legal explanation...',
    'Almost ready...',
  ],
  medicosaathi: [
    'MedicoSaathi is reviewing clinical knowledge...',
    'Preparing your medical explanation...',
    'Checking the latest guidelines...',
    'Almost ready...',
  ],
  maathsaathi: [
    'MaathSaathi is working through the problem...',
    'Calculating step by step...',
    'Preparing your solution...',
    'Almost ready...',
  ],
  physicsaathi: [
    'PhysicsSaathi is applying the principles...',
    'Working through the physics...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  chemsaathi: [
    'ChemSaathi is analysing the reaction...',
    'Checking molecular structures...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  biosaathi: [
    'BioSaathi is reviewing the biology...',
    'Checking cellular mechanisms...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  pharmasaathi: [
    'PharmaSaathi is checking drug data...',
    'Reviewing pharmacology...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  compsaathi: [
    'CompSaathi is compiling your answer...',
    'Debugging the logic...',
    'Preparing your solution...',
    'Almost ready...',
  ],
  econsaathi: [
    'EconSaathi is analysing the data...',
    'Checking economic indicators...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  historysaathi: [
    'HistorySaathi is consulting the archives...',
    'Tracing the historical context...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  psychsaathi: [
    'PsychSaathi is reviewing the research...',
    'Examining psychological frameworks...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  aerospacesaathi: [
    'AerospaceSaathi is computing trajectories...',
    'Checking mission data...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  finsaathi: [
    'FinSaathi is crunching the numbers...',
    'Reviewing financial models...',
    'Preparing your analysis...',
    'Almost ready...',
  ],
  accountsaathi: [
    'AccountSaathi is reviewing the standards...',
    'Checking accounting principles...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  nursingsaathi: [
    'NursingSaathi is reviewing patient-care guidelines...',
    'Checking clinical protocols...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  mechsaathi: [
    'MechSaathi is running the numbers...',
    'Working through forces and motion...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  civilsaathi: [
    'CivilSaathi is checking the structure...',
    'Working through load paths...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  elecsaathi: [
    'ElecSaathi is tracing the circuit...',
    'Checking voltages and currents...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  envirosaathi: [
    'EnviroSaathi is studying the system...',
    'Checking environmental balances...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  bizsaathi: [
    'BizSaathi is thinking through the strategy...',
    'Reviewing business frameworks...',
    'Preparing your answer...',
    'Almost ready...',
  ],
  mktsaathi: [
    'MktSaathi is reading the market...',
    'Checking consumer patterns...',
    'Preparing your insight...',
    'Almost ready...',
  ],
  hrsaathi: [
    'HRSaathi is reviewing people-practices...',
    'Checking the human side of this...',
    'Preparing your answer...',
    'Almost ready...',
  ],
  archsaathi: [
    'ArchSaathi is drafting the idea...',
    'Studying form and function...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  agrisaathi: [
    'AgriSaathi is checking field data...',
    'Reviewing soil and crop cycles...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  biotechsaathi: [
    'BioTechSaathi is reviewing molecular pathways...',
    'Checking experimental protocols...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  'chemengg-saathi': [
    'ChemEnggSaathi is working through the process...',
    'Checking mass and energy balances...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  electronicssaathi: [
    'ElectronicsSaathi is tracing the signal path...',
    'Checking components and logic...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  geosaathi: [
    'GeoSaathi is reading the landscape...',
    'Checking layers and processes...',
    'Preparing your explanation...',
    'Almost ready...',
  ],
  polscisaathi: [
    'PolSciSaathi is reviewing the framework...',
    'Checking political context...',
    'Preparing your analysis...',
    'Almost ready...',
  ],
  statssaathi: [
    'StatsSaathi is running the numbers...',
    'Checking distributions and tests...',
    'Preparing your analysis...',
    'Almost ready...',
  ],
}

const DEFAULT_THINKING = [
  'Your Saathi is thinking...',
  'Preparing your answer...',
  'Finding the best explanation for you...',
  'Almost ready...',
]

export function ThinkingBubble({
  saathiName,
  saathiEmoji,
  saathiSlug,
}: {
  saathiName: string
  saathiEmoji: string
  saathiSlug?: string
}) {
  const [messageIndex, setMessageIndex] = useState(0)
  const messages = (saathiSlug && SAATHI_THINKING[saathiSlug]) ?? DEFAULT_THINKING

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [messages.length])

  return (
    <div
      className="flex items-start gap-2.5 mb-3"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'var(--saathi-light)',
        border: '1px solid var(--saathi-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', flexShrink: 0,
      }}>
        {saathiEmoji}
      </div>

      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: '0 12px 12px 12px',
        padding: '10px 14px',
        maxWidth: '280px',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="thinking-dot"
              style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'var(--saathi-primary)',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p style={{
          fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          margin: 0, transition: 'opacity 0.3s ease',
        }}>
          {messages[messageIndex]}
        </p>
      </div>
    </div>
  )
}
