-- ═══════════════════════════════════════════════════════
-- Faculty Profile Enrichment
-- LinkedIn, Google Scholar, research, thesis, speciality
-- + seed allowed_domains for institutional email validation
-- ═══════════════════════════════════════════════════════

-- Add rich profile fields to faculty_profiles
ALTER TABLE faculty_profiles
ADD COLUMN IF NOT EXISTS linkedin_url TEXT NULL,
ADD COLUMN IF NOT EXISTS google_scholar_url TEXT NULL,
ADD COLUMN IF NOT EXISTS current_research TEXT NULL,
  -- what they're currently researching (500 chars)
ADD COLUMN IF NOT EXISTS thesis_title TEXT NULL,
  -- PhD/Masters thesis title
ADD COLUMN IF NOT EXISTS speciality_areas TEXT[] DEFAULT '{}',
  -- up to 5 speciality areas
ADD COLUMN IF NOT EXISTS interest_areas TEXT[] DEFAULT '{}',
  -- broader academic interests beyond teaching
ADD COLUMN IF NOT EXISTS publications_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_qualification TEXT NULL;
  -- PhD | M.Phil | Masters | Professional

-- ═══════════════════════════════════════════════════════
-- Seed allowed_domains for Indian universities
-- Faculty MUST register with institutional email
-- ═══════════════════════════════════════════════════════

INSERT INTO allowed_domains (domain, allowed_for_role, notes) VALUES
  -- Generic Indian academic domains
  ('ac.in', 'faculty', 'Indian academic institutions'),
  ('edu.in', 'faculty', 'Indian educational institutions'),
  ('res.in', 'faculty', 'Indian research institutions'),
  ('ernet.in', 'faculty', 'ERNET network institutions'),

  -- IITs
  ('iitb.ac.in', 'faculty', 'IIT Bombay'),
  ('iitd.ac.in', 'faculty', 'IIT Delhi'),
  ('iitm.ac.in', 'faculty', 'IIT Madras'),
  ('iitkgp.ac.in', 'faculty', 'IIT Kharagpur'),
  ('iitk.ac.in', 'faculty', 'IIT Kanpur'),
  ('iitr.ac.in', 'faculty', 'IIT Roorkee'),
  ('iitg.ac.in', 'faculty', 'IIT Guwahati'),
  ('iith.ac.in', 'faculty', 'IIT Hyderabad'),
  ('iitj.ac.in', 'faculty', 'IIT Jodhpur'),
  ('iitgn.ac.in', 'faculty', 'IIT Gandhinagar'),
  ('iitp.ac.in', 'faculty', 'IIT Patna'),
  ('iitbbs.ac.in', 'faculty', 'IIT Bhubaneswar'),
  ('iitrpr.ac.in', 'faculty', 'IIT Ropar'),
  ('iiti.ac.in', 'faculty', 'IIT Indore'),
  ('iitmandi.ac.in', 'faculty', 'IIT Mandi'),

  -- IISc + IISERs
  ('iisc.ac.in', 'faculty', 'IISc Bangalore'),
  ('iiserpune.ac.in', 'faculty', 'IISER Pune'),
  ('iiserb.ac.in', 'faculty', 'IISER Bhopal'),
  ('iisermohali.ac.in', 'faculty', 'IISER Mohali'),
  ('iiserkol.ac.in', 'faculty', 'IISER Kolkata'),

  -- NITs
  ('nitk.ac.in', 'faculty', 'NIT Karnataka'),
  ('nitw.ac.in', 'faculty', 'NIT Warangal'),
  ('nitt.edu', 'faculty', 'NIT Trichy'),
  ('nits.ac.in', 'faculty', 'NIT Silchar'),
  ('svnit.ac.in', 'faculty', 'SVNIT Surat'),
  ('mnnit.ac.in', 'faculty', 'MNNIT Allahabad'),
  ('vnit.ac.in', 'faculty', 'VNIT Nagpur'),

  -- Central Universities
  ('du.ac.in', 'faculty', 'Delhi University'),
  ('jnu.ac.in', 'faculty', 'JNU Delhi'),
  ('bhu.ac.in', 'faculty', 'BHU Varanasi'),
  ('amu.ac.in', 'faculty', 'AMU Aligarh'),
  ('uohyd.ac.in', 'faculty', 'University of Hyderabad'),
  ('efl.ac.in', 'faculty', 'EFLU Hyderabad'),
  ('jmi.ac.in', 'faculty', 'Jamia Millia Islamia'),
  ('visva-bharati.ac.in', 'faculty', 'Visva-Bharati'),

  -- Medical + Pharma
  ('aiims.edu', 'faculty', 'AIIMS Delhi'),
  ('aiimsbhopal.edu.in', 'faculty', 'AIIMS Bhopal'),
  ('nfrims.ac.in', 'faculty', 'NFRI Mangalore'),
  ('jipmer.edu.in', 'faculty', 'JIPMER Puducherry'),

  -- Law
  ('nls.ac.in', 'faculty', 'NLSIU Bangalore'),
  ('nludelhi.ac.in', 'faculty', 'NLU Delhi'),
  ('gnlu.ac.in', 'faculty', 'GNLU Gandhinagar'),
  ('nluo.ac.in', 'faculty', 'NLU Odisha'),
  ('nluassam.ac.in', 'faculty', 'NLU Assam'),
  ('nirmauni.ac.in', 'faculty', 'Nirma University'),

  -- Gujarat universities
  ('gtu.ac.in', 'faculty', 'GTU Ahmedabad'),
  ('gujaratuniversity.ac.in', 'faculty', 'Gujarat University'),
  ('ddu.ac.in', 'faculty', 'DDU Nadiad'),
  ('ldce.ac.in', 'faculty', 'LD College of Engineering'),
  ('cept.ac.in', 'faculty', 'CEPT University'),
  ('msu.ac.in', 'faculty', 'MS University Baroda'),
  ('spuvvn.edu', 'faculty', 'SP University Anand'),

  -- Maharashtra
  ('mu.ac.in', 'faculty', 'Mumbai University'),
  ('unipune.ac.in', 'faculty', 'Savitribai Phule Pune University'),
  ('coep.ac.in', 'faculty', 'COEP Pune'),

  -- Karnataka
  ('iiitb.ac.in', 'faculty', 'IIIT Bangalore'),
  ('manipal.edu', 'faculty', 'Manipal Academy'),
  ('christuniversity.in', 'faculty', 'Christ University'),

  -- Tamil Nadu
  ('annauniv.edu', 'faculty', 'Anna University'),
  ('iitm.ac.in', 'faculty', 'IIT Madras'),
  ('srmist.edu.in', 'faculty', 'SRM University'),
  ('vit.ac.in', 'faculty', 'VIT Vellore'),

  -- Telangana + AP
  ('iiit.ac.in', 'faculty', 'IIIT Hyderabad'),
  ('bits-pilani.ac.in', 'faculty', 'BITS Pilani'),

  -- West Bengal
  ('iitkgp.ac.in', 'faculty', 'IIT Kharagpur'),
  ('caluniv.ac.in', 'faculty', 'Calcutta University'),
  ('jadavpuruniversity.in', 'faculty', 'Jadavpur University'),

  -- Rajasthan
  ('uniraj.ac.in', 'faculty', 'Rajasthan University'),
  ('mnit.ac.in', 'faculty', 'MNIT Jaipur'),

  -- UP
  ('iitr.ac.in', 'faculty', 'IIT Roorkee'),
  ('bhu.ac.in', 'faculty', 'BHU'),

  -- Institution domains
  ('edu', 'institution', 'General education'),
  ('ac.in', 'institution', 'Indian academic'),
  ('edu.in', 'institution', 'Indian education'),
  ('org.in', 'institution', 'Indian organisation')

ON CONFLICT (domain) DO NOTHING;

-- Generic email domains to BLOCK for faculty
-- (checked in application code, not stored here)
-- gmail.com, yahoo.com, yahoo.in, hotmail.com,
-- outlook.com, live.com, rediffmail.com,
-- protonmail.com, aol.com, icloud.com
