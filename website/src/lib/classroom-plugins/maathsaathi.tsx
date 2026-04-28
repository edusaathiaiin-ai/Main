'use client'

import { useState, useCallback } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Wolfram Alpha query panel                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

type WolframPod = {
  title: string
  content: string
  image_url: string | null
}

function WolframPanel() {
  const [query, setQuery] = useState('')
  const [pods, setPods] = useState<WolframPod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setPods([])

    try {
      const res = await fetch(`/api/classroom/wolfram?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error ?? 'No result found')
        setLoading(false)
        return
      }

      setPods(data.pods ?? [])
    } catch {
      setError('Query failed')
    }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="Ask Wolfram... e.g. integrate x^2 dx"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        />
        <button
          onClick={handleQuery}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? 'Computing...' : 'Compute'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {pods.map((pod, i) => (
          <div key={i} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
              {pod.title}
            </p>
            {pod.content && (
              <p className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                {pod.content}
              </p>
            )}
            {pod.image_url && (
              <img
                src={pod.image_url}
                alt={pod.title}
                className="mt-2 max-w-full"
                style={{ maxHeight: '200px' }}
              />
            )}
          </div>
        ))}

        {pods.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📐</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Computational knowledge engine</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Wolfram Alpha — maths, physics, statistics</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  GeoGebra panel with mode selector                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

type GeoGebraMode = 'graphing' | 'classic' | '3d' | 'cas'

const GEOGEBRA_MODES: { id: GeoGebraMode; label: string; url: string }[] = [
  { id: 'graphing', label: '2D Graph', url: 'https://www.geogebra.org/graphing?lang=en' },
  { id: 'classic', label: 'Classic', url: 'https://www.geogebra.org/classic?lang=en' },
  { id: '3d', label: '3D', url: 'https://www.geogebra.org/3d?lang=en' },
  { id: 'cas', label: 'CAS', url: 'https://www.geogebra.org/cas?lang=en' },
]

function GeoGebraPanel() {
  const [mode, setMode] = useState<GeoGebraMode>('graphing')
  const activeMode = GEOGEBRA_MODES.find((m) => m.id === mode)!

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {GEOGEBRA_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors"
            style={{
              background: mode === m.id ? 'var(--bg-elevated)' : 'transparent',
              color: mode === m.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <FullscreenPanel label={`GeoGebra ${activeMode.label}`}>
        <iframe
          key={mode}
          src={activeMode.url}
          className="h-full w-full border-0"
          allow="fullscreen"
          title={`GeoGebra ${activeMode.label}`}
        />
      </FullscreenPanel>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Maths Plugin Component                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

type MathTab = 'canvas' | 'geogebra' | 'wolfram' | 'sagemath'

function MathPlugin({ role, unlockedTabIds, onShowAllTools }: PluginProps) {
  const [tab, setTab] = useState<MathTab>('canvas')

  const tabs: { id: MathTab; label: string; sources?: string }[] = [
    { id: 'canvas',   label: '✏️ Draw' },
    { id: 'wolfram',  label: '🔢 Calculate', sources: 'Wolfram Alpha' },
    { id: 'geogebra', label: '📐 Geometry',  sources: 'GeoGebra' },
    { id: 'sagemath', label: '∑ SageMath',   sources: 'SageMath' },
  ]

  // Phase I-2 / Classroom #5 — progressive tab reveal.
  const visibleTabs = unlockedTabIds === undefined
    ? tabs
    : tabs.filter((t, i) => i === 0 || unlockedTabIds.includes(t.id))
  const hasLockedTabs = visibleTabs.length < tabs.length

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}
          >
            {t.label}
          </button>
        ))}
        {hasLockedTabs && onShowAllTools && (
          <button
            type="button"
            onClick={() => onShowAllTools(tabs.map((t) => t.id))}
            className="ml-auto rounded-md px-2 py-1 text-[11px] transition-colors hover:opacity-80"
            style={{ background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            Show all tools ↓
          </button>
        )}
      </div>
      <div className="relative flex-1">
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}
        {tab === 'geogebra' && <GeoGebraPanel />}
        {tab === 'wolfram' && <WolframPanel />}
        {tab === 'sagemath' && (
          <FullscreenPanel label="SageMath">
            <iframe
              src="https://sagecell.sagemath.org/"
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title="SageMathCell"
            />
          </FullscreenPanel>
        )}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: MathPlugin,
  sourceLabel: 'GeoGebra + Wolfram Alpha + SageMath',
}

export default plugin
