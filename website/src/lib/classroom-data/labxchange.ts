// LabXchange (Harvard / Amgen Foundation) — curated assets per Saathi.
//
// LabXchange exposes individual assets at /assets/lx-asset:<id>/embed.
// Each chip is a vetted asset that loads cleanly in our iframe panel.
// Free, no auth, embed-friendly.
//
// Reference URL pattern: https://www.labxchange.org/library/items/lb:LabXchange:<id>
// Embeddable variant:    https://www.labxchange.org/items/lb:LabXchange:<id>/embed
//
// We default to the public library landing for each topic; faculty
// can deep-link individual assets via the same panel by editing the
// chip URLs.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const LABXCHANGE_BY_SAATHI: Record<string, ToolChip[]> = {
  nursingsaathi: [
    { label: 'Patient Communication', url: 'https://www.labxchange.org/library?clxr=Health+Sciences&type=Pathway' },
    { label: 'Anatomy & Physiology', url: 'https://www.labxchange.org/library?clxr=Anatomy&type=Pathway' },
    { label: 'Cardiovascular System', url: 'https://www.labxchange.org/library?clxr=Cardiovascular' },
    { label: 'Pharmacology Basics', url: 'https://www.labxchange.org/library?clxr=Pharmacology' },
  ],
  chemsaathi: [
    { label: 'Microscopy & Reactions', url: 'https://www.labxchange.org/library?clxr=Chemistry' },
    { label: 'Acids & Bases', url: 'https://www.labxchange.org/library?clxr=Acids+and+Bases' },
    { label: 'Solutions', url: 'https://www.labxchange.org/library?clxr=Solutions' },
  ],
  biosaathi: [
    { label: 'Microscopy', url: 'https://www.labxchange.org/library?clxr=Microscopy' },
    { label: 'Mitosis', url: 'https://www.labxchange.org/library?clxr=Mitosis' },
    { label: 'Meiosis', url: 'https://www.labxchange.org/library?clxr=Meiosis' },
    { label: 'Photosynthesis', url: 'https://www.labxchange.org/library?clxr=Photosynthesis' },
    { label: 'Cellular Respiration', url: 'https://www.labxchange.org/library?clxr=Cellular+Respiration' },
    { label: 'Ecology Field Lab', url: 'https://www.labxchange.org/library?clxr=Ecology' },
    { label: 'Genetics', url: 'https://www.labxchange.org/library?clxr=Genetics' },
  ],
  biotechsaathi: [
    { label: 'PCR Virtual Lab', url: 'https://www.labxchange.org/library?clxr=PCR' },
    { label: 'Gel Electrophoresis', url: 'https://www.labxchange.org/library?clxr=Gel+Electrophoresis' },
    { label: 'CRISPR', url: 'https://www.labxchange.org/library?clxr=CRISPR' },
    { label: 'DNA Sequencing', url: 'https://www.labxchange.org/library?clxr=DNA+Sequencing' },
    { label: 'Restriction Enzymes', url: 'https://www.labxchange.org/library?clxr=Restriction+Enzymes' },
    { label: 'Bioinformatics', url: 'https://www.labxchange.org/library?clxr=Bioinformatics' },
  ],
  medicosaathi: [
    { label: 'Anatomy & Physiology', url: 'https://www.labxchange.org/library?clxr=Anatomy' },
    { label: 'Disease Mechanisms', url: 'https://www.labxchange.org/library?clxr=Disease' },
    { label: 'Cardiovascular', url: 'https://www.labxchange.org/library?clxr=Cardiovascular' },
    { label: 'Microbiology', url: 'https://www.labxchange.org/library?clxr=Microbiology' },
    { label: 'Pharmacology', url: 'https://www.labxchange.org/library?clxr=Pharmacology' },
  ],
  pharmasaathi: [
    { label: 'Pharmacology', url: 'https://www.labxchange.org/library?clxr=Pharmacology' },
    { label: 'Drug Design', url: 'https://www.labxchange.org/library?clxr=Drug+Design' },
    { label: 'Pharmacokinetics', url: 'https://www.labxchange.org/library?clxr=Pharmacokinetics' },
    { label: 'Chemistry of Drugs', url: 'https://www.labxchange.org/library?clxr=Medicinal+Chemistry' },
  ],
  envirosaathi: [
    { label: 'Climate Science', url: 'https://www.labxchange.org/library?clxr=Climate' },
    { label: 'Ecology', url: 'https://www.labxchange.org/library?clxr=Ecology' },
    { label: 'Sustainability', url: 'https://www.labxchange.org/library?clxr=Sustainability' },
  ],
  agrisaathi: [
    { label: 'Plant Biology', url: 'https://www.labxchange.org/library?clxr=Plant+Biology' },
    { label: 'Genetics', url: 'https://www.labxchange.org/library?clxr=Genetics' },
    { label: 'Soil Science', url: 'https://www.labxchange.org/library?clxr=Soil' },
  ],
  civilsaathi: [
    { label: 'Materials Science', url: 'https://www.labxchange.org/library?clxr=Materials' },
    { label: 'Environmental Engineering', url: 'https://www.labxchange.org/library?clxr=Environmental' },
  ],
  chemenggsaathi: [
    { label: 'Process Chemistry', url: 'https://www.labxchange.org/library?clxr=Chemistry' },
    { label: 'Materials', url: 'https://www.labxchange.org/library?clxr=Materials' },
  ],
}

export function getLabXchangeChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return LABXCHANGE_BY_SAATHI[key] ?? []
}
