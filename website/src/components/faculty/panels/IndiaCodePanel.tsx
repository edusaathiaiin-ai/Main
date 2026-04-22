'use client'

// ─────────────────────────────────────────────────────────────────────────────
// IndiaCodePanel — faculty solo dock
//
// Official Indian statute portal. No public JSON API, so we embed the live
// search page and also expose quick deep-links to BNS 2023, BNSS 2023, and
// the Bharatiya Sakshya Adhiniyam 2023 — the three new criminal codes
// KanoonSaathi + PolSciSaathi faculty reach for most often.
// ─────────────────────────────────────────────────────────────────────────────

import { IframePanel } from './IframePanel'
import { useState } from 'react'

const QUICK_LINKS: Array<{ label: string; url: string; emoji: string }> = [
  { emoji: '🟠', label: 'BNS 2023 (IPC replacement)', url: 'https://www.indiacode.nic.in/handle/123456789/20062' },
  { emoji: '🔵', label: 'BNSS 2023 (CrPC replacement)', url: 'https://www.indiacode.nic.in/handle/123456789/20064' },
  { emoji: '🟢', label: 'BSA 2023 (Evidence Act replacement)', url: 'https://www.indiacode.nic.in/handle/123456789/20063' },
  { emoji: '🏛️', label: 'Constitution of India', url: 'https://www.indiacode.nic.in/handle/123456789/15240' },
]

export function IndiaCodePanel() {
  const [embedSrc, setEmbedSrc] = useState('https://www.indiacode.nic.in/simple-search?query=&rpp=10&sort_by=score&order=desc')

  return (
    <div className="flex h-full flex-col">
      {/* Quick-link strip — the statutes faculty hit most often */}
      <div
        className="shrink-0 px-2 py-2"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          display:      'flex',
          flexWrap:     'wrap',
          gap:          4,
        }}
      >
        {QUICK_LINKS.map((q) => (
          <button
            key={q.url}
            onClick={() => setEmbedSrc(q.url)}
            title={`Load ${q.label} in this panel`}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          4,
              padding:      '3px 8px',
              fontSize:     10,
              fontWeight:   600,
              borderRadius: 999,
              border:       '1px solid var(--border-subtle)',
              background:   embedSrc === q.url ? 'var(--saathi-light)' : 'var(--bg-elevated)',
              color:        embedSrc === q.url ? 'var(--saathi-text)' : 'var(--text-secondary)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            <span style={{ fontSize: 10 }}>{q.emoji}</span>
            {q.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1" style={{ background: 'var(--bg-base)' }}>
        <IframePanel
          src={embedSrc}
          openUrl={embedSrc}
          title="India Code — official statutes"
          attribution="Govt. of India · Ministry of Law & Justice · Free"
        />
      </div>
    </div>
  )
}
