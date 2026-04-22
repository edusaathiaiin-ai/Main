'use client'

// ─────────────────────────────────────────────────────────────────────────────
// FacultyPanelRouter — dispatch a tool id to its dock panel component.
//
// One switch, lazy-loaded where panels are heavy (RCSB pulls 3Dmol.js).
// Unknown tool ids fall back to ComingSoonPanel — never a crash.
// ─────────────────────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic'
import type { FacultyTool } from '@/lib/faculty-solo/pluginRegistry'
import { PubMedPanel } from './PubMedPanel'
import { UniProtPanel } from './UniProtPanel'
import { GeoGebraPanel } from './GeoGebraPanel'
import { PhETPanel } from './PhETPanel'
import { SageMathCellPanel } from './SageMathCellPanel'
import { EuropePMCPanel } from './EuropePMCPanel'
import { SemanticScholarPanel } from './SemanticScholarPanel'
import { IndiaCodePanel } from './IndiaCodePanel'
import { OpenFdaPanel } from './OpenFdaPanel'
import { NasaImagesPanel } from './NasaImagesPanel'
import { NCBIGenePanel } from './NCBIGenePanel'
import { EnsemblPanel } from './EnsemblPanel'
import { NtrsPanel } from './NtrsPanel'
import { UsgsPanel } from './UsgsPanel'
import { WikimediaCommonsPanel } from './WikimediaCommonsPanel'
import { OpenAnatomyPanel } from './OpenAnatomyPanel'
import { MedlinePlusPanel } from './MedlinePlusPanel'
import { WhoPanel } from './WhoPanel'
import { IsroBhuvanPanel } from './IsroBhuvanPanel'
import { FredPanel } from './FredPanel'
import { ComingSoonPanel } from './ComingSoonPanel'

// RCSB loads the 3Dmol CDN on mount — defer until the user actually picks it.
const RcsbPanelSolo = dynamic(
  () => import('./RcsbPanelSolo').then((m) => m.RcsbPanelSolo),
  { ssr: false, loading: () => <PanelLoader emoji="🧬" label="Loading structure viewer…" /> }
)

function PanelLoader({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p style={{ fontSize: 32 }}>{emoji}</p>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
    </div>
  )
}

export function FacultyPanelRouter({ tool, saathiSlug }: { tool: FacultyTool; saathiSlug: string }) {
  switch (tool.id) {
    case 'pubmed':            return <PubMedPanel           saathiSlug={saathiSlug} />
    case 'rcsb':              return <RcsbPanelSolo         saathiSlug={saathiSlug} />
    case 'uniprot':           return <UniProtPanel          saathiSlug={saathiSlug} />
    case 'europepmc':         return <EuropePMCPanel        saathiSlug={saathiSlug} />
    case 'semantic-scholar':  return <SemanticScholarPanel  saathiSlug={saathiSlug} />
    case 'indiacode':         return <IndiaCodePanel />
    case 'openfda':           return <OpenFdaPanel          saathiSlug={saathiSlug} />
    case 'nasa-images':       return <NasaImagesPanel       saathiSlug={saathiSlug} />
    case 'ncbi-gene':         return <NCBIGenePanel         saathiSlug={saathiSlug} />
    case 'ensembl':           return <EnsemblPanel          saathiSlug={saathiSlug} />
    case 'ntrs':              return <NtrsPanel             saathiSlug={saathiSlug} />
    case 'usgs':              return <UsgsPanel             saathiSlug={saathiSlug} />
    case 'wikimedia-commons': return <WikimediaCommonsPanel saathiSlug={saathiSlug} />
    case 'open-anatomy':      return <OpenAnatomyPanel />
    case 'medlineplus':       return <MedlinePlusPanel />
    case 'who':               return <WhoPanel />
    case 'isro-bhuvan':       return <IsroBhuvanPanel />
    case 'fred':              return <FredPanel />
    case 'geogebra':          return <GeoGebraPanel />
    case 'phet':              return <PhETPanel />
    case 'sagemathcell':      return <SageMathCellPanel />
    default:                  return <ComingSoonPanel tool={tool} />
  }
}
