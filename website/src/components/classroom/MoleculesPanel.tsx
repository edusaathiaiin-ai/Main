'use client'

// ─────────────────────────────────────────────────────────────────────────────
// MoleculesPanel — unified protein/molecule search.
// Phase I-2 / Classroom redesign #4 — replaces standalone RCSB + UniProt
// (and acts as a fallback to PubChem for small molecules).
//
// One search bar. Search logic:
//   1. Try RCSB PDB by name OR 4-char PDB ID
//      → If found: render the 3D structure (3Dmol.js, same engine RcsbPanel
//                  uses) and IN PARALLEL fetch UniProt for the same query
//                  to populate the collapsible "About this protein" card.
//   2. If RCSB returned nothing: fall through to PubChem
//      → If found: render the small-molecule 3D structure from PubChem SDF.
//      → No UniProt section in this case (UniProt is protein-only).
//   3. If neither: show "No results found" + try-again hint.
//
// AutoQuery wiring: this component listens for the 'rcsb' tool from the
// AI command bar (same tool name as before), so the existing
// toolToTab maps in plugins still route correctly to the renamed
// 🔬 Molecules tab.
//
// Source badge for the tab (rendered by the classroom page):
//   Line 1: "RCSB Protein Data Bank + UniProt + PubChem"
//   Line 2: auto-derived → "protein & molecule databases"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAutoQueryHandler } from '@/lib/classroom-plugins/useAutoQueryHandler'
import { FullscreenPanel } from './FullscreenPanel'

type PdbResult = {
  pdb_id:   string
  title:    string
  organism: string
  resolution: number | null
  pdb_data: string | null
}

type UniProtResult = {
  accession:     string
  name:          string
  organism:      string
  function_text: string
  gene:          string
}

type PubChemResult = {
  cid:                number
  name:               string
  molecular_formula:  string
  molecular_weight:   number
  iupac_name:         string
  canonical_smiles:   string
  inchi_key:          string
  sdf:                string | null
}

type Mode = 'idle' | 'pdb' | 'pubchem' | 'empty'

type Props = {
  onArtifact?: (a: { type: string; source: string; source_url?: string; data: Record<string, unknown>; timestamp: string }) => unknown
}

export function MoleculesPanel({ onArtifact }: Props) {
  const [query,    setQuery]    = useState('')
  const [mode,     setMode]     = useState<Mode>('idle')
  const [pdb,      setPdb]      = useState<PdbResult | null>(null)
  const [pubchem,  setPubchem]  = useState<PubChemResult | null>(null)
  const [uniprot,  setUniprot]  = useState<UniProtResult | null>(null)
  const [uniprotOpen, setUniprotOpen] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const viewerRef         = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<unknown>(null)

  // AI command bar → "show insulin" emits the rcsb tool with protein_name.
  // Same tool name as before so plugin toolToTab maps don't need changes.
  useAutoQueryHandler('rcsb', (params) => {
    const q = (params.protein_name as string) ?? (params.pdb_id as string) ?? ''
    if (q) { setQuery(q); doSearch(q) }
  })

  // ── Search orchestration ────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    setPdb(null)
    setPubchem(null)
    setUniprot(null)
    setUniprotOpen(false)
    setMode('idle')

    // 1. Try RCSB. 4-char ID → fetch directly. Otherwise search by name and
    //    auto-load the first result.
    try {
      let pdbHit: PdbResult | null = null
      if (/^[a-zA-Z0-9]{4}$/.test(q.trim())) {
        const res  = await fetch(`/api/classroom/rcsb?pdb=${encodeURIComponent(q.trim())}`)
        if (res.ok) pdbHit = (await res.json()) as PdbResult
      } else {
        const sRes = await fetch(`/api/classroom/rcsb?q=${encodeURIComponent(q.trim())}`)
        if (sRes.ok) {
          const sData = await sRes.json()
          const firstId = (sData.results ?? [])[0]?.pdb_id
          if (firstId) {
            const fRes = await fetch(`/api/classroom/rcsb?pdb=${encodeURIComponent(firstId)}`)
            if (fRes.ok) pdbHit = (await fRes.json()) as PdbResult
          }
        }
      }

      if (pdbHit && pdbHit.pdb_data) {
        setPdb(pdbHit)
        setMode('pdb')
        emitProteinArtifact(pdbHit)
        // Fire UniProt lookup in parallel — failure is silent
        void fetchUniProt(q.trim()).then(setUniprot).catch(() => {})
        setLoading(false)
        return
      }
    } catch { /* fall through to PubChem */ }

    // 2. PubChem fallback. Small molecules / drugs / compounds.
    try {
      const res = await fetch(`/api/classroom/pubchem?name=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        const data = (await res.json()) as PubChemResult
        if (data.cid && data.sdf) {
          setPubchem(data)
          setMode('pubchem')
          emitMoleculeArtifact(data)
          setLoading(false)
          return
        }
      }
    } catch { /* fall through to empty */ }

    // 3. Nothing matched.
    setMode('empty')
    setError(`No results found for "${q.trim()}". Try a different name or PDB ID.`)
    setLoading(false)
  }, [onArtifact])  // eslint-disable-line react-hooks/exhaustive-deps

  function emitProteinArtifact(p: PdbResult) {
    onArtifact?.({
      type:       'protein_structure',
      source:     'RCSB Protein Data Bank',
      source_url: `https://www.rcsb.org/structure/${p.pdb_id}`,
      data:       { pdb_id: p.pdb_id, title: p.title, organism: p.organism },
      timestamp:  new Date().toISOString(),
    })
  }
  function emitMoleculeArtifact(m: PubChemResult) {
    onArtifact?.({
      type:       'molecule_3d',
      source:     'PubChem',
      source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${m.cid}`,
      data:       { cid: m.cid, name: m.iupac_name || m.name, formula: m.molecular_formula },
      timestamp:  new Date().toISOString(),
    })
  }

  async function fetchUniProt(q: string): Promise<UniProtResult | null> {
    // UniProt API is public + CORS-friendly — no proxy needed.
    const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(q)}&size=1&fields=accession,protein_name,organism_name,gene_names,cc_function&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const r = (data.results ?? [])[0]
    if (!r) return null
    return {
      accession:     r.primaryAccession ?? '',
      name:          r.proteinDescription?.recommendedName?.fullName?.value
                       ?? r.proteinDescription?.submissionNames?.[0]?.fullName?.value
                       ?? '',
      organism:      r.organism?.scientificName ?? '',
      function_text: (r.comments ?? []).find((c: { commentType?: string }) => c.commentType === 'FUNCTION')?.texts?.[0]?.value ?? '',
      gene:          (r.genes ?? [])[0]?.geneName?.value ?? '',
    }
  }

  // ── 3D viewer for RCSB results ──────────────────────────────────────────
  // Same 3Dmol.js pattern as RcsbPanel — load the global script once,
  // create a viewer in the ref, render cartoon + ribbon styles.
  useEffect(() => {
    if (mode !== 'pdb' || !pdb?.pdb_data || !viewerRef.current) return

    const existing = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!existing) {
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
          render:  () => void
          clear:   () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current || !pdb?.pdb_data) return

      if (viewerInstanceRef.current) {
        (viewerInstanceRef.current as { clear: () => void }).clear()
      }
      const v = $3Dmol.createViewer(viewerRef.current, { backgroundColor: 0xfafaf8 })
      v.addModel(pdb.pdb_data, 'pdb')
      v.setStyle({}, { cartoon: { color: 'spectrum' } })
      v.setBackgroundColor('0xfafaf8')
      v.zoomTo()
      v.render()
      viewerInstanceRef.current = v
    }
  }, [mode, pdb])

  // ── 3D viewer for PubChem results ───────────────────────────────────────
  useEffect(() => {
    if (mode !== 'pubchem' || !pubchem?.sdf || !viewerRef.current) return

    const existing = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!existing) {
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
          render:  () => void
          clear:   () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current || !pubchem?.sdf) return

      if (viewerInstanceRef.current) {
        (viewerInstanceRef.current as { clear: () => void }).clear()
      }
      const v = $3Dmol.createViewer(viewerRef.current, { backgroundColor: 0xfafaf8 })
      v.addModel(pubchem.sdf, 'sdf')
      v.setStyle({}, { stick: { colorscheme: 'rasmol' } })
      v.setBackgroundColor('0xfafaf8')
      v.zoomTo()
      v.render()
      viewerInstanceRef.current = v
    }
  }, [mode, pubchem])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <FullscreenPanel
      label={
        mode === 'pdb'     && pdb     ? `${pdb.pdb_id} — ${pdb.title}`
      : mode === 'pubchem' && pubchem ? (pubchem.iupac_name || pubchem.name)
      :                                  'Molecules'
      }
    >
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
            onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
            placeholder="Search any protein, molecule, or compound..."
            className="flex-1 border-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            onClick={() => doSearch(query)}
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
            style={{ background: 'var(--gold)', color: 'var(--bg-surface)' }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* RCSB hit — 3D viewer + UniProt collapsible */}
          {mode === 'pdb' && pdb && (
            <>
              <div
                ref={viewerRef}
                style={{
                  height:   '380px',
                  width:    '100%',
                  position: 'relative',
                  background: '#FAFAF8',
                }}
              />
              <div
                className="px-3 py-2 text-xs"
                style={{
                  background:  'var(--bg-elevated)',
                  borderTop:    '1px solid var(--border-subtle)',
                  color:        'var(--text-secondary)',
                }}
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {pdb.organism && <span><strong>Organism:</strong> {pdb.organism}</span>}
                  {pdb.resolution != null && <span><strong>Resolution:</strong> {pdb.resolution}Å</span>}
                  <a
                    href={`https://www.rcsb.org/structure/${pdb.pdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-semibold"
                    style={{ color: 'var(--gold)' }}
                  >
                    View on RCSB →
                  </a>
                </div>
              </div>

              {/* UniProt collapsible */}
              {uniprot && (
                <div
                  className="border-t"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => setUniprotOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold"
                    style={{
                      background: 'var(--bg-surface)',
                      color:      'var(--text-primary)',
                    }}
                  >
                    <span>About this protein</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {uniprotOpen ? '▾' : '▸'}
                    </span>
                  </button>
                  {uniprotOpen && (
                    <div
                      className="px-3 py-3 text-xs leading-relaxed"
                      style={{
                        background: 'var(--bg-elevated)',
                        color:      'var(--text-secondary)',
                        borderTop:  '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            background: 'var(--bg-surface)',
                            color:      'var(--text-ghost)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {uniprot.accession}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {uniprot.name}
                        </span>
                      </div>
                      {uniprot.gene && (
                        <p><strong>Gene:</strong> {uniprot.gene}</p>
                      )}
                      {uniprot.organism && (
                        <p><strong>Organism:</strong> {uniprot.organism}</p>
                      )}
                      {uniprot.function_text && (
                        <p className="mt-1.5"><strong>Function:</strong> {uniprot.function_text}</p>
                      )}
                      <a
                        href={`https://www.uniprot.org/uniprot/${uniprot.accession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[11px] font-semibold"
                        style={{ color: 'var(--gold)' }}
                      >
                        View on UniProt →
                      </a>
                      <p
                        className="mt-2 text-[10px] italic"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        UniProt — 250M+ protein sequences
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* PubChem hit — 3D molecule viewer */}
          {mode === 'pubchem' && pubchem && (
            <>
              <div
                ref={viewerRef}
                style={{
                  height:     '380px',
                  width:      '100%',
                  position:   'relative',
                  background: '#FAFAF8',
                }}
              />
              <div
                className="px-3 py-3 text-xs"
                style={{
                  background:  'var(--bg-elevated)',
                  borderTop:   '1px solid var(--border-subtle)',
                  color:       'var(--text-secondary)',
                }}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span><strong>Formula:</strong> {pubchem.molecular_formula}</span>
                  <span><strong>MW:</strong> {pubchem.molecular_weight} g/mol</span>
                  <span className="col-span-2 break-words"><strong>SMILES:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{pubchem.canonical_smiles}</span></span>
                </div>
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${pubchem.cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-semibold"
                  style={{ color: 'var(--gold)' }}
                >
                  View on PubChem →
                </a>
              </div>
            </>
          )}

          {/* Empty / error / idle states */}
          {mode === 'empty' && (
            <p className="px-3 py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {error}
            </p>
          )}
          {mode === 'idle' && !loading && (
            <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
              <p className="mb-2 text-3xl">🔬</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Search proteins, molecules, or compounds
              </p>
              <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                Try: hemoglobin, insulin, aspirin, 1HHO
              </p>
            </div>
          )}
        </div>
      </div>
    </FullscreenPanel>
  )
}
