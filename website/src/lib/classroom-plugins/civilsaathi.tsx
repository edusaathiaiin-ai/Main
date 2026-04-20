'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'GeoGebra', 'PhET Sims', 'Sketchfab 3D'] as const
type Tab = typeof TABS[number]

const PHET_SIMS = [
  { id: 'under-pressure', name: 'Under Pressure' },
  { id: 'fluid-pressure-and-flow', name: 'Fluid Pressure & Flow' },
]

const SKETCHFAB = [
  { id: '7ec8f888d39d4c90aee4f24c56e0cc3d', name: 'Truss Bridge' },
  { id: 'b3a5a8c1e2f74d6dbce75a7f4e8c9d12', name: 'Arch Dam' },
  { id: 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', name: 'Steel Truss' },
  { id: 'd5e6f7a8b9c0d1e2f3a4b5c6d7e8f901', name: 'Concrete Beam' },
  { id: 'e6f7a8b9c0d1e2f3a4b5c6d7e8f90123', name: 'Suspension Bridge' },
]

function CivilPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [sim, setSim] = useState(PHET_SIMS[0].id)
  const [model, setModel] = useState(SKETCHFAB[0].id)
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
        <div style={{ display: currentTab === 'PhET Sims' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <select value={sim} onChange={(e) => setSim(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {PHET_SIMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <FullscreenPanel label="PhET Simulation"><iframe title="PhET" src={`https://phet.colorado.edu/sims/html/${sim}/latest/${sim}_all.html`} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin" /></FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'Sketchfab 3D' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {SKETCHFAB.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <FullscreenPanel label="Sketchfab 3D"><iframe title="Sketchfab 3D" src={`https://sketchfab.com/models/${model}/embed?autospin=1&ui_theme=dark&ui_infos=0&ui_watermark=0`} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen; xr-spatial-tracking" sandbox="allow-scripts allow-same-origin allow-popups" /></FullscreenPanel>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: CivilPlugin, sourceLabel: 'GeoGebra + PhET + Sketchfab', toolToTab: { geogebra: 'GeoGebra', phet: 'PhET Sims' } }
export default plugin
