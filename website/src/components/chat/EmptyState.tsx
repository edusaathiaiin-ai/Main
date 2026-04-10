'use client'

import { motion } from 'framer-motion'


// ─── Types ────────────────────────────────────────────────────────────────────

type StarterSet = {
  opener: string        // Saathi speaks first — proactive, warm
  description: string   // One-line about what this bot mode does
  starters: readonly string[]  // 4 clickable prompts
  possibilityPrompt?: string   // One "who you're becoming" question — gold, distinct
}

type SaathiBotStarters = Partial<Record<string, StarterSet>>

// ─── Per-Saathi × Per-Bot starters ───────────────────────────────────────────

const SAATHI_STARTERS: Record<string, SaathiBotStarters> = {

  kanoonsaathi: {
    'Study Notes': {
      opener: "Tell me which law, bare act, or landmark case you need notes on — I'll make it structured and exam-ready.",
      description: 'Structured notes on laws, bare acts, and landmark judgments',
      starters: [
        'Make notes on the Indian Contract Act 1872',
        'Summarise landmark Supreme Court judgments on privacy',
        'Notes on fundamental rights under Part III of the Constitution',
        'Explain Section 498A IPC with a clear structure',
      ],
    },
    'Exam Prep': {
      opener: "Which law exam are you preparing for — LLB, judiciary, or CLAT? Tell me and I'll quiz you the right way.",
      description: 'MCQs, past paper patterns, and mock Q&A for law exams',
      starters: [
        'Quiz me on Contract Law with MCQs',
        'Give me 5 hard questions on Constitutional Law',
        'What are common mistake areas in Torts?',
        'Past paper patterns for LLB Semester 3',
      ],
    },
    'Interest Explorer': {
      opener: "Which area of law makes you curious beyond the syllabus? I'll show you where it leads and what careers it opens.",
      description: 'Explore legal careers, emerging laws, and niche practice areas',
      starters: [
        'What is cyber law and where does it lead as a career?',
        'Explain constitutional litigation — who does it and how?',
        'How is AI changing the legal profession in India?',
        'What is international arbitration and how do I get into it?',
      ],
      possibilityPrompt: 'What can a law student become that most people never expect?',
    },
    'UPSC Saathi': {
      opener: "Are you preparing Law as your UPSC optional? Tell me your current stage — Paper I, Paper II, or answer writing — and we'll go from there.",
      description: 'Law optional strategy, answer writing, and GS legal topics',
      starters: [
        'Explain judicial review for a UPSC 250-word answer',
        'Which Law optional topics carry maximum marks?',
        'Draft a model answer on the separation of powers',
        'Important landmark cases every UPSC aspirant must know',
      ],
    },
    'Citizen Guide': {
      opener: "Tell me which law or right you want to understand — I'll explain it in plain language with no jargon.",
      description: 'Plain-language law for everyday life — jargon-free, always',
      starters: [
        'What are my rights if I am arrested?',
        'How do I file an RTI application step by step?',
        'What happens during a bail hearing?',
        'Can I challenge an unfair dismissal from my job?',
      ],
    },
  },

  maathsaathi: {
    'Study Notes': {
      opener: "Which chapter are we building notes for today? Share the topic and I'll structure it with worked examples.",
      description: 'Clean structured notes with worked examples and proofs',
      starters: [
        'Make notes on integration by parts with examples',
        'Explain matrices and determinants clearly',
        'Notes on limits, continuity, and differentiability',
        'Summarise probability distributions with formulas',
      ],
    },
    'Exam Prep': {
      opener: "JEE, GATE, or university exams? Tell me which one and I'll match the difficulty and pattern exactly.",
      description: 'Problem sets, MCQs, and weak-area tracking',
      starters: [
        'Quiz me on calculus — JEE Advanced level',
        'Give me 5 hard problems on linear algebra',
        'What are my weak spots in coordinate geometry?',
        'Timed mock on differential equations',
      ],
    },
    'Interest Explorer': {
      opener: "Mathematics goes far beyond the textbook. Tell me what excites you and I'll show you where it leads in the real world.",
      description: 'Explore the mathematics hiding in science, tech, and everyday life',
      starters: [
        'How is maths used in AI and machine learning?',
        'What is cryptography and how does number theory power it?',
        'Explain game theory with a real-world example',
        'What career paths open with a pure maths degree?',
      ],
      possibilityPrompt: 'What can someone who truly understands mathematics build that most people cannot?',
    },
    'UPSC Saathi': {
      opener: "Maths optional is a high-scoring but demanding choice. Tell me your preparation level and we'll map a strategy together.",
      description: 'Maths optional strategy, answer writing, and paper patterns',
      starters: [
        'Break down the full Maths optional syllabus for me',
        'Which Paper I topics give maximum marks?',
        'Explain real analysis in a way I can write answers',
        'Draft a model answer on group theory',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any maths you need explained simply — for money, loans, data, or just everyday decisions.",
      description: 'Maths explained simply for everyday life and decisions',
      starters: [
        'Explain compound interest vs simple interest',
        'How does EMI calculation actually work?',
        'What is percentage — and how do I calculate GST?',
        'How do I read a statistical chart in a newspaper?',
      ],
    },
  },

  chemsaathi: {
    'Study Notes': {
      opener: "Which topic should we cover? Tell me the chapter or reaction type and I'll build you clean, exam-ready notes.",
      description: 'Structured notes on reactions, mechanisms, and periodic trends',
      starters: [
        'Notes on SN1 vs SN2 reactions with examples',
        'Explain electrochemistry — Nernst equation and cell EMF',
        'Summarise IUPAC nomenclature rules for organic chemistry',
        'Notes on coordination compounds and crystal field theory',
      ],
    },
    'Exam Prep': {
      opener: "JEE, NEET, or GATE Chemistry? Tell me your target and I'll quiz you with the right patterns and difficulty.",
      description: 'MCQs, reaction predictions, and past paper practice',
      starters: [
        'Quiz me on organic reactions — JEE level',
        'Give me 5 questions on p-block elements',
        'Test my weak spots in physical chemistry',
        'Past paper pattern analysis for NEET Chemistry',
      ],
    },
    'Interest Explorer': {
      opener: "Chemistry is behind everything from medicine to materials. What sparks your curiosity beyond the syllabus?",
      description: 'Explore chemistry careers, research areas, and real-world applications',
      starters: [
        'What is green chemistry and why does it matter?',
        'How is chemistry used in drug discovery?',
        'Tell me about computational chemistry as a career',
        'What are the most exciting frontiers in materials science?',
      ],
      possibilityPrompt: 'What is the most unexpected career a chemistry student could walk into?',
    },
    'UPSC Saathi': {
      opener: "Chemistry in UPSC shows up in Science & Tech and Environment. Tell me your weak sections and we'll strengthen them.",
      description: 'Chemistry for UPSC GS, Science & Tech, and optional',
      starters: [
        'Explain nanomaterials for a UPSC Science & Tech answer',
        'How does chemistry appear in UPSC Environment topics?',
        'Key chemistry concepts for UPSC Prelims',
        'Draft a model answer on polymers and their applications',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about chemistry that affects your daily life — food, medicine, air quality, household products.",
      description: 'Chemistry explained for everyday life — no formulas required',
      starters: [
        'Why is my water hard and how do I fix it?',
        'What chemicals should I never mix at home?',
        'Explain how sunscreen actually protects skin',
        'What does "organic" mean on food labels?',
      ],
    },
  },

  biosaathi: {
    'Study Notes': {
      opener: "Which biology topic are we tackling? Tell me the chapter and I'll make structured notes with diagrams described in words.",
      description: 'Structured notes on life sciences — from cell to ecosystem',
      starters: [
        'Notes on DNA replication with step-by-step detail',
        'Explain the immune system — innate vs adaptive',
        'Summarise Mendelian and non-Mendelian genetics',
        'Notes on cell signalling and receptor types',
      ],
    },
    'Exam Prep': {
      opener: "NEET, GATE Life Sciences, or university exams? Tell me and I'll quiz you with the right level of detail.",
      description: 'MCQs, diagram-based questions, and past paper practice',
      starters: [
        'Quiz me on plant physiology for NEET',
        'Give me 5 questions on molecular biology',
        'Test me on ecology and environmental biology',
        'Which topics are highest-scoring in NEET Biology?',
      ],
    },
    'Interest Explorer': {
      opener: "Biology is expanding fast — from CRISPR to synthetic life. What area makes you want to go deeper?",
      description: 'Explore careers and frontiers in the life sciences',
      starters: [
        'What is synthetic biology and what careers does it open?',
        'Explain CRISPR gene editing and where it is heading',
        'What is computational biology and how do I get into it?',
        'Tell me about bioinformatics as a career path',
      ],
      possibilityPrompt: "What's the most unexpected thing a biology student could build?",
    },
    'UPSC Saathi': {
      opener: "Biology appears throughout UPSC — from Science & Tech to Health policy. Tell me which section you need help with.",
      description: 'Biology for UPSC GS, Science & Tech, and optional',
      starters: [
        'Key biology topics for UPSC Prelims Science section',
        'Explain GMO crops for a UPSC answer on food policy',
        'Draft a model answer on antimicrobial resistance',
        'How does health and disease appear in UPSC Mains GS2?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any biology question that matters to your health or your life — I'll explain it clearly.",
      description: 'Biology explained for health, food, and everyday decisions',
      starters: [
        'How does a vaccine actually work in my body?',
        'What happens when I get an infection — step by step?',
        'Explain what gut bacteria do for my health',
        'Why do genetic diseases run in families?',
      ],
    },
  },

  pharmasaathi: {
    'Study Notes': {
      opener: "Which drug class or pharmacology topic should we cover? Tell me and I'll make structured notes with mechanisms and key drugs.",
      description: 'Drug mechanisms, pharmacokinetics, and clinical notes',
      starters: [
        'Notes on NSAIDs — mechanism, uses, and side effects',
        'Explain pharmacokinetics: ADME with examples',
        'Summarise antihypertensive drug classes',
        'Notes on antibiotics — mechanism and resistance',
      ],
    },
    'Exam Prep': {
      opener: "GPAT, NIPER, or university exams? Tell me which one and I'll quiz you on the topics that matter most.",
      description: 'GPAT-style MCQs, drug identification, and pharmacology mock tests',
      starters: [
        'Quiz me on GPAT-style pharmacology questions',
        'Give me 5 questions on pharmaceutical chemistry',
        'Test me on drug-drug interactions',
        'High-yield topics for NIPER entrance exam',
      ],
    },
    'Interest Explorer': {
      opener: "Pharmacy opens doors well beyond the dispensing counter. What direction are you curious about?",
      description: 'Explore pharma careers — R&D, clinical trials, regulatory, and more',
      starters: [
        'What does a pharmacologist in drug discovery actually do?',
        'Explain the clinical trial process from Phase I to approval',
        'What is pharmacovigilance and what careers does it offer?',
        'Tell me about regulatory affairs as a pharma career',
      ],
      possibilityPrompt: 'How is pharmacy connected to the future of healthcare — and who gets to shape that future?',
    },
    'UPSC Saathi': {
      opener: "Pharmacy and drug policy appear in UPSC Health and Science sections. Tell me which topic you want to tackle.",
      description: 'Drug policy, public health, and science topics for UPSC',
      starters: [
        'Explain essential medicines policy for a UPSC answer',
        'How do counterfeit drugs appear in UPSC GS2 Health?',
        'Key drug regulatory topics for UPSC Science & Tech',
        "Draft a model answer on India's pharmaceutical industry",
      ],
    },
    'Citizen Guide': {
      opener: "Ask me about any medicine, supplement, or drug interaction — I'll give you a clear and honest answer.",
      description: 'Medicines and health products explained in plain language',
      starters: [
        'Is it safe to take paracetamol and ibuprofen together?',
        'What should I check before buying an OTC medicine?',
        'Explain what generic medicines are — are they as effective?',
        'How do I read a drug label and its instructions correctly?',
      ],
    },
  },

  archsaathi: {
    'Study Notes': {
      opener: "Which architecture topic should we build notes on? Tell me the subject and I'll structure it with theory, history, and application.",
      description: 'Structured notes on architectural theory, history, and design',
      starters: [
        'Notes on the five orders of classical architecture',
        'Explain passive solar design principles',
        'Summarise the works and philosophy of Le Corbusier',
        'Notes on structural systems — frames, shells, membranes',
      ],
    },
    'Exam Prep': {
      opener: "NATA, GATE Architecture, or university finals? Tell me your target and I'll focus the preparation.",
      description: 'NATA/GATE Q&A, design theory, and past paper analysis',
      starters: [
        'Quiz me on architectural history for GATE AR',
        'Give me 5 questions on building materials and construction',
        'High-yield topics for NATA entrance exam',
        'Test my knowledge on climate-responsive design',
      ],
    },
    'Interest Explorer': {
      opener: "Architecture spans heritage, sustainability, urban design, and technology. What direction pulls you most?",
      description: 'Explore architecture careers and emerging fields',
      starters: [
        'What is parametric design and how is it changing architecture?',
        'Tell me about urban design as a career separate from architecture',
        'What does a career in heritage conservation involve?',
        'How is sustainable architecture different from green building?',
      ],
      possibilityPrompt: 'What does an architect design that outlasts everything they know today?',
    },
    'UPSC Saathi': {
      opener: "Architecture and urban heritage appear in UPSC GS1 and optional. Tell me your focus and we'll build on it.",
      description: 'Architecture and heritage for UPSC GS1 and optional',
      starters: [
        'Key architectural heritage topics for UPSC GS1',
        "Draft a model answer on India's urban planning challenges",
        'Explain smart cities and sustainable infrastructure for UPSC',
        'How does colonial architecture appear in UPSC Indian history?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me about any building, space, or urban design question — I'll explain what makes it work or fail.",
      description: 'Architecture and design explained for everyday spaces',
      starters: [
        'What makes a city walkable — what do architects plan for?',
        'Explain Vastu Shastra — is there science behind it?',
        'What should I look for when evaluating a flat or house?',
        'How do architects design buildings for earthquake safety?',
      ],
    },
  },

  bizsaathi: {
    'Study Notes': {
      opener: "Which business or management topic should we build notes on? Tell me the subject and I'll structure it for exams and real-world application.",
      description: 'Structured notes on management, strategy, and business concepts',
      starters: [
        "Notes on Porter's Five Forces with a real company example",
        'Explain organisational behaviour — motivation theories',
        'Summarise PESTLE and SWOT analysis frameworks',
        'Notes on supply chain management fundamentals',
      ],
    },
    'Exam Prep': {
      opener: "CAT, XAT, MBA finals, or placement interviews? Tell me the context and I'll quiz you the right way.",
      description: 'MBA entrance prep, case interview practice, and mock Q&A',
      starters: [
        'Give me a case interview to solve — product strategy',
        'Quiz me on quantitative aptitude for CAT',
        'High-yield topics for MBA Strategic Management exams',
        'Practise a PI question: "Why MBA and why now?"',
      ],
    },
    'Interest Explorer': {
      opener: "Business has many directions — entrepreneurship, consulting, operations, and more. What pulls you most?",
      description: 'Explore business careers, startup ecosystems, and emerging models',
      starters: [
        'What does a management consultant actually do?',
        "Explain the startup ecosystem in India — funding stages",
        'What is design thinking and how do businesses use it?',
        'Tell me about social enterprise as a business model',
      ],
      possibilityPrompt: 'What can a business student build in India that the world has not seen yet?',
    },
    'UPSC Saathi': {
      opener: "Business and economy overlap heavily in UPSC GS3 and optional. Tell me your focus area and we'll build on it.",
      description: 'Business and economy for UPSC GS3 and management optional',
      starters: [
        'Key industrial policy topics for UPSC GS3',
        'Draft a model answer on Make in India and its outcomes',
        'How does corporate governance appear in UPSC?',
        "Explain India's startup ecosystem for a UPSC answer",
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any business question — how companies work, how markets function, or how to start something of your own.",
      description: 'Business and markets explained for everyone',
      starters: [
        'How does a company actually make and use profit?',
        'Explain what a startup unicorn means and how they get there',
        'What is a franchise and how does it work?',
        'How do I legally register a small business in India?',
      ],
    },
  },

  civilsaathi: {
    'Study Notes': {
      opener: "Which civil engineering topic should we build notes on? Tell me the chapter and I'll structure it clearly.",
      description: 'Structured notes on structures, geotechnics, and construction',
      starters: [
        'Notes on reinforced concrete design — beams and slabs',
        "Explain soil classification and Mohr's circle",
        "Summarise open channel flow and Manning's equation",
        'Notes on critical path method in project management',
      ],
    },
    'Exam Prep': {
      opener: "GATE Civil, ESE, or state PSC? Tell me your target exam and I'll focus the preparation correctly.",
      description: 'GATE-style Q&A, numerical problems, and past paper analysis',
      starters: [
        'Quiz me on structural analysis — GATE level',
        'Give me 5 numerical problems on fluid mechanics',
        'High-yield topics for GATE Civil Engineering',
        'Test my knowledge on transportation engineering',
      ],
    },
    'Interest Explorer': {
      opener: "Civil engineering is at the heart of climate, infrastructure, and urban development. What direction interests you?",
      description: 'Explore civil engineering careers — infrastructure, urban planning, sustainability',
      starters: [
        'What is sustainable construction and what careers does it offer?',
        'Tell me about urban infrastructure planning as a career',
        'How is AI being used in structural engineering?',
        'What does a career in water resources engineering look like?',
      ],
      possibilityPrompt: 'What would you build if you had the power to redesign how a city works?',
    },
    'UPSC Saathi': {
      opener: "Civil Engineering optional is demanding but high-scoring. Tell me your preparation focus and we'll build on it.",
      description: 'Civil Engineering optional strategy and ESE preparation',
      starters: [
        'Break down the UPSC Civil Engineering optional syllabus',
        'Which Paper II topics carry maximum marks?',
        'Draft a model answer on smart cities and infrastructure',
        'Key topics from Civil Engineering for UPSC technical services',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how any infrastructure, building, or public works system works — I'll explain it in plain terms.",
      description: 'Infrastructure and construction explained for everyday understanding',
      starters: [
        'How are large bridges designed to handle earthquakes?',
        'Explain how a metro rail tunnel is built underground',
        'What is a smart city — what makes it different?',
        'How do dams manage floods and store water safely?',
      ],
    },
  },

  compsaathi: {
    'Study Notes': {
      opener: "Which topic or concept should we build notes on? Share it and I'll break it down with code where it helps.",
      description: 'Structured CS notes with code examples and complexity analysis',
      starters: [
        'Notes on binary search trees with code',
        'Explain time and space complexity with examples',
        'Summarise OS concepts — process vs thread, scheduling',
        'Notes on SQL joins with worked query examples',
      ],
    },
    'Exam Prep': {
      opener: "GATE CS, university exams, or placement prep? Tell me which one and I'll target exactly the right questions.",
      description: 'GATE-style MCQs, placement problems, and mock coding rounds',
      starters: [
        'Quiz me on data structures — GATE level',
        'Give me 5 dynamic programming problems to solve',
        'What are the most common placement coding patterns?',
        'Test my knowledge on computer networks',
      ],
    },
    'Interest Explorer': {
      opener: "Computer science branches in every direction. Tell me what excites you most and I'll map out where it leads.",
      description: 'Explore CS career paths, emerging fields, and real-world projects',
      starters: [
        'What is systems programming and who should learn it?',
        'Explain the difference between ML, AI, and data science careers',
        'What is open source contribution and how do I start?',
        'Tell me about cybersecurity as a career path',
      ],
      possibilityPrompt: 'What can someone who truly understands computing build that changes how a billion people live?',
    },
    'UPSC Saathi': {
      opener: "CS and IT topics appear in UPSC GS3 and Science & Tech. Tell me which section you want to strengthen.",
      description: 'CS concepts for UPSC GS3, Science & Tech, and optional',
      starters: [
        'Explain cybersecurity for a UPSC Science & Tech answer',
        'Key technology policy topics for UPSC GS3',
        'Draft a model answer on artificial intelligence governance',
        'How does IT appear in UPSC economic development questions?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about technology, apps, or the internet — I'll explain it without the jargon.",
      description: 'Technology explained for everyday life and digital safety',
      starters: [
        'How do passwords and encryption actually protect me?',
        'What is UPI and how is it technically different from NEFT?',
        'Explain how apps track my location — and how to stop it',
        'What is the cloud and where is my data actually stored?',
      ],
    },
  },

  econsaathi: {
    'Study Notes': {
      opener: "Which economics topic should we build notes on — micro, macro, or Indian economy? Tell me and we'll start.",
      description: 'Structured notes on micro, macro, and Indian economic policy',
      starters: [
        'Notes on price elasticity of demand with examples',
        'Explain Keynesian vs Monetarist economics',
        "Summarise India's fiscal deficit — causes and consequences",
        'Notes on game theory with real-world examples',
      ],
    },
    'Exam Prep': {
      opener: "Economics for CA, UPSC, or university finals? Tell me which exam and I'll target the right concepts and question types.",
      description: 'MCQs, case study Q&A, and past paper practice',
      starters: [
        'Quiz me on microeconomics fundamentals',
        'Give me 5 questions on monetary policy',
        'Test my knowledge on international trade theory',
        'High-yield topics for Economics honours exams',
      ],
    },
    'Interest Explorer': {
      opener: "Economics is everywhere — in policy, business, and everyday decisions. What angle intrigues you most?",
      description: 'Explore behavioural economics, policy, and research careers',
      starters: [
        'What is behavioural economics and how does it change policy?',
        'Explain how central banks actually control inflation',
        'What careers open up with an economics degree beyond teaching?',
        'Tell me about development economics as a research field',
      ],
      possibilityPrompt: 'How is what you are studying connected to decisions that shape the lives of millions?',
    },
    'UPSC Saathi': {
      opener: "Economics is central to UPSC — GS3 and optional. Tell me your focus area and I'll structure the preparation.",
      description: 'Indian economy, GS3 strategy, and Economics optional preparation',
      starters: [
        "Key Indian economy topics for UPSC Prelims",
        "Draft a model answer on India's current account deficit",
        'How should I approach the Economics optional Paper I?',
        'Explain inflation targeting for a UPSC Mains answer',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any economics question about money, prices, jobs, or the budget — I'll explain it plainly.",
      description: 'Economics explained for everyday financial and policy decisions',
      starters: [
        'Why does inflation go up when the government prints money?',
        'What does the RBI repo rate change mean for my EMI?',
        'Explain the Union Budget — who decides how money is spent?',
        'Why do some countries stay poor despite natural resources?',
      ],
    },
  },

  elecsaathi: {
    'Study Notes': {
      opener: "Which electrical engineering topic should we tackle? Give me the chapter and I'll structure it with equations and examples.",
      description: 'Structured notes on power systems, machines, and circuits',
      starters: [
        'Notes on transformer equivalent circuits and losses',
        'Explain power factor and its correction methods',
        'Summarise synchronous machine operation and phasor diagrams',
        'Notes on protection systems — overcurrent and differential relays',
      ],
    },
    'Exam Prep': {
      opener: "GATE EE, ESE, or state PSE exams? Tell me your target and I'll structure the questions correctly.",
      description: 'GATE EE-style Q&A, numerical problems, and past paper analysis',
      starters: [
        'Quiz me on circuit analysis — GATE level',
        'Give me 5 problems on electrical machines',
        'High-yield topics for GATE Electrical Engineering',
        'Test my knowledge on control systems',
      ],
    },
    'Interest Explorer': {
      opener: "Electrical engineering is central to the energy transition and smart technology. What excites you most?",
      description: 'Explore power, renewables, smart grids, and EV careers',
      starters: [
        'What does a career in renewable energy systems look like?',
        'Explain smart grids — how are they different from current power grids?',
        'Tell me about power electronics and its role in EVs',
        "What is the future of electrical engineering in India's grid?",
      ],
      possibilityPrompt: 'What device or system will your generation build that does not exist yet?',
    },
    'UPSC Saathi': {
      opener: "Electrical Engineering is a strong UPSC optional. Tell me your preparation stage and we'll focus on what matters most.",
      description: 'Electrical Engineering optional and ESE preparation',
      starters: [
        'Break down the UPSC EE optional syllabus',
        'Which Paper I topics give maximum marks?',
        "Draft a model answer on India's power sector challenges",
        'Key topics from EE for UPSC Engineering Services',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how electricity, power cuts, or any electrical system works — I'll explain it simply.",
      description: 'How electrical systems work — explained for everyday life',
      starters: [
        'Why do we get power cuts and how does the grid actually work?',
        'Explain solar panels — how do they convert sunlight to electricity?',
        'What is a circuit breaker and why does it trip?',
        'How does wireless charging work?',
      ],
    },
  },

  envirosaathi: {
    'Study Notes': {
      opener: "Which environmental topic should we build notes on? Tell me the chapter and I'll cover the science and policy together.",
      description: 'Structured notes on ecology, environmental science, and policy',
      starters: [
        'Notes on the carbon cycle and climate feedback loops',
        'Explain eutrophication — causes, effects, and remediation',
        "Summarise India's key environmental laws — EPA, Forest Act, Wildlife Act",
        'Notes on biodiversity — hotspots, threats, and conservation strategies',
      ],
    },
    'Exam Prep': {
      opener: "NET Environmental Science, GATE EY, or university exams? Tell me which one and I'll target the right topics.",
      description: 'MCQs, case studies, and past paper practice for environmental science',
      starters: [
        'Quiz me on ecology and ecosystems for GATE EY',
        'Give me 5 questions on pollution control and monitoring',
        'High-yield topics for NET Environmental Science',
        'Test me on environmental impact assessment',
      ],
    },
    'Interest Explorer': {
      opener: "Environmental careers are growing fast — in policy, research, consulting, and activism. What direction interests you?",
      description: 'Explore careers in conservation, climate policy, and sustainability',
      starters: [
        'What does an environmental consultant actually do?',
        'Tell me about climate policy careers in India and internationally',
        'What is environmental law and how do I specialise in it?',
        'Explain carbon markets and green finance as career areas',
      ],
      possibilityPrompt: 'What is the most urgent problem an environmental engineer from India could solve?',
    },
    'UPSC Saathi': {
      opener: "Environment is one of the highest-scoring UPSC Prelims sections. Tell me your weak areas and we'll target them.",
      description: 'Environment and ecology for UPSC Prelims, Mains, and optional',
      starters: [
        'Key ecology topics for UPSC Prelims Environment section',
        "Draft a model answer on India's climate commitments at COP",
        'Explain recent national parks and biosphere reserves for UPSC',
        'Key environmental conventions India has signed',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any question about climate, pollution, or environmental issues — I'll explain the science and what it means for you.",
      description: 'Environment and climate explained for everyday decisions',
      starters: [
        'Explain climate change — what is actually happening and how fast?',
        "What causes Delhi's air pollution and what can be done?",
        'How do my daily choices affect the environment — practically?',
        'What is the difference between weather and climate?',
      ],
    },
  },

  finsaathi: {
    'Study Notes': {
      opener: "Which finance topic should we cover — CA, CFA, or corporate finance? Tell me the chapter and I'll structure it clearly.",
      description: 'Structured notes on financial accounting, taxation, and markets',
      starters: [
        'Notes on AS vs Ind AS — key differences',
        'Explain capital budgeting: NPV, IRR, and Payback Period',
        'Summarise GST — input tax credit and filing',
        'Notes on derivatives: futures, options, and their pricing',
      ],
    },
    'Exam Prep': {
      opener: "CA, CMA, CFA, or university finals? Tell me which exam and paper — I'll quiz you at the right level.",
      description: 'CA/CFA-style MCQs, case studies, and problem solving',
      starters: [
        'Quiz me on CA Foundation Accounts',
        'Give me 5 case-based questions on financial analysis',
        'High-yield topics for CA Intermediate Taxation',
        'Test me on SEBI regulations and securities law',
      ],
    },
    'Interest Explorer': {
      opener: "Finance opens many directions — markets, investment banking, fintech, and more. What excites you most?",
      description: 'Explore finance careers — investment banking, fintech, and wealth management',
      starters: [
        'What does an investment banker actually do day to day?',
        'Explain fintech — how is it disrupting traditional banking?',
        'What is private equity and how does it differ from VC?',
        'Tell me about algorithmic trading as a career',
      ],
      possibilityPrompt: 'How is what you are studying connected to the future of how India builds wealth?',
    },
    'UPSC Saathi': {
      opener: "Finance and taxation appear throughout UPSC GS3 and optional. Tell me your focus and we'll go deep.",
      description: 'Finance topics for UPSC GS3, Budget analysis, and optional',
      starters: [
        "Explain India's direct tax structure for UPSC GS3",
        'Draft a model answer on the fiscal consolidation roadmap',
        'Key Budget topics every UPSC aspirant must understand',
        'How does SEBI and financial regulation appear in UPSC?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any finance or money question — investments, taxes, loans, or savings. I'll explain it clearly.",
      description: 'Personal finance and taxes explained in plain language',
      starters: [
        'How should I start investing as a salaried person?',
        'Explain mutual funds vs stocks — which is better for me?',
        'How do I file my own ITR without a CA?',
        'What is a credit score and how do I improve mine?',
      ],
    },
  },

  historysaathi: {
    'Study Notes': {
      opener: "Which period or event should we build notes on? Tell me the topic and I'll structure it with causes, events, and consequences.",
      description: 'Structured notes on Indian and world history — causes, events, impact',
      starters: [
        'Notes on the causes and consequences of the 1857 revolt',
        'Explain the rise and fall of the Mughal Empire',
        'Summarise the Non-Cooperation Movement — causes and outcome',
        'Notes on the Cold War — origins, phases, and end',
      ],
    },
    'Exam Prep': {
      opener: "UPSC, university history exams, or NET JRF? Tell me which one and I'll target the right patterns.",
      description: 'Essay questions, source analysis, and past paper practice',
      starters: [
        'Quiz me on modern Indian history for UPSC Prelims',
        'Give me 5 questions on medieval history',
        'Test me on world history — French Revolution to Cold War',
        'High-yield history topics for UPSC Mains GS1',
      ],
    },
    'Interest Explorer': {
      opener: "History connects directly to politics, identity, and current events. Which thread makes you want to pull deeper?",
      description: 'Explore historiography, archives, and research careers in history',
      starters: [
        'What is historiography and why do historians disagree?',
        'Explain how oral history preserves voices that archives miss',
        'What careers does a history degree open beyond teaching?',
        'Tell me about digital humanities as a research frontier',
      ],
      possibilityPrompt: 'What can someone who understands how the world changed build, lead, or create?',
    },
    'UPSC Saathi': {
      opener: "History runs through UPSC GS1 and is a strong optional. Tell me your focus — ancient, medieval, or modern — and we'll build from there.",
      description: 'History for UPSC GS1, optional strategy, and answer writing',
      starters: [
        'Key modern Indian history topics for UPSC Prelims',
        'Draft a 250-word answer on the socio-religious reform movements',
        'How should I structure a History optional answer?',
        'Explain post-independence India for UPSC GS1 Mains',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me about any historical event, period, or figure — I'll explain what happened and why it still matters today.",
      description: 'History explained in context — why the past shapes the present',
      starters: [
        'What caused partition — and why did it happen the way it did?',
        'Explain the Emergency of 1975 in simple terms',
        "How did colonialism shape India's current economy?",
        'What is the significance of the Constituent Assembly debates?',
      ],
    },
  },

  hrsaathi: {
    'Study Notes': {
      opener: "Which HR or organisational behaviour topic should we build notes on? Tell me the chapter and I'll structure it clearly.",
      description: 'Structured notes on HR management, labour law, and OB',
      starters: [
        'Notes on performance appraisal systems and their limitations',
        "Explain Herzberg's two-factor theory with examples",
        'Summarise the Industrial Disputes Act — key provisions',
        'Notes on talent acquisition — from JD to onboarding',
      ],
    },
    'Exam Prep': {
      opener: "MBA HR exams, NET Management, or placement interviews? Tell me your context and I'll target the right questions.",
      description: 'Case-based Q&A, MCQs, and HR interview prep',
      starters: [
        'Quiz me on organisational behaviour concepts',
        'Give me 5 HR case study questions to solve',
        'High-yield topics for NET Management Paper II',
        'Practise an HR interview: "Tell me about a conflict you resolved"',
      ],
    },
    'Interest Explorer': {
      opener: "HR is evolving fast — people analytics, DEI, remote work, and more. What direction interests you most?",
      description: 'Explore HR careers — people analytics, L&D, DEI, and HRBP roles',
      starters: [
        'What is people analytics and what tools do HR teams use?',
        'Tell me about DEI roles — what do they actually involve?',
        'What is an HRBP and how is it different from traditional HR?',
        'How is HR changing with remote and hybrid work models?',
      ],
      possibilityPrompt: 'What does the future of human work look like — and who gets to design it?',
    },
    'UPSC Saathi': {
      opener: "HR concepts appear in UPSC Public Administration and General Studies. Tell me your focus and we'll build on it.",
      description: 'HR and public administration for UPSC optional and GS',
      starters: [
        'Key public administration topics for UPSC GS2',
        'Draft a model answer on civil service reforms in India',
        'Explain motivation theories in a UPSC HR context',
        'How does labour law appear in UPSC Social Justice topics?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about workplace rights, job offers, or how organisations work — I'll explain it plainly.",
      description: 'Workplace rights and employment explained for everyone',
      starters: [
        'What are my legal rights as an employee in India?',
        'How do I negotiate a salary without damaging the relationship?',
        'What should I check in an employment contract before signing?',
        'Explain PF, ESI, and gratuity — how do they work?',
      ],
    },
  },

  mechsaathi: {
    'Study Notes': {
      opener: "Which mechanical engineering topic should we cover? Give me the chapter and I'll build structured notes with diagrams described clearly.",
      description: 'Structured notes on thermodynamics, mechanics, and manufacturing',
      starters: [
        'Notes on the Carnot cycle and thermal efficiency',
        'Explain shear force and bending moment diagrams',
        'Summarise types of bearings and their applications',
        'Notes on CNC machining — operations and tools',
      ],
    },
    'Exam Prep': {
      opener: "GATE Mechanical, ESE, or university exams? Tell me the target and I'll quiz you at the right level.",
      description: 'GATE-style numerical and conceptual Q&A for Mechanical Engineering',
      starters: [
        'Give me 5 GATE-level questions on fluid mechanics',
        'Quiz me on thermodynamics — numerical problems',
        'Test my knowledge on theory of machines',
        'High-yield topics for GATE Mechanical Engineering',
      ],
    },
    'Interest Explorer': {
      opener: "Mechanical engineering spans robotics, aerospace, energy, and more. What direction are you drawn to?",
      description: 'Explore mechanical engineering careers and emerging fields',
      starters: [
        'What is mechatronics and what careers does it lead to?',
        'Tell me about additive manufacturing and 3D printing careers',
        'How is mechanical engineering used in electric vehicles?',
        'What does a career in renewable energy look like for an ME?',
      ],
      possibilityPrompt: 'What machine has not been built yet that a mechanical engineer from your generation should build?',
    },
    'UPSC Saathi': {
      opener: "Mechanical engineering appears in UPSC technical services and ESE. Tell me your exam focus and we'll plan.",
      description: 'Mechanical Engineering optional and ESE preparation',
      starters: [
        'Break down the UPSC Engineering Services Mechanical syllabus',
        'Which topics are highest-scoring in ME optional Paper I?',
        'Draft a model answer on renewable energy from an engineering lens',
        'Key manufacturing topics for UPSC technical exams',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how any machine, vehicle, or engineering system works — I'll explain it clearly.",
      description: 'How machines and engineering systems work — explained simply',
      starters: [
        'How does a car engine actually work?',
        "Explain why bridges don't collapse under heavy load",
        'How does an air conditioner remove heat from a room?',
        'What is a heat pump and why is it more efficient than a heater?',
      ],
    },
  },

  medicosaathi: {
    'Study Notes': {
      opener: "Which subject or system should we build notes on? Tell me the topic and I'll structure it the way medical exams expect.",
      description: 'Structured clinical notes — anatomy, physiology, pathology, pharmacology',
      starters: [
        'Notes on the cardiac cycle and heart sounds',
        'Explain the coagulation cascade step by step',
        'Summarise the pharmacology of beta blockers',
        'Notes on glomerulonephritis — types and distinguishing features',
      ],
    },
    'Exam Prep': {
      opener: "NEET PG, USMLE, or university professionals? Tell me which exam and stage — I'll quiz you with clinical vignettes.",
      description: 'Clinical MCQs, vignette-style Q&A, and high-yield topic lists',
      starters: [
        'Quiz me on medicine with NEET PG style questions',
        'Give me 5 high-yield surgery questions',
        'What are the most tested topics in Pharmacology?',
        'Test me on Paediatrics with clinical vignettes',
      ],
    },
    'Interest Explorer': {
      opener: "Medicine has dozens of directions beyond clinical practice. Which area makes you want to explore more?",
      description: 'Explore medical specialties, research, and non-clinical careers',
      starters: [
        'Compare cardiology vs cardiothoracic surgery as careers',
        'What is translational research and how do clinicians get into it?',
        'Tell me about medical AI and radiology as a future specialty',
        'What does a career in global health actually look like?',
      ],
      possibilityPrompt: 'What will medicine in India look like when the students studying it today become the doctors?',
    },
    'UPSC Saathi': {
      opener: "UPSC Medical Science optional is detailed but high-scoring. Tell me your paper focus and we'll structure your preparation.",
      description: 'Medical Science optional strategy and answer writing',
      starters: [
        'Break down the UPSC Medical Science optional syllabus',
        'Draft a model answer on typhoid fever — clinical and public health',
        'Which Paper I topics carry maximum marks?',
        'Explain health policy topics for UPSC GS2',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any health question — symptoms, medications, or how your body works. I'll explain it clearly.",
      description: 'Health and medicine explained in plain language',
      starters: [
        'Explain what happens in my body during a fever',
        'When should I worry about chest pain?',
        'What does my blood test report actually mean?',
        'Explain diabetes — Type 1 vs Type 2 in simple terms',
      ],
    },
  },

  mktsaathi: {
    'Study Notes': {
      opener: "Which marketing topic should we build notes on? Tell me the chapter and I'll structure it with theory and real examples.",
      description: 'Structured notes on marketing strategy, consumer behaviour, and digital',
      starters: [
        'Notes on the 4Ps and 7Ps of marketing with examples',
        'Explain consumer decision-making process — stages and influences',
        'Summarise STP — segmentation, targeting, and positioning',
        'Notes on digital marketing — SEO, SEM, and content strategy',
      ],
    },
    'Exam Prep': {
      opener: "MBA Marketing exams, CAT, or placement interviews? Tell me your context and I'll target the preparation.",
      description: 'Case-based Q&A, brand strategy problems, and MBA exam prep',
      starters: [
        'Give me a marketing case to solve — product launch scenario',
        'Quiz me on consumer behaviour concepts',
        'High-yield topics for MBA Marketing exams',
        'Practise a marketing interview: "How would you market a pen to me?"',
      ],
    },
    'Interest Explorer': {
      opener: "Marketing touches brand strategy, data, creativity, and consumer psychology. What direction interests you most?",
      description: 'Explore marketing careers — brand management, growth, and digital',
      starters: [
        'What does a brand manager actually do day to day?',
        'Tell me about growth hacking and product marketing',
        'What is performance marketing and how is it different from brand?',
        'How is AI changing marketing — tools, roles, and risks?',
      ],
      possibilityPrompt: 'What brand could you build that changes how India sees itself?',
    },
    'UPSC Saathi': {
      opener: "Marketing and advertising policy appear in UPSC Economics and GS3. Tell me your focus area and we'll build on it.",
      description: 'Marketing and consumer policy for UPSC GS and optional',
      starters: [
        "How does marketing regulation appear in UPSC Consumer Affairs topics?",
        "Key topics on India's digital economy for UPSC GS3",
        "Draft a model answer on e-commerce policy in India",
        "Explain FMCG and its role in India's rural economy",
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how advertising, pricing, or marketing actually works — I'll explain the techniques being used on you.",
      description: 'How marketing and advertising work — explained for consumers',
      starters: [
        'How do companies decide the price of a product?',
        'Explain how social media advertising targets me specifically',
        'What is a dark pattern — how do apps manipulate my choices?',
        'How do loyalty programmes actually make companies money?',
      ],
    },
  },

  nursingsaathi: {
    'Study Notes': {
      opener: "Which nursing topic should we cover? Tell me the subject or procedure and I'll structure it clearly for clinical and exam use.",
      description: 'Structured clinical nursing notes — procedures, pharmacology, and care plans',
      starters: [
        'Notes on the nursing process — ADPIE with a clinical example',
        'Explain IV fluid management — types and indications',
        'Summarise post-operative nursing care essentials',
        'Notes on medication administration — 5 rights and error prevention',
      ],
    },
    'Exam Prep': {
      opener: "NCLEX, AIIMS Nursing, or university finals? Tell me your target exam and I'll focus the practice questions.",
      description: 'Clinical Q&A, NCLEX-style questions, and exam pattern practice',
      starters: [
        'Quiz me on medical-surgical nursing — NCLEX style',
        'Give me 5 questions on paediatric nursing care',
        'High-yield pharmacology topics for nursing exams',
        'Test me on maternal and obstetric nursing',
      ],
    },
    'Interest Explorer': {
      opener: "Nursing has many paths — critical care, community health, education, and leadership. What direction interests you?",
      description: 'Explore nursing specialties and advanced practice careers',
      starters: [
        'What is a Nurse Practitioner and how do I become one in India?',
        'Tell me about critical care and ICU nursing as a specialty',
        'What does a career in community and public health nursing look like?',
        'How is nursing education and research evolving in India?',
      ],
      possibilityPrompt: 'What is the most important thing a nurse can become beyond bedside care?',
    },
    'UPSC Saathi': {
      opener: "Public health and nursing policy appear in UPSC GS2 and Health optional. Tell me your focus area.",
      description: 'Public health nursing and health policy for UPSC',
      starters: [
        "How does public health nursing appear in UPSC GS2 Health topics?",
        "Draft a model answer on India's primary health care system",
        "Key national health programmes every UPSC aspirant must know",
        "Explain the role of ASHA workers in India's health policy",
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any question about healthcare, patient care, or how hospitals work — I'll explain it clearly.",
      description: 'Healthcare and patient rights explained in plain language',
      starters: [
        'What questions should I ask before any surgical procedure?',
        'Explain what nurses actually do in an ICU',
        'What are my rights as a patient in an Indian hospital?',
        'How do I manage a wound at home before seeing a doctor?',
      ],
    },
  },

  psychsaathi: {
    'Study Notes': {
      opener: "Which psychology topic should we build notes on? Tell me the chapter and I'll structure it with theory, research, and application.",
      description: 'Structured notes on psychological theory, research, and clinical concepts',
      starters: [
        'Notes on attachment theory — Bowlby and Ainsworth',
        'Explain cognitive dissonance with real examples',
        'Summarise Freudian defence mechanisms with examples',
        'Notes on the DSM diagnostic criteria for depression',
      ],
    },
    'Exam Prep': {
      opener: "University exams, NET JRF, or NIMHANS entrance? Tell me which one and I'll target the right questions.",
      description: 'MCQs, case vignettes, and past paper practice for psychology',
      starters: [
        'Quiz me on research methods in psychology',
        'Give me 5 questions on abnormal psychology',
        'High-yield topics for NET Psychology Paper II',
        'Test me on neuropsychology and brain-behaviour relations',
      ],
    },
    'Interest Explorer': {
      opener: "Psychology branches into clinical, industrial, neuroscience, and policy. What direction interests you most?",
      description: 'Explore psychology careers — clinical, research, I/O, and counselling',
      starters: [
        'What is the difference between a psychologist and a psychiatrist in India?',
        'Tell me about neuropsychology as a research and clinical career',
        'What is organisational psychology and what does it involve?',
        'How do I get into clinical psychology in India — RCI, NIMHANS, etc.?',
      ],
      possibilityPrompt: 'What could a psychology student build that makes India measurably mentally healthier?',
    },
    'UPSC Saathi': {
      opener: "Psychology is a strong UPSC optional and appears in GS4 Ethics. Tell me your preparation area and we'll focus.",
      description: 'Psychology optional strategy, GS4 ethics, and answer writing',
      starters: [
        'Break down the UPSC Psychology optional syllabus',
        'How does psychology appear in UPSC GS4 Ethics and Integrity?',
        'Draft a model answer on emotional intelligence for UPSC',
        'Key social psychology topics for UPSC Mains',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me any question about the mind, emotions, relationships, or mental health — I'll explain it clearly.",
      description: 'Mental health and psychology explained for everyday life',
      starters: [
        'What is cognitive behavioural therapy and how does it work?',
        'Explain anxiety — what is happening in the brain and body?',
        'How do I know if I need to see a therapist?',
        'What is the difference between stress and burnout?',
      ],
    },
  },

  aerospacesaathi: {
    'Study Notes': {
      opener: "Which aerospace topic should we cover? Give me the subject and I'll build structured notes with equations where they help.",
      description: 'Structured notes on aerodynamics, propulsion, and orbital mechanics',
      starters: [
        "Notes on Bernoulli's principle and lift generation",
        'Explain the Tsiolkovsky rocket equation and its implications',
        'Summarise the types of aircraft engines and how they differ',
        "Notes on orbital mechanics — Kepler's laws and orbital transfers",
      ],
    },
    'Exam Prep': {
      opener: "GATE Aerospace, ISRO, or university exams? Tell me your target and I'll structure the questions correctly.",
      description: 'GATE AE-style Q&A, numerical problems, and past paper analysis',
      starters: [
        'Quiz me on aerodynamics — GATE AE level',
        'Give me 5 numerical problems on propulsion',
        'High-yield topics for GATE Aerospace Engineering',
        'Test me on structures and materials for aerospace',
      ],
    },
    'Interest Explorer': {
      opener: "Aerospace is expanding into space commercialisation, drones, and defence. What area pulls you most?",
      description: "Explore aerospace careers — ISRO, defence, commercial space, and UAVs",
      starters: [
        'What does a career at ISRO look like — how do I get there?',
        "Tell me about the commercial space industry and India's role",
        'What is the future of drone technology and UAV careers?',
        "How is India's defence aerospace sector growing?",
      ],
      possibilityPrompt: 'What is the most ambitious thing an aerospace student from India could do in the next 20 years?',
    },
    'UPSC Saathi': {
      opener: "Space and defence technology appear in UPSC Science & Tech and Security. Tell me your focus area.",
      description: 'Space technology and defence for UPSC GS3 and Science & Tech',
      starters: [
        'Key ISRO missions every UPSC aspirant must know',
        "Draft a model answer on India's space policy and future",
        'How does defence technology appear in UPSC Internal Security?',
        "Explain India's anti-satellite test and its strategic implications",
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about space, flight, or aerospace technology — I'll explain how it actually works.",
      description: 'Space and flight technology explained in plain language',
      starters: [
        "How does a rocket actually escape Earth's gravity?",
        'Explain how satellites stay in orbit without falling',
        "What is the difference between ISRO and NASA's missions?",
        'How does GPS actually know where I am?',
      ],
    },
  },

  biotechsaathi: {
    'Study Notes': {
      opener: "Which biotechnology topic should we build notes on? Tell me the subject and I'll structure it with mechanisms and applications.",
      description: 'Structured notes on molecular biology, bioprocessing, and bioinformatics',
      starters: [
        'Notes on PCR — principle, types, and applications',
        'Explain recombinant DNA technology step by step',
        'Summarise monoclonal antibody production and uses',
        'Notes on bioreactor design and scale-up principles',
      ],
    },
    'Exam Prep': {
      opener: "GATE BT, CSIR-NET, or university exams? Tell me your target and I'll quiz you at the right level.",
      description: 'GATE BT-style MCQs, conceptual Q&A, and past paper analysis',
      starters: [
        'Quiz me on molecular biology for GATE BT',
        'Give me 5 questions on genetic engineering',
        'High-yield topics for CSIR-NET Life Sciences',
        'Test me on downstream processing in biotech',
      ],
    },
    'Interest Explorer': {
      opener: "Biotechnology is reshaping medicine, agriculture, and manufacturing. What direction makes you most curious?",
      description: 'Explore biotech careers — pharma, agri-biotech, bioinformatics, and startups',
      starters: [
        'What is synthetic biology and what can it create?',
        'Tell me about bioinformatics as a career — tools and opportunities',
        'What is the CRISPR agricultural revolution about?',
        'How is biotech changing cancer treatment right now?',
      ],
      possibilityPrompt: 'What could a biotech student from India invent that no one else has solved yet?',
    },
    'UPSC Saathi': {
      opener: "Biotechnology appears in UPSC Science & Tech and Agriculture. Tell me which section you want to strengthen.",
      description: 'Biotech for UPSC Science & Tech, Agriculture, and optional',
      starters: [
        'Key biotech topics for UPSC Science & Technology section',
        'Draft a model answer on GM crops and food security in India',
        'Explain biosafety regulations in India for a UPSC answer',
        'How does biofuel policy appear in UPSC Energy topics?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me about any biotech product, GMO, or medical advancement — I'll explain what's actually happening.",
      description: 'Biotechnology explained for health, food, and everyday decisions',
      starters: [
        'Are GMO foods safe — what does the science actually say?',
        'Explain gene therapy — how can genes be used to cure disease?',
        'What is a mRNA vaccine and how is it different from traditional vaccines?',
        'How is biotechnology used in the food I eat every day?',
      ],
    },
  },

  'chemengg-saathi': {
    'Study Notes': {
      opener: "Which chemical engineering topic should we cover? Tell me the chapter and I'll structure it with equations and process examples.",
      description: 'Structured notes on mass/heat transfer, reaction engineering, and process design',
      starters: [
        "Notes on Fick's Law and mass transfer coefficients",
        'Explain CSTR vs PFR — design equations and when to use each',
        'Summarise distillation column design principles',
        'Notes on heat exchanger types and LMTD method',
      ],
    },
    'Exam Prep': {
      opener: "GATE CH, PSU exams, or university finals? Tell me your target and I'll structure the questions correctly.",
      description: 'GATE CH-style Q&A, numerical problems, and past paper analysis',
      starters: [
        'Quiz me on fluid mechanics for GATE Chemical',
        'Give me 5 numerical problems on heat transfer',
        'High-yield topics for GATE CH',
        'Test me on chemical reaction engineering',
      ],
    },
    'Interest Explorer': {
      opener: "Chemical engineering spans energy, materials, pharmaceuticals, and sustainability. What direction interests you?",
      description: 'Explore ChemE careers — oil & gas, specialty chemicals, sustainability, and pharma',
      starters: [
        'What does a process engineer in the petrochemical industry do?',
        'Tell me about green chemical engineering and sustainable processes',
        'What is process safety engineering and what careers does it offer?',
        'How is chemical engineering used in pharmaceutical manufacturing?',
      ],
      possibilityPrompt: 'What process will your generation design that makes the previous generation say — we did not imagine this was possible?',
    },
    'UPSC Saathi': {
      opener: "Chemical engineering appears in UPSC technical services and ESE. Tell me your preparation focus and we'll build on it.",
      description: 'Chemical Engineering optional and ESE preparation',
      starters: [
        'Break down the UPSC Chemical Engineering optional syllabus',
        'Which Paper II topics carry maximum marks?',
        "Draft a model answer on India's chemical industry policy",
        'Key topics from ChemE for UPSC Engineering Services',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how chemical processes, industrial plants, or everyday chemicals work — I'll explain it clearly.",
      description: 'Chemical processes and industrial systems explained simply',
      starters: [
        'How is petrol made from crude oil in a refinery?',
        "Explain how plastic is made and why it doesn't break down",
        'How do water treatment plants make water safe to drink?',
        'What causes industrial accidents like gas leaks?',
      ],
    },
  },

  electronicssaathi: {
    'Study Notes': {
      opener: "Which electronics topic should we build notes on? Tell me the chapter and I'll structure it with circuit examples.",
      description: 'Structured notes on circuits, semiconductors, signals, and embedded systems',
      starters: [
        'Notes on MOSFET operation — regions and small signal model',
        'Explain op-amp configurations with gain equations',
        'Summarise Fourier analysis and its use in signal processing',
        'Notes on microcontroller architecture — registers, memory, peripherals',
      ],
    },
    'Exam Prep': {
      opener: "GATE EC, BARC, or university exams? Tell me your target and I'll structure the questions and difficulty correctly.",
      description: 'GATE EC-style Q&A, numerical problems, and past paper analysis',
      starters: [
        'Quiz me on analog circuits — GATE EC level',
        'Give me 5 questions on digital electronics',
        'High-yield topics for GATE Electronics and Communication',
        'Test me on electromagnetic theory',
      ],
    },
    'Interest Explorer': {
      opener: "Electronics is at the centre of IoT, semiconductors, and VLSI. What direction makes you curious?",
      description: 'Explore electronics careers — VLSI, embedded, RF, and semiconductor',
      starters: [
        'What is VLSI design and what does that career path look like?',
        'Tell me about embedded systems engineering as a career',
        'What is the semiconductor chip shortage really about?',
        "How is India building its own semiconductor ecosystem?",
      ],
      possibilityPrompt: 'What technology will electronics engineers from India build that redefines what a chip can do?',
    },
    'UPSC Saathi': {
      opener: "Electronics and telecom appear in UPSC Science & Tech and ESE. Tell me your focus area and we'll build on it.",
      description: 'Electronics and telecom for UPSC Science & Tech and Engineering Services',
      starters: [
        'Key electronics topics for UPSC Science & Technology GS',
        "Draft a model answer on India's semiconductor policy",
        'Break down the UPSC EC optional syllabus',
        'How does 5G policy appear in UPSC GS3 technology topics?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me how any electronic device, chip, or signal technology works — I'll explain it clearly.",
      description: 'How electronics and devices work — explained for everyday life',
      starters: [
        'How does a smartphone actually process information?',
        'Explain how Wi-Fi and 5G transmit data without wires',
        'What is a semiconductor chip and why is it so hard to make?',
        'How does noise-cancelling technology in headphones work?',
      ],
    },
  },

  physicsaathi: {
    'Study Notes': {
      opener: "Tell me which topic — mechanics, thermodynamics, optics, modern physics — and I'll build structured notes with the key equations and physical intuition behind each one.",
      description: 'Structured notes with derivations, worked examples, and exam patterns',
      starters: [
        'Make notes on Newton\'s Laws with derivations and examples',
        'Explain the key ideas in quantum mechanics for IIT JAM',
        'Notes on electromagnetic induction — Faraday to Maxwell',
        'Summarise thermodynamics for GATE PH preparation',
      ],
    },
    'Exam Prep': {
      opener: "Which Physics exam are you targeting — JEE, NEET, GATE PH, IIT JAM, or B.Sc university? Tell me and I'll quiz you the right way.",
      description: 'MCQs, numerical problems, and past paper patterns for Physics exams',
      starters: [
        'Quiz me on mechanics with JEE-level numericals',
        'Give me 5 tough questions on electromagnetic waves',
        'Where do students lose marks in GATE Physics?',
        'Past paper patterns for IIT JAM Physics',
      ],
    },
    'Interest Explorer': {
      opener: "Physics connects to every frontier — quantum computing, astrophysics, materials science, and beyond. What corner of physics excites you most?",
      description: 'Explore cutting-edge physics research, careers, and real-world applications',
      starters: [
        'What is quantum entanglement and why does it matter?',
        'How is physics being applied in Indian space missions?',
        'What careers open up with a Physics research background?',
        'Explain the standard model in plain language',
      ],
      possibilityPrompt: 'What does physics open up that most students who study it never find out about?',
    },
    'UPSC Saathi': {
      opener: "Physics appears in UPSC Science & Technology and sometimes Prelims. Tell me your preparation stage and we'll map the relevant topics.",
      description: 'Physics topics for UPSC GS3, Science & Technology, and answer writing',
      starters: [
        'How does Physics appear in UPSC GS3?',
        'Key Physics concepts behind ISRO and nuclear energy for UPSC',
        'Draft a model answer on India\'s nuclear programme',
        'How should I approach Science & Technology for Mains?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about how physics explains the world around you — from why the sky is blue to how MRI machines work.",
      description: 'Physics in everyday life — jargon-free, always',
      starters: [
        'Why does ice float on water?',
        'How does a microwave oven actually heat food?',
        'Explain nuclear energy in simple terms',
        'Why is GPS affected by relativity?',
      ],
    },
  },

  accountsaathi: {
    'Study Notes': {
      opener: "Tell me which accounting topic you're working on — financial statements, costing, audit, or GST — and I'll give you clear structured notes with the journal entries and logic.",
      description: 'Structured notes with journal entries, formats, and CA exam patterns',
      starters: [
        'Make notes on the accounting equation and double-entry system',
        'Explain depreciation methods with journal entries',
        'Notes on the Cash Flow Statement — format and logic',
        'Summarise partnership accounts for Class 12 / CA Foundation',
      ],
    },
    'Exam Prep': {
      opener: "Which exam are you preparing for — CA Foundation, CA Inter, Class 12, or CMA? Tell me and I'll quiz you with the right patterns and difficulty.",
      description: 'MCQs, problems, and past paper patterns for CA and commerce exams',
      starters: [
        'Quiz me on journal entries with MCQs',
        'Give me 3 Financial Statements problems at CA Foundation level',
        'What are common mistakes in CA Inter Accounts papers?',
        'Past paper patterns for CBSE Class 12 Accountancy',
      ],
    },
    'Interest Explorer': {
      opener: "Accounting connects to finance, audit, law, and technology. Tell me what direction interests you — I'll show you where it leads.",
      description: 'Explore CA, CMA, CFA careers, and the future of accounting',
      starters: [
        'What is the difference between CA, CMA, and CFA?',
        'How is accounting being changed by AI and automation?',
        'What is forensic accounting and how do I get into it?',
        'Explain how Big 4 firms work and what they look for',
      ],
      possibilityPrompt: 'How is what you are studying connected to the future of money — and who controls it?',
    },
    'UPSC Saathi': {
      opener: "Accounting and economics overlap significantly in UPSC. Let me help you map the relevant areas for GS3 and economics optional.",
      description: 'Accounting concepts for UPSC GS3, economic policy, and budget analysis',
      starters: [
        'How does accounting appear in UPSC GS3?',
        'Explain the Union Budget structure using accounting concepts',
        'Key fiscal deficit and CAD concepts for UPSC',
        'How should I approach Indian economy for Mains?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about money, accounts, or financial documents in plain language — no jargon.",
      description: 'Financial literacy — plain language for everyone',
      starters: [
        'What does a bank statement actually tell me?',
        'How do I understand a company\'s annual report?',
        'What is GST and how does it work in practice?',
        'Explain profit and loss in simple terms',
      ],
    },
  },

  polscisaathi: {
    'Study Notes': {
      opener: "Tell me which topic — Indian polity, political theory, comparative politics, or international relations — and I'll build you structured, exam-ready notes.",
      description: 'Structured notes on political theory, Indian polity, and global politics',
      starters: [
        'Make notes on the Preamble and Fundamental Rights',
        'Explain Federalism in India — cooperative and competitive',
        'Notes on Political Theory: Liberalism vs Socialism',
        'Summarise international relations theories for B.A / UPSC',
      ],
    },
    'Exam Prep': {
      opener: "Which exam are you preparing for — B.A semester, UPSC Prelims/Mains GS2, or PolSci optional? Tell me and I'll quiz you the right way.",
      description: 'MCQs, model answers, and past paper patterns for polity and UPSC',
      starters: [
        'Quiz me on the Indian Constitution with MCQs',
        'Give me 5 questions on Fundamental Rights vs Directive Principles',
        'What are the most commonly asked topics in UPSC GS2?',
        'Past paper patterns for UPSC Political Science optional',
      ],
    },
    'Interest Explorer': {
      opener: "Political science leads to law, diplomacy, journalism, civil services, and academia. What direction interests you?",
      description: 'Explore careers in civil services, law, diplomacy, and political careers',
      starters: [
        'What careers open up with Political Science?',
        'How do I prepare for a career in Indian Foreign Service?',
        'What is the difference between Political Science and Public Policy?',
        'How is AI changing governance and elections?',
      ],
      possibilityPrompt: 'What does a person who understands power and governance actually get to shape in the world?',
    },
    'UPSC Saathi': {
      opener: "Political Science is one of the most scoring UPSC optionals if approached right. Tell me your preparation stage and we'll build a strategy.",
      description: 'UPSC GS2, polity, governance, and Political Science optional strategy',
      starters: [
        'Map the UPSC GS2 syllabus to key Political Science topics',
        'Key governance and polity questions for Mains',
        'Draft a model answer on federalism and centre-state relations',
        'How should I approach Political Science optional for UPSC?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about how government works, how laws are made, or how India's political system functions — in plain language.",
      description: 'How government and democracy work — jargon-free, always',
      starters: [
        'How does a bill become a law in India?',
        'What is the difference between Parliament and the Cabinet?',
        'What does the Supreme Court actually do?',
        'Explain coalition politics in simple terms',
      ],
    },
  },

  statssaathi: {
    'Study Notes': {
      opener: "Tell me which statistics topic you're on — probability, distributions, hypothesis testing, regression — and I'll build clear structured notes with worked examples.",
      description: 'Structured notes with worked examples, formulas, and exam patterns',
      starters: [
        'Make notes on probability distributions — Binomial, Poisson, Normal',
        'Explain hypothesis testing with a clear step-by-step structure',
        'Notes on regression analysis — linear and multiple',
        'Summarise descriptive statistics for B.Sc Statistics',
      ],
    },
    'Exam Prep': {
      opener: "Which Statistics exam are you targeting — B.Sc semester, IIT JAM Statistics, or UPSC? Tell me and I'll quiz you with the right difficulty.",
      description: 'MCQs, problems, and past paper patterns for Stats and Data Science exams',
      starters: [
        'Quiz me on probability theory with IIT JAM-style questions',
        'Give me 3 problems on confidence intervals',
        'What are the most commonly tested topics in IIT JAM Statistics?',
        'Where do students lose marks in Statistics university exams?',
      ],
    },
    'Interest Explorer': {
      opener: "Statistics powers data science, machine learning, economics research, and public health. What direction calls you?",
      description: 'Explore data science, research, actuarial science, and analytics careers',
      starters: [
        'What is the path from Statistics to Data Science?',
        'How is Bayesian statistics changing modern research?',
        'What careers open up with a Statistics background in India?',
        'Explain machine learning from a statistics perspective',
      ],
      possibilityPrompt: 'What can someone who truly understands data and uncertainty build that others cannot?',
    },
    'UPSC Saathi': {
      opener: "Statistics appears in UPSC economics and data interpretation. Let me help you map the relevant areas.",
      description: 'Statistics concepts for UPSC data interpretation, GS, and economics',
      starters: [
        'How does Statistics appear in UPSC Data Interpretation?',
        'Key statistical concepts behind India\'s GDP and census data',
        'How should I read economic survey charts and tables for Mains?',
        'Explain index numbers — CPI, WPI — for UPSC',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about data, statistics, and probability in plain language — how to read a graph, understand a survey result, or spot a misleading statistic.",
      description: 'Data literacy — reading statistics and graphs in everyday life',
      starters: [
        'How do I tell if a statistical claim is trustworthy?',
        'What does "margin of error" actually mean?',
        'How does the government calculate inflation?',
        'Explain what an average does and doesn\'t tell you',
      ],
    },
  },

  geosaathi: {
    'Study Notes': {
      opener: "Tell me which Geography topic you need — physical geography, human geography, cartography, or a specific region — and I'll build structured, map-aware notes.",
      description: 'Structured notes on physical geography, human geography, and maps',
      starters: [
        'Make notes on the Indian monsoon system — causes and patterns',
        'Explain plate tectonics with examples from India and South Asia',
        'Notes on population geography and demographic transition',
        'Summarise major soil types of India for UPSC GS1',
      ],
    },
    'Exam Prep': {
      opener: "Which Geography exam are you preparing for — B.A semester, UPSC GS1, or Geography optional? Tell me and I'll quiz you the right way.",
      description: 'MCQs, map-based questions, and past paper patterns',
      starters: [
        'Quiz me on Indian physical geography with MCQs',
        'Give me 5 map-based questions on India\'s rivers',
        'What are the most commonly asked topics in UPSC GS1 Geography?',
        'Past paper patterns for UPSC Geography optional',
      ],
    },
    'Interest Explorer': {
      opener: "Geography connects to climate science, urban planning, GIS, international development, and civil services. What direction excites you?",
      description: 'Explore GIS, climate careers, urban planning, and research',
      starters: [
        'What careers open up with Geography expertise?',
        'How is GIS and remote sensing changing the field?',
        'What is climate geography and how do I research it?',
        'Explain how geographers contribute to disaster management',
      ],
      possibilityPrompt: 'What is the most important problem a geographer from India could help solve in the next decade?',
    },
    'UPSC Saathi': {
      opener: "Geography is one of the most scoring UPSC optionals and is central to GS1. Tell me your preparation stage and we'll build a strategy.",
      description: 'UPSC GS1 geography, optional paper strategy, and map practice',
      starters: [
        'Map the UPSC GS1 syllabus to key Geography topics',
        'Key physical geography topics for UPSC Prelims',
        'Draft a model answer on India\'s river system and water management',
        'How should I approach Geography optional for UPSC?',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about places, climate, rivers, population, and the physical world around us — in plain language.",
      description: 'Geography of everyday life — jargon-free, always',
      starters: [
        'Why does it rain more on the west coast of India?',
        'What causes an earthquake and how do we measure it?',
        'How does deforestation affect rainfall in India?',
        'Explain why cities are where they are',
      ],
    },
  },

  agrisaathi: {
    'Study Notes': {
      opener: "Tell me which agriculture topic you're studying — agronomy, soil science, horticulture, or crop physiology — and I'll build structured notes aligned to your exam.",
      description: 'Structured notes with agronomic principles, practices, and exam patterns',
      starters: [
        'Make notes on soil fertility and nutrient management',
        'Explain crop rotation systems and their scientific basis',
        'Notes on water management and irrigation methods in Indian agriculture',
        'Summarise the key concepts in plant physiology for B.Sc Agriculture',
      ],
    },
    'Exam Prep': {
      opener: "Which Agriculture exam are you preparing for — B.Sc semester, ICAR NET, or State PSC Agriculture? Tell me and I'll quiz you the right way.",
      description: 'MCQs, problems, and past paper patterns for ICAR NET and state PSC',
      starters: [
        'Quiz me on agronomy with ICAR NET-style MCQs',
        'Give me 5 questions on soil science — types, pH, and nutrients',
        'What are the most commonly tested topics in ICAR NET?',
        'Past paper patterns for Agriculture PSC exams',
      ],
    },
    'Interest Explorer': {
      opener: "Agriculture connects to food security, climate science, biotechnology, and rural development. What direction calls you?",
      description: 'Explore agritech, research, policy, and sustainable farming careers',
      starters: [
        'What careers open up with a B.Sc Agriculture degree?',
        'How is precision agriculture and drone technology changing farming?',
        'What is agri-biotech and how do I enter that research path?',
        'How does climate change affect Indian agriculture specifically?',
      ],
      possibilityPrompt: 'What is the most transformative thing an agricultural scientist from India could build or discover?',
    },
    'UPSC Saathi': {
      opener: "Agriculture is central to UPSC GS3 — food security, irrigation, land reform, and rural economy. Tell me your stage and we'll build a strategy.",
      description: 'UPSC GS3 agriculture, food security, and rural economy strategy',
      starters: [
        'Map key Agriculture topics to UPSC GS3',
        'Explain the Green Revolution — achievements and limitations for UPSC',
        'Draft a model answer on India\'s food security challenges',
        'Key schemes and policies in Indian agriculture for Mains',
      ],
    },
    'Citizen Guide': {
      opener: "Ask me anything about farming, food production, seeds, soil, and how Indian agriculture works — in plain language.",
      description: 'Agriculture and food systems explained simply',
      starters: [
        'How does the minimum support price (MSP) work?',
        'Why do farmers in India face water shortages?',
        'What is organic farming and is it actually better?',
        'Explain how seeds are improved through plant breeding',
      ],
    },
  },
}

// ─── Smart bot-mode defaults (used for any saathi without a specific entry) ──

const BOT_DEFAULTS: Record<string, (name: string) => StarterSet> = {
  'Study Notes': (name) => ({
    opener: `Tell me which topic or chapter you're working on — I'll build you structured ${name} notes, exam-ready.`,
    description: `Structured notes with worked examples`,
    starters: [
      `Explain a core ${name} concept I should know thoroughly`,
      `Make notes on the fundamentals I must not forget`,
      `What are the most important formulas or frameworks in this subject?`,
      `Summarise the chapter I'm currently studying`,
    ],
  }),
  'Exam Prep': (name) => ({
    opener: `Which exam are you preparing for? Tell me the paper and your target — I'll quiz you with the right difficulty and pattern.`,
    description: `MCQs, past paper patterns, and mock Q&A`,
    starters: [
      `Quiz me on the core concepts of ${name}`,
      `What are the most commonly tested topics in ${name} exams?`,
      `Give me 5 tricky questions to test my understanding`,
      `Where are students most likely to lose marks in ${name}?`,
    ],
  }),
  'Interest Explorer': (name) => ({
    opener: `${name} connects to many fields beyond the syllabus. Tell me what excites you most and I'll show you where it leads.`,
    description: `Explore careers, research frontiers, and real-world applications`,
    starters: [
      `What careers open up with expertise in ${name}?`,
      `What is the most exciting frontier in ${name} right now?`,
      `How is ${name} being changed by AI and new technology?`,
      `Tell me about research areas in ${name} I might not know about`,
    ],
  }),
  'UPSC Saathi': (name) => ({
    opener: `${name} appears in UPSC in ways many aspirants underestimate. Tell me your preparation stage and we'll build a strategy.`,
    description: `UPSC strategy, answer writing, and GS topic mapping`,
    starters: [
      `How does ${name} appear in UPSC General Studies?`,
      `Key ${name} topics every UPSC aspirant must know`,
      `Draft a model answer connecting ${name} to a current policy issue`,
      `How should I approach ${name} as a UPSC optional subject?`,
    ],
  }),
  'Citizen Guide': (name) => ({
    opener: `Ask me anything about ${name} in plain language — no jargon, just clear and useful answers.`,
    description: `Plain-language explainer — jargon-free, always`,
    starters: [
      `Explain how ${name} affects my everyday life`,
      `What is one thing most people get wrong about ${name}?`,
      `How do I make better decisions using what ${name} teaches?`,
      `Explain the most important idea in ${name} as simply as possible`,
    ],
  }),
}

// ─── Saathi subject names for default fallback ─────────────────────────────

const SAATHI_SUBJECT: Record<string, string> = {
  kanoonsaathi: 'Law',
  maathsaathi: 'Mathematics',
  chemsaathi: 'Chemistry',
  biosaathi: 'Biology',
  pharmasaathi: 'Pharmacy',
  archsaathi: 'Architecture',
  bizsaathi: 'Business',
  civilsaathi: 'Civil Engineering',
  compsaathi: 'Computer Science',
  econsaathi: 'Economics',
  elecsaathi: 'Electrical Engineering',
  envirosaathi: 'Environmental Science',
  finsaathi: 'Finance',
  historysaathi: 'History',
  hrsaathi: 'Human Resources',
  mechsaathi: 'Mechanical Engineering',
  medicosaathi: 'Medicine',
  mktsaathi: 'Marketing',
  nursingsaathi: 'Nursing',
  psychsaathi: 'Psychology',
  aerospacesaathi: 'Aerospace Engineering',
  biotechsaathi: 'Biotechnology',
  'chemengg-saathi': 'Chemical Engineering',
  electronicssaathi: 'Electronics',
  physicsaathi:  'Physics',
  accountsaathi: 'Accounting',
  polscisaathi:  'Political Science',
  statssaathi:   'Statistics',
  geosaathi:     'Geography',
  agrisaathi:    'Agriculture',
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

function getStarterSet(saathiId: string, botName: string): StarterSet {
  const saathiStarters = SAATHI_STARTERS[saathiId]
  if (saathiStarters?.[botName]) return saathiStarters[botName]!
  const subjectName = SAATHI_SUBJECT[saathiId] ?? 'this subject'
  const defaultFn = BOT_DEFAULTS[botName]
  if (defaultFn) return defaultFn(subjectName)
  return {
    opener: `What would you like to explore today? I'm here to learn with you.`,
    description: 'Your AI learning companion',
    starters: [
      "Help me understand a topic I'm stuck on",
      'Create a study plan for this week',
      'Quiz me on what I already know',
      'What should I focus on first?',
    ],
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  saathiId: string
  saathiEmoji: string
  botName: string
  onStarterClick: (text: string) => void
  isLegalTheme?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyState({
  saathiId,
  saathiEmoji,
  botName,
  onStarterClick,
  isLegalTheme = false,
}: Props) {
  const { opener, description, starters, possibilityPrompt } = getStarterSet(saathiId, botName)

  // All colors via CSS vars — light theme, per-Saathi tinted
  const subtitleColor   = 'var(--text-ghost)'
  const openerBg        = 'var(--saathi-bg)'
  const openerBorder    = 'var(--saathi-border)'
  const openerColor     = 'var(--text-secondary)'
  const descColor       = 'var(--text-tertiary)'
  const chipBg          = 'var(--bg-surface)'
  const chipBorder      = 'var(--border-medium)'
  const chipColor       = 'var(--text-secondary)'
  const chipHoverBg     = 'var(--saathi-bg)'
  const chipHoverBorder = 'var(--saathi-mid)'
  const chipHoverColor  = 'var(--saathi-text)'

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {/* Saathi emoji */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-3"
      >
        <span className="block text-[56px] leading-none">{saathiEmoji}</span>
      </motion.div>

      {/* Bot name + mode description */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mb-5"
      >
        <p
          className="font-display mb-1 text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {botName}
        </p>
        <p className="text-xs" style={{ color: descColor }}>
          {description}
        </p>
      </motion.div>

      {/* Proactive opener — Saathi speaks first */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="mb-6 w-full max-w-sm rounded-2xl px-4 py-3.5 text-left"
        style={{
          background: openerBg,
          border: `0.5px solid ${openerBorder}`,
        }}
      >
        <p className="text-xs leading-relaxed italic" style={{ color: openerColor }}>
          &ldquo;{opener}&rdquo;
        </p>
      </motion.div>

      {/* Starter chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex w-full max-w-sm flex-col gap-2"
      >
        <p
          className="mb-1 text-left text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: subtitleColor }}
        >
          Try asking
        </p>
        {starters.map((starter, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.06 }}
            onClick={() => onStarterClick(starter)}
            className="rounded-xl px-4 py-3 text-left text-sm transition-all duration-150"
            style={{
              background: chipBg,
              border: `0.5px solid ${chipBorder}`,
              color: chipColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = chipHoverBg
              e.currentTarget.style.color = chipHoverColor
              e.currentTarget.style.borderColor = chipHoverBorder
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = chipBg
              e.currentTarget.style.color = chipColor
              e.currentTarget.style.borderColor = chipBorder
            }}
          >
            {starter}
          </motion.button>
        ))}

        {possibilityPrompt && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + starters.length * 0.06 + 0.1 }}
            onClick={() => onStarterClick(possibilityPrompt)}
            className='mt-2 w-full rounded-xl px-4 py-3 text-left text-sm transition-all duration-150'
            style={{
              background: 'var(--saathi-light)',
              border: '1.5px solid var(--saathi-border)',
              color: 'var(--saathi-text)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--saathi-bg)'
              e.currentTarget.style.borderColor = 'var(--saathi-mid)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--saathi-light)'
              e.currentTarget.style.borderColor = 'var(--saathi-border)'
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: '3px' }}>
              ✦ A question worth asking yourself
            </span>
            {possibilityPrompt}
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
