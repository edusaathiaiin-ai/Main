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
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '640px', width: '100%', maxHeight: '80vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {TYPE_LABELS[artifact.type] ?? artifact.type}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              {artifact.source}
              {artifact.timestamp && ` · ${new Date(artifact.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '20px', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <ArtifactContent artifact={artifact} />
        </div>

        {/* Footer: source link */}
        {artifact.source_url && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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

function ArtifactContent({ artifact }: { artifact: Artifact }) {
  const d = artifact.data

  switch (artifact.type) {
    case 'pubmed_citation':
      return (
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '0 0 8px' }}>
            {d.title as string}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 4px' }}>
            {(d.authors as string[])?.join(', ')}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {d.journal as string} · {d.year as string} · PMID: {d.pmid as string}
          </p>
          {d.abstract_snippet && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginTop: '12px' }}>
              {d.abstract_snippet as string}
            </p>
          )}
          {d.doi && (
            <a href={`https://doi.org/${d.doi}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', color: '#C9993A', marginTop: '8px', display: 'inline-block' }}>
              DOI: {d.doi as string}
            </a>
          )}
        </div>
      )

    case 'protein_structure':
      return <Protein3DViewer data={d} />

    case 'wolfram_query':
      return (
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
            Query: <code style={{ color: 'rgba(255,255,255,0.7)' }}>{d.input as string}</code>
          </p>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', marginBottom: '12px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)' }}>
              {d.plaintext_result as string}
            </p>
            {d.latex_result && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                LaTeX: {d.latex_result as string}
              </p>
            )}
          </div>
          {(d.pods as Array<{ title: string; content: string }>)?.map((pod, i) => (
            <div key={i} style={{ marginBottom: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{pod.title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)' }}>{pod.content}</p>
            </div>
          ))}
        </div>
      )

    case 'formula_katex':
      return (
        <div>
          {d.rendered_svg ? (
            <div dangerouslySetInnerHTML={{ __html: d.rendered_svg as string }}
              style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <p style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)' }}>
                {d.latex as string}
              </p>
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>
            Raw LaTeX: {d.latex as string}
          </p>
          {d.context_note && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>
              {d.context_note as string}
            </p>
          )}
        </div>
      )

    case 'code_snapshot':
      return (
        <div>
          <div style={{ padding: '4px 8px', borderRadius: '6px 6px 0 0', background: 'rgba(255,255,255,0.06)', display: 'inline-block' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
              {(d.language as string)?.toUpperCase() ?? 'CODE'}
            </span>
          </div>
          <pre style={{
            padding: '16px', borderRadius: '0 10px 10px 10px', background: 'rgba(255,255,255,0.03)',
            fontSize: '12px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)',
            fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: '300px', margin: 0,
          }}>
            {d.content as string}
          </pre>
          {d.execution_output && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Output:</p>
              <pre style={{
                padding: '10px', borderRadius: '8px', background: 'rgba(5,150,105,0.1)',
                fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', margin: 0,
              }}>
                {d.execution_output as string}
              </pre>
            </div>
          )}
        </div>
      )

    case 'session_notes':
      return (
        <div>
          <div
            dangerouslySetInnerHTML={{ __html: (d.html as string) ?? '' }}
            style={{ fontSize: '13px', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)' }}
          />
        </div>
      )

    case 'molecule_3d':
      return (
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px' }}>
            {d.compound_name as string ?? d.iupac_name as string}
          </p>
          <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
            {d.formula && <Field label="Formula" value={d.formula as string} />}
            {d.molecular_weight && <Field label="Mol. Weight" value={d.molecular_weight as string} />}
            {d.cid && <Field label="CID" value={d.cid as string} />}
            {d.smiles && <Field label="SMILES" value={(d.smiles as string).slice(0, 40)} />}
          </div>
        </div>
      )

    default:
      return (
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
            Raw artifact data:
          </p>
          <pre style={{
            padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
            fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)',
            overflow: 'auto', maxHeight: '400px', margin: 0,
          }}>
            {JSON.stringify(d, null, 2)}
          </pre>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '8px', fontStyle: 'italic' }}>
            Live view unavailable — showing raw data fields.
          </p>
        </div>
      )
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>{value}</p>
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
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{data.title as string}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          PDB: {data.pdb_id as string} · {data.organism as string}
          {data.resolution && ` · ${data.resolution}Å`}
        </p>
      </div>
    </div>
  )
}
