'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useToolChipTabs — composes all "ToolChipPanel" tool tabs for a Saathi.
//
// Each Saathi plugin used to add tools by manually editing tabs[] and the
// render switch. With 13+ tools fanning across 18 Saathis, that meant
// hundreds of tiny edits. Instead, plugins call this helper once and
// receive both the tab definitions and a renderer function.
//
// Tools wired here:
//   PhET · LabXchange · HHMI BioInteractive · Learn.Genetics · BioGames ·
//   Concord · Virtual Labs (vlab.co.in) · MERLOT · ChemCollective ·
//   CircuitVerse · Tinkercad Circuits · SimScale · JSCAD · CAN-Sim
//   scenarios · Desktop Resources.
//
// Each plugin spreads the returned `tabs` into its own tabs[] and calls
// the returned `render(tabId)` to draw the tab content. Tabs only show
// up for Saathis where the corresponding tool has curated chips —
// never for an empty list.
//
// Strict additive: this helper only ADDS tabs. Existing per-plugin tabs
// (PubMed, RCSB, GeoGebra, Falstad, etc.) stay untouched.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { ToolChipPanel } from '@/components/classroom/ToolChipPanel'
import { ResourcesPanel } from '@/components/classroom/ResourcesPanel'
import { getPhetChipsFor } from '@/lib/classroom-data/phetSims'
import { getLabXchangeChipsFor } from '@/lib/classroom-data/labxchange'
import { getHhmiChipsFor } from '@/lib/classroom-data/hhmiBioInteractive'
import { getLearnGeneticsChipsFor } from '@/lib/classroom-data/learnGenetics'
import { getBioGamesChipsFor } from '@/lib/classroom-data/bioGames'
import { getConcordChipsFor } from '@/lib/classroom-data/concord'
import { getVirtualLabsChipsFor } from '@/lib/classroom-data/virtualLabs'
import { getMerlotChipsFor } from '@/lib/classroom-data/merlot'
import { getChemCollectiveChipsFor } from '@/lib/classroom-data/chemCollective'
import { getCircuitVerseChipsFor } from '@/lib/classroom-data/circuitVerse'
import { getTinkercadChipsFor } from '@/lib/classroom-data/tinkercadCircuits'
import { getSimScaleChipsFor } from '@/lib/classroom-data/simScale'
import { getJscadChipsFor } from '@/lib/classroom-data/jscadCAD'
import { getDesmosChipsFor } from '@/lib/classroom-data/desmos'
import { getCompilerExplorerChipsFor } from '@/lib/classroom-data/compilerExplorer'
import { getScenariosFor } from '@/lib/classroom-data/canSim'
import { getDesktopResourcesFor } from '@/lib/classroom-data/desktopResources'

// Tool tab id naming convention: prefixed `tool_` so they never collide
// with existing per-plugin tab ids (canvas, pubmed, rcsb, geogebra, etc.).
export type ToolTabId =
  | 'tool_phet'
  | 'tool_labxchange'
  | 'tool_hhmi'
  | 'tool_learngenetics'
  | 'tool_biogames'
  | 'tool_concord'
  | 'tool_vlab'
  | 'tool_merlot'
  | 'tool_chemcollective'
  | 'tool_circuitverse'
  | 'tool_tinkercad'
  | 'tool_simscale'
  | 'tool_jscad'
  | 'tool_desmos'
  | 'tool_godbolt'
  | 'tool_scenarios'
  | 'tool_resources'

export type ToolTab = {
  id: ToolTabId
  label: string
  /** Optional source attribution surfaced via SourceBadge. */
  sources?: string
}

type ToolTabSet = {
  /** Tabs to spread into the plugin's existing tabs[] array. */
  tabs: ToolTab[]
  /** Returns the panel JSX for a tool tab, or null for non-tool ids. */
  render: (tabId: string) => ReactNode | null
}

// One declarative spec → both `tabs` and `render` derived from it.
type Spec = {
  id: ToolTabId
  label: string
  sources?: string
  /** Render function — picks ToolChipPanel or ResourcesPanel as appropriate. */
  build: (saathiSlug: string) => ReactNode | null
}

const SPECS: Spec[] = [
  {
    id: 'tool_vlab',
    label: '🇮🇳 Virtual Labs',
    sources: 'vlab.co.in (Govt. of India / IIT consortium)',
    build: (slug) => {
      const chips = getVirtualLabsChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Virtual Labs" chips={chips} />
    },
  },
  {
    id: 'tool_phet',
    label: '⚡ PhET Sims',
    sources: 'PhET (CU Boulder)',
    build: (slug) => {
      const chips = getPhetChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="PhET Simulation" chips={chips} />
    },
  },
  {
    id: 'tool_labxchange',
    label: '🧫 LabXchange',
    sources: 'LabXchange (Harvard / Amgen Foundation)',
    build: (slug) => {
      const chips = getLabXchangeChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="LabXchange" chips={chips} />
    },
  },
  {
    id: 'tool_hhmi',
    label: '🧬 HHMI BioInteractive',
    sources: 'HHMI BioInteractive',
    build: (slug) => {
      const chips = getHhmiChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="HHMI BioInteractive" chips={chips} />
    },
  },
  {
    id: 'tool_learngenetics',
    label: '🔬 Learn.Genetics',
    sources: 'Univ. of Utah Genetic Science Learning Center',
    build: (slug) => {
      const chips = getLearnGeneticsChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Learn.Genetics" chips={chips} />
    },
  },
  {
    id: 'tool_biogames',
    label: '🎮 Biology Games & Sims',
    sources: 'BioMan + Biology Simulations',
    build: (slug) => {
      const chips = getBioGamesChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Biology Games & Sims" chips={chips} />
    },
  },
  {
    id: 'tool_concord',
    label: '🌍 Concord Sims',
    sources: 'Concord Consortium',
    build: (slug) => {
      const chips = getConcordChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Concord Consortium" chips={chips} />
    },
  },
  {
    id: 'tool_chemcollective',
    label: '⚗️ ChemCollective',
    sources: 'ChemCollective (Carnegie Mellon)',
    build: (slug) => {
      const chips = getChemCollectiveChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="ChemCollective Virtual Lab" chips={chips} />
    },
  },
  {
    id: 'tool_circuitverse',
    label: '⚡ CircuitVerse',
    sources: 'CircuitVerse (open-source digital logic simulator)',
    build: (slug) => {
      const chips = getCircuitVerseChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="CircuitVerse" chips={chips} />
    },
  },
  {
    id: 'tool_tinkercad',
    label: '🔌 Tinkercad Circuits',
    sources: 'Tinkercad (Autodesk)',
    build: (slug) => {
      const chips = getTinkercadChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Tinkercad Circuits" chips={chips} />
    },
  },
  {
    id: 'tool_simscale',
    label: '💨 SimScale (CFD/FEA)',
    sources: 'SimScale Academic',
    build: (slug) => {
      const chips = getSimScaleChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="SimScale" chips={chips} />
    },
  },
  {
    id: 'tool_jscad',
    label: '📐 JSCAD',
    sources: 'JSCAD (open-source parametric CAD)',
    build: (slug) => {
      const chips = getJscadChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="JSCAD" chips={chips} />
    },
  },
  {
    id: 'tool_desmos',
    label: '📊 Desmos',
    sources: 'Desmos (graphing · geometry · 3D · scientific)',
    build: (slug) => {
      const chips = getDesmosChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Desmos" chips={chips} />
    },
  },
  {
    id: 'tool_godbolt',
    label: '⚙️ Compiler Explorer',
    sources: 'Compiler Explorer (godbolt.org) — open-source',
    build: (slug) => {
      const chips = getCompilerExplorerChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="Compiler Explorer" chips={chips} />
    },
  },
  {
    id: 'tool_merlot',
    label: '📚 MERLOT',
    sources: 'MERLOT (CSU multi-institution catalog)',
    build: (slug) => {
      const chips = getMerlotChipsFor(slug)
      return chips.length === 0 ? null : <ToolChipPanel label="MERLOT" chips={chips} />
    },
  },
  {
    id: 'tool_scenarios',
    label: '🏥 Scenarios',
    sources: 'CAN-Sim + Labster (free demos)',
    build: (slug) => {
      const resources = getScenariosFor(slug)
      return resources.length === 0
        ? null
        : (
          <ResourcesPanel
            label="Clinical & Lab Scenarios"
            intro="Free virtual scenarios curated by faculty. Open in a new tab — these resources host their own players."
            resources={resources}
          />
        )
    },
  },
  {
    id: 'tool_resources',
    label: '📦 Desktop Resources',
    sources: 'External vendors (download-only)',
    build: (slug) => {
      const resources = getDesktopResourcesFor(slug)
      return resources.length === 0
        ? null
        : (
          <ResourcesPanel
            label="Desktop Tools & Downloads"
            intro="Tools that genuinely need a desktop install. Honest links rather than broken iframes."
            resources={resources}
          />
        )
    },
  },
]

export function getToolTabsFor(saathiSlug: string): ToolTabSet {
  const cache = new Map<ToolTabId, ReactNode | null>()
  const tabs: ToolTab[] = []

  for (const spec of SPECS) {
    const node = spec.build(saathiSlug)
    if (node !== null) {
      cache.set(spec.id, node)
      tabs.push({ id: spec.id, label: spec.label, sources: spec.sources })
    }
  }

  return {
    tabs,
    render: (tabId: string) => cache.get(tabId as ToolTabId) ?? null,
  }
}
