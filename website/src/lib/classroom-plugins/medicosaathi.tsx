'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

const TABS = ['Canvas', 'Anatomy 3D', 'PubMed', 'Drug Reference', 'Clinical Images'] as const
type Tab = typeof TABS[number]

// BioDigital Human — free 3D anatomy viewer (allows iframe embedding)
const ANATOMY_SYSTEMS = [
  { id: 'human-body', name: 'Full Human Body', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/male_region_background_background.json&ui-panel=false' },
  { id: 'skeletal', name: 'Skeletal System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/skeletal_system.json&ui-panel=false' },
  { id: 'muscular', name: 'Muscular System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/muscular_system.json&ui-panel=false' },
  { id: 'cardiovascular', name: 'Cardiovascular System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/cardiovascular_system.json&ui-panel=false' },
  { id: 'respiratory', name: 'Respiratory System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/respiratory_system.json&ui-panel=false' },
  { id: 'nervous', name: 'Nervous System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/nervous_system.json&ui-panel=false' },
  { id: 'digestive', name: 'Digestive System', url: 'https://human.biodigital.com/viewer/?id=production/maleAdult/digestive_system.json&ui-panel=false' },
]

// Sketchfab anatomy models as fallback
const SKETCHFAB_ANATOMY = [
  { id: 'a4f3b2c1d5e6f7a8b9c0d1e2f3a4b5c6', name: 'Human Heart' },
  { id: 'b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0', name: 'Human Brain' },
  { id: 'c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1', name: 'Human Skull' },
  { id: 'd7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', name: 'Kidney Cross-Section' },
  { id: 'e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', name: 'Human Lungs' },
]

type PubMedResult = { pmid: string; title: string; abstract: string; authors: string; journal: string; year: string }

function PubMedPanel({ initialSearch, onSearchConsumed }: { initialSearch?: string | null; onSearchConsumed?: () => void }) {
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
      setResults(data.results ?? [])
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

function MedicoPlugin({ role, activeTab, onTabChange, pendingToolLoad, onToolConsumed }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [selectedSystem, setSelectedSystem] = useState(ANATOMY_SYSTEMS[0].id)
  const [pendingSearch, setPendingSearch] = useState<string | null>(null)
  const [drugQuery, setDrugQuery] = useState('')
  const [drugResults, setDrugResults] = useState<{ name: string; description: string }[]>([])

  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingToolLoad) return
    if (pendingToolLoad.tool === 'pubmed') {
      setTab('PubMed')
      const q = (pendingToolLoad.params.query as string) ?? ''
      if (q) setPendingSearch(q)
    } else if (pendingToolLoad.tool === 'rcsb') {
      setTab('Anatomy 3D')
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

  const currentSystem = ANATOMY_SYSTEMS.find((s) => s.id === selectedSystem) ?? ANATOMY_SYSTEMS[0]

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
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <select value={selectedSystem} onChange={(e) => setSelectedSystem(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }}>
              {ANATOMY_SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <iframe title="3D Anatomy" src={currentSystem.url} style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-same-origin allow-popups" />
          </div>
        </div>

        <div style={{ display: currentTab === 'PubMed' ? 'block' : 'none', height: '100%' }}>
          <PubMedPanel initialSearch={pendingSearch} onSearchConsumed={() => setPendingSearch(null)} />
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

        <div style={{ display: currentTab === 'Clinical Images' ? 'block' : 'none', height: '100%' }}>
          <iframe title="Radiopaedia — Clinical Imaging" src="https://radiopaedia.org/" style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: MedicoPlugin,
  sourceLabel: 'BioDigital + PubMed + openFDA + Radiopaedia',
  tabs: [
    { id: 'Canvas', label: 'Canvas' }, { id: 'Anatomy 3D', label: 'Anatomy 3D' },
    { id: 'PubMed', label: 'PubMed' }, { id: 'Drug Reference', label: 'Drug Reference' },
    { id: 'Clinical Images', label: 'Clinical Images' },
  ],
  toolToTab: { pubmed: 'PubMed', rcsb: 'Anatomy 3D' },
}

export default plugin
