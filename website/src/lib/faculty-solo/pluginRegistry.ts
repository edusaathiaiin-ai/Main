// ─────────────────────────────────────────────────────────────────────────────
// Faculty Solo — per-Saathi free-tool registry
//
// The tool basket a faculty user sees in the right-side dock, keyed by
// Saathi slug. FREE SOURCES ONLY — paid APIs (Wolfram, ChemSpider, Elsevier,
// Scopus, Indian Kanoon) stay classroom-only so API cost stays ≈ ₹0 per
// faculty per day.
//
// Rule (mirrors CLAUDE.md "sources never removed"): tools are ADDITIVE forever.
// Swap a weaker free source for a better one — fine. Drop a tool once it
// ships to faculty — never.
//
// Tool panel components are wired in a later phase. This file is pure data
// so the dock scaffold can render without any panels existing yet.
// ─────────────────────────────────────────────────────────────────────────────

export type FacultyTool = {
  /** Stable identifier — used as artifact tool_id in faculty_solo_artifacts */
  id: string
  /** Display name */
  name: string
  /** Icon — single emoji or short glyph */
  emoji: string
  /** Two-letter label shown under the icon in the collapsed rail */
  shortLabel: string
  /** One-line description for hover tooltip + expanded card */
  description: string
  /** Example prompt the faculty can try, italicised in the card */
  samplePrompt?: string
  /** Attribution line — e.g. "NCBI · Free · No rate limit" */
  sourceLabel: string
  /** Canonical external link — shown as "↗ source.org" */
  sourceUrl: string
}

export type FacultyBasket = {
  /** Saathi-owned header — "🧬 BioSaathi's Research Basket" */
  headerLabel: string
  /** Short, invitational line shown above the cards */
  invitation: string
  /** Ordered list of tools in this Saathi's basket */
  tools: FacultyTool[]
  /**
   * How many of the leading tools are "primary" for this Saathi. If set,
   * the expanded dock renders a subtle divider (`✦ Also in this basket`)
   * between indices [0, primaryCount) and [primaryCount, tools.length).
   * Leave undefined to suppress the divider (baskets with ≤4 tools).
   */
  primaryCount?: number
}

// ── Shared tool definitions — reused across multiple Saathis ────────────────
// Keeping these centralised so a copy update flows everywhere at once.

const PUBMED: FacultyTool = {
  id:           'pubmed',
  name:         'PubMed',
  emoji:        '📄',
  shortLabel:   'PM',
  description:  '36M+ biomedical citations, NCBI.',
  samplePrompt: 'Recent papers on CRISPR off-target effects',
  sourceLabel:  'NCBI · Free · No rate limit',
  sourceUrl:    'https://pubmed.ncbi.nlm.nih.gov',
}

const RCSB: FacultyTool = {
  id:           'rcsb',
  name:         'RCSB PDB',
  emoji:        '🧬',
  shortLabel:   'PDB',
  description:  '200,000+ peer-reviewed 3D protein structures.',
  samplePrompt: 'Hemoglobin — load 2HYY',
  sourceLabel:  'RCSB Protein Data Bank · Free',
  sourceUrl:    'https://www.rcsb.org',
}

const UNIPROT: FacultyTool = {
  id:           'uniprot',
  name:         'UniProt',
  emoji:        '🔬',
  shortLabel:   'UP',
  description:  '250M+ annotated protein sequences & function.',
  samplePrompt: 'p53 tumour suppressor function',
  sourceLabel:  'EBI/SIB/PIR · Free',
  sourceUrl:    'https://www.uniprot.org',
}

const EUROPE_PMC: FacultyTool = {
  id:           'europepmc',
  name:         'Europe PMC',
  emoji:        '📚',
  shortLabel:   'EP',
  description:  '40M+ life-science papers, open-access full text.',
  samplePrompt: 'Mitochondrial dysfunction in Parkinson\'s',
  sourceLabel:  'EMBL-EBI · Free · Full text',
  sourceUrl:    'https://europepmc.org',
}

const SEMANTIC_SCHOLAR: FacultyTool = {
  id:           'semantic-scholar',
  name:         'Semantic Scholar',
  emoji:        '🎓',
  shortLabel:   'SS',
  description:  '200M+ papers across every discipline, citation graph.',
  samplePrompt: 'Most-cited papers on prompt engineering',
  sourceLabel:  'Allen Institute for AI · Free',
  sourceUrl:    'https://www.semanticscholar.org',
}

const PUBCHEM: FacultyTool = {
  id:           'pubchem',
  name:         'PubChem',
  emoji:        '🧪',
  shortLabel:   'PC',
  description:  '117M+ chemical compounds, structures, bioactivity.',
  samplePrompt: 'Aspirin — structure and properties',
  sourceLabel:  'NCBI · Free',
  sourceUrl:    'https://pubchem.ncbi.nlm.nih.gov',
}

const GEOGEBRA: FacultyTool = {
  id:           'geogebra',
  name:         'GeoGebra',
  emoji:        '📐',
  shortLabel:   'GG',
  description:  'Interactive algebra, geometry, calculus, CAS.',
  samplePrompt: 'Plot y = sin(x) and its derivative',
  sourceLabel:  'GeoGebra · Free · Embedded',
  sourceUrl:    'https://www.geogebra.org',
}

const PHET: FacultyTool = {
  id:           'phet',
  name:         'PhET Sims',
  emoji:        '🎛️',
  shortLabel:   'PH',
  description:  'Interactive science & math simulations (CU Boulder).',
  samplePrompt: 'Pendulum energy — run the sim',
  sourceLabel:  'PhET · University of Colorado · Free',
  sourceUrl:    'https://phet.colorado.edu',
}

const SAGEMATHCELL: FacultyTool = {
  id:           'sagemathcell',
  name:         'SageMathCell',
  emoji:        '🧮',
  shortLabel:   'SM',
  description:  'Full symbolic & numeric compute — Python + Sage.',
  samplePrompt: 'integrate x^2 * sin(x) from 0 to pi',
  sourceLabel:  'SageMath · Free · Open-source',
  sourceUrl:    'https://sagecell.sagemath.org',
}

const INDIA_CODE: FacultyTool = {
  id:           'indiacode',
  name:         'India Code',
  emoji:        '⚖️',
  shortLabel:   'IC',
  description:  'Official statutes — BNS 2023, BNSS, BSA, Acts of Parliament.',
  samplePrompt: 'Bharatiya Nyaya Sanhita section 103',
  sourceLabel:  'Govt. of India · Free',
  sourceUrl:    'https://www.indiacode.nic.in',
}

const SCI_INDIA: FacultyTool = {
  id:           'sci-india',
  name:         'SC India',
  emoji:        '⚖️',
  shortLabel:   'SC',
  description:  'Supreme Court of India — judgments, orders, case status.',
  samplePrompt: 'Latest Constitution Bench judgments',
  sourceLabel:  'Supreme Court · Free',
  sourceUrl:    'https://main.sci.gov.in',
}

const NASA_IMAGES: FacultyTool = {
  id:           'nasa-images',
  name:         'NASA Images',
  emoji:        '🚀',
  shortLabel:   'NA',
  description:  '140K+ curated images, videos, missions, data.',
  samplePrompt: 'Perseverance rover Mars surface',
  sourceLabel:  'NASA · Free',
  sourceUrl:    'https://images.nasa.gov',
}

const LEAFLET: FacultyTool = {
  id:           'leaflet',
  name:         'Maps (OSM)',
  emoji:        '🗺️',
  shortLabel:   'MP',
  description:  'OpenStreetMap — annotate, measure, export.',
  samplePrompt: 'Mark the seven major rivers of India',
  sourceLabel:  'OpenStreetMap · Free',
  sourceUrl:    'https://www.openstreetmap.org',
}

const WIKIPEDIA: FacultyTool = {
  id:           'wikipedia',
  name:         'Wikipedia',
  emoji:        '📖',
  shortLabel:   'WP',
  description:  '6M+ encyclopaedic articles with citations.',
  samplePrompt: 'Treaty of Versailles — consequences',
  sourceLabel:  'Wikimedia · Free · CC-BY-SA',
  sourceUrl:    'https://en.wikipedia.org',
}

const FALSTAD: FacultyTool = {
  id:           'falstad',
  name:         'Falstad Circuits',
  emoji:        '🔌',
  shortLabel:   'FC',
  description:  'Interactive circuit simulator — analog + digital.',
  samplePrompt: 'Simulate a second-order RLC low-pass filter',
  sourceLabel:  'Falstad · Free',
  sourceUrl:    'https://www.falstad.com/circuit',
}

const OPENFDA: FacultyTool = {
  id:           'openfda',
  name:         'openFDA',
  emoji:        '💊',
  shortLabel:   'FD',
  description:  'FDA drug labels, adverse events, recalls.',
  samplePrompt: 'Metformin — adverse event frequency',
  sourceLabel:  'US FDA · Free',
  sourceUrl:    'https://open.fda.gov',
}

const MEDLINEPLUS: FacultyTool = {
  id:           'medlineplus',
  name:         'MedlinePlus',
  emoji:        '🏥',
  shortLabel:   'ML',
  description:  'Plain-language patient-facing medical reference, NLM.',
  samplePrompt: 'Diabetic ketoacidosis — patient education',
  sourceLabel:  'NIH/NLM · Free',
  sourceUrl:    'https://medlineplus.gov',
}

const WHO: FacultyTool = {
  id:           'who',
  name:         'WHO Guidance',
  emoji:        '🌐',
  shortLabel:   'WH',
  description:  'WHO guidelines, fact sheets, disease outbreaks.',
  samplePrompt: 'WHO antimicrobial stewardship guidance',
  sourceLabel:  'World Health Organization · Free',
  sourceUrl:    'https://www.who.int',
}

const DATA_GOV_IN: FacultyTool = {
  id:           'datagovin',
  name:         'data.gov.in',
  emoji:        '📊',
  shortLabel:   'DG',
  description:  'Open government datasets — India.',
  samplePrompt: 'District-wise literacy — 2011 Census',
  sourceLabel:  'Govt. of India OGD · Free',
  sourceUrl:    'https://data.gov.in',
}

const ENSEMBL: FacultyTool = {
  id:           'ensembl',
  name:         'Ensembl',
  emoji:        '🧬',
  shortLabel:   'EN',
  description:  'Vertebrate genome browser — annotations, variants.',
  samplePrompt: 'BRCA1 gene — human vs mouse orthologs',
  sourceLabel:  'EMBL-EBI · Free',
  sourceUrl:    'https://www.ensembl.org',
}

const NCBI_GENE: FacultyTool = {
  id:           'ncbi-gene',
  name:         'NCBI Gene',
  emoji:        '🧬',
  shortLabel:   'NG',
  description:  'Curated gene records across species.',
  samplePrompt: 'TP53 — gene summary',
  sourceLabel:  'NCBI · Free',
  sourceUrl:    'https://www.ncbi.nlm.nih.gov/gene',
}

const ISRO_BHUVAN: FacultyTool = {
  id:           'isro-bhuvan',
  name:         'ISRO Bhuvan',
  emoji:        '🛰️',
  shortLabel:   'BH',
  description:  'Indian earth observation — imagery, DEM, thematic maps.',
  samplePrompt: 'Cauvery basin DEM view',
  sourceLabel:  'ISRO · Free (token)',
  sourceUrl:    'https://bhuvan.nrsc.gov.in',
}

const NTRS: FacultyTool = {
  id:           'ntrs',
  name:         'NASA NTRS',
  emoji:        '🛰️',
  shortLabel:   'NT',
  description:  'NASA technical reports — 800K+ aerospace papers.',
  samplePrompt: 'rocket engine thermal analysis',
  sourceLabel:  'NASA NTRS · Free',
  sourceUrl:    'https://ntrs.nasa.gov',
}

const MOLVIEW: FacultyTool = {
  id:           'molview',
  name:         'MolView',
  emoji:        '🧪',
  shortLabel:   'MV',
  description:  'Interactive 2D/3D molecule editor & viewer.',
  samplePrompt: 'Draw caffeine and view in 3D',
  sourceLabel:  'MolView · Free',
  sourceUrl:    'https://molview.org',
}

const THREEDMOL: FacultyTool = {
  id:           '3dmol',
  name:         '3Dmol Viewer',
  emoji:        '🧪',
  shortLabel:   '3D',
  description:  'Browser-based 3D molecular visualisation.',
  samplePrompt: 'Load aspirin and render as ball-and-stick',
  sourceLabel:  '3Dmol.js · Free · Open-source',
  sourceUrl:    'https://3dmol.csb.pitt.edu',
}

const MONACO: FacultyTool = {
  id:           'monaco',
  name:         'Code Editor',
  emoji:        '💻',
  shortLabel:   'ED',
  description:  'Monaco (VS Code core) — Python, JS, Java, C++, SQL.',
  samplePrompt: 'Write a binary search in Python',
  sourceLabel:  'Monaco · Free · Open-source',
  sourceUrl:    'https://microsoft.github.io/monaco-editor',
}

const PISTON: FacultyTool = {
  id:           'piston',
  name:         'Run Code',
  emoji:        '▶️',
  shortLabel:   'RN',
  description:  'Execute code snippets in 40+ languages.',
  samplePrompt: 'Run the binary search on a sample array',
  sourceLabel:  'Piston · Free · Open-source',
  sourceUrl:    'https://github.com/engineer-man/piston',
}

const COMPILER_EXPLORER: FacultyTool = {
  id:           'godbolt',
  name:         'Compiler Explorer',
  emoji:        '⚙️',
  shortLabel:   'CX',
  description:  'See C/C++/Java/Rust → assembly across x86/ARM/RISC-V. GATE Computer Architecture staple.',
  samplePrompt: 'Show this loop compiled to x86-64 with -O2',
  sourceLabel:  'godbolt.org · Free · Open-source',
  sourceUrl:    'https://godbolt.org/',
}

// ─── Cross-Saathi tool sweep additions ──────────────────────────────────────

const VIRTUAL_LABS: FacultyTool = {
  id:           'vlab',
  name:         'Virtual Labs',
  emoji:        '🇮🇳',
  shortLabel:   'VL',
  description:  'Indian Govt + IIT virtual labs — AICTE-aligned curriculum coverage across engineering + sciences.',
  samplePrompt: 'Open the Mass Transfer lab for tomorrow\'s lecture demo',
  sourceLabel:  'vlab.co.in · Free · MoE / IIT consortium',
  sourceUrl:    'https://vlab.amrita.edu/',
}

const SIMSCALE: FacultyTool = {
  id:           'simscale',
  name:         'SimScale',
  emoji:        '💨',
  shortLabel:   'SS',
  description:  'Cloud CFD / FEA / thermal — academic tier free for faculty research.',
  samplePrompt: 'Browse public CFD projects for laminar flow examples',
  sourceLabel:  'simscale.com · Free academic tier · Hosted',
  sourceUrl:    'https://www.simscale.com/projects/',
}

const MERLOT: FacultyTool = {
  id:           'merlot',
  name:         'MERLOT',
  emoji:        '📚',
  shortLabel:   'MR',
  description:  'CSU multi-institution catalog of vetted educational resources for engineering + sciences.',
  samplePrompt: 'Find peer-reviewed simulations for fluid dynamics',
  sourceLabel:  'merlot.org · Free · Higher-ed catalog',
  sourceUrl:    'https://www.merlot.org/',
}

const JSCAD: FacultyTool = {
  id:           'jscad',
  name:         'JSCAD',
  emoji:        '📐',
  shortLabel:   'JC',
  description:  'Open-source parametric CAD in pure JavaScript — runs in browser, no install.',
  samplePrompt: 'Sketch a simple gear via parametric code',
  sourceLabel:  'openjscad.xyz · Free · Open-source',
  sourceUrl:    'https://openjscad.xyz/',
}

const LABXCHANGE: FacultyTool = {
  id:           'labxchange',
  name:         'LabXchange',
  emoji:        '🧫',
  shortLabel:   'LX',
  description:  'Harvard / Amgen virtual labs + interactives across biology, medicine, chemistry.',
  samplePrompt: 'Pull the PCR virtual lab for next session',
  sourceLabel:  'labxchange.org · Free · Harvard / Amgen Foundation',
  sourceUrl:    'https://www.labxchange.org/',
}

const HHMI_BIOINTERACTIVE: FacultyTool = {
  id:           'hhmi',
  name:         'HHMI BioInteractive',
  emoji:        '🧬',
  shortLabel:   'HH',
  description:  'Howard Hughes Medical Institute Click & Learn interactives — evolution, CRISPR, ecology, physiology.',
  samplePrompt: 'Find the Stickleback Evolution lab for this lecture',
  sourceLabel:  'biointeractive.org · Free · HHMI',
  sourceUrl:    'https://www.biointeractive.org/',
}

const LEARN_GENETICS: FacultyTool = {
  id:           'learngenetics',
  name:         'Learn.Genetics',
  emoji:        '🔬',
  shortLabel:   'LG',
  description:  'University of Utah genetics — PCR, gel electrophoresis, cloning, microarrays virtual labs.',
  samplePrompt: 'Open the gel electrophoresis virtual lab',
  sourceLabel:  'learn.genetics.utah.edu · Free · Univ. of Utah',
  sourceUrl:    'https://learn.genetics.utah.edu/',
}

const CHEM_COLLECTIVE: FacultyTool = {
  id:           'chemcollective',
  name:         'ChemCollective',
  emoji:        '⚗️',
  shortLabel:   'CC',
  description:  'Carnegie Mellon virtual chemistry labs — stoichiometry, acid-base, equilibrium scenarios.',
  samplePrompt: 'Pull the titration virtual lab',
  sourceLabel:  'chemcollective.org · Free · Carnegie Mellon',
  sourceUrl:    'https://chemcollective.org/',
}

const CIRCUITVERSE: FacultyTool = {
  id:           'circuitverse',
  name:         'CircuitVerse',
  emoji:        '⚡',
  shortLabel:   'CV',
  description:  'Open-source online digital logic simulator. Logic gates, ALU, sequential circuits.',
  samplePrompt: 'Build a 4-bit adder for next class',
  sourceLabel:  'circuitverse.org · Free · Open-source',
  sourceUrl:    'https://circuitverse.org/',
}

const CONCORD: FacultyTool = {
  id:           'concord',
  name:         'Concord Consortium',
  emoji:        '🌍',
  shortLabel:   'CO',
  description:  'HTML5 simulations on energy, climate, earth science, chemistry — open educational resources.',
  samplePrompt: 'Find a building-energy simulation for civil class',
  sourceLabel:  'learn.concord.org · Free · Concord Consortium',
  sourceUrl:    'https://learn.concord.org/',
}

const DESMOS: FacultyTool = {
  id:           'desmos',
  name:         'Desmos',
  emoji:        '📊',
  shortLabel:   'DS',
  description:  'Graphing, geometry, 3D, scientific calculators. Sliders, animations, beautiful plots.',
  samplePrompt: 'Plot y = sin(x)/x with a slider on the period',
  sourceLabel:  'desmos.com · Free · Hosted',
  sourceUrl:    'https://www.desmos.com/calculator',
}

const FRED: FacultyTool = {
  id:           'fred',
  name:         'FRED',
  emoji:        '📈',
  shortLabel:   'FR',
  description:  '800K+ economic time series from 100+ sources.',
  samplePrompt: 'US unemployment rate since 1980',
  sourceLabel:  'Federal Reserve of St. Louis · Free',
  sourceUrl:    'https://fred.stlouisfed.org',
}

const USGS: FacultyTool = {
  id:           'usgs',
  name:         'USGS Quakes',
  emoji:        '🌎',
  shortLabel:   'US',
  description:  'Real-time earthquake + geology data feeds.',
  samplePrompt: 'M 5+ earthquakes in the last 30 days',
  sourceLabel:  'US Geological Survey · Free',
  sourceUrl:    'https://earthquake.usgs.gov',
}

const WIKIMEDIA_COMMONS: FacultyTool = {
  id:           'wikimedia-commons',
  name:         'Wikimedia Commons',
  emoji:        '🖼️',
  shortLabel:   'WC',
  description:  'Free media repository — 100M+ images, diagrams, maps.',
  samplePrompt: 'Ancient Indian temple architecture diagrams',
  sourceLabel:  'Wikimedia · Free · CC',
  sourceUrl:    'https://commons.wikimedia.org',
}

const OPEN_ANATOMY: FacultyTool = {
  id:           'open-anatomy',
  name:         'OpenAnatomy',
  emoji:        '🧠',
  shortLabel:   'OA',
  description:  'Harvard 3D anatomy atlas — interactive, free.',
  samplePrompt: 'Brain — view limbic system structures',
  sourceLabel:  'Harvard · Free',
  sourceUrl:    'https://www.openanatomy.org',
}

// ── Per-Saathi baskets ──────────────────────────────────────────────────────

// Tools within each basket are ordered deliberately: Saathi-native /
// high-value first, cross-disciplinary supporting tools after. When a basket
// has 5+ tools, primaryCount marks the dividing line so the dock can render
// "✦ Also in this basket" between primary and extras. Keep smaller baskets
// (≤4 tools) without a divider — everything there is primary.

export const FACULTY_BASKETS: Record<string, FacultyBasket> = {
  // STEM
  biosaathi: {
    headerLabel:  "🧬 BioSaathi's Research Basket",
    invitation:   'Free, forever. Yours to explore — no API charges, no limits.',
    tools:        [RCSB, UNIPROT, PUBMED, EUROPE_PMC, ENSEMBL, NCBI_GENE, LABXCHANGE, HHMI_BIOINTERACTIVE, LEARN_GENETICS, SEMANTIC_SCHOLAR],
    primaryCount: 4,
  },
  biotechsaathi: {
    headerLabel:  "🔬 BioTechSaathi's Research Basket",
    invitation:   'Your biotech bench — genomes, proteins, literature, free forever.',
    tools:        [RCSB, UNIPROT, ENSEMBL, NCBI_GENE, LABXCHANGE, HHMI_BIOINTERACTIVE, LEARN_GENETICS, PUBMED, EUROPE_PMC],
    primaryCount: 4,
  },
  physicsaathi: {
    headerLabel:  "⚛️ PhysicsSaathi's Lab Bench",
    invitation:   'Plot, simulate, compute — no calculator costs.',
    tools:        [GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, CONCORD, MERLOT, NASA_IMAGES, SEMANTIC_SCHOLAR],
    primaryCount: 4,
  },
  chemsaathi: {
    headerLabel:  "🧪 ChemSaathi's Lab Table",
    invitation:   'Molecules, reactions, compute — all free tier.',
    tools:        [PUBCHEM, THREEDMOL, MOLVIEW, SAGEMATHCELL, LABXCHANGE, CHEM_COLLECTIVE, CONCORD, VIRTUAL_LABS, PUBMED],
    primaryCount: 4,
  },
  maathsaathi: {
    headerLabel: "📐 MaathSaathi's Math Bench",
    invitation:  'Symbolic, numeric, graphical — all free.',
    tools:       [GEOGEBRA, DESMOS, SAGEMATHCELL],
  },
  compsaathi: {
    headerLabel: "💻 CompSaathi's Code Desk",
    invitation:  'Draft, run, debug — in-browser, no setup.',
    tools:       [MONACO, PISTON, COMPILER_EXPLORER, CIRCUITVERSE, VIRTUAL_LABS, SEMANTIC_SCHOLAR],
  },
  mechsaathi: {
    headerLabel:  "⚙️ MechSaathi's Workshop",
    invitation:   'Simulate mechanics, draft problems — free tier.',
    tools:        [GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, SIMSCALE, JSCAD, MERLOT],
    primaryCount: 4,
  },
  civilsaathi: {
    headerLabel:  "🏗️ CivilSaathi's Site Desk",
    invitation:   'Model loads, run sims, pull standards.',
    tools:        [GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, SIMSCALE, JSCAD],
    primaryCount: 3,
  },
  aerospacesaathi: {
    headerLabel:  "🚀 AerospaceSaathi's Mission Desk",
    invitation:   'Orbits, imagery, missions — NASA + ISRO, free.',
    tools:        [NASA_IMAGES, NTRS, ISRO_BHUVAN, GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, SIMSCALE, JSCAD],
    primaryCount: 3,
  },
  elecsaathi: {
    headerLabel:  "⚡ ElecSaathi's Bench",
    invitation:   'Circuits, sims, compute — all free-tier.',
    tools:        [FALSTAD, CIRCUITVERSE, GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, MERLOT],
    primaryCount: 3,
  },
  electronicssaathi: {
    headerLabel:  "🔌 ElectronicsSaathi's Bench",
    invitation:   'Signal, systems, circuits — all free-tier.',
    tools:        [FALSTAD, CIRCUITVERSE, COMPILER_EXPLORER, GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, MERLOT],
    primaryCount: 4,
  },
  'chemengg-saathi': {
    headerLabel:  "⚗️ ChemEnggSaathi's Process Desk",
    invitation:   'Units, molecules, computation — free-tier basket.',
    tools:        [PUBCHEM, GEOGEBRA, PHET, SAGEMATHCELL, VIRTUAL_LABS, SIMSCALE, JSCAD, CHEM_COLLECTIVE],
    primaryCount: 4,
  },
  envirosaathi: {
    headerLabel:  "🌍 EnviroSaathi's Field Desk",
    invitation:   'Maps, satellites, data — all open.',
    tools:        [LEAFLET, NASA_IMAGES, USGS, GEOGEBRA, DATA_GOV_IN, LABXCHANGE, HHMI_BIOINTERACTIVE, CONCORD, SIMSCALE],
    primaryCount: 3,
  },
  agrisaathi: {
    headerLabel: "🌾 AgriSaathi's Field Kit",
    invitation:  'Soil maps, crop literature, data — open sources.',
    tools:       [LEAFLET, PUBMED, DATA_GOV_IN, GEOGEBRA, LABXCHANGE, HHMI_BIOINTERACTIVE, LEARN_GENETICS],
    primaryCount: 4,
  },

  // Medical
  medicosaathi: {
    headerLabel:  "🏥 MedicoSaathi's Clinic Desk",
    invitation:   'Anatomy, drugs, literature — all free, all safe.',
    tools:        [OPEN_ANATOMY, OPENFDA, PUBMED, MEDLINEPLUS, EUROPE_PMC, RCSB, LABXCHANGE, HHMI_BIOINTERACTIVE, LEARN_GENETICS],
    primaryCount: 4,
  },
  pharmasaathi: {
    headerLabel:  "💊 PharmaSaathi's Dispensary Desk",
    invitation:   'Molecules, targets, drug references — free tier.',
    tools:        [PUBCHEM, OPENFDA, RCSB, PUBMED, EUROPE_PMC, LABXCHANGE, HHMI_BIOINTERACTIVE, LEARN_GENETICS],
    primaryCount: 3,
  },
  nursingsaathi: {
    headerLabel: "🩺 NursingSaathi's Rounds",
    invitation:  'Evidence-based references for bedside teaching.',
    tools:       [PUBMED, MEDLINEPLUS, WHO, LABXCHANGE, HHMI_BIOINTERACTIVE],
  },

  // Social + Law
  kanoonsaathi: {
    headerLabel: "⚖️ KanoonSaathi's Law Desk",
    invitation:  'Statutes, judgments, precedent — from official sources.',
    tools:       [INDIA_CODE, SCI_INDIA, WIKIPEDIA],
  },
  polscisaathi: {
    headerLabel: "🏛️ PolSciSaathi's Desk",
    invitation:  'Statutes, maps, public policy references.',
    tools:       [INDIA_CODE, LEAFLET, WIKIPEDIA, DATA_GOV_IN],
  },
  historysaathi: {
    headerLabel: "🏺 HistorySaathi's Archive",
    invitation:  'Maps, primary sources, imagery — all open.',
    tools:       [WIKIPEDIA, WIKIMEDIA_COMMONS, LEAFLET],
  },
  psychsaathi: {
    headerLabel: "🧠 PsychSaathi's Study",
    invitation:  'Evidence-based psychology — free literature only.',
    tools:       [PUBMED, EUROPE_PMC, SEMANTIC_SCHOLAR, HHMI_BIOINTERACTIVE],
  },
  geosaathi: {
    headerLabel:  "🗺️ GeoSaathi's Atlas",
    invitation:   'Maps, geology, satellites — all open data.',
    tools:        [LEAFLET, USGS, NASA_IMAGES, GEOGEBRA, CONCORD],
  },
  archsaathi: {
    headerLabel: "🏛️ ArchSaathi's Studio",
    invitation:  'Maps, reference imagery, design sources — free.',
    tools:       [LEAFLET, WIKIMEDIA_COMMONS, WIKIPEDIA, JSCAD],
  },

  // Commerce
  econsaathi: {
    headerLabel: "📊 EconSaathi's Research Desk",
    invitation:  'Time-series, macro data, plotting — all open.',
    tools:       [FRED, DATA_GOV_IN, GEOGEBRA, DESMOS, SEMANTIC_SCHOLAR],
  },
  accountsaathi: {
    headerLabel: "📒 AccountSaathi's Ledger",
    invitation:  'Calculators, tax resources, data — free tier.',
    tools:       [SAGEMATHCELL, GEOGEBRA, DATA_GOV_IN],
  },
  finsaathi: {
    headerLabel: "💰 FinSaathi's Desk",
    invitation:  'Macro series, compute, data — all free.',
    tools:       [FRED, SAGEMATHCELL, GEOGEBRA, DATA_GOV_IN],
  },
  bizsaathi: {
    headerLabel: "📈 BizSaathi's Research Desk",
    invitation:  'Data, literature, charts — open sources only.',
    tools:       [DATA_GOV_IN, SEMANTIC_SCHOLAR, GEOGEBRA],
  },
  mktsaathi: {
    headerLabel: "📣 MktSaathi's Lookout",
    invitation:  'Cases, references, reading — free-tier mix.',
    tools:       [WIKIPEDIA, SEMANTIC_SCHOLAR, GEOGEBRA],
  },
  hrsaathi: {
    headerLabel: "🤝 HRSaathi's Desk",
    invitation:  'People, policy, evidence — all free sources.',
    tools:       [PUBMED, EUROPE_PMC, WIKIPEDIA],
  },
  statssaathi: {
    headerLabel: "📉 StatsSaathi's Workbench",
    invitation:  'Data, compute, plotting — all open-source.',
    tools:       [SAGEMATHCELL, GEOGEBRA, DESMOS, DATA_GOV_IN, FRED],
  },
}

/** Fallback basket for any Saathi not yet listed — never empty. */
const DEFAULT_BASKET: FacultyBasket = {
  headerLabel: '🧰 Your Saathi Tools',
  invitation:  'Free research tools while your custom basket is being curated.',
  tools:       [PUBMED, SEMANTIC_SCHOLAR, WIKIPEDIA, GEOGEBRA],
}

/** Resolve the basket for a Saathi slug. Always returns something usable. */
export function getFacultyBasket(saathiSlug: string | null | undefined): FacultyBasket {
  if (!saathiSlug) return DEFAULT_BASKET
  return FACULTY_BASKETS[saathiSlug] ?? DEFAULT_BASKET
}
