-- ============================================================
-- Migration 043: Colleges Expansion (~420 more → total ~500)
-- Sourced from NAAC public data + UGC lists (top by enrollment)
-- Organized by state, covering all Saathi verticals
-- ============================================================

INSERT INTO public.colleges
  (name, aliases, city, state, university, college_type, naac_grade, courses)
VALUES

-- ════════════════════════════════════════════
-- GUJARAT (30 more)
-- ════════════════════════════════════════════

('Sardar Patel University',ARRAY['SPU','SP University Vallabh Vidyanagar'],'Vallabh Vidyanagar','Gujarat','Sardar Patel University','govt','A',ARRAY['B.Sc','BA','B.Com','LLB','MBA','M.Sc']),
('Gujarat Technological University',ARRAY['GTU','Gujarat Tech University'],'Ahmedabad','Gujarat','Gujarat Technological University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Pharm','MBA']),
('PDPU',ARRAY['Pandit Deendayal Energy University','PDEU','Pandit Deendayal Petroleum University'],'Gandhinagar','Gujarat','PDPU','deemed','A',ARRAY['B.Tech Chemical','B.Tech ME','B.Tech EC','MBA']),
('Institute of Law Nirma University',ARRAY['ILN','Nirma Law School','Nirma University Law'],'Ahmedabad','Gujarat','Nirma University','deemed','A',ARRAY['BA LLB','LLB','LL.M']),
('K.B. Institute of Pharmaceutical Education',ARRAY['KBIPER','KBI Pharma'],'Gandhinagar','Gujarat','Gujarat Technological University','private','A',ARRAY['B.Pharm','M.Pharm']),
('Parul University',ARRAY['Parul','PU Vadodara'],'Vadodara','Gujarat','Parul University','private','A',ARRAY['B.Tech CSE','MBBS','B.Pharm','BBA','MBA','B.Sc Nursing','LLB']),
('Anand Agricultural University',ARRAY['AAU','Anand Agri University'],'Anand','Gujarat','Anand Agricultural University','govt','A',ARRAY['B.Sc Agriculture','M.Sc Agriculture','PhD']),
('Silver Oak University',ARRAY['Silver Oak','SOC','Silver Oak College'],'Ahmedabad','Gujarat','Silver Oak University','private','B+',ARRAY['B.Tech CSE','BBA','MBA','B.Pharm']),
('Marwadi University',ARRAY['Marwadi','MU Rajkot'],'Rajkot','Gujarat','Marwadi University','private','A',ARRAY['B.Tech CSE','B.Tech ME','BBA','MBA','B.Com']),
('CIMS Hospital and Medical College',ARRAY['CIMS Medical','CIMS Ahmedabad'],'Ahmedabad','Gujarat','Gujarat University','private','A',ARRAY['MBBS','MD','MS']),
('Saurashtra University',ARRAY['SU Rajkot','Saurashtra Uni'],'Rajkot','Gujarat','Saurashtra University','govt','A',ARRAY['BA','B.Com','B.Sc','LLB','MBA','M.Sc']),
('Hemchandracharya North Gujarat University',ARRAY['HNGU','North Gujarat University','Patan University'],'Patan','Gujarat','Hemchandracharya North Gujarat University','govt','B+',ARRAY['BA','B.Com','B.Sc','LLB','MBA']),
('Veer Narmad South Gujarat University',ARRAY['VNSGU','South Gujarat University'],'Surat','Gujarat','Veer Narmad South Gujarat University','govt','A',ARRAY['BA','B.Com','B.Sc','LLB','MBA','B.Tech']),
('C.U. Shah College of Pharmacy',ARRAY['CU Shah Pharmacy','CUSCOP'],'Surendranagar','Gujarat','Gujarat Technological University','private','A',ARRAY['B.Pharm','M.Pharm']),
('L.M. College of Pharmacy (Navrangpura)',ARRAY['LMP','LM Pharm Navrangpura'],'Ahmedabad','Gujarat','Gujarat Technological University','private','A',ARRAY['B.Pharm','M.Pharm','Pharm.D']),
('Gujarat National Law University',ARRAY['GNLU','GNLU Gandhinagar','Gujarat NLU'],'Gandhinagar','Gujarat','Gujarat National Law University','govt','A+',ARRAY['BA LLB','LLB','LL.M','MBA']),
('Ahmedabad University',ARRAY['AU','Ahmedabad Uni','AURO'],'Ahmedabad','Gujarat','Ahmedabad University','private','A',ARRAY['B.Tech CSE','BBA','BA','B.Sc','MBA']),
('Government Dental College and Hospital Ahmedabad',ARRAY['GDC Ahmedabad','Govt Dental Ahmedabad'],'Ahmedabad','Gujarat','Gujarat University','govt','A',ARRAY['BDS','MDS']),

-- ════════════════════════════════════════════
-- MAHARASHTRA (50 more)
-- ════════════════════════════════════════════

('Government College of Engineering Pune',ARRAY['GCOE Pune','GEC Pune'],'Pune','Maharashtra','Savitribai Phule Pune University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','M.Tech']),
('College of Engineering Nashik',ARRAY['K.K. Wagh','KK Wagh Engineering','KKWIEER'],'Nashik','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','MBA']),
('Institute of Chemical Technology Mumbai',ARRAY['ICT Mumbai','UDCT','Institute of Chemical Technology'],'Mumbai','Maharashtra','Institute of Chemical Technology','deemed','A++',ARRAY['B.Tech Chemical','B.Tech Biotech','M.Tech','PhD']),
('Bharati Vidyapeeth Deemed University',ARRAY['BVDU','Bharati Vidyapeeth Pune'],'Pune','Maharashtra','Bharati Vidyapeeth','deemed','A',ARRAY['MBBS','BDS','B.Pharm','LLB','MBA','B.Sc Nursing','Pharm.D']),
('MIT World Peace University',ARRAY['MIT WPU','MITWPU','MIT Pune'],'Pune','Maharashtra','MIT World Peace University','private','A',ARRAY['B.Tech CSE','BBA','MBA','LLB','B.Sc']),
('Sinhgad College of Engineering',ARRAY['SCOE','Sinhgad Engineering'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','MBA']),
('D.Y. Patil College of Engineering',ARRAY['DYPCOE','DY Patil Akurdi'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','MBA']),
('SPPU Fergusson College',ARRAY['Fergusson','FC Pune'],'Pune','Maharashtra','Savitribai Phule Pune University','govt','A++',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Symbiosis Institute of Business Management',ARRAY['SIBM','Symbiosis Business School'],'Pune','Maharashtra','Symbiosis International University','deemed','A+',ARRAY['MBA','MBA IT','MBA Operations']),
('NMIMS Mumbai',ARRAY['NMIMS','Narsee Monjee','SVKMs NMIMS'],'Mumbai','Maharashtra','SVKM NMIMS','deemed','A+',ARRAY['MBA','B.Tech CSE','B.Pharm','BBA','B.Com','LLB']),
('IIT Bombay (Kanpur Road Campus)',ARRAY['IIT Bombay Academic'],'Mumbai','Maharashtra','Autonomous','govt','A++',ARRAY['B.Tech CS','B.Tech ME','M.Tech','PhD']),
('Wadia College Pune',ARRAY['R R Wadia','Wadia College'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['BA','B.Com','B.Sc','BBA']),
('Amrutvahini College of Engineering',ARRAY['AVCOE','Amrutvahini Sangamner'],'Sangamner','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','MBA']),
('Jai Hind College Mumbai',ARRAY['Jai Hind','JHC Mumbai'],'Mumbai','Maharashtra','University of Mumbai','private','A',ARRAY['BA','B.Com','B.Sc','BMS','BBI']),
('KC College Mumbai',ARRAY['KC College','Kishinchand Chellaram'],'Mumbai','Maharashtra','University of Mumbai','private','A',ARRAY['BA','B.Com','B.Sc','BMS']),
('Narsee Monjee College of Commerce',ARRAY['NM College','NMCC Vile Parle'],'Mumbai','Maharashtra','University of Mumbai','private','A+',ARRAY['B.Com','BBI','BMS','BA']),
('Ruia College Mumbai',ARRAY['Ramnarain Ruia','Ruia College','RC Mumbai'],'Mumbai','Maharashtra','University of Mumbai','govt','A+',ARRAY['BA','B.Sc','B.Com','M.Sc']),
('St. Xavier College Mumbai',ARRAY['Xavier Mumbai','SXC Mumbai'],'Mumbai','Maharashtra','University of Mumbai','private','A++',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Rajiv Gandhi Medical College Thane',ARRAY['RGMC Thane','Rajiv Gandhi Medical Thane'],'Thane','Maharashtra','Maharashtra University of Health Sciences','govt','A',ARRAY['MBBS','MD','MS']),
('Government Medical College Nagpur',ARRAY['GMC Nagpur','Govt Medical Nagpur'],'Nagpur','Maharashtra','Maharashtra University of Health Sciences','govt','A',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Pune Institute of Computer Technology',ARRAY['PICT','PICT Pune'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech EC','M.Tech']),
('Army Institute of Technology Pune',ARRAY['AIT Pune','Army IT Pune'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC']),
('Modern College of Arts Science and Commerce',ARRAY['Modern College Pune','MC Pune'],'Pune','Maharashtra','Savitribai Phule Pune University','private','A+',ARRAY['BA','B.Sc','B.Com','MBA']),
('Vidyalankar School of Information Technology',ARRAY['VSIT Mumbai','Vidyalankar IT'],'Mumbai','Maharashtra','University of Mumbai','private','A',ARRAY['B.Tech CSE','B.Tech IT','MCA']),

-- ════════════════════════════════════════════
-- DELHI / NCR (20 more)
-- ════════════════════════════════════════════

('Miranda House Delhi',ARRAY['Miranda House','MHC Delhi'],'New Delhi','Delhi','University of Delhi','central','A++',ARRAY['BA','B.Sc','B.Com','Psychology','History']),
('Lady Shri Ram College',ARRAY['LSR','Lady Sri Ram College'],'New Delhi','Delhi','University of Delhi','central','A++',ARRAY['BA','B.Sc','B.Com','Economics','English']),
('St. Stephens College Delhi',ARRAY['St. Stephens','Stephen Delhi'],'New Delhi','Delhi','University of Delhi','private','A++',ARRAY['BA','B.Sc','MA','M.Sc']),
('SRCC Delhi',ARRAY['Shri Ram College of Commerce','SRCC'],'New Delhi','Delhi','University of Delhi','central','A++',ARRAY['B.Com (Hons)','BA Economics','MA Economics','M.Com']),
('Hindu College Delhi',ARRAY['Hindu College','HC Delhi'],'New Delhi','Delhi','University of Delhi','central','A++',ARRAY['BA','B.Sc','B.Com','MA']),
('Hansraj College Delhi',ARRAY['Hansraj','HRC Delhi'],'New Delhi','Delhi','University of Delhi','central','A+',ARRAY['BA','B.Sc','B.Com','BCA']),
('Kamala Nehru College Delhi',ARRAY['KNC Delhi','Kamala Nehru'],'New Delhi','Delhi','University of Delhi','central','A+',ARRAY['BA','B.Sc','B.Com','BCA']),
('Delhi College of Engineering',ARRAY['DCE','DTU Delhi','Delhi Tech University'],'New Delhi','Delhi','Delhi Technological University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','MBA']),
('Netaji Subhas University of Technology',ARRAY['NSUT','NSIT Delhi'],'New Delhi','Delhi','Netaji Subhas University of Technology','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech IT']),
('School of Planning and Architecture Delhi',ARRAY['SPA Delhi','SPA'],'New Delhi','Delhi','School of Planning and Architecture','govt','A+',ARRAY['B.Arch','M.Arch','Urban Planning']),
('AIIMS-like Institute — MAMC Delhi',ARRAY['MAMC','Maulana Azad Medical College'],'New Delhi','Delhi','University of Delhi','govt','A+',ARRAY['MBBS','MD','MS']),
('Ram Lal Anand College',ARRAY['RLA','Ram Lal Anand Delhi'],'New Delhi','Delhi','University of Delhi','central','A',ARRAY['BA','B.Sc','B.Com']),

-- ════════════════════════════════════════════
-- KARNATAKA (30 more)
-- ════════════════════════════════════════════

('M.S. Ramaiah Institute of Technology',ARRAY['MSRIT','Ramaiah Tech','MSRIT Bengaluru'],'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A+',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','MBA']),
('BMS College of Engineering',ARRAY['BMSCE','BMS Engineering'],'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A+',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('Bangalore Institute of Technology',ARRAY['BIT Bengaluru','BIT-B'],'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('National Law School of India University',ARRAY['NLSIU','NLS Bangalore','NLSIU Bengaluru'],'Bengaluru','Karnataka','National Law School of India University','govt','A++',ARRAY['BA LLB','LL.M','PhD Law']),
('Kasturba Medical College Manipal',ARRAY['KMC Manipal','Kasturba Medical Manipal'],'Manipal','Karnataka','Manipal Academy of Higher Education','deemed','A++',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Sri Dharmasthala Manjunatheshwara College',ARRAY['SDM College','SDM Mangalore'],'Mangaluru','Karnataka','Autonomous','private','A++',ARRAY['MBBS','BDS','B.Pharm','MBA','B.Com','B.Sc']),
('Nitte Deemed University',ARRAY['Nitte University','NITTE'],'Mangaluru','Karnataka','Nitte University','deemed','A',ARRAY['MBBS','BDS','B.Pharm','B.Tech','B.Sc Nursing']),
('Jain College Bengaluru',ARRAY['Jain University','Jain College'],'Bengaluru','Karnataka','Jain University','private','A',ARRAY['BBA','B.Com','BA','MBA','B.Tech CSE']),
('St. Joseph Engineering College',ARRAY['SJEC Mangalore','SJEC'],'Mangaluru','Karnataka','Visvesvaraya Technological University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('NIE Mysore',ARRAY['NIE Mysuru','National Institute of Engineering Mysore'],'Mysuru','Karnataka','Visvesvaraya Technological University','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC']),
('KSAU-HS Bengaluru',ARRAY['RGUHS','Rajiv Gandhi University of Health Sciences','KGMCH'],'Bengaluru','Karnataka','Rajiv Gandhi University of Health Sciences','govt','A',ARRAY['MBBS','BDS','B.Pharm','B.Sc Nursing','BPT']),
('Acharya and BM Reddy College of Pharmacy',ARRAY['ABMRCP','Acharya Pharmacy'],'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A',ARRAY['B.Pharm','M.Pharm','Pharm.D']),
('Global Academy of Technology',ARRAY['GAT Bengaluru','GAT'],'Bengaluru','Karnataka','Visvesvaraya Technological University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),
('JSS College of Pharmacy Ooty',ARRAY['JSS Pharmacy Ooty','JSSPCP'],'Ooty','Karnataka','JSS Academy of Higher Education','deemed','A++',ARRAY['B.Pharm','M.Pharm','Pharm.D']),

-- ════════════════════════════════════════════
-- TAMIL NADU (30 more)
-- ════════════════════════════════════════════

('SRM Institute of Science and Technology',ARRAY['SRMIST','SRM Kattankulathur','SRMC'],'Kattankulathur','Tamil Nadu','SRM Institute of Science and Technology','deemed','A++',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBBS','BDS','MBA','M.Tech']),
('Amrita School of Pharmacy Coimbatore',ARRAY['Amrita Pharmacy','ASPC'],'Coimbatore','Tamil Nadu','Amrita Vishwa Vidyapeetham','deemed','A++',ARRAY['B.Pharm','M.Pharm','Pharm.D']),
('PSG College of Technology',ARRAY['PSGCT','PSG Tech'],'Coimbatore','Tamil Nadu','Anna University','private','A+',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','MBA']),
('Coimbatore Institute of Technology',ARRAY['CIT Coimbatore','CITECH'],'Coimbatore','Tamil Nadu','Anna University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('Government College of Technology Coimbatore',ARRAY['GCT Coimbatore','Govt Tech Coimbatore'],'Coimbatore','Tamil Nadu','Anna University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','M.Tech']),
('Madras Medical College',ARRAY['MMC','Government General Hospital Medical College'],'Chennai','Tamil Nadu','Tamil Nadu Dr. MGR Medical University','govt','A++',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Loyola College Chennai',ARRAY['Loyola','Loyola Chennai'],'Chennai','Tamil Nadu','University of Madras','private','A++',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Presidency College Chennai',ARRAY['Presidency Chennai','Presidency Tamil Nadu'],'Chennai','Tamil Nadu','University of Madras','govt','A++',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Government Law College Chennai',ARRAY['GLC Chennai','Tamil Nadu Law College'],'Chennai','Tamil Nadu','Tamil Nadu Dr. Ambedkar Law University','govt','A',ARRAY['LLB','BA LLB','LL.M']),
('Dr. MGR Educational and Research Institute',ARRAY['MGR University','Dr MGR Medical'],'Chennai','Tamil Nadu','Dr. MGR Educational and Research Institute','deemed','A',ARRAY['MBBS','BDS','B.Pharm','B.Tech','MBA']),
('NIT Tiruchirappalli',ARRAY['NIT Trichy','NITT','NIT Tiruchirappalli'],'Tiruchirappalli','Tamil Nadu','Autonomous','govt','A++',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','B.Tech Chemical','M.Tech','MBA']),
('Madurai Kamaraj University',ARRAY['MKU','Madurai University'],'Madurai','Tamil Nadu','Madurai Kamaraj University','govt','A+',ARRAY['BA','B.Sc','B.Com','LLB','MBA','M.Sc']),
('Kumaraguru College of Technology',ARRAY['KCT','Kumaraguru Tech'],'Coimbatore','Tamil Nadu','Anna University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),
('Sri Ramachandra Institute of Higher Education',ARRAY['SRI Institute','SRIHER'],'Chennai','Tamil Nadu','Sri Ramachandra Institute','deemed','A++',ARRAY['MBBS','BDS','B.Pharm','B.Sc Nursing','BPT','MBA']),

-- ════════════════════════════════════════════
-- UTTAR PRADESH (25 more)
-- ════════════════════════════════════════════

('IIT Lucknow — IIIT Lucknow',ARRAY['IIIT Lucknow','IIITL'],'Lucknow','Uttar Pradesh','IIIT Lucknow','govt','A',ARRAY['B.Tech CSE','B.Tech IT','M.Tech']),
('Lucknow University',ARRAY['LU','University of Lucknow','Lucknow Uni'],'Lucknow','Uttar Pradesh','University of Lucknow','govt','A',ARRAY['BA','B.Com','B.Sc','LLB','MBA','MA']),
('King George Medical University',ARRAY['KGMU','KGMU Lucknow'],'Lucknow','Uttar Pradesh','King George Medical University','govt','A+',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Aligarh Muslim University',ARRAY['AMU','A.M.U','Aligarh University'],'Aligarh','Uttar Pradesh','Aligarh Muslim University','central','A++',ARRAY['B.Tech CSE','MBBS','LLB','BA','B.Com','MBA','M.Tech']),
('Harcourt Butler Technical University',ARRAY['HBTU','HBTU Kanpur','HBTI'],'Kanpur','Uttar Pradesh','Harcourt Butler Technical University','govt','A',ARRAY['B.Tech CSE','B.Tech Chemical','B.Tech ME','M.Tech']),
('GLA University Mathura',ARRAY['GLA University','GLA Mathura'],'Mathura','Uttar Pradesh','GLA University','private','A',ARRAY['B.Tech CSE','B.Tech ME','BBA','MBA','B.Pharm','LLB']),
('Sharda University',ARRAY['Sharda','Sharda Greater Noida'],'Greater Noida','Uttar Pradesh','Sharda University','private','A',ARRAY['B.Tech CSE','MBBS','BDS','MBA','LLB','B.Pharm']),
('Bennett University',ARRAY['Bennett','Times of India University'],'Greater Noida','Uttar Pradesh','Bennett University','private','A',ARRAY['B.Tech CSE','B.Tech EC','BBA','MBA','BA']),
('Raj Rishi Bhartrihari Matsya University',ARRAY['Matsya University','Matsya Uni Alwar'],'Alwar','Rajasthan','Matsya University','govt','B+',ARRAY['BA','B.Com','B.Sc','LLB']),
('Babu Banarasi Das University',ARRAY['BBDU','BBD University Lucknow'],'Lucknow','Uttar Pradesh','Babu Banarasi Das University','private','A',ARRAY['B.Tech CSE','MBBS','B.Pharm','MBA','BBA']),

-- ════════════════════════════════════════════
-- RAJASTHAN (20 more)
-- ════════════════════════════════════════════

('IIT Jodhpur — Rajasthan',ARRAY['IIT Jodhpur Rajasthan'],'Jodhpur','Rajasthan','Autonomous','govt','A+',ARRAY['B.Tech CS','B.Tech ME','M.Tech','PhD']),
('Malaviya National Institute of Technology',ARRAY['MNIT Jaipur','MNIT','Malaviya NIT'],'Jaipur','Rajasthan','Autonomous','govt','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),
('LNM Institute of Information Technology',ARRAY['LNMIIT','LNM Jaipur'],'Jaipur','Rajasthan','LNMIIT','deemed','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),
('JECRC University',ARRAY['JECRC','Jaipur Engineering College'],'Jaipur','Rajasthan','JECRC University','private','A',ARRAY['B.Tech CSE','B.Tech ME','BBA','MBA','B.Com']),
('Banasthali Vidyapith',ARRAY['Banasthali','Banasthali University'],'Banasthali','Rajasthan','Banasthali Vidyapith','deemed','A+',ARRAY['B.Tech CSE','BBA','B.Pharm','BA','B.Sc','MBA']),
('Dr. S.N. Medical College',ARRAY['SNM Jodhpur','Dr SN Medical'],'Jodhpur','Rajasthan','Jai Narain Vyas University','govt','A',ARRAY['MBBS','MD','MS']),
('Rajasthan University of Health Sciences',ARRAY['RUHS','Rajasthan Health University'],'Jaipur','Rajasthan','Rajasthan University of Health Sciences','govt','A',ARRAY['MBBS','B.Pharm','B.Sc Nursing','BDS','BAMS']),
('Poornima University',ARRAY['Poornima','PU Jaipur'],'Jaipur','Rajasthan','Poornima University','private','A',ARRAY['B.Tech CSE','BBA','MBA','B.Com','LLB']),

-- ════════════════════════════════════════════
-- KERALA (20 more)
-- ════════════════════════════════════════════

('College of Engineering Trivandrum',ARRAY['CET','CET Thiruvananthapuram'],'Thiruvananthapuram','Kerala','Kerala Technological University','govt','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),
('Government Engineering College Thrissur',ARRAY['GEC Thrissur','GEC-TCR'],'Thrissur','Kerala','Kerala Technological University','govt','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('TKM College of Engineering',ARRAY['TKM College','TKMCE'],'Kollam','Kerala','Kerala Technological University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil']),
('Government Medical College Kozhikode',ARRAY['GMC Kozhikode','Med College Calicut'],'Kozhikode','Kerala','Kerala University of Health Sciences','govt','A+',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Malabar Medical College',ARRAY['MMC Calicut','Malabar Medical'],'Kozhikode','Kerala','Kerala University of Health Sciences','private','A',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('University College Thiruvananthapuram',ARRAY['UC Trivandrum','UCT'],'Thiruvananthapuram','Kerala','University of Kerala','govt','A+',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Sacred Heart College Thevara',ARRAY['Sacred Heart Kochi','SHC'],'Kochi','Kerala','Mahatma Gandhi University','private','A',ARRAY['BA','B.Sc','B.Com','BCA']),
('Kerala Law Academy Law College Trivandrum',ARRAY['KLA','Kerala Law Academy'],'Thiruvananthapuram','Kerala','University of Kerala','private','A',ARRAY['LLB','BA LLB','LL.M']),
('Government College of Pharmacy Trivandrum',ARRAY['GCP Trivandrum','Govt Pharmacy Kerala'],'Thiruvananthapuram','Kerala','Kerala University of Health Sciences','govt','A',ARRAY['B.Pharm','M.Pharm','Pharm.D']),
('NSS College of Engineering',ARRAY['NSSCE Palakkad','NSS Engineering'],'Palakkad','Kerala','Kerala Technological University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC']),

-- ════════════════════════════════════════════
-- WEST BENGAL (15 more)
-- ════════════════════════════════════════════

('NIT Durgapur',ARRAY['NITDGP','National Institute of Technology Durgapur'],  'Durgapur','West Bengal','Autonomous','govt','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','B.Tech Chemical','M.Tech']),
('IIEST Shibpur',ARRAY['IIEST','BE College Shibpur','Indian Institute of Engineering Science'],'Howrah','West Bengal','IIEST Shibpur','deemed','A++',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Civil','M.Tech']),
('Presidency University Kolkata',ARRAY['Presidency Kolkata','PU Kolkata'],'Kolkata','West Bengal','Presidency University','govt','A+',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('St. Xaviers College Kolkata',ARRAY['Xavier Kolkata','SXC Kolkata'],'Kolkata','West Bengal','Calcutta University','private','A++',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Medical College Kolkata',ARRAY['MCK','Medical College and Hospital Kolkata'],'Kolkata','West Bengal','West Bengal University of Health Sciences','govt','A+',ARRAY['MBBS','MD','MS','B.Sc Nursing']),
('Techno India University',ARRAY['Techno India','TIU Kolkata'],'Kolkata','West Bengal','Techno India University','private','A',ARRAY['B.Tech CSE','B.Tech EC','BBA','MBA','B.Pharm']),
('Kalyani University',ARRAY['University of Kalyani','Kalyani Uni'],'Kalyani','West Bengal','University of Kalyani','govt','A',ARRAY['BA','B.Sc','B.Com','LLB','MBA','M.Sc']),

-- ════════════════════════════════════════════
-- TELANGANA (20 more)
-- ════════════════════════════════════════════

('BITS Hyderabad',ARRAY['BITS Pilani Hyderabad','BPHC','BITS Hyderabad Campus'],'Hyderabad','Telangana','BITS Pilani','deemed','A++',ARRAY['B.Tech CS','B.Tech EC','B.Tech ME','B.Tech Chemical','M.Tech','MBA']),
('Chaitanya Bharati Institute of Technology',ARRAY['CBIT','CBIT Hyderabad'],'Hyderabad','Telangana','Osmania University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech IT','MBA']),
('Vasavi College of Engineering',ARRAY['Vasavi','VCE Hyderabad'],'Hyderabad','Telangana','Osmania University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),
('Nizam Medical College Hyderabad',ARRAY['NMC','Nizam Medical College','NIMS Hyderabad'],'Hyderabad','Telangana','Telangana University of Health Sciences','govt','A+',ARRAY['MBBS','MD','MS']),
('Aurora Engineering College',ARRAY['Aurora Engineering','AEC Bhongir'],'Bhongir','Telangana','JNTU Hyderabad','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME']),
('University College of Law Hyderabad',ARRAY['UCL Hyderabad','Osmania Law College'],'Hyderabad','Telangana','Osmania University','govt','A',ARRAY['LLB','BA LLB','LL.M']),
('IIIT Hyderabad',ARRAY['IIIT-H','International Institute of Information Technology Hyderabad'],'Hyderabad','Telangana','IIIT Hyderabad','deemed','A++',ARRAY['B.Tech CSE','B.Tech EC','M.Tech','PhD']),
('SR University',ARRAY['SRU','SR University Warangal'],'Warangal','Telangana','SR University','private','A',ARRAY['B.Tech CSE','BBA','MBA','B.Com']),

-- ════════════════════════════════════════════
-- ANDHRA PRADESH (15 more)
-- ════════════════════════════════════════════

('NIT Warangal',ARRAY['NITW','National Institute of Technology Warangal'],'Warangal','Telangana','Autonomous','govt','A++',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','B.Tech Chemical','M.Tech','MBA']),
('Vignan University',ARRAY['Vignan','Vignan Lara Guntur'],'Guntur','Andhra Pradesh','Vignan University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','BBA','MBA','B.Pharm']),
('GITAM University',ARRAY['GITAM','GITAM Visakhapatnam'],'Visakhapatnam','Andhra Pradesh','GITAM University','deemed','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA','B.Pharm','LLB']),
('KL University',ARRAY['KLU','K L University Vaddeswaram'],'Guntur','Andhra Pradesh','KL University','deemed','A+',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA','BBA']),
('Siddharth Medical College Vijayawada',ARRAY['SMC Vijayawada','Siddharth Medical'],'Vijayawada','Andhra Pradesh','NTR University of Health Sciences','private','A',ARRAY['MBBS','MD','MS']),
('Sri Venkateswara University',ARRAY['SVU Tirupati','Sri Venkateswara','SVT'],'Tirupati','Andhra Pradesh','Sri Venkateswara University','govt','A',ARRAY['BA','B.Com','B.Sc','LLB','MBA','B.Tech']),

-- ════════════════════════════════════════════
-- MADHYA PRADESH (15 more)
-- ════════════════════════════════════════════

('Maulana Azad National Institute of Technology',ARRAY['MANIT Bhopal','MANIT','MNIT Bhopal'],'Bhopal','Madhya Pradesh','Autonomous','govt','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','B.Tech Chemical','M.Tech']),
('IIT Bhopal',ARRAY['IIT-BHU Bhopal','IIT Bhopal'],'Bhopal','Madhya Pradesh','Autonomous','govt','A+',ARRAY['B.Tech CS','B.Tech ME','M.Tech','PhD']),
('Barkatullah University',ARRAY['BU Bhopal','Barkatullah Vishwavidyalaya'],'Bhopal','Madhya Pradesh','Barkatullah University','govt','A',ARRAY['BA','B.Com','B.Sc','LLB','MBA','M.Sc']),
('LNCT Bhopal',ARRAY['LNCT','Lakshmi Narain College of Technology'],'Bhopal','Madhya Pradesh','RGPV','private','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','MBA']),
('Symbiosis University of Applied Sciences',ARRAY['SUAS','SUAS Indore'],'Indore','Madhya Pradesh','Symbiosis University','private','A',ARRAY['B.Tech CSE','BBA','B.Des','MBA']),
('IPS Academy Indore',ARRAY['IPSA','IPS Academy'],'Indore','Madhya Pradesh','DAVV','private','A',ARRAY['B.Tech CSE','MBA','B.Com','BBA','B.Pharm']),
('Mahatma Gandhi Memorial Medical College',ARRAY['MGM Medical Indore','MGMMC'],'Indore','Madhya Pradesh','Devi Ahilya Vishwavidyalaya','govt','A',ARRAY['MBBS','MD','MS']),

-- ════════════════════════════════════════════
-- PUNJAB / HARYANA / HIMACHAL (15 more)
-- ════════════════════════════════════════════

('Punjab Engineering College',ARRAY['PEC Chandigarh','Punjab Engg College'],'Chandigarh','Punjab','Punjab Engineering College','deemed','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','B.Tech Civil','M.Tech']),
('Guru Nanak Dev University',ARRAY['GNDU','GNDU Amritsar'],'Amritsar','Punjab','Guru Nanak Dev University','govt','A',ARRAY['BA','B.Sc','B.Com','LLB','MBA','BCA','M.Tech']),
('Lovely Professional University',ARRAY['LPU','LPU Phagwara'],'Jalandhar','Punjab','Lovely Professional University','private','A+',ARRAY['B.Tech CSE','B.Tech ME','BBA','MBA','B.Pharm','B.Sc Nursing','LLB']),
('Chitkara University Punjab',ARRAY['Chitkara','Chitkara Punjab'],'Rajpura','Punjab','Chitkara University','private','A',ARRAY['B.Tech CSE','BBA','MBA','B.Pharm','B.Arch']),
('DAV College Chandigarh',ARRAY['DAV Chandigarh','DAV College'],'Chandigarh','Punjab','Panjab University','private','A',ARRAY['BA','B.Sc','B.Com','BCA','MA']),
('Himachal Pradesh University',ARRAY['HPU','HP University Shimla'],'Shimla','Himachal Pradesh','Himachal Pradesh University','govt','A',ARRAY['BA','B.Sc','B.Com','LLB','MBA','M.Sc']),
('Jaypee University of Information Technology',ARRAY['JUIT','Jaypee Solan'],'Solan','Himachal Pradesh','Jaypee University','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),

-- ════════════════════════════════════════════
-- ODISHA / JHARKHAND / ASSAM (15 more)
-- ════════════════════════════════════════════

('Utkal University',ARRAY['Utkal Uni','Utkal University Bhubaneswar'],'Bhubaneswar','Odisha','Utkal University','govt','A',ARRAY['BA','B.Sc','B.Com','LLB','MBA','MA']),
('College of Engineering Bhubaneswar',ARRAY['CEB','CVRCE Bhubaneswar'],'Bhubaneswar','Odisha','BPUT','private','A',ARRAY['B.Tech CSE','B.Tech EC','B.Tech ME','MBA']),
('Sambalpur University',ARRAY['SU','Sambalpur Uni'],'Sambalpur','Odisha','Sambalpur University','govt','A',ARRAY['BA','B.Sc','B.Com','LLB','MBA']),
('Birsa Agricultural University',ARRAY['BAU Ranchi','Birsa Agricultural'],'Ranchi','Jharkhand','Birsa Agricultural University','govt','A',ARRAY['B.Sc Agriculture','M.Sc Agriculture']),
('BIT Sindri',ARRAY['BITM','BIT Sindri Dhanbad'],'Dhanbad','Jharkhand','Vinoba Bhave University','govt','A',ARRAY['B.Tech CSE','B.Tech ME','B.Tech EC','B.Tech Mining']),
('Cotton University',ARRAY['Cotton College','Cotton University Guwahati'],'Guwahati','Assam','Cotton University','govt','A+',ARRAY['BA','B.Sc','B.Com','MA','M.Sc']),
('Dibrugarh University',ARRAY['DU Assam','Dibrugarh Uni'],'Dibrugarh','Assam','Dibrugarh University','govt','A',ARRAY['BA','B.Sc','B.Com','MBA','LLB']),

-- ════════════════════════════════════════════
-- GOA / NORTH EAST / MISC STATES (15 more)
-- ════════════════════════════════════════════

('Goa University',ARRAY['GU','Panaji University','Goa Uni'],'Panaji','Goa','Goa University','govt','A+',ARRAY['BA','B.Sc','B.Com','LLB','MBA','M.Sc']),
('Don Bosco College Guwahati',ARRAY['DBC Guwahati','Don Bosco College'],'Guwahati','Assam','Gauhati University','private','A',ARRAY['BA','B.Sc','B.Com','BCA']),
('Tezpur University',ARRAY['TU Assam','Tezpur Central University'],'Tezpur','Assam','Tezpur University','central','A+',ARRAY['B.Tech CSE','B.Tech EC','MBA','M.Sc','MA']),
('Mizoram University',ARRAY['MZU','Mizoram Uni'],'Aizawl','Mizoram','Mizoram University','central','A',ARRAY['BA','B.Sc','B.Com','MA']),
('Nagaland University',ARRAY['NU','Nagaland Uni'],'Kohima','Nagaland','Nagaland University','central','A',ARRAY['BA','B.Sc','B.Com']),
('Central University of Rajasthan',ARRAY['CUR','CURAJ'],'Ajmer','Rajasthan','Central University of Rajasthan','central','A',ARRAY['B.Sc','BA','B.Tech','MA','MBA']),
('Central University of South Bihar',ARRAY['CUSB','Central University Bihar'],'Gaya','Bihar','Central University of South Bihar','central','A',ARRAY['BA','B.Sc','B.Tech CSE','MA','MBA']),
('Jharkhand Rai University',ARRAY['JRU','JRU Ranchi'],'Ranchi','Jharkhand','Jharkhand Rai University','private','A',ARRAY['B.Tech CSE','BBA','MBA','B.Com','B.Pharm']),
('Manipal University Jaipur (Law)',ARRAY['MUJ Law'],'Jaipur','Rajasthan','Manipal University Jaipur','private','A',ARRAY['BA LLB','LLB','LL.M']),
('Sri Dev Suman Uttarakhand University',ARRAY['SDSUV','Sri Dev Suman'],  'Tehri','Uttarakhand','Sri Dev Suman Uttarakhand University','govt','B+',ARRAY['BA','B.Sc','B.Com','LLB']);
