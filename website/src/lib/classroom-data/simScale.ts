// SimScale Academic Plan — cloud CFD/FEA/thermal simulation.
// Free academic tier (3000 hrs/yr, public projects).
// Faculty hosts simulations; students view via embedded post-processing URL.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const SIMSCALE_BY_SAATHI: Record<string, ToolChip[]> = {
  mechsaathi: [
    { label: 'SimScale Public Projects', url: 'https://www.simscale.com/projects/' },
    { label: 'Structural FEA examples', url: 'https://www.simscale.com/projects/?type=Structural' },
    { label: 'Thermal analysis examples', url: 'https://www.simscale.com/projects/?type=Thermal' },
  ],
  civilsaathi: [
    { label: 'SimScale Public Projects', url: 'https://www.simscale.com/projects/' },
    { label: 'Structural Analysis', url: 'https://www.simscale.com/projects/?type=Structural' },
    { label: 'Wind Loading', url: 'https://www.simscale.com/projects/?type=Fluid' },
  ],
  aerospacesaathi: [
    { label: 'SimScale Public Projects', url: 'https://www.simscale.com/projects/' },
    { label: 'CFD Examples', url: 'https://www.simscale.com/projects/?type=Fluid' },
    { label: 'Aerodynamics', url: 'https://www.simscale.com/projects/?q=aerodynamics' },
  ],
  chemenggsaathi: [
    { label: 'SimScale Public Projects', url: 'https://www.simscale.com/projects/' },
    { label: 'Process Flow', url: 'https://www.simscale.com/projects/?type=Fluid' },
    { label: 'Heat Transfer', url: 'https://www.simscale.com/projects/?type=Thermal' },
  ],
  envirosaathi: [
    { label: 'SimScale Public Projects', url: 'https://www.simscale.com/projects/' },
    { label: 'Environmental Flow', url: 'https://www.simscale.com/projects/?q=environmental' },
  ],
}

export function getSimScaleChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return SIMSCALE_BY_SAATHI[key] ?? []
}
