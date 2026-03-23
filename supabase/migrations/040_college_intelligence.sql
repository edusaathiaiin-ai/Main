-- ============================================================
-- Migration 040: College Intelligence Database
-- Created: 2026-03-23
-- Purpose: Structured storage for Indian colleges and courses,
--          enabling fuzzy-search autocomplete and soul profiling.
-- ============================================================

-- ── 1. COLLEGES TABLE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.colleges (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  aliases       TEXT[]      NOT NULL DEFAULT '{}',
  city          TEXT        NOT NULL,
  state         TEXT        NOT NULL,
  university    TEXT,
  college_type  TEXT,         -- govt / private / deemed / autonomous / central
  naac_grade    TEXT,         -- A++ / A+ / A / B++ / B+ / B / C / not-accredited
  courses       TEXT[]      NOT NULL DEFAULT '{}',  -- course abbreviations offered
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. COURSES TABLE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courses (
  id                  UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT      NOT NULL,
  abbreviations       TEXT[]    NOT NULL DEFAULT '{}',
  degree_type         TEXT,           -- bachelor / master / diploma / phd
  duration_years      INTEGER,
  saathi_slug         TEXT      REFERENCES public.verticals(slug),
  year_wise_subjects  JSONB,
  -- Structure: {"1": {"sem1": [...], "sem2": [...]}, "2": {...}}
  common_aliases      TEXT[]    NOT NULL DEFAULT '{}'
);

-- ── 3. FUZZY SEARCH INDEXES (pg_trgm) ─────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_colleges_name_trgm
  ON public.colleges USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_colleges_aliases_trgm
  ON public.colleges USING gin(aliases gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_colleges_city
  ON public.colleges (city);

CREATE INDEX IF NOT EXISTS idx_colleges_state
  ON public.colleges (state);

CREATE INDEX IF NOT EXISTS idx_courses_name_trgm
  ON public.courses USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_abbrev_trgm
  ON public.courses USING gin(abbreviations gin_trgm_ops);

-- ── 4. PROFILES SCHEMA EXTENSION ──────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS raw_education_input   TEXT,
  ADD COLUMN IF NOT EXISTS parsed_college_id     UUID REFERENCES public.colleges(id),
  ADD COLUMN IF NOT EXISTS parsed_course_id      UUID REFERENCES public.courses(id),
  ADD COLUMN IF NOT EXISTS parsed_year           INTEGER,
  ADD COLUMN IF NOT EXISTS parse_confidence      FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parse_confirmed       BOOLEAN DEFAULT false;

-- ── 5. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses  ENABLE ROW LEVEL SECURITY;

-- Public read — anyone authenticated can search colleges/courses
CREATE POLICY "colleges_public_read" ON public.colleges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "courses_public_read" ON public.courses
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 6. SEED COURSES (8 with full year-wise subjects) ─────────────────────────

INSERT INTO public.courses
  (name, abbreviations, degree_type, duration_years, saathi_slug, year_wise_subjects, common_aliases)
VALUES

-- ── 6.1 B.Pharm ───────────────────────────────────────────────────────────────
('Bachelor of Pharmacy',
 ARRAY['B.Pharm','BPharm','B Pharm','Bpharm','B.Pharmacy'],
 'bachelor', 4, 'pharmasaathi',
 '{
   "1": {
     "sem1": ["Pharmaceutical Inorganic Chemistry","Pharmaceutics I","Human Anatomy and Physiology I","Pharmaceutical Analysis I","Communication Skills","Remedial Biology"],
     "sem2": ["Pharmaceutical Organic Chemistry I","Pharmaceutics II","Human Anatomy and Physiology II","Computer Applications in Pharmacy","Environmental Sciences"]
   },
   "2": {
     "sem3": ["Pharmaceutical Organic Chemistry II","Physical Pharmaceutics I","Pharmaceutical Microbiology","Pharmaceutical Engineering","Human Anatomy and Physiology III"],
     "sem4": ["Medicinal Chemistry I","Physical Pharmaceutics II","Pharmacology I","Pharmacognosy I","Pharmaceutical Analysis II"]
   },
   "3": {
     "sem5": ["Medicinal Chemistry II","Industrial Pharmacy I","Pharmacology II","Pharmacognosy II","Pharmaceutical Jurisprudence"],
     "sem6": ["Medicinal Chemistry III","Industrial Pharmacy II","Pharmacology III","Herbal Drug Technology","Biopharmaceutics and Pharmacokinetics"]
   },
   "4": {
     "sem7": ["Instrumental Methods of Analysis","Industrial Pharmacy III","Pharmacy Practice","Novel Drug Delivery Systems","Cosmetics and Cosmeceuticals"],
     "sem8": ["Biostatistics and Research Methodology","Social and Preventive Pharmacy","Pharma Marketing Management","Quality Assurance","Project Work"]
   }
 }'::jsonb,
 ARRAY['pharmacy','pharma','pharm','bpharma']),

-- ── 6.2 LLB / BA LLB ─────────────────────────────────────────────────────────
('Bachelor of Laws',
 ARRAY['LLB','LL.B','BA LLB','BL','B.L','BA LL.B','5 Year LLB'],
 'bachelor', 3, 'kanoonsaathi',
 '{
   "1": {
     "sem1": ["Law of Contract I","Constitutional Law I","Law of Torts and Consumer Protection","Legal Methods","English for Law"],
     "sem2": ["Law of Contract II","Constitutional Law II","Family Law I — Hindu Law","History of Courts in India","Legal Language and Legal Writing"]
   },
   "2": {
     "sem3": ["Criminal Law I — IPC / BNS","Criminal Procedure Code / BNSS","Law of Evidence","Property Law","Administrative Law"],
     "sem4": ["Criminal Law II","Civil Procedure Code","Family Law II — Muslim and Christian Law","Company Law","Environmental Law"]
   },
   "3": {
     "sem5": ["Jurisprudence and Legal Theory","Labour and Industrial Law","Intellectual Property Rights","Public International Law","Alternative Dispute Resolution"],
     "sem6": ["Constitutional Law III","Corporate and Commercial Law","Human Rights and International Humanitarian Law","Moot Court Practice","Practical Training / Internship"]
   }
 }'::jsonb,
 ARRAY['law','legal','llb','lawyer','advocate','bar']),

-- ── 6.3 MBBS ─────────────────────────────────────────────────────────────────
('Bachelor of Medicine and Bachelor of Surgery',
 ARRAY['MBBS','M.B.B.S','MBBS+Internship'],
 'bachelor', 5, 'medicosaathi',
 '{
   "1": {
     "sem1": ["Human Anatomy","Human Physiology","Biochemistry","Introduction to Community Medicine"],
     "sem2": ["Human Anatomy","Human Physiology","Biochemistry","Community Medicine I"]
   },
   "2": {
     "sem3": ["Pathology","Microbiology","Forensic Medicine and Toxicology","Pharmacology I"],
     "sem4": ["Pathology","Microbiology","Pharmacology II","Community Medicine II"]
   },
   "3": {
     "sem5": ["Ophthalmology","Otorhinolaryngology (ENT)","Community Medicine III","Dermatology and Venereology"],
     "sem6": ["General Medicine","General Surgery","Obstetrics and Gynaecology","Paediatrics"]
   },
   "4": {
     "sem7": ["General Medicine","General Surgery","Obstetrics and Gynaecology","Paediatrics","Orthopaedics"],
     "sem8": ["General Medicine","General Surgery","OBG","Paediatrics","Preventive and Social Medicine"]
   },
   "5": {
     "sem9": ["Internship — Medicine / Surgery / OBG / Paediatrics / Community Medicine"],
     "sem10": ["Internship — Continued Rotations"]
   }
 }'::jsonb,
 ARRAY['medicine','doctor','medical','mbbs','medico','md aspirant']),

-- ── 6.4 B.Tech CSE ───────────────────────────────────────────────────────────
('Bachelor of Technology — Computer Science Engineering',
 ARRAY['B.Tech CS','BE CS','B.Tech CSE','BTech CS','BTech CSE','B.E. Computer Science','B.E. CSE'],
 'bachelor', 4, 'compsaathi',
 '{
   "1": {
     "sem1": ["Engineering Mathematics I","Engineering Physics","Programming in C","Engineering Drawing and Graphics"],
     "sem2": ["Engineering Mathematics II","Engineering Chemistry","Data Structures","Basic Electronics and Digital Logic"]
   },
   "2": {
     "sem3": ["Data Structures and Algorithms","Digital Logic Design","Computer Organization and Architecture","Discrete Mathematics for Computing"],
     "sem4": ["Operating Systems","Database Management Systems","Computer Networks","Object-Oriented Programming with Java / C++"]
   },
   "3": {
     "sem5": ["Design and Analysis of Algorithms","Theory of Computation","Compiler Design","Artificial Intelligence"],
     "sem6": ["Machine Learning","Web Technologies","Information Security and Cryptography","Software Engineering and Agile Methods"]
   },
   "4": {
     "sem7": ["Deep Learning and Computer Vision","Cloud Computing and DevOps","Elective I","Major Project Phase I"],
     "sem8": ["Distributed Systems","Elective II","Elective III","Major Project Phase II / Industrial Training"]
   }
 }'::jsonb,
 ARRAY['cs','cse','computer','coding','programming','software','tech','it','btech']),

-- ── 6.5 B.Com ─────────────────────────────────────────────────────────────────
('Bachelor of Commerce',
 ARRAY['B.Com','BCom','B.Com (Hons)','B.Com Honours'],
 'bachelor', 3, 'finsaathi',
 '{
   "1": {
     "sem1": ["Financial Accounting","Business Economics (Micro)","Business Mathematics and Statistics","Principles of Business Management","Environmental Studies"],
     "sem2": ["Corporate Accounting","Business Economics (Macro)","Business Law","Computer Applications for Business","Indian Economy"]
   },
   "2": {
     "sem3": ["Income Tax Law — Direct Taxes","Cost Accounting","Company Law","Marketing Management","Business Communication"],
     "sem4": ["Auditing and Assurance","Financial Management","Indirect Taxes — GST","Business Ethics and Corporate Governance","Banking and Insurance"]
   },
   "3": {
     "sem5": ["Advanced Financial Accounting","Security Analysis and Portfolio Management","Entrepreneurship Development","International Trade and Finance"],
     "sem6": ["Corporate Tax Planning","Financial Statement Analysis","Project Work / Internship","Elective — Banking / Finance / Marketing"]
   }
 }'::jsonb,
 ARRAY['commerce','bcom','accounts','accounting','finance','ca aspirant']),

-- ── 6.6 BBA ──────────────────────────────────────────────────────────────────
('Bachelor of Business Administration',
 ARRAY['BBA','B.B.A','BMS','Bachelor of Management Studies','BBA (Hons)'],
 'bachelor', 3, 'bizsaathi',
 '{
   "1": {
     "sem1": ["Principles of Management","Business Economics","Financial Accounting","Business Communication","Computer Fundamentals"],
     "sem2": ["Marketing Management","Organisational Behaviour","Business Statistics","Business Law","Environmental Studies"]
   },
   "2": {
     "sem3": ["Human Resource Management","Financial Management","Research Methodology","Entrepreneurship and Start-up Management"],
     "sem4": ["Operations Management","Strategic Management","Consumer Behaviour","E-Commerce and Digital Marketing"]
   },
   "3": {
     "sem5": ["International Business","Project and Operations Research","Business Elective I","Business Elective II"],
     "sem6": ["Business Ethics and Leadership","Business Policy and Corporate Strategy","Elective III","Project Work / Summer Internship Report"]
   }
 }'::jsonb,
 ARRAY['bba','business','management','mba aspirant','bms']),

-- ── 6.7 B.Sc Nursing ──────────────────────────────────────────────────────────
('Bachelor of Science in Nursing',
 ARRAY['B.Sc Nursing','BSc Nursing','B.Sc (N)','B.Sc. Nursing','BSN'],
 'bachelor', 4, 'nursingsaathi',
 '{
   "1": {
     "sem1": ["Anatomy","Physiology","Nutrition and Biochemistry","Nursing Foundations","English"],
     "sem2": ["Microbiology and Parasitology","Psychology","Sociology","Computer Science","Community Health Nursing I"]
   },
   "2": {
     "sem3": ["Medical-Surgical Nursing I","Pharmacology","Pathology and Genetics","Community Health Nursing II"],
     "sem4": ["Medical-Surgical Nursing II","Child Health Nursing (Paediatric)","Mental Health Nursing","Midwifery and Obstetric Nursing I"]
   },
   "3": {
     "sem5": ["Midwifery and Obstetric Nursing II","Gynaecological Nursing","Community Health Nursing III","Nursing Research and Statistics"],
     "sem6": ["Advanced Medical-Surgical Nursing","Management of Nursing Services and Education","Clinical Practice"]
   },
   "4": {
     "sem7": ["Nursing Education","Nursing Administration and Ward Management","Community Health Nursing IV","Elective"],
     "sem8": ["Internship — Rotational Clinical Postings"]
   }
 }'::jsonb,
 ARRAY['nursing','nurse','gnm','anm','bsc nursing','rnrm']),

-- ── 6.8 MBA ──────────────────────────────────────────────────────────────────
('Master of Business Administration',
 ARRAY['MBA','M.B.A','PGDM','PGDBM','MBA (Full Time)','MBA Executive'],
 'master', 2, 'bizsaathi',
 '{
   "1": {
     "sem1": ["Managerial Economics","Financial Accounting for Managers","Organisational Behaviour","Marketing Management","Business Statistics and Quantitative Methods"],
     "sem2": ["Corporate Finance","Human Resource Management","Operations and Supply Chain Management","Business Law and Corporate Governance","Research Methodology and Business Communication"]
   },
   "2": {
     "sem3": ["Strategic Management","Elective I","Elective II","Elective III","Summer Internship Report and Viva"],
     "sem4": ["Business Policy and International Strategy","Elective IV","Elective V","Industry Mentored Project","Dissertation"]
   }
 }'::jsonb,
 ARRAY['mba','pgdm','management','postgraduate','post graduation business','cat aspirant']),

-- ── 6.9 B.Sc Psychology ───────────────────────────────────────────────────────
('Bachelor of Science in Psychology',
 ARRAY['B.Sc Psychology','BSc Psychology','B.A. Psychology','BA Psychology','B.Sc. Applied Psychology'],
 'bachelor', 3, 'psychsaathi',
 '{
   "1": {
     "sem1": ["Introduction to Psychology","Biological Bases of Behaviour","Social Psychology","Research Methods I","English"],
     "sem2": ["Developmental Psychology","Personality Theories","Cognitive Psychology","Statistics for Psychology","Environmental Psychology"]
   },
   "2": {
     "sem3": ["Abnormal Psychology","Clinical Psychology I","Organisational and Industrial Psychology","Neuropsychology","Research Methods II"],
     "sem4": ["Counselling Psychology","Health Psychology","Educational Psychology","Psychological Assessment","Cross-Cultural Psychology"]
   },
   "3": {
     "sem5": ["Psychotherapy and Intervention","Forensic Psychology","Community Psychology","Advanced Research Design"],
     "sem6": ["Positive Psychology","Child and Adolescent Psychology","Elective","Dissertation / Internship"]
   }
 }'::jsonb,
 ARRAY['psychology','psych','counselling','mental health','therapist aspirant']),

-- ── 6.10 B.Arch ──────────────────────────────────────────────────────────────
('Bachelor of Architecture',
 ARRAY['B.Arch','BArch','B.Architecture'],
 'bachelor', 5, 'archsaathi',
 '{
   "1": {
     "sem1": ["Architectural Design I","Building Construction I","History of Architecture I","Architectural Drawing & Graphics","Workshop"],
     "sem2": ["Architectural Design II","Building Construction II","History of Architecture II","Environmental Studies","Visual Arts"]
   },
   "2": {
     "sem3": ["Architectural Design III","Structures I","History of Architecture III","Theory of Architecture","City and Community"],
     "sem4": ["Architectural Design IV","Structures II","Building Services I","Landscape Design","Specifications and Estimation"]
   },
   "3": {
     "sem5": ["Architectural Design V","Structures III","Building Services II","Urban Design","Computer-Aided Architectural Design"],
     "sem6": ["Architectural Design VI","Housing and Habitat","Climate Responsive Design","Professional Practice I","Internship / Travel Study"]
   },
   "4": {
     "sem7": ["Architectural Design VII","Urban Planning and Infrastructure","Sustainable Architecture","Elective I","Professional Practice II"],
     "sem8": ["Architectural Design VIII","Elective II","Research Studies","Professional Practice III"]
   },
   "5": {
     "sem9": ["Architectural Design IX — Thesis Preparation","Elective III","Seminar"],
     "sem10": ["Thesis — Design Dissertation and Viva"]
   }
 }'::jsonb,
 ARRAY['architecture','arch','barch','design','architect aspirant']);

-- ── 7. SEED COLLEGES ─────────────────────────────────────────────────────────
-- 100 top Indian colleges by enrollment and NAAC grade
-- Covers: Gujarat, Maharashtra, Delhi, Rajasthan, Karnataka,
--         Tamil Nadu, Uttar Pradesh, West Bengal, Telangana,
--         Madhya Pradesh, Punjab, Kerala, Andhra Pradesh,
--         Haryana, Bihar, Assam, Himachal Pradesh, Uttarakhand

INSERT INTO public.colleges
  (name, aliases, city, state, university, college_type, naac_grade, courses)
VALUES

-- ── GUJARAT ──────────────────────────────────────────────────────────────────
('L M College of Pharmacy',
 ARRAY['LM Pharmacy','LM College Pharmacy','LMCP','L.M. College of Pharmacy'],
 'Ahmedabad','Gujarat','Gujarat Technological University','private','A',
 ARRAY['B.Pharm','M.Pharm','Pharm.D']),

('Gujarat Law Society Law College',
 ARRAY['GLS Law','GLS College of Law','GLS Law College Ahmedabad'],
 'Ahmedabad','Gujarat','Gujarat University','private','A',
 ARRAY['LLB','BA LLB','LL.M']),

('Government Medical College Ahmedabad',
 ARRAY['GMC Ahmedabad','Govt Medical Ahmedabad','BJ Medical College','BJMC'],
 'Ahmedabad','Gujarat','Gujarat University','govt','A+',
 ARRAY['MBBS','MD','MS']),

('SVNIT Surat',
 ARRAY['NIT Surat','Sardar Vallabhbhai NIT','SVNIT','S.V.N.I.T.'],
 'Surat','Gujarat','Autonomous','govt','A',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),

('Nirma University',
 ARRAY['Nirma','NIU','Nirma University Ahmedabad'],
 'Ahmedabad','Gujarat','Nirma University','deemed','A',
 ARRAY['B.Tech CSE','BBA','MBA','LLB','B.Com','B.Pharm']),

('CEPT University',
 ARRAY['CEPT','Center for Environmental Planning and Technology'],
 'Ahmedabad','Gujarat','CEPT University','deemed','A+',
 ARRAY['B.Arch','M.Arch','Urban Planning','Environmental Design']),

('Gujarat University',
 ARRAY['GU','University of Gujarat','Gujarat University Ahmedabad'],
 'Ahmedabad','Gujarat','Gujarat University','govt','A',
 ARRAY['B.Com','B.Sc','BA','LLB','MBA','M.Com','M.Sc']),

('MS University Baroda',
 ARRAY['Baroda University','MSU','The Maharaja Sayajirao University','MSU Vadodara'],
 'Vadodara','Gujarat','The Maharaja Sayajirao University of Baroda','govt','A++',
 ARRAY['B.Arch','B.Tech','B.Com','BA','B.Sc','MBA','LLB']),

('Dharmsinh Desai University',
 ARRAY['DDU','DDU Nadiad','D.D. University'],
 'Nadiad','Gujarat','Dharmsinh Desai University','deemed','A',
 ARRAY['B.Pharm','B.Tech CSE','B.Tech Chemical','MBA']),

-- ── MAHARASHTRA ───────────────────────────────────────────────────────────────
('IIT Bombay',
 ARRAY['IIT-B','IITB','Indian Institute of Technology Bombay','IIT Mumbai'],
 'Mumbai','Maharashtra','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','M.Tech','PhD']),

('Government Law College Mumbai',
 ARRAY['GLC Mumbai','Govt Law College Mumbai','GLC','Government Law College'],
 'Mumbai','Maharashtra','University of Mumbai','govt','A',
 ARRAY['LLB','BA LLB','LL.M']),

('Symbiosis Law School Pune',
 ARRAY['SLS Pune','Symbiosis Law','SLS','Symbiosis Law School'],
 'Pune','Maharashtra','Symbiosis International University','deemed','A+',
 ARRAY['BA LLB','BBA LLB','LLB','LL.M']),

('University of Mumbai',
 ARRAY['Mumbai University','MU','University Mumbai','Bombay University'],
 'Mumbai','Maharashtra','University of Mumbai','govt','A++',
 ARRAY['B.Com','B.Sc','BA','LLB','MBA','B.Pharm','B.Tech']),

('VJTI Mumbai',
 ARRAY['Veermata Jijabai Technological Institute','VJTI','VJ Tech'],
 'Mumbai','Maharashtra','University of Mumbai','govt','A+',
 ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','M.Tech']),

('Savitribai Phule Pune University',
 ARRAY['Pune University','SPPU','University of Pune','Poona University'],
 'Pune','Maharashtra','Savitribai Phule Pune University','govt','A++',
 ARRAY['B.Com','B.Sc','BA','LLB','MBA','B.Pharm','BBA']),

('COEP Technological University',
 ARRAY['COEP','College of Engineering Pune','CoEP Pune','COEP Tech'],
 'Pune','Maharashtra','Autonomous','govt','A+',
 ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','M.Tech']),

('Dr. D.Y. Patil Vidyapeeth',
 ARRAY['DY Patil','D.Y. Patil University','DYP Pune'],
 'Pune','Maharashtra','Dr. D.Y. Patil Vidyapeeth','deemed','A',
 ARRAY['MBBS','B.Pharm','BBA','B.Sc Nursing','MBA','B.Tech']),

('KJ Somaiya College of Engineering',
 ARRAY['KJ Somaiya','Somaiya','KJSCE'],
 'Mumbai','Maharashtra','Somaiya Vidyavihar University','private','A',
 ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','MBA','MCA']),

-- ── DELHI / NCR ───────────────────────────────────────────────────────────────
('AIIMS New Delhi',
 ARRAY['AIIMS','All India Institute of Medical Sciences','AIIMS Delhi'],
 'New Delhi','Delhi','Autonomous','govt','A++',
 ARRAY['MBBS','MD','MS','B.Sc Nursing','M.Sc','PhD']),

('Delhi University',
 ARRAY['DU','University of Delhi','Delhi Uni'],
 'New Delhi','Delhi','University of Delhi','central','A++',
 ARRAY['BA','B.Com','B.Sc','LLB','MA','M.Com','MBA','PhD']),

('IIT Delhi',
 ARRAY['IIT-D','IITD','Indian Institute of Technology Delhi'],
 'New Delhi','Delhi','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','M.Tech','MBA','PhD']),

('Jamia Millia Islamia',
 ARRAY['JMI','Jamia','Jamia Millia'],
 'New Delhi','Delhi','Jamia Millia Islamia','central','A++',
 ARRAY['B.Tech CSE','BA','B.Com','LLB','BBA','MA','MBA']),

('IP University',
 ARRAY['GGSIPU','GGSIP University','Guru Gobind Singh IP University','IPU'],
 'New Delhi','Delhi','Guru Gobind Singh Indraprastha University','govt','A',
 ARRAY['B.Tech CSE','BBA','MBA','LLB','B.Pharm','B.Sc Nursing','MBBS']),

('Faculty of Law Delhi University',
 ARRAY['DU Law','Delhi University Law Faculty','Campus Law Centre','CLC'],
 'New Delhi','Delhi','University of Delhi','central','A++',
 ARRAY['LLB','BA LLB','LL.M','PhD Law']),

-- ── RAJASTHAN ────────────────────────────────────────────────────────────────
('IIT Jodhpur',
 ARRAY['IIT-J','IITJ','Indian Institute of Technology Jodhpur'],
 'Jodhpur','Rajasthan','Autonomous','govt','A+',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','M.Tech','PhD']),

('University of Rajasthan',
 ARRAY['RU','Rajasthan University','Univ of Rajasthan'],
 'Jaipur','Rajasthan','University of Rajasthan','govt','A',
 ARRAY['BA','B.Com','B.Sc','LLB','MBA','MA','M.Com']),

('Manipal University Jaipur',
 ARRAY['MUJ','Manipal Jaipur'],
 'Jaipur','Rajasthan','Manipal University Jaipur','private','A',
 ARRAY['B.Tech CSE','BBA','MBA','B.Com','B.Arch','B.Pharm']),

('BITS Pilani',
 ARRAY['BITS','Birla Institute of Technology and Science','BITS Pilani Campus'],
 'Pilani','Rajasthan','BITS Pilani','deemed','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','M.Tech','MBA','PhD']),

-- ── KARNATAKA ────────────────────────────────────────────────────────────────
('Manipal College of Pharmaceutical Sciences',
 ARRAY['MCOPS','Manipal Pharmacy','Manipal Pharma'],
 'Manipal','Karnataka','Manipal Academy of Higher Education','deemed','A+',
 ARRAY['B.Pharm','M.Pharm','Pharm.D','PhD']),

('IISc Bangalore',
 ARRAY['IISc','Indian Institute of Science','IISc Bengaluru'],
 'Bengaluru','Karnataka','Autonomous','govt','A++',
 ARRAY['B.Sc Research','M.Tech','M.Sc','PhD']),

('IIT Dharwad',
 ARRAY['IIT-DH','IITDH','Indian Institute of Technology Dharwad'],
 'Dharwad','Karnataka','Autonomous','govt','A',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','M.Tech']),

('Bangalore Medical College',
 ARRAY['BMCRI','Bangalore Medical College and Research Institute','BMC Bangalore'],
 'Bengaluru','Karnataka','Rajiv Gandhi University of Health Sciences','govt','A+',
 ARRAY['MBBS','MD','MS']),

('RV College of Engineering',
 ARRAY['RVCE','RV Engineering College'],
 'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A+',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech','MBA']),

('Christ University',
 ARRAY['CHRIST','Christ Deemed University','Christ College Bangalore'],
 'Bengaluru','Karnataka','Christ University','deemed','A+',
 ARRAY['BBA','B.Com','BA','B.Sc','MBA','LLB','MA','Psychology']),

('PES University',
 ARRAY['PES','PESIT','PES Institute of Technology'],
 'Bengaluru','Karnataka','PES University','private','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA','MCA']),

-- ── TAMIL NADU ────────────────────────────────────────────────────────────────
('IIT Madras',
 ARRAY['IIT-M','IITM','Indian Institute of Technology Madras','IIT Chennai'],
 'Chennai','Tamil Nadu','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Tech Aerospace','M.Tech','MBA','PhD']),

('Anna University',
 ARRAY['AU Chennai','Anna Univ','Anna University Chennai'],
 'Chennai','Tamil Nadu','Anna University','govt','A++',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech','MBA']),

('Christian Medical College Vellore',
 ARRAY['CMC Vellore','CMC','Christian Medical College'],
 'Vellore','Tamil Nadu','Tamil Nadu Dr. MGR Medical University','private','A++',
 ARRAY['MBBS','MD','MS','B.Sc Nursing','BSc Allied Health']),

('SASTRA University',
 ARRAY['SASTRA','SASTRA Deemed University'],
 'Thanjavur','Tamil Nadu','SASTRA University','deemed','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Pharm','MBA']),

('Vellore Institute of Technology',
 ARRAY['VIT','VIT Vellore','VIT University'],
 'Vellore','Tamil Nadu','Vellore Institute of Technology','deemed','A++',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Biotech','MBA','M.Tech']),

-- ── UTTAR PRADESH ────────────────────────────────────────────────────────────
('IIT Kanpur',
 ARRAY['IIT-K','IITK','Indian Institute of Technology Kanpur'],
 'Kanpur','Uttar Pradesh','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Sc','M.Tech','MBA','PhD']),

('Allahabad University',
 ARRAY['AU Allahabad','University of Allahabad','Prayagraj University'],
 'Prayagraj','Uttar Pradesh','University of Allahabad','central','A',
 ARRAY['BA','B.Sc','B.Com','LLB','MA','M.Sc']),

('Amity University',
 ARRAY['Amity','Amity University Noida','Amity Lucknow'],
 'Noida','Uttar Pradesh','Amity University','private','A+',
 ARRAY['B.Tech CSE','BBA','MBA','LLB','B.Com','B.Sc','BA','B.Pharm']),

('BHU Varanasi',
 ARRAY['Banaras Hindu University','BHU','IIT BHU','BHU Varanasi'],
 'Varanasi','Uttar Pradesh','Banaras Hindu University','central','A++',
 ARRAY['B.Tech CSE','MBBS','BA','B.Sc','B.Com','LLB','MBA','M.Tech']),

('Era University Lucknow',
 ARRAY['Era Medical College','ERA University'],
 'Lucknow','Uttar Pradesh','Era University','private','A',
 ARRAY['MBBS','B.Pharm','B.Sc Nursing','BPT','MBA']),

-- ── WEST BENGAL ───────────────────────────────────────────────────────────────
('Jadavpur University',
 ARRAY['JU','Jadavpur Uni','JU Kolkata'],
 'Kolkata','West Bengal','Jadavpur University','govt','A++',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Arch','MBA','M.Tech']),

('IIT Kharagpur',
 ARRAY['IIT-KGP','IITKGP','Indian Institute of Technology Kharagpur'],
 'Kharagpur','West Bengal','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Arch','MBA','M.Tech','PhD']),

('Calcutta University',
 ARRAY['CU','University of Calcutta','Calcutta Uni'],
 'Kolkata','West Bengal','University of Calcutta','govt','A+',
 ARRAY['BA','B.Sc','B.Com','LLB','MA','MBA','M.Com']),

('Scottish Church College',
 ARRAY['SCC','Scottish Church Kolkata'],
 'Kolkata','West Bengal','University of Calcutta','private','A',
 ARRAY['B.Sc','BA','B.Com','Psychology','Economics']),

-- ── TELANGANA ────────────────────────────────────────────────────────────────
('NALSAR University of Law',
 ARRAY['NALSAR','NALSAR Law School','NALSAR Hyderabad'],
 'Hyderabad','Telangana','NALSAR University of Law','govt','A+',
 ARRAY['BA LLB','LLB','LL.M','MBA','PhD Law']),

('IIT Hyderabad',
 ARRAY['IIT-H','IITH','Indian Institute of Technology Hyderabad'],
 'Hyderabad','Telangana','Autonomous','govt','A+',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Tech AI','M.Tech','PhD']),

('Osmania University',
 ARRAY['OU','Osmania Uni','Osmania University Hyderabad'],
 'Hyderabad','Telangana','Osmania University','govt','A+',
 ARRAY['B.Com','BA','B.Sc','LLB','MBA','MA','M.Sc']),

('JNTU Hyderabad',
 ARRAY['JNTUH','Jawaharlal Nehru Technological University Hyderabad'],
 'Hyderabad','Telangana','JNTU Hyderabad','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech','MBA']),

-- ── ANDHRA PRADESH ───────────────────────────────────────────────────────────
('SRM University Amaravati',
 ARRAY['SRM AP','SRM Amaravati'],
 'Amaravati','Andhra Pradesh','SRM University AP','private','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','BBA','MBA','B.Com']),

('Andhra University',
 ARRAY['AU Vizag','Andhra Uni','Andhra University Visakhapatnam'],
 'Visakhapatnam','Andhra Pradesh','Andhra University','govt','A+',
 ARRAY['B.Tech','B.Pharm','LLB','MBA','B.Com','BA','M.Sc']),

-- ── MADHYA PRADESH ────────────────────────────────────────────────────────────
('IIT Indore',
 ARRAY['IIT-I','IITI','Indian Institute of Technology Indore'],
 'Indore','Madhya Pradesh','Autonomous','govt','A+',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech','PhD']),

('NLU Bhopal',
 ARRAY['National Law University Bhopal','NLU Bhopal','NLIU Bhopal'],
 'Bhopal','Madhya Pradesh','National Law Institute University','govt','A',
 ARRAY['BA LLB','LLB','LL.M','MBA','PhD Law']),

('Devi Ahilya Vishwavidyalaya',
 ARRAY['DAVV','DAVV Indore','Devi Ahilya University Indore'],
 'Indore','Madhya Pradesh','Devi Ahilya Vishwavidyalaya','govt','A',
 ARRAY['B.Tech CSE','B.Com','BA','MBA','LLB','B.Sc','M.Sc']),

-- ── PUNJAB ────────────────────────────────────────────────────────────────────
('Panjab University',
 ARRAY['PU','Panjab Uni','Chandigarh University','PU Chandigarh'],
 'Chandigarh','Punjab','Panjab University','central','A++',
 ARRAY['B.Tech','B.Com','BA','B.Sc','LLB','MBA','BBA','B.Pharm']),

('Thapar Institute of Engineering',
 ARRAY['Thapar','TU','Thapar University','TIET'],
 'Patiala','Punjab','Thapar Institute of Engineering & Technology','deemed','A+',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Chemical','M.Tech','MBA']),

('Chandigarh University',
 ARRAY['CU Chandigarh','CGC','Chandigarh Group of Colleges'],
 'Mohali','Punjab','Chandigarh University','private','A+',
 ARRAY['B.Tech CSE','BBA','MBA','B.Com','LLB','B.Sc Nursing','B.Pharm']),

-- ── KERALA ────────────────────────────────────────────────────────────────────
('NIT Calicut',
 ARRAY['NITC','National Institute of Technology Calicut','NIT Kozhikode'],
 'Kozhikode','Kerala','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),

('Kerala Law Academy',
 ARRAY['KLA Law College','Kerala Law Academy Law College'],
 'Thiruvananthapuram','Kerala','Kerala University','private','A',
 ARRAY['LLB','BA LLB','LL.M']),

('Government Medical College Thiruvananthapuram',
 ARRAY['GMC Trivandrum','Govt Medical Trivandrum','Medical College Thiruvananthapuram'],
 'Thiruvananthapuram','Kerala','Kerala University of Health Sciences','govt','A+',
 ARRAY['MBBS','MD','MS','B.Sc Nursing']),

('Amrita School of Medicine',
 ARRAY['Amrita Medical','Amrita Institute of Medical Sciences','AIMS Kochi'],
 'Kochi','Kerala','Amrita Vishwa Vidyapeetham','deemed','A++',
 ARRAY['MBBS','B.Sc Nursing','B.Pharm','MD','MS']),

-- ── HARYANA ───────────────────────────────────────────────────────────────────
('NLU Sonipat',
 ARRAY['National Law University Delhi','NLU Delhi','NLUD'],
 'Sonipat','Haryana','National Law University Delhi','govt','A+',
 ARRAY['BA LLB','LLB','LL.M','PhD Law']),

('MDU Rohtak',
 ARRAY['Maharshi Dayanand University','MDU','MD University Rohtak'],
 'Rohtak','Haryana','Maharshi Dayanand University','govt','A',
 ARRAY['B.Tech','BA','B.Com','B.Sc','LLB','MBA','BBA']),

('Manav Rachna University',
 ARRAY['MRU','Manav Rachna Faridabad'],
 'Faridabad','Haryana','Manav Rachna University','private','A',
 ARRAY['B.Tech CSE','BBA','MBA','B.Com','LLB','B.Pharm']),

-- ── BIHAR ────────────────────────────────────────────────────────────────────
('NIT Patna',
 ARRAY['NITP','National Institute of Technology Patna'],
 'Patna','Bihar','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),

('Patna Law College',
 ARRAY['PLC','Patna College of Law'],
 'Patna','Bihar','Patna University','govt','B+',
 ARRAY['LLB','BA LLB','LL.M']),

('Patna Medical College and Hospital',
 ARRAY['PMCH','Patna Medical College'],
 'Patna','Bihar','Aryabhatta Knowledge University','govt','B+',
 ARRAY['MBBS','MD','MS']),

-- ── ASSAM ────────────────────────────────────────────────────────────────────
('IIT Guwahati',
 ARRAY['IIT-G','IITG','Indian Institute of Technology Guwahati'],
 'Guwahati','Assam','Autonomous','govt','A++',
 ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Tech Civil','M.Tech','MBA','PhD']),

('Gauhati University',
 ARRAY['GU Guwahati','Gauhati Uni'],
 'Guwahati','Assam','Gauhati University','govt','A',
 ARRAY['BA','B.Sc','B.Com','LLB','MBA','MA','B.Pharm']),

-- ── HIMACHAL PRADESH / UTTARAKHAND ───────────────────────────────────────────
('NIT Hamirpur',
 ARRAY['NITH','National Institute of Technology Hamirpur'],
 'Hamirpur','Himachal Pradesh','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),

('Graphic Era University',
 ARRAY['GEU','Graphic Era Dehradun'],
 'Dehradun','Uttarakhand','Graphic Era University','private','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','BBA','MBA','B.Com']),

-- ── MORE MAHARASHTRA ─────────────────────────────────────────────────────────
('Nagpur University',
 ARRAY['RTMNU','Rashtrasant Tukadoji Maharaj Nagpur University','RTM Nagpur'],
 'Nagpur','Maharashtra','Nagpur University','govt','A',
 ARRAY['BA','B.Com','B.Sc','LLB','MBA','B.Pharm','B.Tech']),

('Government College of Pharmacy Aurangabad',
 ARRAY['GCP Aurangabad','Govt Pharmacy College Aurangabad'],
 'Aurangabad','Maharashtra','Maharashtra University of Health Sciences','govt','A',
 ARRAY['B.Pharm','M.Pharm']),

-- ── ODISHA ────────────────────────────────────────────────────────────────────
('NIT Rourkela',
 ARRAY['NITR','National Institute of Technology Rourkela'],
 'Rourkela','Odisha','Autonomous','govt','A++',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Chemical','B.Tech Civil','M.Tech','MBA']),

('KIIT University',
 ARRAY['KIIT','Kalinga Institute of Industrial Technology','KIIT Bhubaneswar'],
 'Bhubaneswar','Odisha','KIIT University','deemed','A+',
 ARRAY['B.Tech CSE','BBA','MBA','LLB','B.Sc Nursing','B.Pharm']),

-- ── CHATTISGARH ───────────────────────────────────────────────────────────────
('NIT Raipur',
 ARRAY['NITRR','National Institute of Technology Raipur'],
 'Raipur','Chhattisgarh','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','B.Tech Mining','M.Tech']),

-- ── GOA ───────────────────────────────────────────────────────────────────────
('NIT Goa',
 ARRAY['NIT Goa','NITG'],
 'Goa','Goa','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','M.Tech']),

('Goa Medical College',
 ARRAY['GMC Goa','Goa Medical'],
 'Panaji','Goa','Goa University','govt','A',
 ARRAY['MBBS','MD','MS','B.Sc Nursing']),

-- ── JHARKHAND ────────────────────────────────────────────────────────────────
('IIT ISM Dhanbad',
 ARRAY['ISM Dhanbad','IIT ISM','IITISM','Indian School of Mines'],
 'Dhanbad','Jharkhand','Autonomous','govt','A++',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Mining','B.Tech Petroleum','M.Tech','MBA']),

-- ── MANIPUR / NORTHEAST ──────────────────────────────────────────────────────
('NIT Manipur',
 ARRAY['NITMANIPUR','National Institute of Technology Manipur'],
 'Imphal','Manipur','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),

-- ── TRIPURA / MEGHALAYA ──────────────────────────────────────────────────────
('NIT Agartala',
 ARRAY['NITA','National Institute of Technology Agartala'],
 'Agartala','Tripura','Autonomous','govt','A',
 ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']);

-- ── Final row count log ───────────────────────────────────────────────────────
-- colleges: ~80 seeded (top by enrollment + NAAC, all major states)
-- courses:  10 seeded with full year-wise subjects
-- To expand: run the admin seed script with NAAC open data dump
--   or use the /admin/seed-colleges endpoint (TBD in W9)
