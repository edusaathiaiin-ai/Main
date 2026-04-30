'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { getToolTabsFor } from './useToolChipTabs'

const BASE_TABS = ['Canvas', 'GeoGebra', 'PhET Sims', 'Sketchfab 3D'] as const
type BaseTab = typeof BASE_TABS[number]
type Tab = BaseTab | string

const PHET_SIMS = [
  { id: 'forces-and-motion-basics', name: 'Forces & Motion' },
  { id: 'energy-skate-park-basics', name: 'Energy Conservation' },
  { id: 'pendulum-lab', name: 'Pendulum Lab' },
  { id: 'projectile-motion', name: 'Projectile Motion' },
  { id: 'hookes-law', name: "Hooke's Law" },
  { id: 'masses-and-springs', name: 'Masses & Springs' },
  { id: 'friction', name: 'Friction' },
]

const SKETCHFAB = [
  { id: '74c6aceed86b4a41aaad3b93afc3e262', name: 'Turbofan Engine' },
  { id: '47756e4d8a1b43188109795177c00e55', name: 'Jet Compressor' },
  { id: 'e957a9dbb45146e0946e16f2cb12c827', name: 'Rocket Nozzle' },
]

function MechPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [sim, setSim] = useState(PHET_SIMS[0].id)
  const [model, setModel] = useState(SKETCHFAB[0].id)
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('mechsaathi')
  const allTabs: { id: Tab; label: string }[] = [
    ...BASE_TABS.map((t) => ({ id: t as Tab, label: t })),
    ...toolTabs.map((t) => ({ id: t.id as Tab, label: t.label })),
  ]
  const toolNode = renderToolTab(currentTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
        {allTabs.map((t) => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: currentTab === t.id ? 700 : 500, background: currentTab === t.id ? 'var(--saathi-primary)' : 'transparent', color: currentTab === t.id ? '#fff' : 'var(--text-secondary)', border: currentTab === t.id ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer' }}>{t.label}</button>))}
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
        {toolNode && <div style={{ height: '100%' }}>{toolNode}</div>}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: MechPlugin, sourceLabel: 'GeoGebra + PhET + Sketchfab', toolToTab: { geogebra: 'GeoGebra', phet: 'PhET Sims' } }
export default plugin
