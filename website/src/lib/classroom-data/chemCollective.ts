// ChemCollective (Carnegie Mellon) — virtual chemistry labs.
// HTML5 activities only — Java applet legacy excluded (browsers reject Java).

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const CHEM_COLLECTIVE_BY_SAATHI: Record<string, ToolChip[]> = {
  chemsaathi: [
    { label: 'Stoichiometry Activities', url: 'http://chemcollective.org/stoichiometry' },
    { label: 'Acid-Base Scenarios', url: 'http://chemcollective.org/find_activities/acid-base' },
    { label: 'Equilibrium Scenarios', url: 'http://chemcollective.org/find_activities/equilibrium' },
    { label: 'Thermochemistry Labs', url: 'http://chemcollective.org/find_activities/thermo' },
    { label: 'Solubility Activities', url: 'http://chemcollective.org/find_activities/solubility' },
    { label: 'Online Activities Library', url: 'http://chemcollective.org/activities' },
  ],
  chemenggsaathi: [
    { label: 'Stoichiometry', url: 'http://chemcollective.org/stoichiometry' },
    { label: 'Equilibrium', url: 'http://chemcollective.org/find_activities/equilibrium' },
    { label: 'Thermochemistry', url: 'http://chemcollective.org/find_activities/thermo' },
  ],
  pharmasaathi: [
    { label: 'Acid-Base Scenarios', url: 'http://chemcollective.org/find_activities/acid-base' },
    { label: 'Solubility', url: 'http://chemcollective.org/find_activities/solubility' },
  ],
  biotechsaathi: [
    { label: 'Stoichiometry', url: 'http://chemcollective.org/stoichiometry' },
    { label: 'Acid-Base', url: 'http://chemcollective.org/find_activities/acid-base' },
  ],
}

export function getChemCollectiveChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return CHEM_COLLECTIVE_BY_SAATHI[key] ?? []
}
