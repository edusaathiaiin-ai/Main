'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { ScienceDirectPanel, ScopusPanel } from '@/components/classroom/ElsevierPanels'
import { RcsbPanel } from '@/components/classroom/RcsbPanel'
import { WolframPanel } from '@/components/classroom/WolframPanel'

const TABS = ['Canvas', 'Anatomy 3D', 'Proteins', 'Wolfram', 'PubMed', 'ScienceDirect', 'Citations', 'Drug Reference', 'Clinical Images'] as const
type Tab = typeof TABS[number]

// Zygote Body — free 3D anatomy viewer (no auth required, allows embedding)
const ANATOMY_VIEWS = [
  { id: 'full-body', name: 'Full Human Body', url: 'https://www.zygotebody.com/#nav=-10.49,115.8,75.86,0,0,0' },
  { id: 'skeletal', name: 'Skeletal System', url: 'https://www.zygotebody.com/#nav=-10.49,115.8,75.86,0,0,0&sel=p:;h:;s:1110100000;c:0;o:0' },
  { id: 'muscular', name: 'Muscular System', url: 'https://www.zygotebody.com/#nav=-10.49,115.8,75.86,0,0,0&sel=p:;h:;s:0001000000;c:0;o:0' },
  { id: 'organs', name: 'Internal Organs', url: 'https://www.zygotebody.com/#nav=-10.49,115.8,75.86,0,0,0&sel=p:;h:;s:0000011100;c:0;o:0' },
]

// Sketchfab anatomy models — verified via API search, CC-licensed
const SKETCHFAB_ANATOMY = [
  { id: '3f8072336ce94d18b3d0d055a1ece089', name: 'Realistic Human Heart' },
  { id: '0aa0e33c5c854d1bab7bac9e1c7acaec', name: 'Human Brain & Brainstem' },
  { id: 'a47ef69ff3a4402783cff0f841bc5e0a', name: 'Human Skull & Neck' },
  { id: '911b9df7e7834175b69b4840ea15e054', name: 'Human Skeleton' },
  { id: 'bd50aacad58b488ea80ed973b4874a08', name: 'Knee Joint Anatomy' },
]

type PubMedResult = { pmid: string; title: string; abstract: string; authors: string; journal: string; year: string }

function PubMedPanel({ initialSearch, onSearchConsumed, onArtifact }: { initialSearch?: string | null; onSearchConsumed?: () => void; onArtifact?: PluginProps['onArtifact'] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PubMedResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchDone = useState(false)

  useEffect(() => {
    if (initialSearch && !searchDone[0]) {
      searchDone[1](true)
      setQuery(initialSearch)
      onSearchConsumed?.()
      doSearch(initialSearch)
    }
  }, [initialSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/pubmed?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      const papers = data.papers ?? []
      setResults(papers)
      for (const p of papers) {
        onArtifact?.({
          type: 'pubmed_citation', source: 'PubMed / NCBI',
          source_url: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}`,
          data: { pmid: p.pmid, title: p.title, authors: p.authors ?? [], journal: p.journal ?? '', year: p.year ?? '' },
          timestamp: new Date().toISOString(),
        })
      }
    } catch { setResults([]) }
    setLoading(false)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
        📄 PubMed — Medical Literature Search
      </h3>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
          placeholder="Search — e.g. diabetes management, CRISPR therapy..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }}
        />
        <button onClick={() => doSearch(query)} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--saathi-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? '…' : 'Search'}
        </button>
      </div>
      {results.map((r) => (
        <div key={r.pmid} style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{r.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)', margin: '0 0 4px' }}>{r.authors} · {r.journal} · {r.year}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 6px', lineHeight: 1.5 }}>{r.abstract?.slice(0, 250)}…</p>
          <a href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '11px', color: 'var(--saathi-primary)', fontWeight: 600, textDecoration: 'none' }}>View on PubMed →</a>
        </div>
      ))}
    </div>
  )
}

function MedicoPlugin({ role, activeTab, onTabChange, pendingToolLoad, onToolConsumed, onArtifact }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [selectedModel, setSelectedModel] = useState(SKETCHFAB_ANATOMY[0].id)
  const [anatomySource, setAnatomySource] = useState<'sketchfab' | 'zygote'>('sketchfab')
  const [pendingSearch, setPendingSearch] = useState<string | null>(null)
  const [pendingRcsb, setPendingRcsb] = useState<string | null>(null)
  const [pendingWolfram, setPendingWolfram] = useState<string | null>(null)
  const [drugQuery, setDrugQuery] = useState('')
  const [drugResults, setDrugResults] = useState<{ name: string; description: string }[]>([])

  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingToolLoad) return
    const p = pendingToolLoad.params
    if (pendingToolLoad.tool === 'pubmed') {
      setTab('PubMed')
      const q = (p.query as string) ?? ''
      if (q) setPendingSearch(q)
    } else if (pendingToolLoad.tool === 'rcsb') {
      setTab('Proteins')
      const q = (p.protein_name as string) ?? (p.pdb_id as string) ?? ''
      if (q) setPendingRcsb(q)
    } else if (pendingToolLoad.tool === 'wolfram') {
      setTab('Wolfram')
      const q = (p.query as string) ?? ''
      if (q) setPendingWolfram(q)
    }
    onToolConsumed?.()
  }, [pendingToolLoad]) // eslint-disable-line react-hooks/exhaustive-deps

  async function searchDrug() {
    if (!drugQuery.trim()) return
    try {
      const res = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugQuery)}"&limit=5`)
      const data = await res.json()
      setDrugResults((data.results ?? []).map((r: { openfda?: { brand_name?: string[] }; description?: string[]; indications_and_usage?: string[] }) => ({
        name: r.openfda?.brand_name?.[0] ?? drugQuery,
        description: (r.indications_and_usage?.[0] ?? r.description?.[0] ?? '').slice(0, 300),
      })))
    } catch { setDrugResults([]) }
  }

  const currentModel = SKETCHFAB_ANATOMY.find((s) => s.id === selectedModel) ?? SKETCHFAB_ANATOMY[0]
  const currentZygote = ANATOMY_VIEWS.find((v) => v.id === 'full-body') ?? ANATOMY_VIEWS[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: currentTab === t ? 700 : 500,
            background: currentTab === t ? 'var(--saathi-primary)' : 'transparent',
            color: currentTab === t ? '#fff' : 'var(--text-secondary)',
            border: currentTab === t ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: currentTab === 'Canvas' ? 'block' : 'none', height: '100%' }}>
          <CollaborativeCanvas role={role} />
        </div>

        <div style={{ display: currentTab === 'Anatomy 3D' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setAnatomySource('sketchfab')} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: anatomySource === 'sketchfab' ? 'var(--saathi-primary)' : 'var(--bg-elevated)',
                color: anatomySource === 'sketchfab' ? '#fff' : 'var(--text-tertiary)',
              }}>Sketchfab 3D</button>
              <button onClick={() => setAnatomySource('zygote')} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: anatomySource === 'zygote' ? 'var(--saathi-primary)' : 'var(--bg-elevated)',
                color: anatomySource === 'zygote' ? '#fff' : 'var(--text-tertiary)',
              }}>Zygote Body</button>
            </div>
            {anatomySource === 'sketchfab' && (
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }}>
                {SKETCHFAB_ANATOMY.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {anatomySource === 'zygote' && (
              <select value={currentZygote.id} onChange={(e) => {
                const v = ANATOMY_VIEWS.find(a => a.id === e.target.value)
                if (v) { /* Zygote reloads via iframe src */ }
              }}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }}>
                {ANATOMY_VIEWS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {anatomySource === 'sketchfab' ? (
              <iframe
                title={currentModel.name}
                src={`https://sketchfab.com/models/${currentModel.id}/embed?autostart=1&ui_theme=dark`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
              />
            ) : (
              <iframe
                title="Zygote Body 3D Anatomy"
                src={currentZygote.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="fullscreen"
                allowFullScreen
              />
            )}
          </div>
        </div>

        <div style={{ display: currentTab === 'Proteins' ? 'block' : 'none', height: '100%' }}>
          <RcsbPanel placeholder="Search protein... e.g. Troponin, 1J1E" initialQuery={pendingRcsb} onQueryConsumed={() => setPendingRcsb(null)} onArtifact={onArtifact} />
        </div>

        <div style={{ display: currentTab === 'Wolfram' ? 'block' : 'none', height: '100%' }}>
          <WolframPanel initialQuery={pendingWolfram} onQueryConsumed={() => setPendingWolfram(null)} onArtifact={onArtifact} />
        </div>

        <div style={{ display: currentTab === 'PubMed' ? 'block' : 'none', height: '100%' }}>
          <PubMedPanel initialSearch={pendingSearch} onSearchConsumed={() => setPendingSearch(null)} onArtifact={onArtifact} />
        </div>

        <div style={{ display: currentTab === 'ScienceDirect' ? 'block' : 'none', height: '100%' }}>
          <ScienceDirectPanel />
        </div>

        <div style={{ display: currentTab === 'Citations' ? 'block' : 'none', height: '100%' }}>
          <ScopusPanel />
        </div>

        <div style={{ display: currentTab === 'Drug Reference' ? 'block' : 'none', height: '100%', overflowY: 'auto', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>💊 openFDA Drug Reference</h3>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <input value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchDrug()}
              placeholder="Search drug — e.g. Metformin, Aspirin, Amoxicillin..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }} />
            <button onClick={searchDrug} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--saathi-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>Search</button>
          </div>
          {drugResults.map((d, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{d.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>{d.description}</p>
            </div>
          ))}
        </div>

        <div style={{ display: currentTab === 'Clinical Images' ? 'block' : 'none', height: '100%', overflowY: 'auto', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            🩻 Clinical Imaging Resources
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Open these research-grade imaging databases in a new tab. Search for any condition, modality, or anatomy.
          </p>
          {[
            { name: 'Radiopaedia', desc: '100,000+ radiology cases with imaging and diagnosis', url: 'https://radiopaedia.org/search?q=' },
            { name: 'OpenI — NIH', desc: 'Biomedical image search from NIH National Library of Medicine', url: 'https://openi.nlm.nih.gov/' },
            { name: 'Radiology Masterclass', desc: 'Free radiology tutorials and case studies', url: 'https://www.radiologymasterclass.co.uk/' },
          ].map((r) => (
            <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', textDecoration: 'none', transition: 'border-color 200ms' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--saathi-primary)', margin: '0 0 4px' }}>{r.name} →</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: MedicoPlugin,
  sourceLabel: 'RCSB PDB + Wolfram Alpha + PubMed + ScienceDirect + Scopus',
  tabs: [
    { id: 'Canvas', label: 'Canvas' }, { id: 'Anatomy 3D', label: 'Anatomy 3D' },
    { id: 'Proteins', label: 'Proteins' }, { id: 'Wolfram', label: 'Wolfram' },
    { id: 'PubMed', label: 'PubMed' }, { id: 'ScienceDirect', label: 'ScienceDirect' },
    { id: 'Citations', label: 'Citations' }, { id: 'Drug Reference', label: 'Drug Reference' },
    { id: 'Clinical Images', label: 'Clinical Images' },
  ],
  toolToTab: { pubmed: 'PubMed', rcsb: 'Proteins', wolfram: 'Wolfram' },
}

export default plugin
