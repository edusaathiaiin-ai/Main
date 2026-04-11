// website/src/constants/exploreBeyond.ts
// ════════════════════════════════════════════════════════════════
// Explore Beyond — Curated treasure chest per Saathi
// Static content. No API. Pure value for students.
// ════════════════════════════════════════════════════════════════

export type ExploreItem = {
  title:       string
  description: string   // one line — what makes it worth their time
  url:         string
  free:        boolean  // is it free to access?
}

export type ExploreBeyondData = {
  books:    ExploreItem[]
  podcasts: ExploreItem[]
  channels: ExploreItem[]
  journals: ExploreItem[]
  tools:    ExploreItem[]
}

export const EXPLORE_BEYOND: Record<string, ExploreBeyondData> = {

  // ── KanoonSaathi ────────────────────────────────────────────────
  kanoonsaathi: {
    books: [
      { title: 'Introduction to the Constitution of India', description: 'D.D. Basu — the most trusted reference for Indian constitutional law students', url: 'https://www.amazon.in/Introduction-Constitution-India-Durga-Basu/dp/8135317498', free: false },
      { title: 'The Transformation of India', description: 'Nani Palkhivala — his essays on the Constitution and fundamental rights are essential reading', url: 'https://www.amazon.in/Transformation-India-Essays-Nani-Palkhivala/dp/8170944082', free: false },
      { title: 'Annihilation of Caste', description: 'B.R. Ambedkar — understand the social foundations of Indian law from its chief architect', url: 'https://www.amazon.in/Annihilation-Caste-Penguin-Modern-Classics/dp/0231172885', free: true },
    ],
    podcasts: [
      { title: 'Supreme Court Observer Podcast', description: 'Case analyses and constitutional debates from Indian legal scholars', url: 'https://www.scobserver.in/podcast/', free: true },
      { title: 'Legally Speaking — Bar and Bench', description: 'Weekly conversations with senior advocates and judges', url: 'https://www.barandbench.com/podcast', free: true },
    ],
    channels: [
      { title: 'LawSikho', description: 'Free lectures on Indian law — contract, criminal, constitutional', url: 'https://www.youtube.com/@LawSikho', free: true },
      { title: 'Legal Bites Academy', description: 'Structured law lectures aligned with LLB and CLAT syllabus', url: 'https://www.youtube.com/@LegalBitesAcademy', free: true },
    ],
    journals: [
      { title: 'Indian Kanoon', description: 'Free access to Supreme Court and High Court judgments — essential primary source', url: 'https://indiankanoon.org', free: true },
      { title: 'SSRN — Law', description: 'Pre-publication law research papers from Indian and global scholars', url: 'https://www.ssrn.com/index.cfm/en/janda/journalbrowse/?jandaPage=1&subj=LEGA', free: true },
    ],
    tools: [
      { title: 'SCC Online (Student)', description: 'Supreme Court Cases database — ask your college library for access', url: 'https://www.scconline.com', free: false },
      { title: 'Manupatra', description: 'Comprehensive Indian legal database with case laws and bare acts', url: 'https://www.manupatra.com', free: false },
    ],
  },

  // ── BioSaathi ───────────────────────────────────────────────────
  biosaathi: {
    books: [
      { title: 'The Selfish Gene', description: 'Richard Dawkins — evolution and genetics explained through gene-centric view, essential for B.Sc Biology', url: 'https://www.amazon.in/Selfish-Gene-Richard-Dawkins/dp/0198788606', free: false },
      { title: 'The Double Helix', description: 'James Watson — the discovery of DNA structure, a scientific detective story every biology student should read', url: 'https://www.amazon.in/Double-Helix-Norton-Critical-Editions/dp/0393950751', free: false },
      { title: 'What is Life?', description: 'Erwin Schrödinger — the physics of living cells, still relevant 80 years after publication', url: 'https://www.amazon.in/What-Life-Erwin-Schrodinger/dp/1107604664', free: false },
    ],
    podcasts: [
      { title: 'Radiolab', description: 'Science storytelling at its best — biology, ethics, and wonder combined', url: 'https://radiolab.org', free: true },
      { title: 'This Week in Evolution', description: 'Weekly discussions of new evolution research papers — advanced but accessible', url: 'https://www.microbe.tv/twie/', free: true },
    ],
    channels: [
      { title: 'Amoeba Sisters', description: 'Biology concepts explained simply — cell division, genetics, ecology done right', url: 'https://www.youtube.com/@AmoebaSisters', free: true },
      { title: 'Crash Course Biology', description: 'Fast-paced, complete biology course aligned with undergraduate syllabus', url: 'https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF', free: true },
    ],
    journals: [
      { title: 'PubMed Central', description: 'Free access to millions of biomedical research papers — your primary research database', url: 'https://www.ncbi.nlm.nih.gov/pmc/', free: true },
      { title: 'Nature', description: "World's leading science journal — read the abstracts to stay current", url: 'https://www.nature.com/nature/', free: false },
    ],
    tools: [
      { title: 'NCBI Blast', description: 'Compare DNA and protein sequences — used in real genomics research, free for students', url: 'https://blast.ncbi.nlm.nih.gov/Blast.cgi', free: true },
      { title: 'Cell Image Library', description: 'Free microscopy images of cells and organisms for study and reference', url: 'http://www.cellimagelibrary.org', free: true },
    ],
  },

  // ── BioTechSaathi ───────────────────────────────────────────────
  biotechsaathi: {
    books: [
      { title: 'Molecular Biology of the Cell', description: 'Alberts et al. — the definitive textbook for cell and molecular biology at undergraduate and postgraduate level', url: 'https://www.amazon.in/Molecular-Biology-Cell-Bruce-Alberts/dp/0393884821', free: false },
      { title: 'The Code Breaker', description: 'Walter Isaacson — the story of Jennifer Doudna, CRISPR, and the future of genetic engineering', url: 'https://www.amazon.in/Code-Breaker-Jennifer-Doudna-Editing/dp/1982115866', free: false },
      { title: 'Regenesis', description: 'George Church — synthetic biology and the future of biotechnology, by one of its pioneers', url: 'https://www.amazon.in/Regenesis-George-Church/dp/0465075703', free: false },
    ],
    podcasts: [
      { title: 'CRISPR Chat', description: 'Conversations about gene editing technology and its applications in medicine and agriculture', url: 'https://www.crisprchat.com', free: true },
      { title: 'Bio-IT World Podcast', description: 'Bioinformatics and computational biology at the frontier', url: 'https://www.bio-itworld.com/podcast', free: true },
    ],
    channels: [
      { title: 'iBiology', description: 'Free video lectures by Nobel laureates and leading biomedical scientists', url: 'https://www.ibiology.org', free: true },
      { title: 'MIT OpenCourseWare Biology', description: 'Full MIT biology and biotech courses — lecture videos and problem sets', url: 'https://www.youtube.com/@mitocw', free: true },
    ],
    journals: [
      { title: 'Nature Biotechnology', description: 'Leading journal for biotech research — read abstracts for current developments', url: 'https://www.nature.com/nbt/', free: false },
      { title: 'PubMed Central', description: 'Free access to biomedical and biotechnology research papers', url: 'https://www.ncbi.nlm.nih.gov/pmc/', free: true },
    ],
    tools: [
      { title: 'Benchling (Student)', description: 'Free molecular biology lab notebook — design plasmids, primers, experiments', url: 'https://www.benchling.com/academic', free: true },
      { title: 'UniProt', description: 'Protein sequence and function database — essential for biochemistry and biotech research', url: 'https://www.uniprot.org', free: true },
    ],
  },

  // ── PhysicsSaathi ───────────────────────────────────────────────
  physicsaathi: {
    books: [
      { title: 'The Feynman Lectures on Physics', description: 'Richard Feynman — three volumes that changed how physics is taught. Available free online', url: 'https://www.feynmanlectures.caltech.edu', free: true },
      { title: 'A Brief History of Time', description: 'Stephen Hawking — cosmology and the nature of the universe for every physics student', url: 'https://www.amazon.in/Brief-History-Time-Stephen-Hawking/dp/0553380168', free: false },
      { title: 'QED: The Strange Theory of Light and Matter', description: 'Feynman explains quantum electrodynamics without mathematics — remarkable clarity', url: 'https://www.amazon.in/QED-Strange-Theory-Light-Matter/dp/0691164096', free: false },
    ],
    podcasts: [
      { title: "Sean Carroll's Mindscape", description: 'Weekly conversations on physics, philosophy, and the nature of reality — outstanding depth', url: 'https://www.preposterousuniverse.com/podcast/', free: true },
      { title: 'Physics World Weekly', description: 'News and research from the Institute of Physics — current developments in brief', url: 'https://physicsworld.com/a/physics-world-weekly-podcast/', free: true },
    ],
    channels: [
      { title: '3Blue1Brown', description: 'Mathematical intuition visualised — essential for understanding physics mathematics', url: 'https://www.youtube.com/@3blue1brown', free: true },
      { title: 'PBS Space Time', description: 'Advanced physics concepts explained rigorously — general relativity, quantum mechanics, cosmology', url: 'https://www.youtube.com/@pbsspacetime', free: true },
    ],
    journals: [
      { title: 'arXiv Physics', description: 'Free preprint server — read physics papers before they are published in journals', url: 'https://arxiv.org/archive/physics', free: true },
      { title: 'Physical Review Letters', description: 'APS flagship journal — groundbreaking physics results, many papers freely accessible', url: 'https://journals.aps.org/prl/', free: false },
    ],
    tools: [
      { title: 'PhET Interactive Simulations', description: 'Free physics simulations from University of Colorado — waves, circuits, quantum, nuclear', url: 'https://phet.colorado.edu', free: true },
      { title: 'Wolfram Alpha', description: 'Solve physics equations, unit conversions, and mathematical calculations instantly', url: 'https://www.wolframalpha.com', free: true },
    ],
  },

  // ── MaathSaathi ─────────────────────────────────────────────────
  maathsaathi: {
    books: [
      { title: "A Mathematician's Apology", description: "G.H. Hardy — on the beauty and purpose of mathematics, written by Ramanujan's mentor", url: 'https://www.amazon.in/Mathematicians-Apology-G-H-Hardy/dp/1107604977', free: false },
      { title: 'How to Solve It', description: 'George Pólya — the definitive guide to mathematical problem-solving strategy', url: 'https://www.amazon.in/How-Solve-George-Polya/dp/069116407X', free: false },
      { title: 'The Man Who Knew Infinity', description: 'Robert Kanigel — biography of Ramanujan, essential reading for every Indian mathematics student', url: 'https://www.amazon.in/Man-Who-Knew-Infinity-Ramanujan/dp/1476763496', free: false },
    ],
    podcasts: [
      { title: 'My Favourite Theorem', description: 'Mathematicians discuss their favourite theorems — beautiful and accessible', url: 'https://kpknudson.com/my-favorite-theorem/', free: true },
      { title: 'Numberphile Podcast', description: 'Deep conversations with mathematicians about their work and how they think', url: 'https://www.numberphile.com/podcast', free: true },
    ],
    channels: [
      { title: '3Blue1Brown', description: 'Visual mathematics — linear algebra, calculus, neural networks explained with extraordinary clarity', url: 'https://www.youtube.com/@3blue1brown', free: true },
      { title: 'Numberphile', description: 'Mathematicians talking about their favourite numbers and problems — genuinely joyful', url: 'https://www.youtube.com/@numberphile', free: true },
    ],
    journals: [
      { title: 'arXiv Mathematics', description: 'Free preprint server — read mathematics research before publication', url: 'https://arxiv.org/archive/math', free: true },
      { title: 'American Mathematical Monthly', description: 'Accessible research articles and problems — excellent for undergraduate level', url: 'https://www.tandfonline.com/toc/uamm20/current', free: false },
    ],
    tools: [
      { title: 'GeoGebra', description: 'Free interactive geometry, algebra, calculus, and statistics — visualise any mathematical concept', url: 'https://www.geogebra.org', free: true },
      { title: 'Desmos', description: 'Free graphing calculator — plot functions, explore calculus, build intuition', url: 'https://www.desmos.com', free: true },
    ],
  },

  // ── ChemSaathi ──────────────────────────────────────────────────
  chemsaathi: {
    books: [
      { title: 'The Disappearing Spoon', description: 'Sam Kean — the periodic table told through stories of discovery, intrigue, and human drama', url: 'https://www.amazon.in/Disappearing-Spoon-Stories-Periodic-Table/dp/0316051632', free: false },
      { title: 'Organic Chemistry', description: 'Clayden, Greeves, Warren — the most readable advanced organic chemistry textbook available', url: 'https://www.amazon.in/Organic-Chemistry-Jonathan-Clayden/dp/0199270295', free: false },
      { title: 'The Alchemy of Air', description: 'Thomas Hager — the story of Fritz Haber and the synthesis of ammonia that feeds the world', url: 'https://www.amazon.in/Alchemy-Air-Dazzling-Triumph-Terrible/dp/0307351793', free: false },
    ],
    podcasts: [
      { title: 'Chemistry World Podcast', description: 'Royal Society of Chemistry — news, research, and careers in chemistry', url: 'https://www.chemistryworld.com/podcasts', free: true },
      { title: 'The Collapsed Wavefunction', description: 'Chemistry and physics at their intersection — for students who want to go deeper', url: 'https://podcasts.apple.com/us/podcast/the-collapsed-wavefunction/id1461516095', free: true },
    ],
    channels: [
      { title: 'NileRed', description: 'Real chemistry experiments with extraordinary production — organic chemistry made visual', url: 'https://www.youtube.com/@NileRed', free: true },
      { title: 'Periodic Videos', description: 'Every element explored — University of Nottingham chemistry professors at their best', url: 'https://www.youtube.com/@periodicvideos', free: true },
    ],
    journals: [
      { title: 'Journal of the American Chemical Society', description: 'Leading chemistry journal — abstracts freely accessible, shows frontier research', url: 'https://pubs.acs.org/journal/jacsat', free: false },
      { title: 'Royal Society of Chemistry Journals', description: 'Many RSC journals have free access — excellent for Indian chemistry students', url: 'https://www.rsc.org/journals-books-databases/', free: false },
    ],
    tools: [
      { title: 'ChemDraw (Academic)', description: 'Industry-standard molecular drawing software — free for students via your institution', url: 'https://www.perkinelmer.com/category/chemdraw', free: false },
      { title: 'PubChem', description: 'Free database of chemical structures, properties, and biological activities — essential resource', url: 'https://pubchem.ncbi.nlm.nih.gov', free: true },
    ],
  },

  // ── CompSaathi ──────────────────────────────────────────────────
  compsaathi: {
    books: [
      { title: 'The Pragmatic Programmer', description: 'Hunt and Thomas — the mindset and practices of great software developers, not just syntax', url: 'https://www.amazon.in/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052', free: false },
      { title: 'Introduction to Algorithms (CLRS)', description: 'Cormen et al. — the definitive algorithms textbook for serious computer science students', url: 'https://www.amazon.in/Introduction-Algorithms-Thomas-H-Cormen/dp/0262046305', free: false },
      { title: 'The Mythical Man-Month', description: 'Fred Brooks — why software projects fail and how to think about software engineering', url: 'https://www.amazon.in/Mythical-Man-Month-Software-Engineering-Anniversary/dp/0201835959', free: false },
    ],
    podcasts: [
      { title: 'Lex Fridman Podcast', description: 'Deep conversations with AI researchers, programmers, and computer scientists', url: 'https://lexfridman.com/podcast/', free: true },
      { title: 'Software Engineering Daily', description: 'Daily interviews on software engineering topics — systems, AI, databases, distributed computing', url: 'https://softwareengineeringdaily.com', free: true },
    ],
    channels: [
      { title: 'MIT OpenCourseWare', description: 'Full MIT CS courses free — algorithms, AI, systems, programming languages', url: 'https://www.youtube.com/@mitocw', free: true },
      { title: 'Fireship', description: 'Fast, clear explanations of modern web tech, frameworks, and computer science concepts', url: 'https://www.youtube.com/@Fireship', free: true },
    ],
    journals: [
      { title: 'arXiv Computer Science', description: 'Free preprint server — read AI, ML, and CS research before publication', url: 'https://arxiv.org/archive/cs', free: true },
      { title: 'ACM Digital Library', description: 'Association for Computing Machinery — leading CS research, some papers freely accessible', url: 'https://dl.acm.org', free: false },
    ],
    tools: [
      { title: 'LeetCode', description: 'Practice algorithmic problem solving — essential for placements and competitive programming', url: 'https://leetcode.com', free: true },
      { title: 'GitHub Student Developer Pack', description: 'Free access to 100+ developer tools — apply with your college email', url: 'https://education.github.com/pack', free: true },
    ],
  },

  // ── MedicoSaathi ────────────────────────────────────────────────
  medicosaathi: {
    books: [
      { title: "Gray's Anatomy", description: 'The definitive human anatomy reference — every MBBS student needs access to this', url: 'https://www.amazon.in/Grays-Anatomy-Anatomical-Clinical-Practice/dp/0702077933', free: false },
      { title: 'The Spirit Catches You and You Fall Down', description: 'Anne Fadiman — the most important book on medicine, culture, and doctor-patient relationships', url: 'https://www.amazon.in/Spirit-Catches-You-Fall-Down/dp/0374525641', free: false },
      { title: 'Being Mortal', description: 'Atul Gawande — on medicine, aging, and what matters at the end of life. Essential for every doctor', url: 'https://www.amazon.in/Being-Mortal-Medicine-What-Matters/dp/1250076226', free: false },
    ],
    podcasts: [
      { title: 'NEJM This Week', description: 'New England Journal of Medicine — weekly summary of the most important clinical research', url: 'https://www.nejm.org/multimedia/audio', free: true },
      { title: 'Curbsiders Internal Medicine', description: 'Clinical medicine topics explained by residents and attendings — practical and exam-relevant', url: 'https://thecurbsiders.com', free: true },
    ],
    channels: [
      { title: 'Osmosis', description: 'Medical education videos aligned with USMLE and MBBS — pathology, pharmacology, clinical', url: 'https://www.youtube.com/@osmosis', free: true },
      { title: 'Armando Hasudungan', description: 'Hand-drawn medical illustrations explaining complex physiology and pathology beautifully', url: 'https://www.youtube.com/@armandohasudungan', free: true },
    ],
    journals: [
      { title: 'PubMed', description: 'Free access to 35 million biomedical citations — your primary medical research database', url: 'https://pubmed.ncbi.nlm.nih.gov', free: true },
      { title: 'The Lancet', description: "World's leading medical journal — read freely accessible articles and commentaries", url: 'https://www.thelancet.com', free: false },
    ],
    tools: [
      { title: 'Anki', description: 'Spaced repetition flashcard software — the gold standard for medical school memorisation', url: 'https://apps.ankiweb.net', free: true },
      { title: 'Radiopaedia', description: 'Free radiology reference and teaching file — essential for clinical years', url: 'https://radiopaedia.org', free: true },
    ],
  },

  // ── PharmaSaathi ────────────────────────────────────────────────
  pharmasaathi: {
    books: [
      { title: "Goodman & Gilman's Pharmacological Basis of Therapeutics", description: 'The definitive pharmacology reference — mechanisms, clinical use, and toxicity', url: 'https://www.amazon.in/Goodman-Gilmans-Pharmacological-Basis-Therapeutics/dp/1264258453', free: false },
      { title: 'The Drug Hunters', description: 'Donald Remy Kirsch — how drugs are discovered and developed, the real process behind medicines', url: 'https://www.amazon.in/Drug-Hunters-Improvised-Discovery-Medicines/dp/1628729090', free: false },
      { title: 'Bad Pharma', description: 'Ben Goldacre — how pharmaceutical companies distort evidence, essential critical reading', url: 'https://www.amazon.in/Bad-Pharma-Companies-Mislead-Doctors/dp/0865478015', free: false },
    ],
    podcasts: [
      { title: 'Talking Medicines Podcast', description: 'Drug discovery, pharmacovigilance, and medicines data — practical for pharmacy students', url: 'https://www.talkingmedicines.co.uk/podcast', free: true },
      { title: 'PharmacyPodcast.com', description: 'Clinical pharmacy topics and career guidance for pharmacy professionals', url: 'https://pharmacypodcast.com', free: true },
    ],
    channels: [
      { title: 'Armando Hasudungan', description: 'Drug mechanisms and pharmacology illustrated with extraordinary clarity', url: 'https://www.youtube.com/@armandohasudungan', free: true },
      { title: 'Medscape Education', description: 'CME videos on drug therapy and clinical pharmacology', url: 'https://www.youtube.com/@Medscape', free: true },
    ],
    journals: [
      { title: 'PubMed — Pharmacology', description: 'Filter PubMed by pharmacology — free access to clinical drug research', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=pharmacology', free: true },
      { title: 'Drug Discovery Today', description: 'Elsevier journal covering drug discovery and development research', url: 'https://www.journals.elsevier.com/drug-discovery-today', free: false },
    ],
    tools: [
      { title: 'DrugBank', description: 'Free database of drug structures, targets, mechanisms, and interactions', url: 'https://go.drugbank.com', free: true },
      { title: 'Drugs.com', description: 'Drug interactions checker and clinical pharmacology reference — free and comprehensive', url: 'https://www.drugs.com', free: true },
    ],
  },

  // ── NursingSaathi ───────────────────────────────────────────────
  nursingsaathi: {
    books: [
      { title: 'Notes on Nursing', description: 'Florence Nightingale — the founder of modern nursing on what nursing actually is, timeless', url: 'https://www.amazon.in/Notes-Nursing-Florence-Nightingale/dp/1614271321', free: true },
      { title: 'Fundamentals of Nursing', description: 'Potter and Perry — the standard nursing reference for GNM and B.Sc Nursing students', url: 'https://www.amazon.in/Fundamentals-Nursing-Potter-Patricia-Anne/dp/0323327400', free: false },
      { title: 'The Spirit Catches You and You Fall Down', description: 'Anne Fadiman — the most important book on patient care, culture, and nursing ethics', url: 'https://www.amazon.in/Spirit-Catches-You-Fall-Down/dp/0374525641', free: false },
    ],
    podcasts: [
      { title: 'The Nurse Keith Show', description: 'Nursing career development, clinical skills, and professional growth', url: 'https://nursekeith.com/podcasts/', free: true },
      { title: 'Straight A Nursing', description: 'NCLEX preparation and nursing school success strategies', url: 'https://www.straightanursing.com/podcast/', free: true },
    ],
    channels: [
      { title: 'RegisteredNurseRN', description: 'Nursing school topics — pharmacology, disease processes, NCLEX review', url: 'https://www.youtube.com/@RegisteredNurseRN', free: true },
      { title: 'Simple Nursing', description: 'Simplified nursing concepts — pathophysiology, medications, clinical skills', url: 'https://www.youtube.com/@simplenursing', free: true },
    ],
    journals: [
      { title: 'Indian Journal of Nursing Studies', description: 'Peer-reviewed nursing research from India — evidence-based practice for Indian nurses', url: 'https://www.journals.elsevier.com/international-journal-of-nursing-studies', free: false },
      { title: 'PubMed — Nursing', description: 'Filter PubMed by nursing — free access to clinical nursing research', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=nursing', free: true },
    ],
    tools: [
      { title: 'Nursing Central (Student)', description: 'Drug guides, disease information, and clinical decision support — check college access', url: 'https://nursing.unboundmedicine.com', free: false },
      { title: 'Medscape Nursing', description: 'Free clinical nursing reference — drug interactions, disease information, CME', url: 'https://www.medscape.com/nurses', free: true },
    ],
  },

  // ── EconSaathi ──────────────────────────────────────────────────
  econsaathi: {
    books: [
      { title: 'Development as Freedom', description: 'Amartya Sen — the Nobel laureate from India redefines what economic development means', url: 'https://www.amazon.in/Development-Freedom-Amartya-Sen/dp/0198297564', free: false },
      { title: 'Freakonomics', description: 'Levitt and Dubner — applying economic thinking to unexpected problems, essential for building economic intuition', url: 'https://www.amazon.in/Freakonomics-Economist-Explores-Hidden-Everything/dp/0060731338', free: false },
      { title: 'Poor Economics', description: 'Banerjee and Duflo (Nobel 2019) — randomised controlled trials in development economics, India-focused', url: 'https://www.amazon.in/Poor-Economics-Radical-Rethinking-Poverty/dp/1610390938', free: false },
    ],
    podcasts: [
      { title: 'Econtalk', description: 'Russ Roberts in conversation with economists — long-form, rigorous, weekly', url: 'https://www.econtalk.org', free: true },
      { title: "Mint's Let's Talk Money", description: 'Indian personal finance and economics — practical and India-specific', url: 'https://www.livemint.com/podcast', free: true },
    ],
    channels: [
      { title: 'Marginal Revolution University', description: 'Free economics courses by Tyler Cowen and Alex Tabarrok — rigorous and accessible', url: 'https://www.youtube.com/@mruniversity', free: true },
      { title: 'Crash Course Economics', description: 'Complete introductory economics course aligned with undergraduate syllabus', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtPNZwz5_o_5uirJ8gQXnhEO', free: true },
    ],
    journals: [
      { title: 'SSRN Economics', description: 'Free preprint economics papers — read research before publication', url: 'https://www.ssrn.com/index.cfm/en/janda/journalbrowse/?jandaPage=1&subj=ECON', free: true },
      { title: 'Economic and Political Weekly', description: "India's most important economics journal — essential for Indian economic analysis", url: 'https://www.epw.in', free: false },
    ],
    tools: [
      { title: 'FRED (Federal Reserve)', description: 'Free economic data from the US Federal Reserve — global macroeconomic data and charts', url: 'https://fred.stlouisfed.org', free: true },
      { title: 'World Bank Open Data', description: 'Free global development data — GDP, poverty, education, health across all countries', url: 'https://data.worldbank.org', free: true },
    ],
  },

  // ── AccountSaathi ───────────────────────────────────────────────
  accountsaathi: {
    books: [
      { title: 'Financial Shenanigans', description: 'Howard Schilit — how companies manipulate accounts, essential for CA and accounting students', url: 'https://www.amazon.in/Financial-Shenanigans-Accounting-Gimmicks-Reporting/dp/1260117170', free: false },
      { title: 'The Intelligent Investor', description: 'Benjamin Graham — financial statement analysis and value investing, accounting for investors', url: 'https://www.amazon.in/Intelligent-Investor-Definitive-Book-Investing/dp/0062312685', free: false },
      { title: 'One Up on Wall Street', description: 'Peter Lynch — reading financial statements to find investment opportunities', url: 'https://www.amazon.in/One-Up-Wall-Street-Already/dp/0743200403', free: false },
    ],
    podcasts: [
      { title: 'CA Final Direct Tax by ICAI', description: 'Official ICAI lectures for CA Final — free and authoritative', url: 'https://www.icai.org/post.html?post_id=15076', free: true },
      { title: 'Paisa Vaisa', description: 'Indian personal finance podcast — GST, income tax, investments explained clearly', url: 'https://shows.acast.com/paisa-vaisa', free: true },
    ],
    channels: [
      { title: 'ICAI Official', description: 'Official Institute of Chartered Accountants of India — CA Foundation to Final lectures', url: 'https://www.youtube.com/@ICAIofficial', free: true },
      { title: 'Accounting Stuff', description: 'Financial statements, ratios, and accounting concepts explained visually', url: 'https://www.youtube.com/@AccountingStuff', free: true },
    ],
    journals: [
      { title: 'ICAI Journal (The Chartered Accountant)', description: 'Official ICAI journal — standards, updates, and professional development', url: 'https://www.icai.org/post.html?post_id=13218', free: true },
      { title: 'IFRS Foundation', description: 'International accounting standards — free access to Ind AS and IFRS summaries', url: 'https://www.ifrs.org', free: true },
    ],
    tools: [
      { title: 'Income Tax India e-Filing', description: 'Official IT portal — practice ITR filing and understand tax computation', url: 'https://www.incometax.gov.in', free: true },
      { title: 'ClearTax', description: 'Free GST and income tax calculator — practical tool for accounting students', url: 'https://cleartax.in', free: true },
    ],
  },

  // ── FinSaathi ───────────────────────────────────────────────────
  finsaathi: {
    books: [
      { title: 'The Intelligent Investor', description: 'Benjamin Graham — the bible of value investing and financial analysis', url: 'https://www.amazon.in/Intelligent-Investor-Definitive-Book-Investing/dp/0062312685', free: false },
      { title: 'Against the Gods: The Remarkable Story of Risk', description: 'Peter Bernstein — the history of risk management and probability in finance', url: 'https://www.amazon.in/Against-Gods-Remarkable-Story-Risk/dp/0471295639', free: false },
      { title: 'When Genius Failed', description: 'Roger Lowenstein — the collapse of LTCM, essential for understanding financial risk', url: 'https://www.amazon.in/When-Genius-Failed-Long-Term-Management/dp/0375758259', free: false },
    ],
    podcasts: [
      { title: 'We Study Billionaires', description: 'Deep dives into great investors — Buffett, Munger, Lynch, Dalio explained', url: 'https://theinvestorspodcast.com/we-study-billionaires/', free: true },
      { title: 'Zerodha Varsity Podcast', description: 'Indian markets, trading, and investing — practical and India-specific', url: 'https://zerodha.com/varsity/', free: true },
    ],
    channels: [
      { title: 'CA Rachana Ranade', description: 'Indian stock markets and financial analysis explained in Hindi and English', url: 'https://www.youtube.com/@CARachanaRanade', free: true },
      { title: 'Aswath Damodaran', description: 'NYU professor — valuation, corporate finance, and investment philosophy lectures', url: 'https://www.youtube.com/@AswathDamodaran', free: true },
    ],
    journals: [
      { title: 'Journal of Finance', description: 'Leading academic finance journal — abstracts give you the frontier of research', url: 'https://onlinelibrary.wiley.com/journal/15406261', free: false },
      { title: 'SSRN Finance', description: 'Free preprint finance research papers', url: 'https://www.ssrn.com/index.cfm/en/janda/journalbrowse/?jandaPage=1&subj=FIN', free: true },
    ],
    tools: [
      { title: 'Zerodha Varsity', description: 'Free comprehensive financial markets education — modules from basics to derivatives', url: 'https://zerodha.com/varsity/', free: true },
      { title: 'Screener.in', description: 'Free Indian stock screening and financial data tool — essential for fundamental analysis', url: 'https://www.screener.in', free: true },
    ],
  },

  // ── BizSaathi ───────────────────────────────────────────────────
  bizsaathi: {
    books: [
      { title: 'Good to Great', description: "Jim Collins — why some companies make the leap and others don't, based on rigorous research", url: 'https://www.amazon.in/Good-Great-Companies-Leap-Others/dp/0066620996', free: false },
      { title: 'Zero to One', description: 'Peter Thiel — building startups that create new things rather than copying existing ones', url: 'https://www.amazon.in/Zero-One-Notes-Start-Future/dp/0804139296', free: false },
      { title: 'The Hard Thing About Hard Things', description: 'Ben Horowitz — the brutal realities of building and running a business', url: 'https://www.amazon.in/Hard-Thing-About-Things-Building/dp/0062273205', free: false },
    ],
    podcasts: [
      { title: 'How I Built This', description: 'Guy Raz interviews founders about building companies from scratch — NPR, exceptional quality', url: 'https://www.npr.org/series/490248027/how-i-built-this', free: true },
      { title: 'Founders Over 40 India', description: 'Indian entrepreneurs and business leaders — local context and inspiration', url: 'https://open.spotify.com/show/foundersover40india', free: true },
    ],
    channels: [
      { title: 'Y Combinator', description: "Startup school lectures and founder interviews — world's best startup education free", url: 'https://www.youtube.com/@ycombinator', free: true },
      { title: 'Harvard Business Review', description: 'Management thinking, leadership, and strategy from HBR', url: 'https://www.youtube.com/@HarvardBusinessReview', free: true },
    ],
    journals: [
      { title: 'Harvard Business Review', description: 'Leading management journal — some articles free, essential reading for MBA students', url: 'https://hbr.org', free: false },
      { title: 'SSRN Management', description: 'Free preprint management and business research papers', url: 'https://www.ssrn.com', free: true },
    ],
    tools: [
      { title: 'Business Model Canvas (Strategyzer)', description: 'Free tool to design and analyse business models — essential for strategy courses', url: 'https://www.strategyzer.com/library/the-business-model-canvas', free: true },
      { title: 'Statista (Student)', description: 'Business statistics and market data — ask your college library for access', url: 'https://www.statista.com', free: false },
    ],
  },

  // ── MktSaathi ───────────────────────────────────────────────────
  mktsaathi: {
    books: [
      { title: 'Ogilvy on Advertising', description: 'David Ogilvy — the foundational text on advertising and marketing from its greatest practitioner', url: 'https://www.amazon.in/Ogilvy-Advertising-David/dp/039472903X', free: false },
      { title: 'Influence: The Psychology of Persuasion', description: 'Robert Cialdini — the science of why people say yes, essential for every marketer', url: 'https://www.amazon.in/Influence-Psychology-Persuasion-Robert-Cialdini/dp/006124189X', free: false },
      { title: 'Building a StoryBrand', description: 'Donald Miller — how to clarify your brand message so customers listen', url: 'https://www.amazon.in/Building-StoryBrand-Clarify-Message-Customers/dp/0718033329', free: false },
    ],
    podcasts: [
      { title: 'Marketing Over Coffee', description: 'Weekly marketing discussions — digital, content, SEO, social media', url: 'https://www.marketingovercoffee.com', free: true },
      { title: 'Social Media Marketing Podcast', description: 'Michael Stelzner — practical social media and digital marketing strategies', url: 'https://www.socialmediaexaminer.com/shows/', free: true },
    ],
    channels: [
      { title: 'GaryVee', description: 'Gary Vaynerchuk on digital marketing, content creation, and brand building', url: 'https://www.youtube.com/@garyvee', free: true },
      { title: 'Neil Patel', description: 'SEO, content marketing, and digital strategy — practical and data-driven', url: 'https://www.youtube.com/@neilpatel', free: true },
    ],
    journals: [
      { title: 'Journal of Marketing', description: 'AMA leading marketing research journal — abstracts show frontier of academic marketing', url: 'https://journals.sagepub.com/home/jmx', free: false },
      { title: 'Think with Google', description: 'Free consumer insights and marketing trends from Google — excellent for digital marketing', url: 'https://www.thinkwithgoogle.com', free: true },
    ],
    tools: [
      { title: 'Google Analytics Academy', description: 'Free Google Analytics certification — essential for every digital marketer', url: 'https://analytics.google.com/analytics/academy/', free: true },
      { title: 'Canva', description: 'Free design tool for marketing materials — social posts, presentations, infographics', url: 'https://www.canva.com', free: true },
    ],
  },

  // ── HRSaathi ────────────────────────────────────────────────────
  hrsaathi: {
    books: [
      { title: 'Drive', description: 'Daniel Pink — the science of motivation, essential for HR and organisational behaviour', url: 'https://www.amazon.in/Drive-Surprising-Truth-About-Motivates/dp/1594484805', free: false },
      { title: 'First, Break All The Rules', description: 'Marcus Buckingham — Gallup research on what great managers do differently', url: 'https://www.amazon.in/First-Break-All-Rules-Differently/dp/1595621113', free: false },
      { title: 'Work Rules!', description: 'Laszlo Bock — how Google approaches people management and HR', url: 'https://www.amazon.in/Work-Rules-Insights-Inside-Transform/dp/1444792385', free: false },
    ],
    podcasts: [
      { title: 'Worklife with Adam Grant', description: 'Organisational psychologist explores the science of making work better', url: 'https://www.ted.com/series/worklife_with_adam_grant', free: true },
      { title: 'The HR Leaders Podcast', description: "CHROs and HR directors share what's working in people management", url: 'https://hrleaders.co/podcast', free: true },
    ],
    channels: [
      { title: 'SHRM', description: 'Society for Human Resource Management — HR best practices and case studies', url: 'https://www.youtube.com/@SHRMHRVideo', free: true },
      { title: 'TED Talks — Work', description: 'The best TED talks on work, leadership, and organisational behaviour', url: 'https://www.youtube.com/playlist?list=PLOGi5-fAu8bFYFeLqEk0mJA6KVEcQb2Fj', free: true },
    ],
    journals: [
      { title: 'Academy of Management Journal', description: 'Leading management and HR research — abstracts freely accessible', url: 'https://journals.aom.org/journal/amj', free: false },
      { title: 'SHRM Research', description: "Free HR research reports and white papers from the world's largest HR association", url: 'https://www.shrm.org/research', free: true },
    ],
    tools: [
      { title: 'Gallup Q12 Survey', description: 'Free employee engagement framework — understand what drives team performance', url: 'https://www.gallup.com/workplace/356063/gallup-q12-employee-engagement-survey.aspx', free: true },
      { title: 'LinkedIn Learning (Student)', description: 'HR, leadership, and management courses — check if your college has a subscription', url: 'https://www.linkedin.com/learning/', free: false },
    ],
  },

  // ── HistorySaathi ───────────────────────────────────────────────
  historysaathi: {
    books: [
      { title: 'India: A History', description: 'John Keay — comprehensive narrative history of India from ancient times to independence', url: 'https://www.amazon.in/India-History-John-Keay/dp/0802137970', free: false },
      { title: 'The Discovery of India', description: "Jawaharlal Nehru — India's first PM writing about Indian civilisation and history, essential reading", url: 'https://www.amazon.in/Discovery-India-Jawaharlal-Nehru/dp/0195623592', free: false },
      { title: 'Sapiens', description: 'Yuval Noah Harari — a brief history of humankind, changes how you think about history', url: 'https://www.amazon.in/Sapiens-Humankind-Yuval-Noah-Harari/dp/0099590085', free: false },
    ],
    podcasts: [
      { title: 'The History of India Podcast', description: 'Kit Patrick — chronological history of India from the Indus Valley to the present', url: 'https://www.historyofindiapodcast.com', free: true },
      { title: 'Revisionist History', description: 'Malcolm Gladwell re-examines overlooked events and misunderstood people in history', url: 'https://www.pushkin.fm/podcasts/revisionist-history', free: true },
    ],
    channels: [
      { title: 'History of India (YouTube)', description: 'Detailed coverage of Indian history — ancient, medieval, modern, with maps and context', url: 'https://www.youtube.com/@HistoryofIndia', free: true },
      { title: 'Crash Course World History', description: "John Green's complete world history course — entertaining and academically rigorous", url: 'https://www.youtube.com/playlist?list=PLBDA2E52FB1EF80C9', free: true },
    ],
    journals: [
      { title: 'Indian Historical Review', description: 'SAGE journal — peer-reviewed Indian history research', url: 'https://journals.sagepub.com/home/ihr', free: false },
      { title: 'JSTOR — History', description: 'Access thousands of history journal articles — free with registration (100 articles/month)', url: 'https://www.jstor.org', free: true },
    ],
    tools: [
      { title: 'Google Arts & Culture', description: 'Virtual tours of museums and historical sites — primary sources made visual', url: 'https://artsandculture.google.com', free: true },
      { title: 'Internet Archive', description: 'Free access to historical documents, books, and newspapers — invaluable for research', url: 'https://archive.org', free: true },
    ],
  },

  // ── PsychSaathi ─────────────────────────────────────────────────
  psychsaathi: {
    books: [
      { title: "Man's Search for Meaning", description: 'Viktor Frankl — the most important psychology book of the 20th century, from a Holocaust survivor', url: 'https://www.amazon.in/Mans-Search-Meaning-Viktor-Frankl/dp/0807014273', free: false },
      { title: 'Thinking, Fast and Slow', description: 'Daniel Kahneman (Nobel) — two systems of thinking and the psychology of judgement and decision-making', url: 'https://www.amazon.in/Thinking-Fast-Slow-Daniel-Kahneman/dp/0141033576', free: false },
      { title: 'The Body Keeps the Score', description: 'Bessel van der Kolk — trauma, the brain, and the body — essential for clinical psychology students', url: 'https://www.amazon.in/Body-Keeps-Score-Healing-Trauma/dp/0143127748', free: false },
    ],
    podcasts: [
      { title: 'Hidden Brain', description: 'Shankar Vedantam — the unconscious patterns that drive human behaviour', url: 'https://hiddenbrain.org', free: true },
      { title: 'The Psychology Podcast', description: 'Scott Barry Kaufman interviews psychologists about human potential and flourishing', url: 'https://scottbarrykaufman.com/podcast/', free: true },
    ],
    channels: [
      { title: 'Crash Course Psychology', description: 'Complete psychology course — 40 episodes covering the full undergraduate syllabus', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', free: true },
      { title: 'TED Talks — Psychology', description: 'The best TED talks on mind, brain, behaviour, and mental health', url: 'https://www.ted.com/topics/psychology', free: true },
    ],
    journals: [
      { title: 'Psychological Science', description: 'APS flagship journal — cutting-edge psychological research across all subfields', url: 'https://journals.sagepub.com/home/pss', free: false },
      { title: 'NIMHANS Journal', description: 'Indian mental health research — India-specific clinical and community psychology', url: 'https://nimhans.ac.in/nimhans-journal/', free: true },
    ],
    tools: [
      { title: 'Psychology Today', description: 'Understand therapy approaches and mental health resources — essential for clinical students', url: 'https://www.psychologytoday.com', free: true },
      { title: 'iResearchNet Psychology', description: 'Free psychology research topics and study guides for undergraduate students', url: 'http://psychology.iresearchnet.com', free: true },
    ],
  },

  // ── PolSciSaathi ────────────────────────────────────────────────
  polscisaathi: {
    books: [
      { title: 'The Republic', description: 'Plato — the foundational text of political philosophy, still essential 2400 years later', url: 'https://www.amazon.in/Republic-Plato/dp/0140455116', free: true },
      { title: 'Arthashastra', description: "Kautilya/Chanakya — ancient Indian statecraft and political economy, India's own political classic", url: 'https://www.amazon.in/Arthashastra-Kautilya/dp/014045518X', free: false },
      { title: 'The Idea of Justice', description: "Amartya Sen — a new approach to political philosophy and justice theory from India's Nobel laureate", url: 'https://www.amazon.in/Idea-Justice-Amartya-Sen/dp/0141037857', free: false },
    ],
    podcasts: [
      { title: 'The India Explained Podcast', description: 'Indian politics, policy, and governance explained clearly and in depth', url: 'https://www.thehindu.com/podcast/', free: true },
      { title: 'PRS Legislative Research Podcast', description: "Indian Parliament, bills, and policy explained by India's leading legislative research body", url: 'https://prsindia.org/theissue', free: true },
    ],
    channels: [
      { title: 'Drishti IAS', description: 'UPSC political science and governance — comprehensive and India-focused', url: 'https://www.youtube.com/@DrishtiIASvideos', free: true },
      { title: 'Crash Course Government', description: 'Political science and government systems explained — concepts are universal', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOfse2ncvffeelTrqvhrz8H', free: true },
    ],
    journals: [
      { title: 'Economic and Political Weekly', description: "India's essential journal for political economy, governance, and social science", url: 'https://www.epw.in', free: false },
      { title: 'PRS India', description: 'Free legislative research — bill summaries, committee reports, Parliament data', url: 'https://prsindia.org', free: true },
    ],
    tools: [
      { title: 'PRS India Legislative Tracker', description: 'Track bills in Parliament — essential for political science students', url: 'https://prsindia.org/billtrack', free: true },
      { title: 'Election Commission of India', description: 'Official electoral data — results, voter turnout, candidate information', url: 'https://eci.gov.in', free: true },
    ],
  },

  // ── StatsSaathi ─────────────────────────────────────────────────
  statssaathi: {
    books: [
      { title: 'The Signal and the Noise', description: 'Nate Silver — prediction, probability, and statistics applied to elections, sports, and economics', url: 'https://www.amazon.in/Signal-Noise-Many-Predictions-Fail/dp/0143125087', free: false },
      { title: 'How to Lie With Statistics', description: 'Darrell Huff — the classic guide to statistical manipulation and how to spot it', url: 'https://www.amazon.in/How-Lie-Statistics-Darrell-Huff/dp/0393310728', free: false },
      { title: 'The Art of Statistics', description: 'David Spiegelhalter — learning from data in the real world, rigorous and accessible', url: 'https://www.amazon.in/Art-Statistics-Learning-Pelican-Books/dp/0241258766', free: false },
    ],
    podcasts: [
      { title: 'Not So Standard Deviations', description: 'Hilary Parker and Roger Peng on data science and statistics in practice', url: 'http://nssdeviations.com', free: true },
      { title: 'DataFramed', description: "DataCamp's podcast on data science, statistics, and machine learning", url: 'https://www.datacamp.com/podcast', free: true },
    ],
    channels: [
      { title: 'StatQuest with Josh Starmer', description: 'Statistics and machine learning explained with extraordinary clarity — the best statistics channel', url: 'https://www.youtube.com/@statquest', free: true },
      { title: '3Blue1Brown', description: 'Probability and statistics visualised mathematically — intuition first', url: 'https://www.youtube.com/@3blue1brown', free: true },
    ],
    journals: [
      { title: 'arXiv Statistics', description: 'Free preprint statistics and machine learning research papers', url: 'https://arxiv.org/archive/stat', free: true },
      { title: 'Journal of the American Statistical Association', description: 'Leading statistics journal — methodology and applications', url: 'https://www.tandfonline.com/toc/uasa20/current', free: false },
    ],
    tools: [
      { title: 'R Studio (Posit Cloud)', description: 'Free statistical computing — industry standard for data analysis and visualisation', url: 'https://posit.cloud', free: true },
      { title: 'Kaggle', description: 'Free datasets, notebooks, and competitions — learn statistics and data science by doing', url: 'https://www.kaggle.com', free: true },
    ],
  },

  // ── GeoSaathi ───────────────────────────────────────────────────
  geosaathi: {
    books: [
      { title: 'Prisoners of Geography', description: 'Tim Marshall — how geography shapes geopolitics and international relations', url: 'https://www.amazon.in/Prisoners-Geography-Explains-Everything-About/dp/1783962437', free: false },
      { title: 'Guns, Germs, and Steel', description: 'Jared Diamond — why geography determined which civilisations dominated others', url: 'https://www.amazon.in/Guns-Germs-Steel-Fates-Societies/dp/0393354326', free: false },
      { title: 'The Revenge of Geography', description: 'Robert Kaplan — geography and the coming conflicts of the 21st century', url: 'https://www.amazon.in/Revenge-Geography-Coming-Conflicts-Against/dp/0812982223', free: false },
    ],
    podcasts: [
      { title: 'Geographics (Podcast)', description: 'Geography, geopolitics, and world affairs explained through a geographical lens', url: 'https://open.spotify.com/show/geographics', free: true },
      { title: 'Maps and Flags', description: 'Weekly geography news and current affairs — great for UPSC geography optional', url: 'https://open.spotify.com/show/mapsandflags', free: true },
    ],
    channels: [
      { title: 'RealLifeLore', description: 'Geography, borders, and geopolitics explained visually — excellent UPSC preparation', url: 'https://www.youtube.com/@RealLifeLore', free: true },
      { title: 'NCERT Official', description: 'NCERT video content for geography — aligned with UPSC and university syllabi', url: 'https://www.youtube.com/@ncert', free: true },
    ],
    journals: [
      { title: 'Nature Geoscience', description: 'Physical geography and earth science research at the frontier', url: 'https://www.nature.com/ngeo/', free: false },
      { title: 'The Geographical Journal', description: 'Royal Geographical Society — human and physical geography research', url: 'https://rgs-ibg.onlinelibrary.wiley.com/journal/14754959', free: false },
    ],
    tools: [
      { title: 'Google Earth', description: 'Free satellite imagery and geographic exploration — essential tool for geography students', url: 'https://earth.google.com', free: true },
      { title: 'QGIS', description: 'Free open-source GIS software — industry standard for geographic information systems', url: 'https://qgis.org', free: true },
    ],
  },

  // ── AgriSaathi ──────────────────────────────────────────────────
  agrisaathi: {
    books: [
      { title: 'The One-Straw Revolution', description: 'Masanobu Fukuoka — natural farming philosophy that changed sustainable agriculture globally', url: 'https://www.amazon.in/One-Straw-Revolution-Introduction-Natural-Farming/dp/1590173139', free: false },
      { title: 'Silent Spring', description: 'Rachel Carson — the book that started the environmental movement, essential for agriculture students', url: 'https://www.amazon.in/Silent-Spring-Rachel-Carson/dp/0618249060', free: false },
      { title: "Farmer's Glory", description: 'A.G. Street — understanding farming from the ground up, a classic agricultural perspective', url: 'https://www.amazon.in/Farmers-Glory-G-Street/dp/1870948025', free: false },
    ],
    podcasts: [
      { title: 'ICAR Krishi Darshan', description: 'Indian Council of Agricultural Research — official agricultural education in Hindi and English', url: 'https://icar.org.in', free: true },
      { title: 'Sustainable Agriculture Podcast', description: 'Practical sustainable farming techniques and research from around the world', url: 'https://www.sare.org/podcast', free: true },
    ],
    channels: [
      { title: 'ICAR Official', description: 'Indian Council of Agricultural Research — research, techniques, and crop science', url: 'https://www.youtube.com/@ICARofficial', free: true },
      { title: 'Krishi Jagran', description: 'Indian agriculture news, techniques, and government schemes in Hindi', url: 'https://www.youtube.com/@KrishiJagranTV', free: true },
    ],
    journals: [
      { title: 'Indian Journal of Agricultural Sciences', description: "ICAR's flagship journal — peer-reviewed Indian agricultural research", url: 'https://epubs.icar.org.in/index.php/IJAgS', free: true },
      { title: 'Nature Plants', description: 'Leading plant science and agriculture research — abstracts show current frontiers', url: 'https://www.nature.com/nplants/', free: false },
    ],
    tools: [
      { title: 'Kisan Suvidha App', description: 'Government of India app for farmers — weather, market prices, crop advisories', url: 'https://play.google.com/store/apps/details?id=com.kisan', free: true },
      { title: 'FAO AGRIS', description: 'Free agricultural science and technology database from the UN Food and Agriculture Organisation', url: 'https://agris.fao.org', free: true },
    ],
  },

  // ── ArchSaathi ──────────────────────────────────────────────────
  archsaathi: {
    books: [
      { title: 'A Pattern Language', description: 'Christopher Alexander — 253 patterns for designing towns, buildings, and spaces, foundational', url: 'https://www.amazon.in/Pattern-Language-Buildings-Construction-Environmental/dp/0195019199', free: false },
      { title: 'Towards a New Architecture', description: 'Le Corbusier — the manifesto of modern architecture, still debated and essential', url: 'https://www.amazon.in/Towards-Architecture-Dover-Architecture-Corbusier/dp/0486250237', free: false },
      { title: 'The Architecture of Happiness', description: 'Alain de Botton — how the spaces we inhabit affect who we are and how we feel', url: 'https://www.amazon.in/Architecture-Happiness-Alain-Botton/dp/0141027630', free: false },
    ],
    podcasts: [
      { title: '99% Invisible', description: 'Roman Mars on the design and architecture of the built world — essential listening', url: 'https://99percentinvisible.org', free: true },
      { title: "The Architect's Podcast", description: 'Architecture careers, practice, and design thinking in the Indian context', url: 'https://www.architectspodcast.com', free: true },
    ],
    channels: [
      { title: 'Architectural Digest', description: 'Contemporary architecture, interiors, and design — visual inspiration and criticism', url: 'https://www.youtube.com/@ArchDigest', free: true },
      { title: 'B.V. Doshi Memorial', description: "Work of India's Pritzker Prize winner — Indian architecture at its finest", url: 'https://www.vastushilpa.org', free: true },
    ],
    journals: [
      { title: 'Architectural Record', description: 'Leading architecture journal — buildings, technology, and design globally', url: 'https://www.architecturalrecord.com', free: false },
      { title: 'Journal of Architecture', description: 'RIBA academic journal — architectural history, theory, and practice', url: 'https://www.tandfonline.com/toc/rjar20/current', free: false },
    ],
    tools: [
      { title: 'SketchUp Free', description: 'Free 3D modelling software — browser-based, excellent for architectural design students', url: 'https://www.sketchup.com/products/sketchup-free', free: true },
      { title: 'AutoCAD (Student)', description: 'Free architectural drawing software from Autodesk for students', url: 'https://www.autodesk.com/education/edu-software/overview', free: true },
    ],
  },

  // ── CivilSaathi ─────────────────────────────────────────────────
  civilsaathi: {
    books: [
      { title: 'The Death and Life of Great American Cities', description: 'Jane Jacobs — the most influential book on urban planning and what makes cities work', url: 'https://www.amazon.in/Death-Life-Great-American-Cities/dp/067974195X', free: false },
      { title: 'Soil Mechanics', description: 'Das — the standard geotechnical engineering reference for B.Tech Civil students', url: 'https://www.amazon.in/Fundamentals-Geotechnical-Engineering-Braja-Das/dp/1111576025', free: false },
      { title: "Structures: Or Why Things Don't Fall Down", description: 'J.E. Gordon — structural engineering intuition built through stories, essential reading', url: 'https://www.amazon.in/Structures-Things-Dont-Fall-Down/dp/0306812835', free: false },
    ],
    podcasts: [
      { title: 'The Civil Engineering Podcast', description: 'Career development and technical topics for civil engineers in India and globally', url: 'https://www.civilengineeringpodcast.com', free: true },
      { title: 'Talking Headways', description: 'Transportation planning and urban mobility — essential for infrastructure engineers', url: 'https://streetsblog.libsyn.com', free: true },
    ],
    channels: [
      { title: 'NPTEL Civil Engineering', description: 'IIT professors on structural analysis, geotechnical, and environmental engineering', url: 'https://www.youtube.com/@nptel', free: true },
      { title: 'Practical Engineering', description: 'Civil infrastructure explained with models and experiments — bridges, dams, roads', url: 'https://www.youtube.com/@PracticalEngineeringChannel', free: true },
    ],
    journals: [
      { title: 'Journal of Structural Engineering (ASCE)', description: 'Leading structural engineering research — essential for advanced study', url: 'https://ascelibrary.org/journal/jsendh', free: false },
      { title: 'Indian Concrete Journal', description: 'Concrete technology and structural research relevant to Indian construction practice', url: 'https://www.indianconcretejournal.com', free: false },
    ],
    tools: [
      { title: 'AutoCAD (Student)', description: 'Free civil engineering drawing software from Autodesk for students', url: 'https://www.autodesk.com/education/edu-software/overview', free: true },
      { title: 'STAAD.Pro (Student)', description: 'Structural analysis software — industry standard for civil engineers, free student version', url: 'https://www.bentley.com/software/staad-pro/', free: false },
    ],
  },

  // ── ElecSaathi ──────────────────────────────────────────────────
  elecsaathi: {
    books: [
      { title: 'The Art of Electronics', description: 'Horowitz and Hill — the most practical electronics reference, essential for every EE student', url: 'https://www.amazon.in/Art-Electronics-Paul-Horowitz/dp/0521809266', free: false },
      { title: 'Power Systems Analysis', description: 'Bergen and Vittal — comprehensive power systems textbook for electrical engineering', url: 'https://www.amazon.in/Power-Systems-Analysis-Arthur-Bergen/dp/0136919901', free: false },
      { title: "Surely You're Joking, Mr. Feynman!", description: "Richard Feynman — physicist's adventures in science and engineering, builds scientific thinking", url: 'https://www.amazon.in/Surely-Youre-Joking-Feynman-Adventures/dp/009917331X', free: false },
    ],
    podcasts: [
      { title: 'The Amp Hour', description: 'Electronics design and engineering — practical, weekly, excellent for EE students', url: 'https://theamphour.com', free: true },
      { title: 'Embedded.fm', description: 'Embedded systems and electronics engineering — interviews with practitioners', url: 'https://embedded.fm', free: true },
    ],
    channels: [
      { title: 'NPTEL Electrical Engineering', description: 'IIT professors on power systems, control, and electrical machines — free and rigorous', url: 'https://www.youtube.com/@nptel', free: true },
      { title: 'Prof. Sam Ben-Yaakov', description: 'Power electronics and analog circuits explained with depth by a leading researcher', url: 'https://www.youtube.com/@profsamben-yaakov', free: true },
    ],
    journals: [
      { title: 'IEEE Transactions on Power Systems', description: 'Leading power engineering research — IEEE access may be available through your college', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=59', free: false },
      { title: 'arXiv Electrical Engineering', description: 'Free preprint papers in electrical engineering and systems science', url: 'https://arxiv.org/archive/eess', free: true },
    ],
    tools: [
      { title: 'LTspice', description: 'Free circuit simulation software from Analog Devices — industry standard for EE students', url: 'https://www.analog.com/en/design-center/design-tools-and-calculators/ltspice-simulator.html', free: true },
      { title: 'MATLAB (Student)', description: 'Matrix computation and simulation — check if your college has a campus licence', url: 'https://www.mathworks.com/academia/students.html', free: false },
    ],
  },

  // ── ElectronicsSaathi ───────────────────────────────────────────
  electronicssaathi: {
    books: [
      { title: 'Microelectronic Circuits', description: 'Sedra and Smith — the definitive analog and digital electronics textbook for ECE students', url: 'https://www.amazon.in/Microelectronic-Circuits-Adel-S-Sedra/dp/0190853549', free: false },
      { title: 'Digital Design', description: 'Morris Mano — logic design and digital systems, essential for VLSI and digital electronics', url: 'https://www.amazon.in/Digital-Design-Morris-R-Mano/dp/9332542457', free: false },
      { title: 'The Innovators', description: 'Walter Isaacson — the history of the digital revolution and the people who built it', url: 'https://www.amazon.in/Innovators-Hackers-Geniuses-Created-Revolution/dp/1476708703', free: false },
    ],
    podcasts: [
      { title: 'The Amp Hour', description: 'Electronics design, embedded systems, and signal processing — weekly and practical', url: 'https://theamphour.com', free: true },
      { title: 'Semiconductor Insiders', description: 'Semiconductor industry, VLSI, and chip design — relevant for ECE students', url: 'https://www.semiconductorinsiders.com/podcast', free: true },
    ],
    channels: [
      { title: 'Ben Eater', description: 'Build an 8-bit computer from scratch — digital electronics explained by building it', url: 'https://www.youtube.com/@BenEater', free: true },
      { title: 'NPTEL Electronics', description: 'IIT professors on analog circuits, digital systems, and VLSI design', url: 'https://www.youtube.com/@nptel', free: true },
    ],
    journals: [
      { title: 'IEEE Transactions on Electron Devices', description: 'Semiconductor devices and electronics research — check college IEEE access', url: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=16', free: false },
      { title: 'arXiv Electrical Engineering', description: 'Free preprint papers in signal processing and electronics', url: 'https://arxiv.org/archive/eess', free: true },
    ],
    tools: [
      { title: 'Tinkercad Circuits', description: 'Free online circuit simulator and Arduino emulator — perfect for ECE students', url: 'https://www.tinkercad.com/circuits', free: true },
      { title: 'Falstad Circuit Simulator', description: 'Free browser-based circuit simulator — visualise signals and circuit behaviour', url: 'https://www.falstad.com/circuit/', free: true },
    ],
  },

  // ── EnviroSaathi ────────────────────────────────────────────────
  envirosaathi: {
    books: [
      { title: 'Silent Spring', description: 'Rachel Carson — the book that started the environmental movement, essential for every environment student', url: 'https://www.amazon.in/Silent-Spring-Rachel-Carson/dp/0618249060', free: false },
      { title: 'The Uninhabitable Earth', description: 'David Wallace-Wells — climate change consequences explained with data and urgency', url: 'https://www.amazon.in/Uninhabitable-Earth-Story-Warming-World/dp/0141988916', free: false },
      { title: 'Ecology of a Changing Planet', description: 'Mark Bush — comprehensive ecology and environmental science for undergraduate students', url: 'https://www.amazon.in/Ecology-Changing-Planet-Mark-Bush/dp/0131015400', free: false },
    ],
    podcasts: [
      { title: 'Outrage and Optimism', description: 'Climate change solutions and policy — conversations with world leaders and scientists', url: 'https://www.outrageandoptimism.org', free: true },
      { title: 'India Climate Dialogues', description: 'Climate change and environment policy in the Indian context', url: 'https://indiaclimatedialogue.net/podcast/', free: true },
    ],
    channels: [
      { title: 'Kurzgesagt', description: 'Environmental and climate science explained with extraordinary animation and accuracy', url: 'https://www.youtube.com/@kurzgesagt', free: true },
      { title: 'DTE India (Down to Earth)', description: 'Indian environmental news, policy, and science — essential for Indian environmental studies', url: 'https://www.youtube.com/@DownToEarthIndia', free: true },
    ],
    journals: [
      { title: 'Nature Climate Change', description: 'Leading climate science journal — abstracts show current research frontiers', url: 'https://www.nature.com/nclimate/', free: false },
      { title: 'Down to Earth', description: "India's most important environmental magazine — free online access to many articles", url: 'https://www.downtoearth.org.in', free: true },
    ],
    tools: [
      { title: 'Global Forest Watch', description: 'Free real-time deforestation and forest monitoring data — essential for environmental research', url: 'https://www.globalforestwatch.org', free: true },
      { title: 'NASA Earth Observatory', description: 'Free satellite data and visualisations of environmental change — primary source', url: 'https://earthobservatory.nasa.gov', free: true },
    ],
  },

  // ── MechSaathi ──────────────────────────────────────────────────
  mechsaathi: {
    books: [
      { title: 'Engineering Mechanics', description: 'Meriam and Kraige — the standard reference for statics and dynamics at undergraduate level', url: 'https://www.amazon.in/Engineering-Mechanics-Statics-J-Meriam/dp/1118919726', free: false },
      { title: 'The Way Things Work', description: 'David Macaulay — how machines and technology work, beautifully illustrated, builds intuition', url: 'https://www.amazon.in/New-Way-Things-Work/dp/0395938473', free: false },
      { title: 'Toyota Production System', description: 'Taiichi Ohno — the engineering and management philosophy behind modern manufacturing', url: 'https://www.amazon.in/Toyota-Production-System-Taiichi-Ohno/dp/0915299143', free: false },
    ],
    podcasts: [
      { title: 'The Mechanical Engineering Podcast', description: 'Career and technical topics for mechanical engineers — industry insights and skills', url: 'https://www.mechanicalengineeringpodcast.com', free: true },
      { title: 'The Engineering Commons', description: 'Engineering careers, skills, and real-world problem solving', url: 'https://www.theengineeringcommons.com', free: true },
    ],
    channels: [
      { title: 'The Efficient Engineer', description: 'Thermodynamics, fluid mechanics, and mechanical engineering explained visually', url: 'https://www.youtube.com/@TheEfficientEngineer', free: true },
      { title: 'NPTEL Mechanical', description: 'IIT professors teaching mechanical engineering — free and syllabus-aligned', url: 'https://www.youtube.com/@nptel', free: true },
    ],
    journals: [
      { title: 'Journal of Mechanical Design', description: 'ASME journal — mechanical design research, some papers freely accessible', url: 'https://asmedigitalcollection.asme.org/mechanicaldesign', free: false },
      { title: 'arXiv Mechanical Engineering', description: 'Free preprint papers in mechanics and engineering', url: 'https://arxiv.org/search/?searchtype=all&query=mechanical+engineering', free: true },
    ],
    tools: [
      { title: 'Fusion 360 (Student)', description: 'Free CAD/CAM software from Autodesk for students — industry standard for mechanical design', url: 'https://www.autodesk.com/education/edu-software/overview', free: true },
      { title: 'SimScale', description: 'Free cloud-based CFD and FEA simulation — run engineering simulations in your browser', url: 'https://www.simscale.com', free: true },
    ],
  },

  // ── AerospaceSaathi ─────────────────────────────────────────────
  aerospacesaathi: {
    books: [
      { title: 'Wings of Fire', description: "A.P.J. Abdul Kalam — autobiography of India's missile man and former President, essential for Indian aerospace students", url: 'https://www.amazon.in/Wings-Fire-Autobiography-Abdul-Kalam/dp/8173711461', free: false },
      { title: 'Introduction to Flight', description: 'John D. Anderson — the definitive undergraduate aeronautics and astronautics textbook', url: 'https://www.amazon.in/Introduction-Flight-John-Anderson/dp/0073380245', free: false },
      { title: 'The Right Stuff', description: 'Tom Wolfe — the early astronauts and test pilots who defined the space age', url: 'https://www.amazon.in/Right-Stuff-Tom-Wolfe/dp/0312427565', free: false },
    ],
    podcasts: [
      { title: 'ISRO Speaks', description: "Official ISRO content on India's space missions and research", url: 'https://www.isro.gov.in', free: true },
      { title: 'Main Engine Cut Off', description: 'Space industry news and launch analysis — follows ISRO, SpaceX, and global launches', url: 'https://mainenginecutoff.com', free: true },
    ],
    channels: [
      { title: 'ISRO Official', description: 'Official Indian Space Research Organisation — missions, science, and technology', url: 'https://www.youtube.com/@ISROofficial', free: true },
      { title: 'Scott Manley', description: 'Orbital mechanics, space history, and aerospace engineering explained with depth', url: 'https://www.youtube.com/@ScottManley', free: true },
    ],
    journals: [
      { title: 'Journal of Spacecraft and Rockets (AIAA)', description: 'American Institute of Aeronautics and Astronautics — leading aerospace research', url: 'https://arc.aiaa.org/journal/jsr', free: false },
      { title: 'Acta Astronautica', description: 'International astronautics research — space mission design and technology', url: 'https://www.journals.elsevier.com/acta-astronautica', free: false },
    ],
    tools: [
      { title: 'NASA Eyes on the Solar System', description: 'Free 3D visualisation of NASA missions and solar system exploration', url: 'https://eyes.nasa.gov', free: true },
      { title: 'Kerbal Space Program (Demo)', description: 'Rocket design and orbital mechanics simulator — teaches real aerospace physics through play', url: 'https://www.kerbalspaceprogram.com', free: false },
    ],
  },

  // ── ChemEnggSaathi ──────────────────────────────────────────────
  'chemengg-saathi': {
    books: [
      { title: 'Chemical Engineering Design', description: 'Towler and Sinnott — process design and economics, the standard plant design reference', url: 'https://www.amazon.in/Chemical-Engineering-Design-Gavin-Towler/dp/0080966608', free: false },
      { title: 'Transport Phenomena', description: 'Bird, Stewart, Lightfoot — the foundational text for mass, heat, and momentum transfer', url: 'https://www.amazon.in/Transport-Phenomena-R-Byron-Bird/dp/0470115394', free: false },
      { title: 'The Alchemy of Air', description: 'Thomas Hager — the Haber-Bosch process that feeds the world, chemical engineering history', url: 'https://www.amazon.in/Alchemy-Air-Dazzling-Triumph-Terrible/dp/0307351793', free: false },
    ],
    podcasts: [
      { title: 'The Chemical Engineering Podcast', description: 'Career development and technical topics for chemical engineers', url: 'https://www.chemicalengineeringpodcast.com', free: true },
      { title: 'AIChE Podcast', description: 'American Institute of Chemical Engineers — research, careers, and industry insights', url: 'https://www.aiche.org/chenected/podcast', free: true },
    ],
    channels: [
      { title: 'NPTEL Chemical Engineering', description: 'IIT professors on reaction engineering, mass transfer, and process control', url: 'https://www.youtube.com/@nptel', free: true },
      { title: 'LearnChemE', description: 'University of Colorado chemical engineering — thermodynamics, transport, reaction engineering', url: 'https://www.youtube.com/@LearnChemE', free: true },
    ],
    journals: [
      { title: 'Chemical Engineering Science', description: 'Elsevier — leading chemical engineering research journal', url: 'https://www.journals.elsevier.com/chemical-engineering-science', free: false },
      { title: 'AIChE Journal', description: 'American Institute of Chemical Engineers — process and reaction engineering research', url: 'https://aiche.onlinelibrary.wiley.com/journal/15475905', free: false },
    ],
    tools: [
      { title: 'Aspen Plus (Student)', description: 'Process simulation software — industry standard for chemical plant design, free for students', url: 'https://www.aspentech.com/en/products/engineering/aspen-plus', free: false },
      { title: 'DWSIM', description: 'Free open-source chemical process simulator — alternative to Aspen for students', url: 'https://dwsim.org', free: true },
    ],
  },

}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getExploreBeyond(slug: string): ExploreBeyondData | null {
  return EXPLORE_BEYOND[slug] ?? null
}

export const EXPLORE_CATEGORIES = [
  { key: 'books',    emoji: '📚', label: 'Books'    },
  { key: 'podcasts', emoji: '🎙️', label: 'Podcasts' },
  { key: 'channels', emoji: '📺', label: 'Channels' },
  { key: 'journals', emoji: '🔬', label: 'Journals' },
  { key: 'tools',    emoji: '🛠️', label: 'Tools'    },
] as const
