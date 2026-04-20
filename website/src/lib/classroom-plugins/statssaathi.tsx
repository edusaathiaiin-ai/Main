'use client'

import { useState, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

const TABS = ['Canvas', 'GeoGebra', 'Code Editor'] as const
type Tab = typeof TABS[number]

function StatsPlugin({ role, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'Canvas') as Tab
  const setTab = (t: Tab) => onTabChange?.(t)
  const [code, setCode] = useState('# Write R or Python code here\nprint("Hello, Statistics!")\n')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [lang, setLang] = useState<'python' | 'r'>('python')
  useEffect(() => { if (!activeTab) onTabChange?.('Canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runCode = async () => {
    setRunning(true)
    setOutput('')
    try {
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang === 'r' ? 'r' : 'python3', version: '*', files: [{ content: code }] }),
      })
      const data = await res.json()
      setOutput(data.run?.output || data.run?.stderr || 'No output')
    } catch { setOutput('Execution failed') }
    setRunning(false)
  }

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
        <div style={{ display: currentTab === 'Code Editor' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={lang} onChange={(e) => setLang(e.target.value as 'python' | 'r')} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              <option value="python">Python</option>
              <option value="r">R</option>
            </select>
            <button onClick={runCode} disabled={running} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: 'var(--saathi-primary)', color: '#fff', border: 'none', cursor: 'pointer', opacity: running ? 0.5 : 1 }}>{running ? 'Running...' : 'Run'}</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} style={{ flex: 1, padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--bg-base)', color: 'var(--text-primary)', border: 'none', outline: 'none', resize: 'none', borderBottom: '1px solid var(--border-subtle)' }} />
            <pre style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', margin: 0, minHeight: '80px', maxHeight: '200px', overflow: 'auto' }}>{output || 'Output will appear here...'}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = { Component: StatsPlugin, sourceLabel: 'GeoGebra + Canvas', toolToTab: { geogebra: 'GeoGebra', code: 'Code Editor' } }
export default plugin
