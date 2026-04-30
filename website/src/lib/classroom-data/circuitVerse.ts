// CircuitVerse — open-source online digital logic simulator.
// circuitverse.org. Free, no auth for viewing, embed-friendly.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const CIRCUITVERSE_BY_SAATHI: Record<string, ToolChip[]> = {
  elecsaathi: [
    { label: 'CircuitVerse Simulator', url: 'https://circuitverse.org/simulator' },
    { label: 'Logic Gates', url: 'https://circuitverse.org/examples?tag=gates' },
    { label: 'Combinational Circuits', url: 'https://circuitverse.org/examples?tag=combinational' },
    { label: 'Sequential Circuits', url: 'https://circuitverse.org/examples?tag=sequential' },
  ],
  electronicssaathi: [
    { label: 'CircuitVerse Simulator', url: 'https://circuitverse.org/simulator' },
    { label: 'Logic Gates', url: 'https://circuitverse.org/examples?tag=gates' },
    { label: 'Adders & Subtractors', url: 'https://circuitverse.org/examples?tag=arithmetic' },
    { label: 'Flip-Flops', url: 'https://circuitverse.org/examples?tag=flipflop' },
    { label: 'Counters', url: 'https://circuitverse.org/examples?tag=counter' },
  ],
  compsaathi: [
    { label: 'CircuitVerse Simulator', url: 'https://circuitverse.org/simulator' },
    { label: 'Boolean Logic', url: 'https://circuitverse.org/examples?tag=gates' },
    { label: 'ALU Design', url: 'https://circuitverse.org/examples?tag=alu' },
    { label: 'Memory Units', url: 'https://circuitverse.org/examples?tag=memory' },
  ],
}

export function getCircuitVerseChipsFor(saathiSlug: string): ToolChip[] {
  return CIRCUITVERSE_BY_SAATHI[saathiSlug] ?? []
}
