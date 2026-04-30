'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { getToolTabsFor } from './useToolChipTabs'

const BASE_TABS = ['Canvas', 'PubMed', 'Media'] as const
type BaseTab = typeof BASE_TABS[number]
type Tab = BaseTab | string

function PsychPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [embedUrl, setEmbedUrl] = useState('')
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('psychsaathi')
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
        <div style={{ display: currentTab === 'PubMed' ? 'block' : 'none', height: '100%' }}>
          <FullscreenPanel label="PubMed">
            <iframe title="PubMed" src="https://pubmed.ncbi.nlm.nih.gov/?term=psychology" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
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
                <span style={{ fontSize: '32px', opacity: 0.3 }}>🧠</span>
                <p style={{ fontSize: '13px', color: 'var(--text-ghost)' }}>Paste a URL above to embed</p>
              </div>
            )}
          </div>
        </div>
        {toolNode && <div style={{ height: '100%' }}>{toolNode}</div>}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: PsychPlugin, sourceLabel: 'PubMed + Canvas', toolToTab: { pubmed: 'PubMed' } }
export default plugin
