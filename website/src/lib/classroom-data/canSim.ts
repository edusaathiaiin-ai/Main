// CAN-Sim virtual nursing simulations + scenarios. Mostly PDF / scenario-doc
// content; we link out via ResourcesPanel rather than iframe.
//
// We also pool free Labster demo scenarios that work without an
// institutional license. Both go in the same "Scenarios" tab.

import type { ResourceChip } from '@/components/classroom/ResourcesPanel'

const SCENARIOS_BY_SAATHI: Record<string, ResourceChip[]> = {
  nursingsaathi: [
    {
      label: 'CAN-Sim Open Simulations',
      url: 'https://can-sim.ca/open-source-simulations/',
      description: 'Open-source nursing scenarios and assessment tools.',
      icon: '🏥',
      tag: 'Scenarios',
    },
    {
      label: 'CAN-Sim Resources Hub',
      url: 'https://can-sim.ca/resources/',
      description: 'Faculty teaching resources for simulation-based learning.',
      icon: '📋',
      tag: 'Faculty',
    },
    {
      label: 'Labster (Free Demos)',
      url: 'https://www.labster.com/simulations',
      description: 'Browse free Labster demo simulations — full library is institutional.',
      icon: '🧪',
      tag: 'Demos',
    },
  ],
  medicosaathi: [
    {
      label: 'CAN-Sim Clinical Scenarios',
      url: 'https://can-sim.ca/open-source-simulations/',
      description: 'Open-access clinical patient scenarios.',
      icon: '🏥',
      tag: 'Scenarios',
    },
    {
      label: 'Labster (Free Demos)',
      url: 'https://www.labster.com/simulations',
      description: 'Browse free Labster medical demo simulations.',
      icon: '🧪',
      tag: 'Demos',
    },
  ],
}

export function getScenariosFor(saathiSlug: string): ResourceChip[] {
  return SCENARIOS_BY_SAATHI[saathiSlug] ?? []
}
