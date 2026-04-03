-- ── Faculty Differentiation System ───────────────────────────────────────────
-- Three paths: Active (domain-verified) | Retired/Emeritus | Independent
-- Adds: doc upload, badge_type, independent credential, allowed_domains enrichment

-- ── faculty_profiles additions ────────────────────────────────────────────────

ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS verification_doc_url       TEXT NULL,
  -- Supabase Storage path: "{userId}/{type}_{timestamp}.{ext}"

  ADD COLUMN IF NOT EXISTS verification_doc_type      TEXT NULL,
  -- retirement_letter | pension_slip | appointment_letter

  ADD COLUMN IF NOT EXISTS verification_doc_uploaded_at TIMESTAMPTZ NULL,

  ADD COLUMN IF NOT EXISTS independent_credential     TEXT NULL,
  -- Free text: "PhD IIT Bombay, 10 years industry, LinkedIn: ..."

  ADD COLUMN IF NOT EXISTS badge_type                 TEXT NULL;
  -- faculty_verified | emeritus | expert_verified | pending

-- ── allowed_domains enrichment ────────────────────────────────────────────────

ALTER TABLE allowed_domains
  ADD COLUMN IF NOT EXISTS institution_name TEXT,
  ADD COLUMN IF NOT EXISTS auto_verify      BOOLEAN DEFAULT true;

-- Back-fill institution_name from notes where missing
UPDATE allowed_domains
SET institution_name = COALESCE(notes, domain)
WHERE institution_name IS NULL;

-- ── Seed common Indian academic domains ───────────────────────────────────────

INSERT INTO allowed_domains (domain, institution_name, allowed_for_role, auto_verify, is_active)
VALUES
  ('nlu.ac.in',                   'National Law University',              'faculty', true,  true),
  ('iitb.ac.in',                  'IIT Bombay',                          'faculty', true,  true),
  ('iitd.ac.in',                  'IIT Delhi',                           'faculty', true,  true),
  ('iitk.ac.in',                  'IIT Kanpur',                          'faculty', true,  true),
  ('iitm.ac.in',                  'IIT Madras',                          'faculty', true,  true),
  ('iitg.ac.in',                  'IIT Guwahati',                        'faculty', true,  true),
  ('iisc.ac.in',                  'IISc Bangalore',                      'faculty', true,  true),
  ('aiims.edu',                   'AIIMS Delhi',                         'faculty', true,  true),
  ('nfsu.ac.in',                  'NFSU Gandhinagar',                    'faculty', true,  true),
  ('nirmauni.ac.in',              'Nirma University',                    'faculty', true,  true),
  ('pdpu.ac.in',                  'PDPU Gandhinagar',                    'faculty', true,  true),
  ('gtu.ac.in',                   'Gujarat Technological University',    'faculty', true,  true),
  ('gujaratuniversity.ac.in',     'Gujarat University',                  'faculty', true,  true),
  ('cept.ac.in',                  'CEPT University',                     'faculty', true,  true),
  ('svnit.ac.in',                 'SVNIT Surat',                         'faculty', true,  true),
  ('nitk.ac.in',                  'NIT Karnataka',                       'faculty', true,  true),
  ('bits-pilani.ac.in',           'BITS Pilani',                         'faculty', true,  true),
  ('du.ac.in',                    'Delhi University',                    'faculty', true,  true),
  ('jnu.ac.in',                   'Jawaharlal Nehru University',         'faculty', true,  true),
  ('bhu.ac.in',                   'Banaras Hindu University',            'faculty', true,  true),
  ('uohyd.ac.in',                 'University of Hyderabad',             'faculty', true,  true),
  ('manipal.edu',                 'Manipal University',                  'faculty', true,  true),
  ('amity.edu',                   'Amity University',                    'faculty', false, true),
  ('christuniversity.in',         'Christ University',                   'faculty', true,  true),
  ('symbiosis.ac.in',             'Symbiosis International University',  'faculty', true,  true),
  ('vit.ac.in',                   'VIT University',                      'faculty', true,  true),
  ('srm.edu.in',                  'SRM University',                      'faculty', false, true),
  ('lpu.in',                      'Lovely Professional University',      'faculty', false, true)
ON CONFLICT (domain) DO UPDATE SET
  institution_name = EXCLUDED.institution_name,
  auto_verify      = EXCLUDED.auto_verify,
  allowed_for_role = EXCLUDED.allowed_for_role,
  is_active        = EXCLUDED.is_active;

-- ── Storage bucket: faculty-docs ──────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage BEFORE running these policies:
--   1. Create bucket named "faculty-docs"
--   2. Set to PRIVATE (not public)
--
-- Then these policies will apply:

-- Faculty can upload into their own userId sub-folder
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'faculty-docs') THEN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'Faculty upload own docs',
      'faculty-docs',
      'INSERT',
      '(auth.uid()::text = (storage.foldername(name))[1])'
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES (
      'Faculty read own docs',
      'faculty-docs',
      'SELECT',
      '(auth.uid()::text = (storage.foldername(name))[1])'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END$$;
