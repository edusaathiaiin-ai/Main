// PhET Interactive Simulations — curated chip catalogs per Saathi.
//
// Each chip is { label, url, description? }. URL format is the standard
// PhET HTML5 sim path: https://phet.colorado.edu/sims/html/<id>/latest/<id>_en.html
// All sims are free, no auth, iframe-friendly. Source: phet.colorado.edu.
//
// Adding a new sim for an existing Saathi = data-only edit. Adding a new
// Saathi = add a key + chip array.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const sim = (id: string, label: string, description?: string): ToolChip => ({
  label,
  url: `https://phet.colorado.edu/sims/html/${id}/latest/${id}_en.html`,
  description,
})

const PHET_BY_SAATHI: Record<string, ToolChip[]> = {
  physicsaathi: [
    sim('projectile-motion', 'Projectile Motion'),
    sim('forces-and-motion-basics', 'Forces & Motion'),
    sim('energy-skate-park-basics', 'Energy Skate Park'),
    sim('wave-on-a-string', 'Waves on a String'),
    sim('pendulum-lab', 'Pendulum Lab'),
    sim('gravity-and-orbits', 'Gravity & Orbits'),
    sim('circuit-construction-kit-dc', 'Circuit Construction (DC)'),
    sim('ohms-law', "Ohm's Law"),
    sim('geometric-optics', 'Geometric Optics'),
    sim('quantum-tunneling', 'Quantum Tunneling'),
    sim('blackbody-spectrum', 'Blackbody Spectrum'),
    sim('rutherford-scattering', 'Rutherford Scattering'),
    sim('faraday', "Faraday's Law"),
    sim('bending-light', 'Bending Light'),
    sim('gas-properties', 'Gas Properties'),
  ],
  chemsaathi: [
    sim('ph-scale', 'pH Scale'),
    sim('build-a-molecule', 'Build a Molecule'),
    sim('build-an-atom', 'Build an Atom'),
    sim('acid-base-solutions', 'Acid-Base Solutions'),
    sim('sugar-and-salt-solutions', 'Sugar & Salt Solutions'),
    sim('reactants-products-and-leftovers', 'Reactants, Products & Leftovers'),
    sim('balancing-chemical-equations', 'Balancing Chemical Equations'),
    sim('states-of-matter-basics', 'States of Matter (Basics)'),
    sim('gas-properties', 'Gas Properties'),
    sim('beers-law-lab', "Beer's Law Lab"),
    sim('molarity', 'Molarity'),
    sim('atomic-interactions', 'Atomic Interactions'),
    sim('salts-and-solubility', 'Salts & Solubility'),
    sim('concentration', 'Concentration'),
    sim('reactions-and-rates', 'Reactions & Rates'),
  ],
  biosaathi: [
    sim('gene-expression-essentials', 'Gene Expression Essentials'),
    sim('natural-selection', 'Natural Selection'),
    sim('neuron', 'Neuron'),
    sim('build-a-molecule', 'Build a Molecule'),
    sim('membrane-channels', 'Membrane Channels'),
  ],
  biotechsaathi: [
    sim('gene-expression-essentials', 'Gene Expression Essentials'),
    sim('natural-selection', 'Natural Selection'),
    sim('build-a-molecule', 'Build a Molecule'),
    sim('ph-scale', 'pH Scale'),
  ],
  medicosaathi: [
    sim('neuron', 'Neuron'),
    sim('membrane-channels', 'Membrane Channels'),
    sim('blood-pressure', 'Blood Pressure (legacy — verify availability)'),
    sim('ph-scale', 'pH Scale'),
  ],
  pharmasaathi: [
    sim('molarity', 'Molarity'),
    sim('concentration', 'Concentration'),
    sim('beers-law-lab', "Beer's Law Lab"),
    sim('build-a-molecule', 'Build a Molecule'),
  ],
  envirosaathi: [
    sim('greenhouse-effect', 'Greenhouse Effect'),
    sim('gas-properties', 'Gas Properties'),
    sim('states-of-matter-basics', 'States of Matter'),
    sim('natural-selection', 'Natural Selection'),
  ],
  agrisaathi: [
    sim('natural-selection', 'Natural Selection'),
    sim('ph-scale', 'pH Scale'),
    sim('greenhouse-effect', 'Greenhouse Effect'),
  ],
  maathsaathi: [
    sim('graphing-lines', 'Graphing Lines'),
    sim('graphing-quadratics', 'Graphing Quadratics'),
    sim('function-builder', 'Function Builder'),
    sim('plinko-probability', 'Plinko Probability'),
    sim('trig-tour', 'Trig Tour'),
  ],
  aerospacesaathi: [
    sim('projectile-motion', 'Projectile Motion'),
    sim('gravity-and-orbits', 'Gravity & Orbits'),
    sim('forces-and-motion-basics', 'Forces & Motion'),
    sim('gas-properties', 'Gas Properties'),
  ],
  mechsaathi: [
    sim('forces-and-motion-basics', 'Forces & Motion'),
    sim('energy-skate-park-basics', 'Energy Skate Park'),
    sim('pendulum-lab', 'Pendulum Lab'),
    sim('gas-properties', 'Gas Properties'),
  ],
  civilsaathi: [
    sim('forces-and-motion-basics', 'Forces & Motion'),
    sim('energy-skate-park-basics', 'Energy Skate Park'),
    sim('gravity-and-orbits', 'Gravity & Orbits'),
  ],
  elecsaathi: [
    sim('circuit-construction-kit-dc', 'Circuit Construction (DC)'),
    sim('circuit-construction-kit-ac', 'Circuit Construction (AC)'),
    sim('ohms-law', "Ohm's Law"),
    sim('faraday', "Faraday's Law"),
    sim('resistance-in-a-wire', 'Resistance in a Wire'),
  ],
  electronicssaathi: [
    sim('circuit-construction-kit-dc', 'Circuit Construction (DC)'),
    sim('circuit-construction-kit-ac', 'Circuit Construction (AC)'),
    sim('ohms-law', "Ohm's Law"),
    sim('resistance-in-a-wire', 'Resistance in a Wire'),
  ],
  chemenggsaathi: [
    sim('reactions-and-rates', 'Reactions & Rates'),
    sim('gas-properties', 'Gas Properties'),
    sim('states-of-matter-basics', 'States of Matter'),
    sim('molarity', 'Molarity'),
  ],
}

export function getPhetChipsFor(saathiSlug: string): ToolChip[] {
  // Normalise the chemengg-saathi slug variant.
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return PHET_BY_SAATHI[key] ?? []
}
