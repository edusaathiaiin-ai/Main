'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PubChem search + 3Dmol.js viewer                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

type CompoundResult = {
  cid: number
  name: string
  formula: string
  molecular_weight: number
  iupac_name: string
  smiles: string
  inchi_key: string
  sdf: string | null
}

function PubChemPanel() {
  const [query, setQuery] = useState('')
  const [compound, setCompound] = useState<CompoundResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<unknown>(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setCompound(null)

    try {
      const res = await fetch(`/api/classroom/pubchem?name=${encodeURIComponent(query.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Not found')
        setLoading(false)
        return
      }

      setCompound(data)
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  // Render 3D structure with 3Dmol.js when SDF data is available
  useEffect(() => {
    if (!compound?.sdf || !viewerRef.current) return

    // Dynamically load 3Dmol.js from CDN (avoid bundling 2MB+ library)
    const script = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!script) {
      const s = document.createElement('script')
      s.id = '3dmol-script'
      s.src = 'https://3Dmol.org/build/3Dmol-min.js'
      s.onload = () => render3D()
      document.head.appendChild(s)
    } else {
      render3D()
    }

    function render3D() {
      const $3Dmol = (window as unknown as Record<string, unknown>)['$3Dmol'] as {
        createViewer: (el: HTMLElement, config: Record<string, unknown>) => {
          addModel: (data: string, format: string) => void
          setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void
          setBackgroundColor: (color: string) => void
          zoomTo: () => void
          render: () => void
          clear: () => void
        }
      } | undefined

      if (!$3Dmol || !viewerRef.current) return

      // Clear previous viewer
      if (viewerInstanceRef.current) {
        (viewerInstanceRef.current as { clear: () => void }).clear()
      }
      viewerRef.current.innerHTML = ''

      const viewer = $3Dmol.createViewer(viewerRef.current, {
        backgroundColor: '#FAFAF8',
      })
      viewer.addModel(compound!.sdf!, 'sdf')
      viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } })
      viewer.zoomTo()
      viewer.render()
      viewerInstanceRef.current = viewer
    }
  }, [compound])

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search compound... e.g. Aspirin, Caffeine, Glucose"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}

        {compound && (
          <div className="flex flex-col gap-0">
            {/* 3D viewer */}
            <div
              ref={viewerRef}
              className="w-full"
              style={{ height: '300px', background: 'var(--bg-base)' }}
            />

            {/* Compound info */}
            <div className="space-y-2 px-3 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
                  IUPAC Name
                </p>
                <p className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {compound.iupac_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Formula</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{compound.formula}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Mol. Weight</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{compound.molecular_weight} g/mol</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>CID</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{compound.cid}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>InChIKey</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{compound.inchi_key}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>SMILES</p>
                <p className="break-all text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {compound.smiles}
                </p>
              </div>

              {/* PubChem link */}
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold"
                style={{ color: 'var(--gold)' }}
              >
                View on PubChem →
              </a>
            </div>
          </div>
        )}

        {!compound && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧪</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search for any compound
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              PubChem database — 100M+ compounds
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Ketcher 2D molecular editor (iframe embed)                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

function KetcherPanel() {
  // Ketcher standalone editor hosted by EPAM — free, no install
  return (
    <iframe
      src="https://lifescience.opensource.epam.com/KetcherDemoSA/index.html"
      className="h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      title="Ketcher Molecular Editor"
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Chemistry Plugin Component                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

type ChemTab = 'canvas' | 'pubchem' | 'ketcher'

function ChemPlugin({ role }: PluginProps) {
  const [tab, setTab] = useState<ChemTab>('canvas')

  const tabs: { id: ChemTab; label: string }[] = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'pubchem', label: '3D Molecules' },
    { id: 'ketcher', label: '2D Editor' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div
        className="flex shrink-0 items-center gap-1 px-2 py-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {tabs.map((t) => (
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
      </div>

      {/* Tab content */}
      <div className="relative flex-1">
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}
        {tab === 'pubchem' && <PubChemPanel />}
        {tab === 'ketcher' && <KetcherPanel />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Export                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

const plugin: SaathiPlugin = {
  Component: ChemPlugin,
  sourceLabel: 'PubChem + 3Dmol.js + Ketcher',
}

export default plugin
