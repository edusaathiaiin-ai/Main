// BioMan Biology + Biology Simulations — free HTML5 educational games + sims.
// HTML5 only — Flash/Java legacy excluded.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const BIOGAMES_BY_SAATHI: Record<string, ToolChip[]> = {
  biosaathi: [
    { label: 'BioMan: Cell Defense', url: 'https://biomanbio.com/HTML5GamesandLabs/Cellgames/celldefensehtml5page.html' },
    { label: 'BioMan: DNA Replication', url: 'https://biomanbio.com/HTML5GamesandLabs/Geneticsgames/dnareplicationhtml5page.html' },
    { label: 'BioMan: Mitosis Manor', url: 'https://biomanbio.com/HTML5GamesandLabs/Cellgames/mitosismansionhtml5.html' },
    { label: 'Biology Sims: Natural Selection', url: 'https://www.biologysimulations.com/natural-selection' },
    { label: 'Biology Sims: Pea Plants', url: 'https://www.biologysimulations.com/pea-plant-genetics' },
    { label: 'Biology Sims: Ecosystem', url: 'https://www.biologysimulations.com/predator-prey' },
  ],
  biotechsaathi: [
    { label: 'BioMan: DNA Replication', url: 'https://biomanbio.com/HTML5GamesandLabs/Geneticsgames/dnareplicationhtml5page.html' },
    { label: 'Biology Sims: Pea Plants', url: 'https://www.biologysimulations.com/pea-plant-genetics' },
  ],
  agrisaathi: [
    { label: 'Biology Sims: Pea Plants', url: 'https://www.biologysimulations.com/pea-plant-genetics' },
    { label: 'Biology Sims: Ecosystem', url: 'https://www.biologysimulations.com/predator-prey' },
    { label: 'Biology Sims: Natural Selection', url: 'https://www.biologysimulations.com/natural-selection' },
  ],
  envirosaathi: [
    { label: 'Biology Sims: Ecosystem', url: 'https://www.biologysimulations.com/predator-prey' },
    { label: 'Biology Sims: Natural Selection', url: 'https://www.biologysimulations.com/natural-selection' },
  ],
}

export function getBioGamesChipsFor(saathiSlug: string): ToolChip[] {
  return BIOGAMES_BY_SAATHI[saathiSlug] ?? []
}
