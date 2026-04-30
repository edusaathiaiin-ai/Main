// Concord Consortium HTML5 simulations — embeddable, free, no auth.
// Source: learn.concord.org. Replaces the desktop-only Energy3D suggestion.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const CONCORD_BY_SAATHI: Record<string, ToolChip[]> = {
  civilsaathi: [
    { label: 'Building Energy Model', url: 'https://learn.concord.org/resources?q=energy' },
    { label: 'Materials & Heat Transfer', url: 'https://learn.concord.org/resources?q=heat+transfer' },
    { label: 'Renewable Energy', url: 'https://learn.concord.org/resources?q=solar' },
  ],
  envirosaathi: [
    { label: 'Climate Models', url: 'https://learn.concord.org/resources?q=climate' },
    { label: 'Greenhouse Effect', url: 'https://learn.concord.org/resources?q=greenhouse' },
    { label: 'Renewable Energy', url: 'https://learn.concord.org/resources?q=renewable' },
    { label: 'Earth Systems', url: 'https://learn.concord.org/resources?q=earth' },
  ],
  physicsaathi: [
    { label: 'Heat & Temperature', url: 'https://learn.concord.org/resources?q=heat' },
    { label: 'Energy', url: 'https://learn.concord.org/resources?q=energy' },
    { label: 'Forces', url: 'https://learn.concord.org/resources?q=force' },
  ],
  chemsaathi: [
    { label: 'Chemical Reactions', url: 'https://learn.concord.org/resources?q=reaction' },
    { label: 'Molecular Structure', url: 'https://learn.concord.org/resources?q=molecule' },
    { label: 'States of Matter', url: 'https://learn.concord.org/resources?q=states+of+matter' },
  ],
  geosaathi: [
    { label: 'Earth Systems', url: 'https://learn.concord.org/resources?q=earth' },
    { label: 'Plate Tectonics', url: 'https://learn.concord.org/resources?q=plate' },
    { label: 'Climate', url: 'https://learn.concord.org/resources?q=climate' },
  ],
}

export function getConcordChipsFor(saathiSlug: string): ToolChip[] {
  return CONCORD_BY_SAATHI[saathiSlug] ?? []
}
