'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

const TABS = ['Canvas', 'PubMed', 'Drug Reference', 'Clinical Guidelines'] as const
type Tab = typeof TABS[number]

function NursingPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [drugQuery, setDrugQuery] = useState('')
  const [pubmedQuery, setPubmedQuery] = useState('')

  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div style={{ display: currentTab === 'Canvas' ? 'block' : 'none', height: '100%' }}><CollaborativeCanvas role={role} /></div>
        <div style={{ display: currentTab === 'PubMed' ? 'block' : 'none', height: '100%' }}>
          <iframe title="PubMed Nursing" src="https://pubmed.ncbi.nlm.nih.gov/?term=nursing" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
        <div style={{ display: currentTab === 'Drug Reference' ? 'block' : 'none', height: '100%' }}>
          <iframe title="MedlinePlus Drugs" src="https://medlineplus.gov/druginformation.html" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
        <div style={{ display: currentTab === 'Clinical Guidelines' ? 'block' : 'none', height: '100%' }}>
          <iframe title="WHO Guidelines" src="https://www.who.int/publications/guidelines" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: NursingPlugin, sourceLabel: 'PubMed + MedlinePlus + WHO', toolToTab: { pubmed: 'PubMed' } }
export default plugin
