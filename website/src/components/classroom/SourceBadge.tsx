'use client'

/**
 * Small badge showing data-source attribution at the bottom-left of the
 * plugin panel. Two lines:
 *
 *   Line 1 — technical source names (e.g. "RCSB Protein Data Bank + PubMed")
 *   Line 2 — plain-English description, auto-derived from the source names
 *            via SOURCE_DESCRIPTIONS below ("peer-reviewed research")
 *
 * Per Phase I-2 / Classroom redesign #2 — the badge moved from a global
 * plugin-level label to a per-tab signal. Multi-tab plugins set
 * `sources` per tab; single-pane plugins continue to use the
 * plugin-level `sourceLabel` field, which the classroom page passes
 * through to this same component.
 */

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  // protein & molecule databases
  'RCSB':                       'protein & molecule databases',
  'RCSB PDB':                   'protein & molecule databases',
  'RCSB Protein Data Bank':     'protein & molecule databases',
  'UniProt':                    'protein & molecule databases',
  'PubChem':                    'protein & molecule databases',
  // peer-reviewed research
  'PubMed':                     'peer-reviewed research',
  'PubMed / NCBI':              'peer-reviewed research',
  'ScienceDirect':              'peer-reviewed research',
  'ScienceDirect (Elsevier)':   'peer-reviewed research',
  'Scopus':                     'peer-reviewed research',
  'Scopus (Elsevier)':          'peer-reviewed research',
  // live computation engine
  'Wolfram':                    'live computation engine',
  'Wolfram Alpha':              'live computation engine',
  // interactive geometry
  'GeoGebra':                   'interactive geometry',
  // physics & science simulations
  'PhET':                       'physics & science simulations',
  // Indian court judgments
  'Indian Kanoon':              'Indian court judgments',
  // space & earth science data
  'NASA':                       'space & earth science data',
  'NASA Earth':                 'space & earth science data',
  'NASA Open Data':             'space & earth science data',
  'NTRS':                       'space & earth science data',
  'ISRO Bhuvan':                'space & earth science data',
  // code editor + live execution
  'Monaco':                     'code editor + live execution',
  'Monaco Editor':              'code editor + live execution',
  'Piston':                     'code editor + live execution',
  'Piston Runtime':             'code editor + live execution',
}

/** Split "RCSB PDB + UniProt + PubMed" into ['RCSB PDB','UniProt','PubMed'],
 *  look up each, dedupe descriptions, join with middot. Sources without a
 *  known description (e.g. Sketchfab, OpenStreetMap) silently contribute
 *  nothing — the line just stays shorter. */
function describeSources(sources: string): string {
  const parts = sources.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)
  const seen: string[] = []
  for (const p of parts) {
    const desc = SOURCE_DESCRIPTIONS[p]
    if (desc && !seen.includes(desc)) seen.push(desc)
  }
  return seen.join(' · ')
}

export function SourceBadge({ sources }: { sources: string }) {
  if (!sources) return null
  const description = describeSources(sources)

  return (
    <div
      className="absolute bottom-2 left-2 z-10 max-w-[60%] rounded-md px-2 py-1.5"
      style={{
        background: 'var(--bg-surface)',
        border:     '1px solid var(--border-subtle)',
        boxShadow:  '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="text-[9px] font-semibold leading-snug"
        style={{
          color:      'var(--text-ghost)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {sources}
      </div>
      {description && (
        <div
          className="mt-0.5 text-[10px] italic leading-snug"
          style={{ color: 'var(--text-ghost)' }}
        >
          {description}
        </div>
      )}
    </div>
  )
}
