'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { getToolTabsFor } from './useToolChipTabs'

const BASE_TABS = ['Canvas', 'GeoGebra', 'Maps', 'NASA Earth'] as const
type BaseTab = typeof BASE_TABS[number]
type Tab = BaseTab | string

const LANDMARKS = [
  { name: 'Amazon Rainforest', lat: -3.4653, lng: -62.2159 },
  { name: 'Great Barrier Reef', lat: -18.2871, lng: 147.6992 },
  { name: 'Sundarbans', lat: 21.9497, lng: 89.1833 },
  { name: 'Sahara Desert', lat: 23.4162, lng: 25.6628 },
  { name: 'Antarctic Ice Sheet', lat: -75.2509, lng: 0.0 },
  { name: 'Ganges Delta', lat: 22.0, lng: 89.0 },
]

function EnviroPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [nasaQuery, setNasaQuery] = useState('earth observation')
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('envirosaathi')
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
        <div style={{ display: currentTab === 'Maps' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {LANDMARKS.map((l) => (
                <button key={l.name} onClick={() => { const f = document.getElementById('enviro-map') as HTMLIFrameElement; if (f) f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.5}%2C${l.lat - 0.3}%2C${l.lng + 0.5}%2C${l.lat + 0.3}&layer=mapnik&marker=${l.lat}%2C${l.lng}` }} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>{l.name}</button>
              ))}
            </div>
          </div>
          <FullscreenPanel label="Map">
            <iframe id="enviro-map" title="OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 0.5}%2C${LANDMARKS[0].lat - 0.3}%2C${LANDMARKS[0].lng + 0.5}%2C${LANDMARKS[0].lat + 0.3}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`} style={{ width: '100%', height: '100%', border: 'none' }} />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'NASA Earth' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '6px' }}>
            <input value={nasaQuery} onChange={(e) => setNasaQuery(e.target.value)} placeholder="Search NASA images..." style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }} />
          </div>
          <FullscreenPanel label="NASA Images">
            <iframe title="NASA Images" src={`https://images.nasa.gov/search?q=${encodeURIComponent(nasaQuery)}&media=image`} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups" />
          </FullscreenPanel>
        </div>
        {toolNode && <div style={{ height: '100%' }}>{toolNode}</div>}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: EnviroPlugin, sourceLabel: 'GeoGebra + OpenStreetMap + NASA Earth', toolToTab: { geogebra: 'GeoGebra', leaflet: 'Maps', nasa: 'NASA Earth' } }
export default plugin
