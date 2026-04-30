// HHMI BioInteractive — curated Click & Learn / interactive resources per Saathi.
// Source: biointeractive.org. Free, no auth, embed-friendly.
//
// We link to BioInteractive's HTML5 interactive resources. Each chip
// loads the publicly hosted page in our iframe panel.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const HHMI_BY_SAATHI: Record<string, ToolChip[]> = {
  biosaathi: [
    { label: 'Evolution & Selection', url: 'https://www.biointeractive.org/classroom-resources/biology-genetics-evolution' },
    { label: 'Stickleback Evolution Lab', url: 'https://www.biointeractive.org/classroom-resources/stickleback-evolution-virtual-lab' },
    { label: 'Cell Signaling', url: 'https://www.biointeractive.org/classroom-resources?topic=Cell+Biology' },
    { label: 'Population Dynamics', url: 'https://www.biointeractive.org/classroom-resources?topic=Ecology' },
    { label: 'Mutation Types', url: 'https://www.biointeractive.org/classroom-resources?topic=Genetics' },
  ],
  biotechsaathi: [
    { label: 'CRISPR', url: 'https://www.biointeractive.org/classroom-resources?keywords=CRISPR' },
    { label: 'DNA Structure', url: 'https://www.biointeractive.org/classroom-resources?keywords=DNA' },
    { label: 'Cell Signaling', url: 'https://www.biointeractive.org/classroom-resources?topic=Cell+Biology' },
    { label: 'Gene Regulation', url: 'https://www.biointeractive.org/classroom-resources?keywords=Gene+Regulation' },
  ],
  medicosaathi: [
    { label: 'Disease Mechanisms', url: 'https://www.biointeractive.org/classroom-resources?topic=Anatomy+%26+Physiology' },
    { label: 'Infectious Disease', url: 'https://www.biointeractive.org/classroom-resources?keywords=Infectious' },
    { label: 'Cardiovascular Click & Learn', url: 'https://www.biointeractive.org/classroom-resources?keywords=Cardiovascular' },
    { label: 'Neuroscience', url: 'https://www.biointeractive.org/classroom-resources?topic=Neuroscience' },
  ],
  nursingsaathi: [
    { label: 'Anatomy & Physiology', url: 'https://www.biointeractive.org/classroom-resources?topic=Anatomy+%26+Physiology' },
    { label: 'Infectious Disease', url: 'https://www.biointeractive.org/classroom-resources?keywords=Infectious' },
    { label: 'Cardiovascular', url: 'https://www.biointeractive.org/classroom-resources?keywords=Cardiovascular' },
  ],
  pharmasaathi: [
    { label: 'Drug Action', url: 'https://www.biointeractive.org/classroom-resources?keywords=Drug' },
    { label: 'Cell Signaling', url: 'https://www.biointeractive.org/classroom-resources?topic=Cell+Biology' },
    { label: 'Disease Mechanisms', url: 'https://www.biointeractive.org/classroom-resources?topic=Anatomy+%26+Physiology' },
  ],
  psychsaathi: [
    { label: 'Neuroscience', url: 'https://www.biointeractive.org/classroom-resources?topic=Neuroscience' },
    { label: 'Brain & Behavior', url: 'https://www.biointeractive.org/classroom-resources?keywords=Brain' },
  ],
  agrisaathi: [
    { label: 'Plant Biology', url: 'https://www.biointeractive.org/classroom-resources?keywords=Plant' },
    { label: 'Ecology', url: 'https://www.biointeractive.org/classroom-resources?topic=Ecology' },
    { label: 'Evolution', url: 'https://www.biointeractive.org/classroom-resources?topic=Evolution' },
  ],
  envirosaathi: [
    { label: 'Climate', url: 'https://www.biointeractive.org/classroom-resources?keywords=Climate' },
    { label: 'Ecology', url: 'https://www.biointeractive.org/classroom-resources?topic=Ecology' },
    { label: 'Biodiversity', url: 'https://www.biointeractive.org/classroom-resources?keywords=Biodiversity' },
  ],
}

export function getHhmiChipsFor(saathiSlug: string): ToolChip[] {
  return HHMI_BY_SAATHI[saathiSlug] ?? []
}
