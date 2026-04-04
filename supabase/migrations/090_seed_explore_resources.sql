-- 090_seed_explore_resources.sql
--
-- Seed initial Explore Beyond resources for KanoonSaathi.
-- These are shown as DB fallback when the curate-resources edge function
-- is unavailable or hasn't generated AI content yet for the current week.
--
-- vertical_id: kanoonsaathi = 2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9

INSERT INTO public.explore_resources
  (vertical_id, title, description, url,
   resource_type, emoji,
   author, publisher, year,
   is_free, is_indian_context,
   display_order, is_featured,
   week_number, curated_by)
VALUES
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Indian Kanoon',
    'Free access to Indian court judgements, statutes, and legal documents. Essential for case law research across all Indian courts.',
    'https://indiankanoon.org',
    'website', '⚖️',
    NULL, NULL, NULL,
    TRUE, TRUE,
    1, TRUE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Live Law',
    'Real-time reporting on Supreme Court and High Court decisions, legal analysis, and breaking news from Indian courts.',
    'https://www.livelaw.in',
    'website', '📰',
    NULL, NULL, NULL,
    TRUE, TRUE,
    2, TRUE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Constitution of India — Full Text',
    'Complete text of the Indian Constitution with all amendments up to date. The primary source for constitutional law study.',
    'https://www.india.gov.in/sites/upload_files/npi/files/coi_part_full.pdf',
    'paper', '📜',
    NULL, 'Government of India', NULL,
    TRUE, TRUE,
    3, TRUE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Bar and Bench',
    'Independent legal news platform covering courts, law firms, regulatory developments, and legal policy across India.',
    'https://www.barandbench.com',
    'website', '🏛️',
    NULL, NULL, NULL,
    TRUE, TRUE,
    4, FALSE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Bare Acts Live',
    'Complete bare acts of India with amendments, section-wise navigation, and commentary. Covers IPC, CPC, CrPC, and all major central acts.',
    'https://www.bareactslive.com',
    'website', '📖',
    NULL, NULL, NULL,
    TRUE, TRUE,
    5, FALSE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Law Commission of India Reports',
    'Official law reform reports from the Law Commission — essential for UPSC Law optional and understanding legislative intent.',
    'https://lawcommissionofindia.nic.in',
    'journal', '🏛️',
    NULL, 'Government of India', NULL,
    TRUE, TRUE,
    6, FALSE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'SSRN Legal Scholarship Network',
    'Pre-print papers in Indian and international law by leading academics. Great for research topics and citation sourcing.',
    'https://www.ssrn.com/index.cfm/en/lawschoolnetwork/',
    'journal', '🔬',
    NULL, 'SSRN', NULL,
    TRUE, FALSE,
    7, FALSE,
    0, 'seed'
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'LawBhoomi — CLAT Preparation',
    'Comprehensive free CLAT, AILET, and law entrance preparation resources including mock tests, current affairs, and GK for law students.',
    'https://lawbhoomi.com',
    'tool', '🎯',
    NULL, NULL, NULL,
    TRUE, TRUE,
    8, FALSE,
    0, 'seed'
  )
ON CONFLICT DO NOTHING;
