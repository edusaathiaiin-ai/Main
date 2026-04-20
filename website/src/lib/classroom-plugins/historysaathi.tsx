'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'Maps', 'Media'] as const
type Tab = typeof TABS[number]

const LANDMARKS = [
  { name: 'Rome', lat: 41.8902, lng: 12.4922 },
  { name: 'Athens', lat: 37.9715, lng: 23.7267 },
  { name: 'Mohenjo-daro', lat: 27.3242, lng: 68.1386 },
  { name: 'Hampi', lat: 15.3350, lng: 76.4600 },
  { name: 'Delhi', lat: 28.6562, lng: 77.2410 },
  { name: 'London', lat: 51.5014, lng: -0.1419 },
  { name: 'Cairo', lat: 29.9792, lng: 31.1342 },
  { name: 'Beijing', lat: 39.9163, lng: 116.3972 },
]

function HistoryPlugin({ role, activeTab, onTabChange }: PluginProps) {
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
        <div style={{ display: currentTab === 'Maps' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {LANDMARKS.map((l) => (
                <button key={l.name} onClick={() => { const f = document.getElementById('history-map') as HTMLIFrameElement; if (f) f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.02}%2C${l.lat - 0.01}%2C${l.lng + 0.02}%2C${l.lat + 0.01}&layer=mapnik&marker=${l.lat}%2C${l.lng}` }} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>{l.name}</button>
              ))}
            </div>
          </div>
          <FullscreenPanel label="Map">
            <iframe id="history-map" title="OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 0.02}%2C${LANDMARKS[0].lat - 0.01}%2C${LANDMARKS[0].lng + 0.02}%2C${LANDMARKS[0].lat + 0.01}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`} style={{ width: '100%', height: '100%', border: 'none' }} />
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
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🏺</span>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>Paste a URL above to embed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: HistoryPlugin, sourceLabel: 'OpenStreetMap + Wikipedia', toolToTab: { leaflet: 'Maps' } }
export default plugin
