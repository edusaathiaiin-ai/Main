'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'GeoGebra', 'Maps', 'PubMed'] as const
type Tab = typeof TABS[number]

const LANDMARKS = [
  { name: 'Punjab (India)', lat: 30.9, lng: 75.85 },
  { name: 'Iowa (USA)', lat: 41.88, lng: -93.1 },
  { name: 'Pampas (Argentina)', lat: -35.0, lng: -63.0 },
  { name: 'Mekong Delta', lat: 10.0, lng: 105.8 },
  { name: 'Nile Valley', lat: 25.0, lng: 32.5 },
  { name: 'Deccan Plateau', lat: 18.0, lng: 77.0 },
]

function AgriPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
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
        <div style={{ display: currentTab === 'Maps' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {LANDMARKS.map((l) => (
                <button key={l.name} onClick={() => { const f = document.getElementById('agri-map') as HTMLIFrameElement; if (f) f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 1}%2C${l.lat - 0.5}%2C${l.lng + 1}%2C${l.lat + 0.5}&layer=mapnik&marker=${l.lat}%2C${l.lng}` }} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>{l.name}</button>
              ))}
            </div>
          </div>
          <FullscreenPanel label="Map">
            <iframe id="agri-map" title="OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 1}%2C${LANDMARKS[0].lat - 0.5}%2C${LANDMARKS[0].lng + 1}%2C${LANDMARKS[0].lat + 0.5}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`} style={{ width: '100%', height: '100%', border: 'none' }} />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'PubMed' ? 'block' : 'none', height: '100%' }}>
          <FullscreenPanel label="PubMed">
            <iframe title="PubMed" src="https://pubmed.ncbi.nlm.nih.gov/?term=agricultural+science" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
          </FullscreenPanel>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: AgriPlugin, sourceLabel: 'GeoGebra + OpenStreetMap + PubMed', toolToTab: { geogebra: 'GeoGebra', leaflet: 'Maps', pubmed: 'PubMed' } }
export default plugin
