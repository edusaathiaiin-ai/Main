-- Migration 047: Add 4 new Saathis
-- ChemEnggSaathi, BioTechSaathi, AerospaceSaathi, ElectronicsSaathi
-- NOTE: id = slug (text PK), consistent with existing verticals seeding pattern.

INSERT INTO public.verticals (id, slug, name, emoji, tagline, primary_color, accent_color, bg_color, is_active, is_live)
VALUES
  ('chemengg saathi', 'chemengg saathi', 'ChemEnggSaathi', '⚗️', 'Where chemistry meets industry', '#7C2D12', '#EA580C', '#FFF1E6', true, false),
  ('biotechsaathi',   'biotechsaathi',   'BioTechSaathi',  '🦠', 'Engineering life, one cell at a time', '#064E3B', '#10B981', '#ECFDF5', true, false),
  ('aerospacesaathi', 'aerospacesaathi', 'AerospaceSaathi','✈️', 'From ground to orbit, engineered', '#1E3A5F', '#3B82F6', '#EFF6FF', true, false),
  ('electronicssaathi','electronicssaathi','ElectronicsSaathi','📡','Signals, systems, and beyond', '#312E81', '#6366F1', '#EEF2FF', true, false)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  emoji         = EXCLUDED.emoji,
  tagline       = EXCLUDED.tagline,
  primary_color = EXCLUDED.primary_color,
  accent_color  = EXCLUDED.accent_color,
  bg_color      = EXCLUDED.bg_color,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();

-- Seed bot_personas Bot 1 for each new Saathi
INSERT INTO public.bot_personas
  (vertical_id, bot_slot, name, role, tone, specialities, never_do, is_active)
VALUES
  ('chemengg saathi', 1,
   'Prof. Rajan',
   'Chemical Process Engineering guide of ChemEnggSaathi',
   'practical and industry-aware, connects theory to plant operations',
   ARRAY['fluid mechanics','heat transfer','mass transfer','reaction engineering','process design','thermodynamics'],
   ARRAY['confuse chemistry with chemical engineering','give medical or safety advice beyond academic context','recommend specific chemicals for non-academic use'],
   true),

  ('biotechsaathi', 1,
   'Dr. Priya',
   'Biotechnology learning guide of BioTechSaathi',
   'curious and research-oriented, bridges biology and engineering',
   ARRAY['genetic engineering','fermentation','bioprocess design','molecular biology','downstream processing','bioinformatics'],
   ARRAY['provide medical diagnoses','recommend genetic modifications outside academic context','give clinical advice'],
   true),

  ('aerospacesaathi', 1,
   'Wing Commander Arya',
   'Aerospace Engineering guide of AerospaceSaathi',
   'precise and inspiring, connects fundamentals to real aircraft and spacecraft',
   ARRAY['aerodynamics','flight mechanics','propulsion','aircraft structures','space technology','avionics'],
   ARRAY['provide classified defence information','recommend modifications to actual aircraft','give aviation operational advice'],
   true),

  ('electronicssaathi', 1,
   'Prof. Mehta',
   'Electronics Engineering guide of ElectronicsSaathi',
   'systematic and practical, connects theory to real circuits and systems',
   ARRAY['analog circuits','digital systems','communication systems','VLSI','embedded systems','signal processing'],
   ARRAY['provide circuit designs for harmful devices','recommend bypassing safety systems','give advice on illegal signal interception'],
   true)
ON CONFLICT (vertical_id, bot_slot) DO NOTHING;

-- Seed courses for the 4 new Saathis
INSERT INTO public.courses
  (name, abbreviations, degree_type, duration_years, saathi_slug, common_aliases, year_wise_subjects)
VALUES

('Bachelor of Technology - Chemical Engineering',
 ARRAY['B.Tech ChemE','BE Chemical','B.Tech Chemical Engineering'],
 'bachelor', 4, 'chemengg saathi',
 ARRAY['chemical engineering','process engineering','chem engg','chemE'],
 '{
   "1": {
     "sem1": ["Engineering Mathematics I","Engineering Physics","Engineering Chemistry","Basic Electrical Engineering","Engineering Drawing"],
     "sem2": ["Engineering Mathematics II","Engineering Mechanics","Computer Programming","Environmental Studies","Workshop Practice"]
   },
   "2": {
     "sem3": ["Chemical Engineering Thermodynamics","Fluid Mechanics","Organic Chemistry","Inorganic Chemistry","Mathematics III"],
     "sem4": ["Heat Transfer","Mass Transfer I","Chemical Reaction Engineering I","Physical Chemistry","Instrumentation"]
   },
   "3": {
     "sem5": ["Mass Transfer II","Chemical Reaction Engineering II","Process Dynamics and Control","Chemical Technology I","Numerical Methods"],
     "sem6": ["Transport Phenomena","Chemical Technology II","Plant Design and Economics","Safety Engineering","Elective I"]
   },
   "4": {
     "sem7": ["Process Integration","Environmental Engineering","Elective II","Elective III","Project I"],
     "sem8": ["Industrial Training","Project II","Elective IV","Seminar"]
   }
 }'::jsonb),

('Bachelor of Technology - Biotechnology',
 ARRAY['B.Tech Biotech','BE Biotechnology','B.Tech Biotechnology'],
 'bachelor', 4, 'biotechsaathi',
 ARRAY['biotechnology','biotech','bioengineering','bio tech'],
 '{
   "1": {
     "sem1": ["Engineering Mathematics","Biology for Engineers","Chemistry","Physics","Computer Science"],
     "sem2": ["Biochemistry I","Cell Biology","Microbiology I","Engineering Drawing","Environmental Science"]
   },
   "2": {
     "sem3": ["Biochemistry II","Genetics","Microbiology II","Bioprocess Engineering I","Analytical Techniques"],
     "sem4": ["Molecular Biology","Immunology","Bioprocess Engineering II","Downstream Processing","Biostatistics"]
   },
   "3": {
     "sem5": ["Genetic Engineering","Fermentation Technology","Enzyme Technology","Bioinformatics","Industrial Biotechnology"],
     "sem6": ["Plant Biotechnology","Animal Biotechnology","Biosafety and Bioethics","Intellectual Property Rights","Elective I"]
   },
   "4": {
     "sem7": ["Nanobiotechnology","Medical Biotechnology","Elective II","Elective III","Project I"],
     "sem8": ["Industrial Training","Project II","Entrepreneurship","Seminar"]
   }
 }'::jsonb),

('Bachelor of Technology - Aerospace Engineering',
 ARRAY['B.Tech Aerospace','BE Aerospace','B.Tech Aeronautical'],
 'bachelor', 4, 'aerospacesaathi',
 ARRAY['aerospace','aeronautical','aero','aviation engineering'],
 '{
   "1": {
     "sem1": ["Engineering Mathematics I","Engineering Physics","Engineering Chemistry","Introduction to Aerospace","Engineering Drawing"],
     "sem2": ["Engineering Mathematics II","Engineering Mechanics","Thermodynamics","Computer Programming","Materials Science"]
   },
   "2": {
     "sem3": ["Aerodynamics I","Aircraft Structures I","Flight Mechanics","Propulsion I","Numerical Methods"],
     "sem4": ["Aerodynamics II","Aircraft Structures II","Control Systems","Propulsion II","Experimental Aerodynamics"]
   },
   "3": {
     "sem5": ["Computational Fluid Dynamics","Structural Dynamics","Avionics","Space Technology","Aircraft Design I"],
     "sem6": ["Helicopter Aerodynamics","Composite Materials","Rocket Propulsion","Navigation Systems","Aircraft Design II"]
   },
   "4": {
     "sem7": ["Aircraft Performance","Aeroelasticity","Elective I","Elective II","Project I"],
     "sem8": ["Industrial Training","Project II","Elective III","Seminar"]
   }
 }'::jsonb),

('Bachelor of Technology - Electronics Engineering',
 ARRAY['B.Tech Electronics','BE Electronics','B.Tech EC','Electronics and Telecommunication'],
 'bachelor', 4, 'electronicssaathi',
 ARRAY['electronics','EC','e&tc','telecommunication','ece without computers'],
 '{
   "1": {
     "sem1": ["Engineering Mathematics I","Engineering Physics","Basic Electronics","Computer Programming","Engineering Drawing"],
     "sem2": ["Engineering Mathematics II","Electronic Devices","Circuit Theory","Digital Electronics","Engineering Chemistry"]
   },
   "2": {
     "sem3": ["Analog Circuits","Signals and Systems","Electromagnetic Theory","Microprocessors","Mathematics III"],
     "sem4": ["Linear Integrated Circuits","Communication Systems I","Control Systems","VLSI Design","Numerical Methods"]
   },
   "3": {
     "sem5": ["Communication Systems II","Digital Signal Processing","Microcontrollers","Antenna Theory","Elective I"],
     "sem6": ["Wireless Communication","Embedded Systems","Optical Fiber Communication","RF Engineering","Elective II"]
   },
   "4": {
     "sem7": ["5G and Beyond","IoT Systems","Elective III","Elective IV","Project I"],
     "sem8": ["Industrial Training","Project II","Elective V","Seminar"]
   }
 }'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- Verify
SELECT id, name, slug, is_live FROM verticals
WHERE slug IN ('chemengg saathi','biotechsaathi','aerospacesaathi','electronicssaathi')
ORDER BY name;
