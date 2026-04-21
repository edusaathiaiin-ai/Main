'use client'

import { useEffect, useRef } from 'react'

type Artifact = {
  type: string
  source: string
  source_url?: string
  data: Record<string, unknown>
  timestamp: string
}

const TYPE_LABELS: Record<string, string> = {
  molecule_3d: 'Molecule 3D',
  protein_structure: 'Protein Structure',
  wolfram_query: 'Wolfram Computation',
  geogebra_state: 'GeoGebra Construction',
  phet_session: 'PhET Simulation',
  pubmed_citation: 'PubMed Citation',
  formula_katex: 'Formula',
  pdf_annotation: 'PDF Annotation',
  code_snapshot: 'Code Snapshot',
  map_state: 'Map View',
  canvas_snapshot: 'Canvas Snapshot',
  session_notes: 'Session Notes',
}

export function ArtifactModal({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1A1F2E', borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          maxWidth: '640px', width: '100%', maxHeight: '80vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--bg-elevated)',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {TYPE_LABELS[artifact.type] ?? artifact.type}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {artifact.source}
              {artifact.timestamp && ` · ${new Date(artifact.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '20px', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <ArtifactContent artifact={artifact} />
        </div>

        {/* Footer: source link */}
        {artifact.source_url && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bg-elevated)' }}>
            <a href={artifact.source_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '12px', fontWeight: 600, color: '#C9993A', textDecoration: 'none' }}>
              View on {artifact.source} →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function s(v: unknown): string { return String(v ?? '') }

function ArtifactContent({ artifact }: { artifact: Artifact }) {
  const d = artifact.data

  switch (artifact.type) {
    case 'pubmed_citation':
      return (
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 8px' }}>
            {s(d.title)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
            {Array.isArray(d.authors) ? (d.authors as string[]).join(', ') : s(d.authors)}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)' }}>
            {s(d.journal)} · {s(d.year)} · PMID: {s(d.pmid)}
          </p>
          {d.abstract_snippet ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px' }}>
              {s(d.abstract_snippet)}
            </p>
          ) : null}
          {d.doi ? (
            <a href={`https://doi.org/${d.doi}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', color: '#C9993A', marginTop: '8px', display: 'inline-block' }}>
              DOI: {s(d.doi)}
            </a>
          ) : null}
        </div>
      )

    case 'protein_structure':
      return <Protein3DViewer data={d} />

    case 'wolfram_query':
      return (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
            Query: <code style={{ color: 'var(--text-secondary)' }}>{s(d.input)}</code>
          </p>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-elevated)', marginBottom: '12px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {s(d.plaintext_result)}
            </p>
            {d.latex_result ? (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                LaTeX: {s(d.latex_result)}
              </p>
            ) : null}
          </div>
          {Array.isArray(d.pods) && (d.pods as Array<{ title: string; content: string }>).map((pod, i) => (
            <div key={i} style={{ marginBottom: '8px', padding: '10px', borderRadius: '8px', background: 'var(--bg-elevated)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{pod.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{pod.content}</p>
            </div>
          ))}
        </div>
      )

    case 'formula_katex':
      return (
        <div>
          {d.rendered_svg ? (
            <div dangerouslySetInnerHTML={{ __html: s(d.rendered_svg) }}
              style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '10px' }} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
              <p style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {s(d.latex)}
              </p>
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>
            Raw LaTeX: {s(d.latex)}
          </p>
          {d.context_note ? (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              {s(d.context_note)}
            </p>
          ) : null}
        </div>
      )

    case 'code_snapshot':
      return (
        <div>
          <div style={{ padding: '4px 8px', borderRadius: '6px 6px 0 0', background: 'var(--bg-elevated)', display: 'inline-block' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {s(d.language).toUpperCase() || 'CODE'}
            </span>
          </div>
          <pre style={{
            padding: '16px', borderRadius: '0 10px 10px 10px', background: 'var(--bg-elevated)',
            fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: '300px', margin: 0,
          }}>
            {s(d.content)}
          </pre>
          {d.execution_output ? (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px' }}>Output:</p>
              <pre style={{
                padding: '10px', borderRadius: '8px', background: 'rgba(5,150,105,0.1)',
                fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: 0,
              }}>
                {s(d.execution_output)}
              </pre>
            </div>
          ) : null}
        </div>
      )

    case 'session_notes':
      return (
        <div>
          <div
            dangerouslySetInnerHTML={{ __html: s(d.html) }}
            style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text-secondary)' }}
          />
        </div>
      )

    case 'molecule_3d':
      return (
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            {s(d.compound_name || d.iupac_name)}
          </p>
          <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
            {d.formula ? <Field label="Formula" value={s(d.formula)} /> : null}
            {d.molecular_weight ? <Field label="Mol. Weight" value={s(d.molecular_weight)} /> : null}
            {d.cid ? <Field label="CID" value={s(d.cid)} /> : null}
            {d.smiles ? <Field label="SMILES" value={s(d.smiles).slice(0, 40)} /> : null}
          </div>
        </div>
      )

    default:
      return (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Raw artifact data:
          </p>
          <pre style={{
            padding: '12px', borderRadius: '8px', background: 'var(--bg-elevated)',
            fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
            overflow: 'auto', maxHeight: '400px', margin: 0,
          }}>
            {JSON.stringify(d, null, 2)}
          </pre>
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)', marginTop: '8px', fontStyle: 'italic' }}>
            Live view unavailable — showing raw data fields.
          </p>
        </div>
      )
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-ghost)', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</p>
    </div>
  )
}

function Protein3DViewer({ data }: { data: Record<string, unknown> }) {
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewerRef.current || !data.pdb_id) return

    const script = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!script) {
      const s = document.createElement('script')
      s.id = '3dmol-script'
      s.src = 'https://3Dmol.org/build/3Dmol-min.js'
      s.onload = () => render()
      document.head.appendChild(s)
    } else { render() }

    async function render() {
      const $3Dmol = (window as unknown as Record<string, unknown>)['$3Dmol'] as {
        createViewer: (el: HTMLElement, cfg: Record<string, unknown>) => {
          addModel: (d: string, f: string) => void
          setStyle: (s: Record<string, unknown>, st: Record<string, unknown>) => void
          zoomTo: () => void; render: () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current) return

      try {
        const res = await fetch(`https://files.rcsb.org/view/${data.pdb_id}.pdb`)
        const pdbData = await res.text()
        viewerRef.current.innerHTML = ''
        const viewer = $3Dmol.createViewer(viewerRef.current, { backgroundColor: '#1A1F2E' })
        viewer.addModel(pdbData, 'pdb')
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
        viewer.zoomTo()
        viewer.render()
      } catch { /* fallback to raw data */ }
    }
  }, [data.pdb_id])

  return (
    <div>
      <div ref={viewerRef} style={{ width: '100%', height: '280px', borderRadius: '10px', background: '#1A1F2E' }} />
      <div style={{ marginTop: '12px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s(data.title)}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          PDB: {s(data.pdb_id)} · {s(data.organism)}
          {data.resolution ? ` · ${data.resolution}Å` : ''}
        </p>
      </div>
    </div>
  )
}
