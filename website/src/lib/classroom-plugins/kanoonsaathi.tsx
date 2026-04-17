'use client'

import { useState, useCallback } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { ToolContainer } from '@/components/classroom/ToolContainer'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BNS Cross-Reference Table (IPC → BNS 2023)                               */
/*  Local lookup — no API. Critical post 1 July 2024.                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

const IPC_TO_BNS: { ipc: string; bns: string; description: string }[] = [
  { ipc: '299', bns: '101', description: 'Culpable homicide' },
  { ipc: '300', bns: '101(1)', description: 'Murder' },
  { ipc: '302', bns: '103(1)', description: 'Punishment for murder' },
  { ipc: '304', bns: '105', description: 'Culpable homicide not amounting to murder' },
  { ipc: '304A', bns: '106', description: 'Death by negligence' },
  { ipc: '304B', bns: '80', description: 'Dowry death' },
  { ipc: '306', bns: '108', description: 'Abetment of suicide' },
  { ipc: '307', bns: '109', description: 'Attempt to murder' },
  { ipc: '319', bns: '114', description: 'Hurt' },
  { ipc: '320', bns: '114(2)', description: 'Grievous hurt' },
  { ipc: '323', bns: '115(2)', description: 'Punishment for voluntarily causing hurt' },
  { ipc: '325', bns: '117(2)', description: 'Punishment for voluntarily causing grievous hurt' },
  { ipc: '354', bns: '74', description: 'Assault on woman with intent to outrage modesty' },
  { ipc: '354A', bns: '75', description: 'Sexual harassment' },
  { ipc: '354B', bns: '76', description: 'Assault with intent to disrobe' },
  { ipc: '354C', bns: '77', description: 'Voyeurism' },
  { ipc: '354D', bns: '78', description: 'Stalking' },
  { ipc: '363', bns: '137', description: 'Kidnapping' },
  { ipc: '376', bns: '64', description: 'Rape' },
  { ipc: '376A', bns: '66', description: 'Intercourse by person in authority' },
  { ipc: '377', bns: '—', description: 'Unnatural offences (decriminalised by SC in 2018, not in BNS)' },
  { ipc: '378', bns: '303', description: 'Theft' },
  { ipc: '379', bns: '303(2)', description: 'Punishment for theft' },
  { ipc: '383', bns: '308', description: 'Extortion' },
  { ipc: '390', bns: '309', description: 'Robbery' },
  { ipc: '392', bns: '309(2)', description: 'Punishment for robbery' },
  { ipc: '395', bns: '310(2)', description: 'Dacoity' },
  { ipc: '405', bns: '316', description: 'Criminal breach of trust' },
  { ipc: '415', bns: '318', description: 'Cheating' },
  { ipc: '420', bns: '318(4)', description: 'Cheating and dishonestly inducing delivery of property' },
  { ipc: '498A', bns: '85', description: 'Cruelty by husband or relatives' },
  { ipc: '499', bns: '356', description: 'Defamation' },
  { ipc: '500', bns: '356(2)', description: 'Punishment for defamation' },
  { ipc: '506', bns: '351', description: 'Criminal intimidation' },
  { ipc: '34', bns: '3(5)', description: 'Common intention' },
  { ipc: '120B', bns: '61', description: 'Criminal conspiracy' },
  { ipc: '124A', bns: '152', description: 'Sedition → Acts endangering sovereignty' },
  { ipc: '153A', bns: '196', description: 'Promoting enmity between groups' },
  { ipc: '295A', bns: '299', description: 'Deliberate acts to outrage religious feelings' },
  { ipc: '497', bns: '—', description: 'Adultery (struck down by SC in 2018, not in BNS)' },
  { ipc: '509', bns: '79', description: 'Word, gesture or act intended to insult modesty of a woman' },
]

function BnsPanel() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? IPC_TO_BNS.filter((r) =>
        r.ipc.toLowerCase().includes(query.toLowerCase()) ||
        r.bns.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase())
      )
    : IPC_TO_BNS

  return (
    <ToolContainer name="BNS Cross-Reference" source="BNS 2023 (eff. 1 July 2024)">
      <div className="flex h-full flex-col">
        <div className="shrink-0 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IPC section, BNS section, or description..."
            className="w-full border-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Header row */}
          <div className="sticky top-0 flex items-center gap-2 px-3 py-1.5"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="w-16 text-[10px] font-bold uppercase" style={{ color: 'var(--text-ghost)' }}>IPC</span>
            <span className="w-16 text-[10px] font-bold uppercase" style={{ color: 'var(--text-ghost)' }}>BNS</span>
            <span className="flex-1 text-[10px] font-bold uppercase" style={{ color: 'var(--text-ghost)' }}>Offence</span>
          </div>
          {filtered.map((r) => (
            <div key={r.ipc} className="flex items-center gap-2 border-b px-3 py-2"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="w-16 text-sm font-bold" style={{ color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>
                {r.ipc}
              </span>
              <span className="w-16 text-sm font-bold" style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                {r.bns}
              </span>
              <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {r.description}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-ghost)' }}>
              No matching sections for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </ToolContainer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Indian Kanoon search panel                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

type CaseResult = {
  docid: number
  title: string
  headline: string
  court: string
  date: string
  citation: string
}

function IndianKanoonPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CaseResult[]>([])
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; doc: string; court: string; date: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])
    setSelectedDoc(null)
    setPending(false)

    try {
      const res = await fetch(`/api/classroom/indiankanoon?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()

      if (data.pending) {
        setPending(true)
        setLoading(false)
        return
      }

      setResults(data.results ?? [])
      if (data.results?.length === 0) setError('No cases found')
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  const loadDocument = useCallback(async (docid: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/indiankanoon?docid=${docid}`)
      const data = await res.json()
      if (data.pending) { setPending(true); setLoading(false); return }
      if (res.ok) setSelectedDoc(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  return (
    <ToolContainer name="Indian Kanoon" source="indiankanoon.org">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search cases... e.g. Section 302 murder"
            className="flex-1 border-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }} />
          <button onClick={handleSearch} disabled={loading || !query.trim()}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
            style={{ background: 'var(--gold)', color: '#fff' }}>
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {pending && (
            <div className="px-4 py-8 text-center">
              <p className="mb-1 text-3xl">⚖️</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Indian Kanoon integration coming soon.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Key pending approval.</p>
            </div>
          )}

          {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

          {/* Document view */}
          {selectedDoc && (
            <div className="px-3 py-3">
              <button onClick={() => setSelectedDoc(null)} className="mb-2 text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                &larr; Back to results
              </button>
              <h3 className="mb-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedDoc.title}</h3>
              <p className="mb-3 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {selectedDoc.court} &middot; {selectedDoc.date}
              </p>
              <div className="prose-sm text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: selectedDoc.doc }} />
            </div>
          )}

          {/* Results list */}
          {!selectedDoc && results.map((r) => (
            <button key={r.docid} onClick={() => loadDocument(r.docid)}
              className="block w-full border-b px-3 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
              {r.headline && (
                <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: 'var(--text-tertiary)' }}
                  dangerouslySetInnerHTML={{ __html: r.headline }} />
              )}
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {r.court} &middot; {r.date} {r.citation && `&middot; ${r.citation}`}
              </p>
            </button>
          ))}

          {!selectedDoc && results.length === 0 && !error && !pending && !loading && (
            <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
              <p className="mb-1 text-3xl">⚖️</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search Indian case law</p>
              <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Supreme Court, High Courts, Tribunals</p>
            </div>
          )}
        </div>
      </div>
    </ToolContainer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PDF Viewer (pdfjs-dist) — faculty pastes URL                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PdfPanel() {
  const [url, setUrl] = useState('')
  const [loadedUrl, setLoadedUrl] = useState('')

  const handleLoad = useCallback(() => {
    if (!url.trim()) return
    // Use Google Docs viewer as a reliable cross-origin PDF renderer
    // pdfjs-dist requires CORS headers on the PDF which most legal sites don't provide
    setLoadedUrl(url.trim())
  }, [url])

  return (
    <ToolContainer name="PDF Viewer" source="Document viewer">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            placeholder="Paste PDF URL... e.g. https://example.com/judgment.pdf"
            className="flex-1 border-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} />
          <button onClick={handleLoad} disabled={!url.trim()}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
            style={{ background: 'var(--gold)', color: '#fff' }}>
            Load
          </button>
        </div>
        <div className="flex-1">
          {loadedUrl ? (
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(loadedUrl)}`}
              className="h-full w-full border-0"
              title="PDF Viewer"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-1 text-3xl">📄</p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Paste a PDF URL above</p>
                <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Case judgments, statutes, legal documents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolContainer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Law Plugin Component                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

type LawTab = 'canvas' | 'kanoon' | 'bns' | 'pdf'

function LawPlugin({ role }: PluginProps) {
  const [tab, setTab] = useState<LawTab>('canvas')

  const tabs: { id: LawTab; label: string }[] = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'kanoon', label: 'Indian Kanoon' },
    { id: 'bns', label: 'IPC → BNS' },
    { id: 'pdf', label: 'PDF Viewer' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}
        {tab === 'kanoon' && <IndianKanoonPanel />}
        {tab === 'bns' && <BnsPanel />}
        {tab === 'pdf' && <PdfPanel />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: LawPlugin,
  sourceLabel: 'Indian Kanoon + BNS 2023',
}

export default plugin
