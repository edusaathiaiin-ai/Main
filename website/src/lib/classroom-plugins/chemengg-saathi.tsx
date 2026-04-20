'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'GeoGebra', 'PubChem', 'PhET Sims'] as const
type Tab = typeof TABS[number]

const PHET_SIMS = [
  { id: 'gas-properties', name: 'Gas Properties' },
  { id: 'under-pressure', name: 'Under Pressure' },
]

function ChemEnggPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [sim, setSim] = useState(PHET_SIMS[0].id)
  const [pubchemQuery, setPubchemQuery] = useState('')
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
        {TABS.map((t) => (<button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: currentTab === t ? 700 : 500, background: currentTab === t ? 'var(--saathi-primary)' : 'transparent', color: currentTab === t ? '#fff' : 'var(--text-secondary)', border: currentTab === t ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer' }}>{t}</button>))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: currentTab === 'Canvas' ? 'block' : 'none', height: '100%' }}><CollaborativeCanvas role={role} /></div>
        <div style={{ display: currentTab === 'GeoGebra' ? 'block' : 'none', height: '100%' }}>
          <FullscreenPanel label="GeoGebra">
            <iframe title="GeoGebra" src="https://www.geogebra.org/classic" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'PubChem' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '6px' }}>
            <input value={pubchemQuery} onChange={(e) => setPubchemQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pubchemQuery.trim() && setPubchemQuery(pubchemQuery.trim())} placeholder="Search compound..." style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }} />
          </div>
          <FullscreenPanel label="PubChem">
            <iframe title="PubChem" src={pubchemQuery.trim() ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(pubchemQuery.trim())}` : 'https://pubchem.ncbi.nlm.nih.gov/'} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'PhET Sims' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <select value={sim} onChange={(e) => setSim(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {PHET_SIMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <FullscreenPanel label="PhET Simulation"><iframe title="PhET" src={`https://phet.colorado.edu/sims/html/${sim}/latest/${sim}_all.html`} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin" /></FullscreenPanel>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: ChemEnggPlugin, sourceLabel: 'GeoGebra + PubChem + PhET', toolToTab: { geogebra: 'GeoGebra', pubchem: 'PubChem', phet: 'PhET Sims' } }
export default plugin
