// Subject chips (curriculum topics) per Saathi — up to 12 per saathi
// Students select up to 5. The chip that matches their Saathi is shown by default.

export const SUBJECT_CHIPS: Record<string, string[]> = {
  kanoonsaathi: [
    'Constitutional Law', 'Criminal Law', 'Civil Law',
    'Contract Law', 'Evidence Law', 'Family Law',
    'Administrative Law', 'Corporate Law', 'IPR',
    'International Law', 'Labour Law', 'Tax Law',
  ],
  maathsaathi: [
    'Calculus', 'Linear Algebra', 'Probability',
    'Statistics', 'Differential Equations', 'Real Analysis',
    'Discrete Maths', 'Mechanics', 'Number Theory',
    'Abstract Algebra', 'Complex Analysis', 'Topology',
  ],
  pharmasaathi: [
    'Pharmacology I', 'Pharmacology II', 'Pharmaceutics',
    'Pharmaceutical Chemistry', 'Pharmacognosy', 'Drug Analysis',
    'Biopharmaceutics', 'Clinical Pharmacy', 'Medicinal Chemistry',
    'Quality Assurance', 'Regulatory Affairs', 'Pharmacokinetics',
  ],
  chemsaathi: [
    'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry',
    'Analytical Chemistry', 'Spectroscopy', 'Biochemistry',
    'Polymer Chemistry', 'Electronic Structure', 'Reaction Mechanisms',
    'Thermodynamics', 'Electrochemistry', 'Chemical Kinetics',
  ],
  biosaathi: [
    'Cell Biology', 'Molecular Biology', 'Genetics',
    'Biochemistry', 'Ecology', 'Evolution',
    'Microbiology', 'Physiology', 'Immunology',
    'Developmental Biology', 'Neuroscience', 'Systems Biology',
  ],
  medicosaathi: [
    'Anatomy', 'Physiology', 'Biochemistry',
    'Pathology', 'Pharmacology', 'Microbiology',
    'Community Medicine', 'Surgery', 'Medicine',
    'Obstetrics', 'Paediatrics', 'Forensic Medicine',
  ],
  compsaathi: [
    'Data Structures', 'Algorithms', 'Operating Systems',
    'Database Management', 'Computer Networks', 'Software Engineering',
    'Theory of Computation', 'Computer Architecture', 'Compiler Design',
    'Machine Learning', 'Cloud Computing', 'Cybersecurity',
  ],
  mechsaathi: [
    'Engineering Mechanics', 'Thermodynamics', 'Fluid Mechanics',
    'Manufacturing Processes', 'Machine Design', 'Strength of Materials',
    'Heat Transfer', 'CAD/CAM', 'Robotics',
    'Vibrations', 'Metrology', 'Industrial Engineering',
  ],
  civilsaathi: [
    'Structural Analysis', 'Soil Mechanics', 'Fluid Mechanics',
    'Concrete Technology', 'Transportation Engineering', 'Surveying',
    'Environmental Engineering', 'Hydraulics', 'Foundation Engineering',
    'Steel Structures', 'Construction Management', 'Geotechnical Engineering',
  ],
  archsaathi: [
    'Architectural Design', 'Building Technology', 'Urban Planning',
    'History of Architecture', 'Environmental Design', 'Structural Systems',
    'Interior Architecture', 'Landscape Design', 'Building Services',
    'Housing Design', 'Vernacular Architecture', 'Digital Architecture',
  ],
  elecsaathi: [
    'Circuit Theory', 'Signals & Systems', 'Control Systems',
    'Power Systems', 'Power Electronics', 'Electric Machines',
    'Electromagnetics', 'Analog Circuits', 'Digital Systems',
    'VLSI Design', 'Embedded Systems', 'Energy Systems',
  ],
  electronicssaathi: [
    'Analog Electronics', 'Digital Electronics', 'Microprocessors',
    'Signal Processing', 'Communication Systems', 'VLSI',
    'Embedded Systems', 'Control Engineering', 'RF Electronics',
    'Sensors', 'IoT', 'Semiconductor Devices',
  ],
  chemenggsaathi: [
    'Chemical Process Calculations', 'Thermodynamics', 'Fluid Operations',
    'Heat Transfer', 'Mass Transfer', 'Chemical Reaction Engineering',
    'Process Control', 'Transport Phenomena', 'Plant Design',
    'Safety Engineering', 'Polymer Technology', 'Environmental Engineering',
  ],
  biotechsaathi: [
    'Molecular Biology', 'Biochemistry', 'Microbiology',
    'Cell Biology', 'Bioprocess Engineering', 'Bioinformatics',
    'Genetic Engineering', 'Immunology', 'Biotechnology Regulation',
    'Bioseparation', 'Enzyme Technology', 'Fermentation Technology',
  ],
  aerosaathi: [
    'Aerodynamics', 'Aircraft Structures', 'Propulsion',
    'Flight Mechanics', 'Avionics', 'Aircraft Design',
    'Composite Materials', 'Control Systems', 'CFD',
    'Wind Tunnel Testing', 'Thermodynamics', 'Navigation',
  ],
  aerospacesaathi: [
    'Orbital Mechanics', 'Spacecraft Design', 'Propulsion',
    'Aerodynamics', 'Structures & Materials', 'Attitude Control',
    'Space Mission Design', 'Guidance Navigation', 'Avionics',
    'Thermal Control', 'Remote Sensing', 'Launch Vehicles',
  ],
  econsaathi: [
    'Microeconomics', 'Macroeconomics', 'Econometrics',
    'International Trade', 'Development Economics', 'Public Finance',
    'Monetary Economics', 'Industrial Organisation', 'Game Theory',
    'Labour Economics', 'Environmental Economics', 'Financial Economics',
  ],
  bizsaathi: [
    'Management Principles', 'Marketing Management', 'Finance',
    'Human Resources', 'Operations Management', 'Business Strategy',
    'Accounting', 'Business Law', 'Entrepreneurship',
    'Organisational Behaviour', 'Supply Chain', 'Business Analytics',
  ],
  finsaathi: [
    'Financial Management', 'Security Analysis', 'Portfolio Management',
    'Derivatives', 'Fixed Income', 'Corporate Finance',
    'Financial Modelling', 'Risk Management', 'Accounting',
    'Banking', 'Fintech', 'International Finance',
  ],
  envirosaathi: [
    'Environmental Chemistry', 'Ecology', 'Climate Science',
    'Environmental Policy', 'Sustainability', 'Water Resources',
    'Air Quality', 'Solid Waste Management', 'Environmental Impact',
    'Renewable Energy', 'Pollution Control', 'Geography',
  ],
  physisaathi: [
    'Classical Mechanics', 'Electromagnetism', 'Quantum Mechanics',
    'Thermodynamics', 'Statistical Mechanics', 'Optics',
    'Nuclear Physics', 'Particle Physics', 'Condensed Matter',
    'Astrophysics', 'Mathematical Physics', 'Relativity',
  ],
};

// Interest area chips — more exploratory/research-oriented, per saathi
export const INTEREST_CHIPS: Record<string, string[]> = {
  kanoonsaathi: [
    'Constitutional Reforms', 'Human Rights', 'Cyber Law',
    'Environmental Law', 'Legal Tech', 'International Criminal Law',
    'AI & Law', 'Gender Justice',
  ],
  maathsaathi: [
    'Cryptography', 'Mathematical Modelling', 'Game Theory',
    'Competitive Maths', 'Quantum Computing', 'Data Science',
    'Actuarial Science', 'Mathematical Finance',
  ],
  pharmasaathi: [
    'Drug Discovery', 'Nanotechnology in Pharma', 'Pharmacogenomics',
    'Clinical Research', 'Regulatory Science', 'Drug Delivery',
    'Biopharmaceuticals', 'Personalised Medicine',
  ],
  chemsaathi: [
    'Green Chemistry', 'Nanotechnology', 'Computational Chemistry',
    'Material Science', 'Drug Design', 'Supramolecular Chemistry',
    'Astrochemistry', 'Photochemistry',
  ],
  biosaathi: [
    'Synthetic Biology', 'CRISPR Research', 'Marine Biology',
    'Conservation Biology', 'Astrobiology', 'Neuroscience',
    'Computational Biology', 'Genomics',
  ],
  compsaathi: [
    'Artificial Intelligence', 'Blockchain', 'Quantum Computing',
    'Open Source', 'System Design', 'Competitive Programming',
    'DevOps', 'Startup Technology',
  ],
  archsaathi: [
    'Sustainable Architecture', 'Smart Cities', 'Parametric Design',
    'Heritage Conservation', 'Urban Mobility', 'Biophilic Design',
    'Social Housing', 'Digital Fabrication',
  ],
  default: [
    'Research & Academia', 'Entrepreneurship', 'Social Impact',
    'Policy Making', 'International Career', 'Sustainability',
    'Technology & Innovation', 'Public Speaking & Leadership',
  ],
};

export function getSubjectChips(saathiId: string): string[] {
  return SUBJECT_CHIPS[saathiId] ?? SUBJECT_CHIPS['compsaathi'];
}

export function getInterestChips(saathiId: string): string[] {
  return INTEREST_CHIPS[saathiId] ?? INTEREST_CHIPS['default'];
}
