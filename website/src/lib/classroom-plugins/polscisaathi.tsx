'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'Indian Kanoon', 'Maps', 'Media'] as const
type Tab = typeof TABS[number]

const LANDMARKS = [
  { name: 'Parliament House', lat: 28.6175, lng: 77.2085 },
  { name: 'Supreme Court', lat: 28.6225, lng: 77.2400 },
  { name: 'Rashtrapati Bhavan', lat: 28.6143, lng: 77.1994 },
  { name: 'Vidhan Sabha (Mumbai)', lat: 18.9281, lng: 72.8311 },
  { name: 'UN Headquarters', lat: 40.7489, lng: -73.9680 },
]

function PolSciPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [embedUrl, setEmbedUrl] = useState('')
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
        {TABS.map((t) => (<button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: currentTab === t ? 700 : 500, background: currentTab === t ? 'var(--saathi-primary)' : 'transparent', color: currentTab === t ? '#fff' : 'var(--text-secondary)', border: currentTab === t ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer' }}>{t}</button>))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: currentTab === 'Canvas' ? 'block' : 'none', height: '100%' }}><CollaborativeCanvas role={role} /></div>
        <div style={{ display: currentTab === 'Indian Kanoon' ? 'block' : 'none', height: '100%' }}>
          <FullscreenPanel label="Indian Kanoon">
            <iframe title="Indian Kanoon" src="https://indiankanoon.org/" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'Maps' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {LANDMARKS.map((l) => (
                <button key={l.name} onClick={() => { const f = document.getElementById('polsci-map') as HTMLIFrameElement; if (f) f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.01}%2C${l.lat - 0.005}%2C${l.lng + 0.01}%2C${l.lat + 0.005}&layer=mapnik&marker=${l.lat}%2C${l.lng}` }} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>{l.name}</button>
              ))}
            </div>
          </div>
          <FullscreenPanel label="Map">
            <iframe id="polsci-map" title="OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 0.01}%2C${LANDMARKS[0].lat - 0.005}%2C${LANDMARKS[0].lng + 0.01}%2C${LANDMARKS[0].lat + 0.005}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`} style={{ width: '100%', height: '100%', border: 'none' }} />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'Media' ? 'block' : 'none', height: '100%' }}>
          <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              <input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="Paste YouTube or embeddable URL" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', outline: 'none' }} />
            </div>
            {embedUrl ? (
              <FullscreenPanel label="Media">
                <iframe title="Media" src={embedUrl.includes('youtube.com/watch?v=') ? embedUrl.replace('watch?v=', 'embed/') : embedUrl.includes('youtu.be/') ? `https://www.youtube.com/embed/${embedUrl.split('youtu.be/')[1]}` : embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups" />
              </FullscreenPanel>
            ) : (
              <div style={{ height: '300px', borderRadius: '12px', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🏛️</span>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>Paste a URL above to embed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: PolSciPlugin, sourceLabel: 'Indian Kanoon + OpenStreetMap', toolToTab: { indiankanoon: 'Indian Kanoon', leaflet: 'Maps' } }
export default plugin
