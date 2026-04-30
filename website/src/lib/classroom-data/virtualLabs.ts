// Virtual Labs — Indian Government MoE / IIT consortium platform.
// vlab.co.in | vlab.amrita.edu — free, government-backed, AICTE-aligned.
// HTML5 labs only — older Java applets excluded.
//
// Each chip points to a specific lab's "experiment" page. The full
// catalogue lives at vlab.co.in/broad-area-XXX. We curate the
// strongest engineering labs per Saathi.

import type { ToolChip } from '@/components/classroom/ToolChipPanel'

const VLAB_BY_SAATHI: Record<string, ToolChip[]> = {
  mechsaathi: [
    { label: 'Mechanics of Solids', url: 'https://vlab.amrita.edu/?sub=1&brch=174' },
    { label: 'Fluid Mechanics', url: 'https://vlab.amrita.edu/?sub=1&brch=175' },
    { label: 'Heat Transfer', url: 'https://vlab.amrita.edu/?sub=1&brch=194' },
    { label: 'Manufacturing Processes', url: 'https://vlab.amrita.edu/?sub=1&brch=313' },
    { label: 'Theory of Machines', url: 'https://vlab.amrita.edu/?sub=1&brch=176' },
    { label: 'Mechanical Vibrations', url: 'https://vlab.amrita.edu/?sub=1&brch=178' },
  ],
  civilsaathi: [
    { label: 'Strength of Materials', url: 'https://vlab.amrita.edu/?sub=3&brch=290' },
    { label: 'Geotechnical Engineering', url: 'https://vlab.amrita.edu/?sub=3&brch=68' },
    { label: 'Structural Analysis', url: 'https://vlab.amrita.edu/?sub=3&brch=82' },
    { label: 'Hydraulics', url: 'https://vlab.amrita.edu/?sub=3&brch=80' },
    { label: 'Surveying', url: 'https://vlab.amrita.edu/?sub=3&brch=94' },
    { label: 'Concrete Technology', url: 'https://vlab.amrita.edu/?sub=3&brch=89' },
  ],
  chemenggsaathi: [
    { label: 'Mass Transfer', url: 'https://vlab.amrita.edu/?sub=2&brch=194' },
    { label: 'Heat Transfer', url: 'https://vlab.amrita.edu/?sub=2&brch=195' },
    { label: 'Chemical Reaction Engineering', url: 'https://vlab.amrita.edu/?sub=2&brch=193' },
    { label: 'Process Control', url: 'https://vlab.amrita.edu/?sub=2&brch=196' },
    { label: 'Fluid Flow Operations', url: 'https://vlab.amrita.edu/?sub=2&brch=197' },
  ],
  elecsaathi: [
    { label: 'Power Systems', url: 'https://vlab.amrita.edu/?sub=4&brch=216' },
    { label: 'Power Electronics', url: 'https://vlab.amrita.edu/?sub=4&brch=215' },
    { label: 'Electric Machines', url: 'https://vlab.amrita.edu/?sub=4&brch=217' },
    { label: 'Control Systems', url: 'https://vlab.amrita.edu/?sub=4&brch=219' },
    { label: 'Electrical Measurements', url: 'https://vlab.amrita.edu/?sub=4&brch=276' },
  ],
  electronicssaathi: [
    { label: 'Digital Electronics', url: 'https://vlab.amrita.edu/?sub=59&brch=277' },
    { label: 'Analog Electronics', url: 'https://vlab.amrita.edu/?sub=59&brch=278' },
    { label: 'Communications', url: 'https://vlab.amrita.edu/?sub=59&brch=275' },
    { label: 'VLSI Design', url: 'https://vlab.amrita.edu/?sub=59&brch=274' },
    { label: 'Microprocessors', url: 'https://vlab.amrita.edu/?sub=59&brch=279' },
  ],
  aerospacesaathi: [
    { label: 'Aerodynamics', url: 'https://vlab.amrita.edu/?sub=1&brch=181' },
    { label: 'Propulsion', url: 'https://vlab.amrita.edu/?sub=1&brch=182' },
    { label: 'Flight Mechanics', url: 'https://vlab.amrita.edu/?sub=1&brch=183' },
  ],
  biotechsaathi: [
    { label: 'Bioinformatics', url: 'https://vlab.amrita.edu/?sub=3&brch=275' },
    { label: 'Bioprocess Engineering', url: 'https://vlab.amrita.edu/?sub=3&brch=276' },
    { label: 'Tissue Engineering', url: 'https://vlab.amrita.edu/?sub=3&brch=277' },
    { label: 'Microbiology', url: 'https://vlab.amrita.edu/?sub=3&brch=73' },
  ],
  biosaathi: [
    { label: 'Cell Biology', url: 'https://vlab.amrita.edu/?sub=3&brch=189' },
    { label: 'Molecular Biology', url: 'https://vlab.amrita.edu/?sub=3&brch=70' },
    { label: 'Genetics', url: 'https://vlab.amrita.edu/?sub=3&brch=72' },
    { label: 'Microbiology', url: 'https://vlab.amrita.edu/?sub=3&brch=73' },
  ],
  chemsaathi: [
    { label: 'Physical Chemistry', url: 'https://vlab.amrita.edu/?sub=2&brch=190' },
    { label: 'Organic Chemistry', url: 'https://vlab.amrita.edu/?sub=2&brch=191' },
    { label: 'Analytical Chemistry', url: 'https://vlab.amrita.edu/?sub=2&brch=192' },
    { label: 'Inorganic Chemistry', url: 'https://vlab.amrita.edu/?sub=2&brch=189' },
  ],
  physicsaathi: [
    { label: 'Optics', url: 'https://vlab.amrita.edu/?sub=2&brch=187' },
    { label: 'Modern Physics', url: 'https://vlab.amrita.edu/?sub=2&brch=188' },
    { label: 'Mechanics', url: 'https://vlab.amrita.edu/?sub=2&brch=185' },
    { label: 'Thermodynamics', url: 'https://vlab.amrita.edu/?sub=2&brch=186' },
  ],
  compsaathi: [
    { label: 'Data Structures', url: 'https://vlab.amrita.edu/?sub=80&brch=307' },
    { label: 'Computer Networks', url: 'https://vlab.amrita.edu/?sub=80&brch=308' },
    { label: 'Database Management', url: 'https://vlab.amrita.edu/?sub=80&brch=309' },
    { label: 'Operating Systems', url: 'https://vlab.amrita.edu/?sub=80&brch=310' },
  ],
}

export function getVirtualLabsChipsFor(saathiSlug: string): ToolChip[] {
  const key = saathiSlug.replace('chemengg-saathi', 'chemenggsaathi')
  return VLAB_BY_SAATHI[key] ?? []
}
