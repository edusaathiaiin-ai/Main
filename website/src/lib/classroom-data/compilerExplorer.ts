// Compiler Explorer (godbolt.org) — open-source, free, iframe-friendly.
// Source-to-assembly viewer used heavily in GATE Computer Architecture
// prep, undergrad systems courses, and practical CS interviews.
//
// godbolt.org accepts iframe embedding directly. The compiler/language
// selector lives inside the embedded UI, so a single chip is enough —
// students pick the language (C++, C, Rust, Java, Go, etc.) and target
// architecture (x86, ARM, RISC-V, MIPS) within the iframe.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const COMPILER_EXPLORER: ToolChip[] = [
  {
    label: 'Compiler Explorer',
    url:   'https://godbolt.org/',
    description: 'Source → assembly across compilers + architectures. Pick language inside.',
  },
]

const COMPILER_EXPLORER_BY_SAATHI: Record<string, ToolChip[]> = {
  compsaathi:        COMPILER_EXPLORER,
  electronicssaathi: COMPILER_EXPLORER,
}

export function getCompilerExplorerChipsFor(saathiSlug: string): ToolChip[] {
  return COMPILER_EXPLORER_BY_SAATHI[saathiSlug] ?? []
}
