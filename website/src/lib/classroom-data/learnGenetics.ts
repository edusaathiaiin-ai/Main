// Learn.Genetics (University of Utah Genetic Science Learning Center).
// Free, no auth, embed-friendly. Strong on biotech techniques.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const LEARN_GENETICS_BY_SAATHI: Record<string, ToolChip[]> = {
  biotechsaathi: [
    { label: 'PCR Virtual Lab', url: 'https://learn.genetics.utah.edu/content/labs/pcr/' },
    { label: 'Gel Electrophoresis Lab', url: 'https://learn.genetics.utah.edu/content/labs/gel/' },
    { label: 'Cloning', url: 'https://learn.genetics.utah.edu/content/cloning/' },
    { label: 'Microarrays', url: 'https://learn.genetics.utah.edu/content/labs/microarray/' },
    { label: 'Gene Therapy', url: 'https://learn.genetics.utah.edu/content/genetherapy/' },
    { label: 'Build a DNA', url: 'https://learn.genetics.utah.edu/content/basics/builddna/' },
    { label: 'Transgenic Mice', url: 'https://learn.genetics.utah.edu/content/labs/transgenic/' },
  ],
  biosaathi: [
    { label: 'Build a DNA', url: 'https://learn.genetics.utah.edu/content/basics/builddna/' },
    { label: 'PCR Virtual Lab', url: 'https://learn.genetics.utah.edu/content/labs/pcr/' },
    { label: 'Gel Electrophoresis', url: 'https://learn.genetics.utah.edu/content/labs/gel/' },
    { label: 'DNA Extraction', url: 'https://learn.genetics.utah.edu/content/labs/extraction/' },
    { label: 'Cell Size & Scale', url: 'https://learn.genetics.utah.edu/content/cells/scale/' },
  ],
  medicosaathi: [
    { label: 'Genetic Disorders', url: 'https://learn.genetics.utah.edu/content/disorders/' },
    { label: 'Pharmacogenomics', url: 'https://learn.genetics.utah.edu/content/pharma/' },
    { label: 'Inheritance', url: 'https://learn.genetics.utah.edu/content/inheritance/' },
  ],
  pharmasaathi: [
    { label: 'Pharmacogenomics', url: 'https://learn.genetics.utah.edu/content/pharma/' },
    { label: 'Drug Delivery', url: 'https://learn.genetics.utah.edu/content/cells/' },
  ],
  nursingsaathi: [
    { label: 'Genetic Disorders', url: 'https://learn.genetics.utah.edu/content/disorders/' },
    { label: 'Inheritance', url: 'https://learn.genetics.utah.edu/content/inheritance/' },
  ],
  agrisaathi: [
    { label: 'Plant Genetics', url: 'https://learn.genetics.utah.edu/content/inheritance/' },
    { label: 'Cloning', url: 'https://learn.genetics.utah.edu/content/cloning/' },
  ],
}

export function getLearnGeneticsChipsFor(saathiSlug: string): ToolChip[] {
  return LEARN_GENETICS_BY_SAATHI[saathiSlug] ?? []
}
