'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'Maps', 'GeoGebra', 'Media'] as const
type Tab = typeof TABS[number]

const LANDMARKS = [
  { name: 'Himalayas', lat: 27.9881, lng: 86.9250 },
  { name: 'Grand Canyon', lat: 36.1069, lng: -112.1129 },
  { name: 'Mariana Trench', lat: 11.3493, lng: 142.1996 },
  { name: 'Sahara Desert', lat: 23.4162, lng: 25.6628 },
  { name: 'Great Rift Valley', lat: -1.9403, lng: 36.1500 },
  { name: 'Deccan Plateau', lat: 18.0, lng: 77.0 },
  { name: 'Ring of Fire', lat: 35.6762, lng: 139.6503 },
]

function GeoPlugin({ role, activeTab, onTabChange }: PluginProps) {
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
                <button key={l.name} onClick={() => { const f = document.getElementById('geo-map') as HTMLIFrameElement; if (f) f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.5}%2C${l.lat - 0.3}%2C${l.lng + 0.5}%2C${l.lat + 0.3}&layer=mapnik&marker=${l.lat}%2C${l.lng}` }} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '10px', fontWeight: 500, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>{l.name}</button>
              ))}
            </div>
          </div>
          <FullscreenPanel label="Map">
            <iframe id="geo-map" title="OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${LANDMARKS[0].lng - 0.5}%2C${LANDMARKS[0].lat - 0.3}%2C${LANDMARKS[0].lng + 0.5}%2C${LANDMARKS[0].lat + 0.3}&layer=mapnik&marker=${LANDMARKS[0].lat}%2C${LANDMARKS[0].lng}`} style={{ width: '100%', height: '100%', border: 'none' }} />
          </FullscreenPanel>
        </div>
        <div style={{ display: currentTab === 'GeoGebra' ? 'block' : 'none', height: '100%' }}>
          <FullscreenPanel label="GeoGebra">
            <iframe title="GeoGebra" src="https://www.geogebra.org/classic" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
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
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🗺️</span>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>Paste a URL above to embed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: GeoPlugin, sourceLabel: 'OpenStreetMap + GeoGebra', toolToTab: { leaflet: 'Maps', geogebra: 'GeoGebra' } }
export default plugin
