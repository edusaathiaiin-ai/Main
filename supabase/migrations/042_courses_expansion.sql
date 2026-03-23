-- ============================================================
-- Migration 042: Course Seeds Expansion (40 more → total 50)
-- Covers all major Indian degrees across all Saathi verticals
-- ============================================================

INSERT INTO public.courses
  (name, abbreviations, degree_type, duration_years, saathi_slug, year_wise_subjects, common_aliases)
VALUES

-- ── ENGINEERING VARIANTS ──────────────────────────────────────────────────────

('Bachelor of Technology — Electronics and Communication',
 ARRAY['B.Tech EC','BE EC','B.Tech ECE','BTech ECE','B.E. ECE'],
 'bachelor', 4, 'elecsaathi',
 '{"1":{"sem1":["Engineering Mathematics I","Physics","C Programming","Engineering Drawing"],"sem2":["Mathematics II","Chemistry","Data Structures","Digital Electronics"]},"2":{"sem3":["Signals and Systems","Analog Circuits","Electromagnetic Theory","Network Theory"],"sem4":["Digital Communication","Microprocessors","Control Systems","Electronic Measurements"]},"3":{"sem5":["VLSI Design","Wireless Communication","DSP","Embedded Systems"],"sem6":["Optical Communication","Antenna Theory","RF Engineering","Microcontrollers"]},"4":{"sem7":["Advanced Communication","IoT Systems","Elective I","Project I"],"sem8":["5G Technologies","Elective II","Project II","Industrial Training"]}}'::jsonb,
 ARRAY['ece','electronics','ec','telecom']),

('Bachelor of Technology — Mechanical Engineering',
 ARRAY['B.Tech ME','BE ME','BTech Mechanical','B.E. Mechanical'],
 'bachelor', 4, 'mechsaathi',
 '{"1":{"sem1":["Engineering Mathematics I","Physics","C Programming","Engineering Drawing"],"sem2":["Mathematics II","Chemistry","Workshop Practice","Basic Electrical"]},"2":{"sem3":["Strength of Materials","Thermodynamics","Fluid Mechanics","Manufacturing Processes"],"sem4":["Machine Design","Heat Transfer","Kinematics","Metrology"]},"3":{"sem5":["CAD/CAM","Industrial Engineering","Dynamics of Machinery","Automobile Engineering"],"sem6":["Refrigeration and AC","Robotics","Finite Element Analysis","Production Technology"]},"4":{"sem7":["Advanced Manufacturing","Elective I","Project I","Entrepreneurship"],"sem8":["Elective II","Elective III","Project II","Industrial Training"]}}'::jsonb,
 ARRAY['mechanical','mech','me','automobile']),

('Bachelor of Technology — Civil Engineering',
 ARRAY['B.Tech Civil','BE Civil','BTech Civil','B.E. Civil'],
 'bachelor', 4, 'civilsaathi',
 '{"1":{"sem1":["Mathematics I","Physics","Drawing","Surveying I"],"sem2":["Mathematics II","Chemistry","Building Materials","Environmental Studies"]},"2":{"sem3":["Structural Analysis","Fluid Mechanics","Soil Mechanics","Surveying II"],"sem4":["RCC Design","Hydraulics","Foundation Engineering","Transportation Engineering"]},"3":{"sem5":["Steel Design","Environmental Engineering","Irrigation","Quantity Surveying"],"sem6":["Advanced Concrete","Remote Sensing","Construction Management","Traffic Engineering"]},"4":{"sem7":["Earthquake Engineering","Elective I","Project I","Infrastructure Planning"],"sem8":["Bridge Engineering","Elective II","Project II","Industrial Training"]}}'::jsonb,
 ARRAY['civil','construction','infrastructure','architecture civil']),

('Bachelor of Technology — Chemical Engineering',
 ARRAY['B.Tech Chemical','BE Chemical','BTech Chem Engg'],
 'bachelor', 4, 'chemsaathi',
 '{"1":{"sem1":["Mathematics I","Physics","Chemistry","Engineering Drawing"],"sem2":["Mathematics II","Engineering Chemistry","C Programming","Environmental Studies"]},"2":{"sem3":["Fluid Flow","Heat Transfer","Mass Transfer","Thermodynamics"],"sem4":["Chemical Reaction Engineering","Instrumentation","Process Dynamics","Separation Processes"]},"3":{"sem5":["Process Design","Petroleum Refining","Polymer Technology","Safety Engineering"],"sem6":["Chemical Plant Design","Fertilizer Technology","Environmental Pollution","Biochemical Engineering"]},"4":{"sem7":["Project Management","Elective I","Project I","Industrial Visit"],"sem8":["Elective II","Elective III","Project II","Plant Training"]}}'::jsonb,
 ARRAY['chemical','chem engg','process','petroleum']),

('Bachelor of Technology — Biotechnology',
 ARRAY['B.Tech Biotech','BE Biotechnology','BTech Biotechnology'],
 'bachelor', 4, 'biosaathi',
 '{"1":{"sem1":["Mathematics","Chemistry","Biology","Engineering Drawing"],"sem2":["Biochemistry","Cell Biology","Physics","Computer Applications"]},"2":{"sem3":["Microbiology","Genetics","Bioprocess Engineering","Analytical Techniques"],"sem4":["Molecular Biology","Immunology","Fermentation Technology","Biostatistics"]},"3":{"sem5":["Genetic Engineering","Downstream Processing","Bioinformatics","Plant Biotechnology"],"sem6":["Animal Biotechnology","Enzyme Technology","Environmental Biotechnology","Regulatory Affairs"]},"4":{"sem7":["Industrial Biotechnology","Elective I","Project I","IPR in Biotech"],"sem8":["Elective II","Project II","Industry Internship"]}}'::jsonb,
 ARRAY['biotech','biotechnology','bioscience']),

('Bachelor of Computer Applications',
 ARRAY['BCA','B.C.A','Bachelor of Computer Applications'],
 'bachelor', 3, 'compsaathi',
 '{"1":{"sem1":["Mathematics I","C Programming","Digital Logic","Computer Fundamentals"],"sem2":["Mathematics II","Data Structures","OOP with C++","Database Concepts"]},"2":{"sem3":["Data Structures and Algorithms","OS","DBMS","Visual Programming"],"sem4":["Computer Networks","Software Engineering","Java Programming","Web Design"]},"3":{"sem5":["Advanced Java","Mobile App Development","Artificial Intelligence","Elective I"],"sem6":["Cloud Computing","Project","Elective II","Internship"]}}'::jsonb,
 ARRAY['bca','computer applications','programming','it']),

('Master of Computer Applications',
 ARRAY['MCA','M.C.A'],
 'master', 3, 'compsaathi',
 '{"1":{"sem1":["Advanced Mathematics","C and Data Structures","Computer Organisation","Discrete Maths"],"sem2":["OOP with C++","DBMS","OS","Probability and Statistics"]},"2":{"sem3":["Software Engineering","Computer Networks","Java","Algorithm Design"],"sem4":["Web Technologies","AI","Elective I","System Programming"]},"3":{"sem5":["Cloud Computing","Machine Learning","Elective II","Seminar"],"sem6":["Project","Dissertation","Industrial Training"]}}'::jsonb,
 ARRAY['mca','computer applications pg','masters cs']),

-- ── PHARMACY VARIANTS ────────────────────────────────────────────────────────

('Doctor of Pharmacy',
 ARRAY['Pharm.D','PharmD','Pharm D'],
 'bachelor', 6, 'pharmasaathi',
 '{"1":{"sem1":["Pharmaceutics I","Anatomy Physiology","Medicinal Biochemistry","Pathophysiology"],"sem2":["Pharmaceutics II","Pharmacognosy","Medicinal Chemistry","Pharmacokinetics"]},"2":{"sem3":["Pharmaceutical Analysis","Pharmacology I","Pharmaceutical Microbiology","Community Pharmacy"],"sem4":["Pharmacology II","Hospital Pharmacy","Pharmaceutical Formulations","Biopharmaceutics"]},"3":{"sem5":["Clinical Pharmacology","Pharmacotherapeutics I","Evidence-Based Medicine","Drug Information"],"sem6":["Pharmacotherapeutics II","Clinical Pharmacy","Rational Drug Use","Communication Skills"]},"4":{"sem7":["Pharmacotherapeutics III","Hospital Rotation I","Research Methods","Pharmacoeconomics"],"sem8":["Clerkship I","Clerkship II","Case Presentations"]},"5":{"sem9":["Residency Rotations — Internal Medicine"],"sem10":["Residency — Cardiology and Infectious Disease"]},"6":{"sem11":["Project / Thesis"],"sem12":["Final Viva and Clinical Examination"]}}'::jsonb,
 ARRAY['pharmd','doctorate pharmacy','clinical pharmacy']),

('Master of Pharmacy',
 ARRAY['M.Pharm','MPharm','M Pharm'],
 'master', 2, 'pharmasaathi',
 '{"1":{"sem1":["Advanced Pharmaceutics","Modern Pharmaceutical Analysis","Drug Regulatory Affairs","Research Methodology"],"sem2":["Novel Drug Delivery Systems","Pharmacokinetics","Biostatistics","Seminar"]},"2":{"sem3":["Dissertation I","Advanced Pharmacology","Elective I","Literature Review"],"sem4":["Dissertation II","Conference Presentation","Thesis Submission"]}}'::jsonb,
 ARRAY['mpharm','masters pharmacy','pg pharmacy']),

-- ── MEDICAL VARIANTS ─────────────────────────────────────────────────────────

('Bachelor of Dental Surgery',
 ARRAY['BDS','B.D.S','Dental Surgery'],
 'bachelor', 5, 'medicosaathi',
 '{"1":{"sem1":["Oral Anatomy","Dental Histology","Biochemistry","Physiology"],"sem2":["General Anatomy","Dental Materials","Community Dentistry I","Dental Pharmacology"]},"2":{"sem3":["General and Oral Pathology","Oral Microbiology","Conservative Dentistry I","Preclinical Prosthodontics"],"sem4":["General Medicine","Preclinical Orthodontics","Periodontology I","Oral Surgery I"]},"3":{"sem5":["Conservative Dentistry II","Prosthodontics I","Orthodontics","Periodontology II"],"sem6":["Oral Medicine","Paediatric Dentistry","Oral Radiology","Oral Surgery II"]},"4":{"sem7":["Advanced Conservative","Implantology","Forensic Odontology","Gerodontology"],"sem8":["Comprehensive Clerkship"]},"5":{"sem9":["Internship Rotations"],"sem10":["Final Clinical Examination"]}}'::jsonb,
 ARRAY['bds','dental','dentistry','odontology']),

('Bachelor of Ayurvedic Medicine and Surgery',
 ARRAY['BAMS','B.A.M.S','Ayurveda'],
 'bachelor', 5, 'medicosaathi',
 '{"1":{"sem1":["Padartha Vigyan","Rachana Sharira","Sanskrit","Ayurveda Itihas"],"sem2":["Kriya Sharira","Dravyaguna I","Ashtanga Hridayam","Sanskrit Advanced"]},"2":{"sem3":["Dravyaguna II","Rasa Shastra I","Rogavijnana I","Nidan Panchaka"],"sem4":["Rasa Shastra II","Rogavijnana II","Agada Tantra","Charak Samhita"]},"3":{"sem5":["Kayachikitsa I","Panchakarma","Prasuti Tantra","Kaumarbhritya"],"sem6":["Kayachikitsa II","Shalya Tantra","Shalakya Tantra","Research Methodology"]},"4":{"sem7":["Advanced Kayachikitsa","Swasthavritta","Geriatrics","Community Health"],"sem8":["Clinical Attachment"]},"5":{"sem9":["Rotatory Internship"],"sem10":["Dissertation and Viva"]}}'::jsonb,
 ARRAY['bams','ayurveda','ayurvedic','traditional medicine']),

('Bachelor of Physiotherapy',
 ARRAY['BPT','B.P.T','Physiotherapy'],
 'bachelor', 4, 'nursingsaathi',
 '{"1":{"sem1":["Anatomy I","Physiology I","Biochemistry","Fundamentals of Physiotherapy"],"sem2":["Anatomy II","Physiology II","Psychology","Exercise Therapy"]},"2":{"sem3":["Pathology","Biomechanics","Electrotherapy I","Orthopaedics"],"sem4":["Clinical Medicine","Electrotherapy II","Musculoskeletal Physiotherapy","Research Methods"]},"3":{"sem5":["Neurology","Neuro Physiotherapy","Sports Medicine","Paediatric Physiotherapy"],"sem6":["Cardiopulmonary","Geriatric Physiotherapy","Community Rehabilitation","Prosthetics"]},"4":{"sem7":["Advanced Ortho Physiotherapy","Manual Therapy","Elective","Project I"],"sem8":["Internship","Dissertation"]}}'::jsonb,
 ARRAY['bpt','physio','physiotherapy','rehabilitation']),

('Bachelor of Science in Medical Lab Technology',
 ARRAY['B.Sc MLT','BMLT','BSc MLT'],
 'bachelor', 3, 'medicosaathi',
 '{"1":{"sem1":["Anatomy and Physiology","Biochemistry I","Basics of MLT","Clinical Psychology"],"sem2":["Pathology I","Haematology I","Microbiology I","Computer Basics"]},"2":{"sem3":["Clinical Biochemistry","Haematology II","Blood Banking","Microbiology II"],"sem4":["Histopathology","Cytology","Molecular Diagnostics","Immunology"]},"3":{"sem5":["Advanced Techniques","Research Methods","Clinical Attachment","Lab Management"],"sem6":["Project","Internship","Dissertation"]}}'::jsonb,
 ARRAY['mlt','lab technology','medical laboratory','clinical lab']),

('General Nursing and Midwifery',
 ARRAY['GNM','G.N.M'],
 'diploma', 3, 'nursingsaathi',
 '{"1":{"sem1":["Anatomy and Physiology","Microbiology","Nutrition","Nursing Fundamentals"],"sem2":["Community Health I","Psychology","Pharmacology","First Aid"]},"2":{"sem3":["Medical Nursing","Surgical Nursing","Child Health Nursing","Mental Health"],"sem4":["OBG Nursing","ENT Ophthalmology","Community Health II","Midwifery I"]},"3":{"sem5":["Advanced Nursing","Midwifery II","Community Health III","Administration"],"sem6":["Internship"]}}'::jsonb,
 ARRAY['gnm','nursing diploma','auxiliary nurse midwife']),

-- ── SCIENCE ───────────────────────────────────────────────────────────────────

('Bachelor of Science — Mathematics',
 ARRAY['B.Sc Maths','BSc Mathematics','B.Sc Mathematics'],
 'bachelor', 3, 'maathsaathi',
 '{"1":{"sem1":["Algebra I","Calculus I","Mechanics","English"],"sem2":["Algebra II","Calculus II","Geometry","Computer Applications"]},"2":{"sem3":["Real Analysis","Differential Equations","Numerical Methods","Abstract Algebra"],"sem4":["Complex Analysis","Topology","Linear Algebra","Probability"]},"3":{"sem5":["Functional Analysis","Mathematical Statistics","Operations Research","Elective I"],"sem6":["Partial Differential Equations","Graph Theory","Project","Elective II"]}}'::jsonb,
 ARRAY['maths','mathematics','bsc maths','pure math']),

('Bachelor of Science — Physics',
 ARRAY['B.Sc Physics','BSc Physics'],
 'bachelor', 3, 'maathsaathi',
 '{"1":{"sem1":["Mechanics","Thermal Physics","Electricity","Mathematics I"],"sem2":["Optics","Electronics","Statistical Mechanics","Mathematics II"]},"2":{"sem3":["Quantum Mechanics I","Electromagnetic Theory","Nuclear Physics","Computational Physics"],"sem4":["Solid State Physics","Spectroscopy","Mathematical Physics","Optics Lab"]},"3":{"sem5":["Particle Physics","Astrophysics","Nanotechnology","Elective I"],"sem6":["Advanced Quantum","Materials Science","Project","Elective II"]}}'::jsonb,
 ARRAY['physics','bsc physics','applied physics']),

('Bachelor of Science — Chemistry',
 ARRAY['B.Sc Chemistry','BSc Chemistry'],
 'bachelor', 3, 'chemsaathi',
 '{"1":{"sem1":["Inorganic Chemistry I","Organic Chemistry I","Physical Chemistry I","English"],"sem2":["Inorganic Chemistry II","Organic Chemistry II","Physical Chemistry II","Maths"]},"2":{"sem3":["Spectroscopy","Analytical Chemistry","Polymer Chemistry","Biochemistry"],"sem4":["Industrial Chemistry","Environmental Chemistry","Reaction Mechanisms","Research Methods"]},"3":{"sem5":["Advanced Organic","Coordination Chemistry","Green Chemistry","Elective I"],"sem6":["Separation Techniques","Project","Elective II","Internship"]}}'::jsonb,
 ARRAY['chemistry','bsc chem','organic chemistry']),

('Bachelor of Science — Agriculture',
 ARRAY['B.Sc Agriculture','BSc Agri','B.Sc. Agri'],
 'bachelor', 4, 'envirosathi',
 '{"1":{"sem1":["Agricultural Heritage","Crop Botany","Soil Science I","Rural Development"],"sem2":["Crop Production","Plant Physiology","Weather and Climate","Agricultural Microbiology"]},"2":{"sem3":["Genetics and Plant Breeding","Entomology","Soil Fertility","Agronomy I"],"sem4":["Plant Pathology","Agronomy II","Seed Technology","Farm Machinery"]},"3":{"sem5":["Horticulture","Agricultural Economics","Extension Education","Irrigation"],"sem6":["Forestry","Post-Harvest Technology","Organic Farming","Rural Entrepreneurship"]},"4":{"sem7":["Precision Agriculture","Agri Business","Elective","Project I"],"sem8":["Dissertation","Internship","Project II"]}}'::jsonb,
 ARRAY['agriculture','bsc agri','farming','agronomy','horticulture']),

('Bachelor of Science — Environmental Science',
 ARRAY['B.Sc Environmental Science','BSc Environmental','B.Sc EnvSc'],
 'bachelor', 3, 'envirosathi',
 '{"1":{"sem1":["Introduction to Environment","Ecology","Chemistry of Environment","Mathematics"],"sem2":["Environmental Biology","Soil Science","Environmental Economics","Computer Applications"]},"2":{"sem3":["Environmental Pollution Control","Remote Sensing","GIS","Disaster Management"],"sem4":["Climate Change","Environmental Impact Assessment","Biodiversity","Waste Management"]},"3":{"sem5":["Environmental Toxicology","Carbon Markets","Elective I","Field Work"],"sem6":["Project","Internship","Environmental Law","Elective II"]}}'::jsonb,
 ARRAY['environment','environmental science','ecology','green']),

-- ── COMMERCE / FINANCE ────────────────────────────────────────────────────────

('Master of Commerce',
 ARRAY['M.Com','MCom','M.Com. (Hons)'],
 'master', 2, 'finsaathi',
 '{"1":{"sem1":["Advanced Financial Accounting","Managerial Economics","Business Statistics","Research Methodology"],"sem2":["Corporate Finance","Advanced Cost Accounting","Banking Law","Computer Applications"]},"2":{"sem3":["International Finance","Security Analysis","Elective I","Seminar"],"sem4":["Dissertation","Elective II","Viva Voce"]}}'::jsonb,
 ARRAY['mcom','masters commerce','pg commerce']),

('Chartered Accountancy',
 ARRAY['CA','C.A.','CA Final','CA Inter'],
 'other', 3, 'finsaathi',
 '{"1":{"sem1":["Accounting Fundamentals","Business Laws","Quantitative Aptitude","Business Economics"],"sem2":["Advanced Accounting","Corporate Laws","Cost and Management Accounting","Taxation I"]},"2":{"sem3":["Strategic Financial Management","Advanced Auditing","Information Systems","Strategic Management"],"sem4":["Indirect Tax Laws","Direct Tax Laws","Financial Reporting II"]},"3":{"sem5":["Advanced Financial Reporting","Strategic Cost Management","Risk Management","Elective"],"sem6":["Multi-disciplinary Case Study","Articleship Assessment"]}}'::jsonb,
 ARRAY['ca','chartered accountant','icai','ca foundation','ca intermediate']),

('Company Secretary',
 ARRAY['CS','C.S.','Company Secretary'],
 'other', 3, 'finsaathi',
 '{"1":{"sem1":["Business Environment","Corporate Governance","Economics","Accounting"],"sem2":["Business Laws","Industrial Laws","Tax Laws","Financial Management"]},"2":{"sem3":["Corporate Laws and Governance","Securities Laws","Economic Laws","Governance"],"sem4":["Advanced Company Law","Corporate Restructuring","Resolution of Corporate Disputes"]},"3":{"sem5":["Drafting and Pleading","Corporate Funding and Listings","Elective"],"sem6":["Training","Examination"]}}'::jsonb,
 ARRAY['cs','icsi','company law','corporate secretary']),

('Bachelor of Business Administration — Finance',
 ARRAY['BBA Finance','BBA (Finance)','BBA Fin'],
 'bachelor', 3, 'finsaathi',
 '{"1":{"sem1":["Financial Accounting","Business Economics","Business Maths","Communication"],"sem2":["Corporate Accounting","Statistics","Business Law","Computer Applications"]},"2":{"sem3":["Financial Management","Cost Accounting","Income Tax","Banking"],"sem4":["Security Analysis","Financial Derivatives","Portfolio Management","Working Capital"]},"3":{"sem5":["International Finance","Project Finance","Elective I","Insurance"],"sem6":["Financial Analysis","Dissertation","Elective II","Internship"]}}'::jsonb,
 ARRAY['bba finance','finance bba','commerce management']),

-- ── HUMANITIES / ARTS ─────────────────────────────────────────────────────────

('Bachelor of Arts — Political Science',
 ARRAY['BA Political Science','BA Pol Sci','B.A. Political Science'],
 'bachelor', 3, 'kanoonsaathi',
 '{"1":{"sem1":["Introduction to Political Theory","Indian Government and Politics","History of Political Ideas","English"],"sem2":["Comparative Government","International Relations","Indian Constitution","Environmental Studies"]},"2":{"sem3":["Political Thought I","Public Administration","Federalism in India","Research Methods"],"sem4":["Political Thought II","Electoral Politics","Human Rights","Foreign Policy"]},"3":{"sem5":["Contemporary Political Theory","Governance and Public Policy","Elective I","Conflict Studies"],"sem6":["Gender and Politics","Dissertation","Elective II","Internship"]}}'::jsonb,
 ARRAY['ba pol sci','political science','polity','civics','upsc aspirant']),

('Bachelor of Arts — Economics',
 ARRAY['BA Economics','B.A. Economics','BA Eco'],
 'bachelor', 3, 'econsaathi',
 '{"1":{"sem1":["Microeconomics I","Indian Economy","Mathematics for Economics","English"],"sem2":["Macroeconomics I","Economic History","Statistics I","Environmental Economics"]},"2":{"sem3":["Microeconomics II","Public Finance","Development Economics","Statistics II"],"sem4":["Macroeconomics II","International Trade","Agricultural Economics","Econometrics I"]},"3":{"sem5":["Monetary Economics","Industrial Economics","Elective I","Research Methods"],"sem6":["Financial Economics","Econometrics II","Dissertation","Elective II"]}}'::jsonb,
 ARRAY['ba economics','eco','economics','ba eco','economy']),

('Bachelor of Arts — History',
 ARRAY['BA History','B.A. History','BA Hist'],
 'bachelor', 3, 'historysaathi',
 '{"1":{"sem1":["Ancient Indian History","World History I","Introduction to Archaeology","English"],"sem2":["Medieval Indian History","World History II","Historiography","Environmental Studies"]},"2":{"sem3":["Modern Indian History","Colonial India","Social History","Research Methods"],"sem4":["Contemporary India","Regional History","Economic History","Nationalism"]},"3":{"sem5":["Post-Independence India","Asian History","Elective I","Oral History"],"sem6":["Global History","Dissertation","Elective II","Museum Studies"]}}'::jsonb,
 ARRAY['ba history','history','historical studies']),

('Bachelor of Arts — Sociology',
 ARRAY['BA Sociology','B.A. Sociology','BA Soc'],
 'bachelor', 3, 'psychsaathi',
 '{"1":{"sem1":["Introduction to Sociology","Social Anthropology","Indian Social Institutions","English"],"sem2":["Social Research Methods","Rural Sociology","Urban Sociology","Environmental Studies"]},"2":{"sem3":["Classical Sociological Thought","Social Stratification","Tribal Society","Statistics for Social Science"],"sem4":["Modern Sociological Theory","Gender Studies","Industrial Sociology","Quantitative Methods"]},"3":{"sem5":["Sociology of Deviance","Political Sociology","Elective I","Social Work"],"sem6":["Globalization","Dissertation","Elective II","Field Work"]}}'::jsonb,
 ARRAY['ba sociology','sociology','social science','anthropology']),

-- ── MANAGEMENT SPECIALIZATIONS ────────────────────────────────────────────────

('Master of Business Administration — Human Resources',
 ARRAY['MBA HR','MBA (HRM)','MBA Human Resource'],
 'master', 2, 'hrsaathi',
 '{"1":{"sem1":["Organisational Behaviour","Talent Acquisition","Managerial Economics","Business Communication"],"sem2":["Strategic HRM","Training and Development","Employee Relations","Labour Law"]},"2":{"sem3":["Performance Management","Compensation Design","HR Analytics","Organisational Development"],"sem4":["Global HRM","Project / Dissertation","Elective"]}}'::jsonb,
 ARRAY['mba hr','hrm','human resources','people management']),

('Master of Business Administration — Marketing',
 ARRAY['MBA Marketing','MBA (Mktg)','MBA Mkt'],
 'master', 2, 'mktsaathi',
 '{"1":{"sem1":["Marketing Management","Consumer Behaviour","Business Communication","Financial Accounting"],"sem2":["Digital Marketing","Advertising","Sales Management","Brand Management"]},"2":{"sem3":["Marketing Research","International Marketing","CRM","Product Management"],"sem4":["Growth Marketing","Dissertation","Elective"]}}'::jsonb,
 ARRAY['mba marketing','marketing mba','brand manager','digital marketing']),

('Master of Business Administration — Finance',
 ARRAY['MBA Finance','MBA (Finance)','MBA Fin'],
 'master', 2, 'finsaathi',
 '{"1":{"sem1":["Financial Management","Accounting for Managers","Managerial Economics","Quantitative Methods"],"sem2":["Corporate Finance","Investment Analysis","Financial Derivatives","Banking"]},"2":{"sem3":["Mergers and Acquisitions","Risk Management","International Finance","Elective"],"sem4":["Financial Modeling","Project Finance","Dissertation"]}}'::jsonb,
 ARRAY['mba finance','finance mba','investment banking aspirant']),

-- ── LAW VARIANTS ─────────────────────────────────────────────────────────────

('Master of Laws',
 ARRAY['LL.M','LLM','M.L.','Masters Law'],
 'master', 1, 'kanoonsaathi',
 '{"1":{"sem1":["Jurisprudence and Legal Theory","Constitutional Law","Research Methodology","Elective I — Corporate / Criminal / IP"],"sem2":["Dissertation","Comparative Law","Elective II","Seminar"]}}'::jsonb,
 ARRAY['llm','masters law','pg law','law postgraduate']),

('Integrated BA LLB (5 Year)',
 ARRAY['BA LLB (Hons)','Integrated LLB','5-Year LLB','BALLB'],
 'bachelor', 5, 'kanoonsaathi',
 '{"1":{"sem1":["Law of Contract I","Constitutional Law I","History of Law","Political Theory","English"],"sem2":["Law of Contract II","Constitutional Law II","Family Law I","Economics","Communication"]},"2":{"sem3":["Criminal Law I","Tort Law","Jurisprudence","Sociology","Administrative Law"],"sem4":["Criminal Law II","Property Law","Evidence Law","Political Science","History"]},"3":{"sem5":["Company Law","IP Law","Environmental Law","Moot Court I","Public International Law"],"sem6":["Labour Law","Tax Law","Constitutional Law III","Moot Court II","ADR"]},"4":{"sem7":["Constitutional Remedies","Human Rights","Criminology","Elective I","Seminar"],"sem8":["Corporate Governance","Securities Law","Elective II","Research Paper"]},"5":{"sem9":["Advanced Corporate Law","Clinical Legal Education","Dissertation","Elective III"],"sem10":["Practical Training","Placement","Final Viva"]}}'::jsonb,
 ARRAY['ba llb','5 year law','integrated law','clat aspirant']),

-- ── ARCHITECTURE / DESIGN ────────────────────────────────────────────────────

('Master of Architecture',
 ARRAY['M.Arch','MArch','Masters Architecture'],
 'master', 2, 'archsaathi',
 '{"1":{"sem1":["Advanced Architectural Design I","History and Theory","Structural Systems","Research Methods"],"sem2":["Advanced Design II","Urban Design Studio","Sustainable Architecture","Professional Practice"]},"2":{"sem3":["Thesis Preparatory Studio","Elective I","Dissertation I"],"sem4":["Thesis Studio","Final Viva","Dissertation II"]}}'::jsonb,
 ARRAY['march','masters architecture','architecture pg']),

('Bachelor of Design',
 ARRAY['B.Des','BDes','Bachelor of Design'],
 'bachelor', 4, 'archsaathi',
 '{"1":{"sem1":["Design Fundamentals","Drawing and Sketching","Visual Communication","History of Design"],"sem2":["Color Theory","Typography","Design Processes","Craft Studies"]},"2":{"sem3":["Graphic Design I","UX Fundamentals","Material Studies","Photography"],"sem4":["UI/UX Design","Digital Media","Branding","3D Modeling"]},"3":{"sem5":["Interaction Design","Motion Graphics","User Research","Elective I"],"sem6":["Design for Social Impact","Elective II","Internship","Portfolio"]},"4":{"sem7":["Capstone Design I","Elective III","Design Entrepreneurship"],"sem8":["Capstone Design II","Thesis Exhibition","Internship"]}}'::jsonb,
 ARRAY['bdes','design','ux design','graphic design','product design']),

-- ── IT / DATA ─────────────────────────────────────────────────────────────────

('Bachelor of Technology — Artificial Intelligence and Data Science',
 ARRAY['B.Tech AI DS','BTech AIDS','B.Tech AI&DS','B.Tech Data Science'],
 'bachelor', 4, 'compsaathi',
 '{"1":{"sem1":["Linear Algebra","Python Programming","Statistics I","Database Fundamentals"],"sem2":["Probability","Data Structures","Statistics II","Business Intelligence"]},"2":{"sem3":["Machine Learning I","Big Data Analytics","Data Wrangling","Applied Statistics"],"sem4":["Deep Learning","NLP Fundamentals","Data Visualization","Cloud Platforms"]},"3":{"sem5":["Computer Vision","Feature Engineering","MLOps","Ethics in AI"],"sem6":["Generative AI","Time Series","Elective I","Hackathon Project"]},"4":{"sem7":["Advanced Deep Learning","Elective II","Capstone I","Research"],"sem8":["Industry Project","Elective III","Capstone II","Internship"]}}'::jsonb,
 ARRAY['aids','ai ds','data science','ai','machine learning','btech ds']),

('Bachelor of Technology — Information Technology',
 ARRAY['B.Tech IT','BE IT','BTech IT','B.E. IT'],
 'bachelor', 4, 'compsaathi',
 '{"1":{"sem1":["Mathematics I","Physics","C Programming","IT Essentials"],"sem2":["Mathematics II","Digital Logic","Data Structures","Web Technologies I"]},"2":{"sem3":["DBMS","OS","Computer Networks","OOP Java"],"sem4":["Software Engineering","Cyber Security","Web Technologies II","Mobile Computing"]},"3":{"sem5":["Cloud Computing","IoT","Algorithm Design","Elective I"],"sem6":["Blockchain","DevOps","Elective II","Mini Project"]},"4":{"sem7":["AI Fundamentals","Elective III","Project I","Entrepreneurship"],"sem8":["Project II","Elective IV","Industrial Training"]}}'::jsonb,
 ARRAY['it','information technology','btech it']),

-- ── MISCELLANEOUS ─────────────────────────────────────────────────────────────

('Master of Science — Mathematics',
 ARRAY['M.Sc Mathematics','MSc Maths','M.Sc Maths'],
 'master', 2, 'maathsaathi',
 '{"1":{"sem1":["Real Analysis","Algebra I","Topology I","Differential Equations"],"sem2":["Complex Analysis","Algebra II","Functional Analysis","Numerical Analysis"]},"2":{"sem3":["Partial Differential Equations","Elective I","Elective II","Research Seminar"],"sem4":["Dissertation","Project","Elective III"]}}'::jsonb,
 ARRAY['msc maths','masters mathematics','pg maths']),

('Diploma in Pharmacy',
 ARRAY['D.Pharm','DPharm','D Pharm','Pharmacy Diploma'],
 'diploma', 2, 'pharmasaathi',
 '{"1":{"sem1":["Pharmaceutics I","Pharmaceutical Chemistry I","Pharmacognosy","Human Anatomy and Physiology"],"sem2":["Pharmaceutics II","Pharmaceutical Chemistry II","Community Pharmacy","Biochemistry"]},"2":{"sem3":["Pharmaceutical Jurisprudence","Drug Store Management","Hospital Pharmacy","Advanced Pharmacology"],"sem4":["Practical Training","Viva Voce"]}}'::jsonb,
 ARRAY['dpharm','diploma pharmacy','pharmacy diploma','pharmacist']),

('Bachelor of Science — Data Science',
 ARRAY['B.Sc Data Science','BSc DS','B.Sc. Data Science'],
 'bachelor', 3, 'compsaathi',
 '{"1":{"sem1":["Python Basics","Statistics I","Linear Algebra","Database Fundamentals"],"sem2":["R Programming","Probability","Data Wrangling","Business Analytics"]},"2":{"sem3":["Machine Learning I","Big Data","Data Visualization","Applied Statistics"],"sem4":["Deep Learning Basics","NLP","SQL and NoSQL","Ethics in Data"]},"3":{"sem5":["Advanced ML","Computer Vision","Elective I","Capstone I"],"sem6":["Industry Project","Elective II","Dissertation","Internship"]}}'::jsonb,
 ARRAY['bsc ds','data science bsc','analytics','statistics data']);
