/**
 * supabase/functions/rss-fetch/index.ts
 *
 * RSS News Fetcher — runs via cron at 6:00 AM IST daily.
 * Fetches RSS feeds for all active verticals, parses headlines + URLs,
 * and upserts into news_items table. Never stores article body.
 *
 * ── CRON AUTH ────────────────────────────────────────────────────────────────
 * This function uses a CRON_SECRET header — NOT the service role key.
 * The service role key must NEVER appear in SQL cron jobs.
 *
 * Trigger via Supabase cron:
 *   select cron.schedule('rss-fetch-daily', '30 0 * * *', $$
 *     select net.http_post(
 *       url     := 'https://<project>.supabase.co/functions/v1/rss-fetch',
 *       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
 *     );
 *   $$);
 *   (30 0 UTC = 05:30 IST = 6:00 AM IST)
 *
 * Add to Supabase secrets:
 *   CRON_SECRET=<random 32-char string — generate with: openssl rand -hex 16>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const PROFESSOR_NOTES_PER_SAATHI = 1; // Reduced from 3 to fit in 150s Edge Function limit

// Startup env check — never log key values or prefixes
console.log('[rss-fetch] ENV check:', {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  hasCronSecret: !!CRON_SECRET,
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// RSS feed definitions — headline + URL only (zero copyright risk)
// ---------------------------------------------------------------------------

type FeedDef = {
  url: string;
  source: string;
  category: string;
};

const RSS_FEEDS: Record<string, FeedDef[]> = {
  kanoonsaathi: [
    { url: 'https://www.barandbench.com/feed', source: 'Bar & Bench', category: 'Law' },
    { url: 'https://www.livelaw.in/feed', source: 'Live Law', category: 'Law' },
    { url: 'https://feeds.feedburner.com/TheHinduLegal', source: 'The Hindu Legal', category: 'Law' },
    { url: 'https://lawmin.gov.in/rss', source: 'Ministry of Law', category: 'Indian Legislation' },
    { url: 'https://main.sci.gov.in/rss', source: 'Supreme Court of India', category: 'Supreme Court' },
    { url: 'https://prsindia.org/rss.xml', source: 'PRS India', category: 'Legislative Research' },
    { url: 'https://www.indiacode.nic.in/rss', source: 'India Code', category: 'Indian Acts & Statutes' },
  ],

  medicosaathi: [
    { url: 'https://www.nejm.org/action/showFeed?type=etoc&pub=nejm&jc=nejm', source: 'NEJM', category: 'Medical Research' },
    { url: 'https://www.thelancet.com/rssfeed/lancet_current.xml', source: 'The Lancet', category: 'Medical Research' },
    { url: 'https://jamanetwork.com/rss/site_3/67.xml', source: 'JAMA', category: 'Medical Research' },
    { url: 'https://www.bmj.com/rss/thebmj_current.xml', source: 'BMJ', category: 'Medical Research' },
    { url: 'https://www.nature.com/nm.rss', source: 'Nature Medicine', category: 'Medical Research' },
    { url: 'https://www.cochranelibrary.com/cdsr/reviews.rss', source: 'Cochrane Library', category: 'Evidence-Based Medicine' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=medical+education&format=rss', source: 'PubMed', category: 'Medical Research' },
    { url: 'https://www.who.int/rss-feeds/news-english.xml', source: 'WHO', category: 'Global Health' },
    { url: 'https://rss.sciencedaily.com/releases/health_medicine.xml', source: 'Science Daily', category: 'Health' },
  ],

  pharmasaathi: [
    // ── #1 — Nature Reviews Drug Discovery (IF ~120, gold standard for drug discovery reviews)
    { url: 'https://www.nature.com/nrd.rss', source: 'Nature Reviews Drug Discovery', category: 'Drug Discovery' },
    // ── Trends in Pharmacological Sciences (Cell Press elite review journal)
    { url: 'https://www.cell.com/trends/pharmacological-sciences/rss/current', source: 'Trends in Pharmacological Sciences', category: 'Pharmacology Reviews' },
    // ── Advanced Drug Delivery Reviews (Elsevier — top for delivery/formulation/pharmaceutics)
    { url: 'https://rss.sciencedirect.com/publication/science/0169409X', source: 'Advanced Drug Delivery Reviews', category: 'Drug Delivery' },
    // ── Journal of Controlled Release (Elsevier — leading for drug delivery systems)
    { url: 'https://rss.sciencedirect.com/publication/science/01683659', source: 'Journal of Controlled Release', category: 'Controlled Release' },
    // ── Clinical Pharmacology & Therapeutics (Wiley/ASCPT — flagship for translational PK/PD)
    { url: 'https://ascpt.onlinelibrary.wiley.com/action/showFeed?jc=15326535&type=etoc&feed=rss', source: 'Clinical Pharmacology & Therapeutics', category: 'Clinical Pharmacology' },
    // ── The AAPS Journal (Springer — American Association of Pharmaceutical Scientists flagship)
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=12248', source: 'The AAPS Journal', category: 'Pharmaceutical Sciences' },
    // ── Pharmaceutical Research (Springer — core AAPS journal, widely used)
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=11095', source: 'Pharmaceutical Research', category: 'Pharmaceutical Research' },
    // ── Journal of Pharmaceutical Sciences (Elsevier/APhA — broad pharmaceutics/pharmacy)
    { url: 'https://rss.sciencedirect.com/publication/science/00223549', source: 'Journal of Pharmaceutical Sciences', category: 'Pharmaceutics' },
    // ── Molecular Pharmaceutics (ACS — elite for pharma/chemistry interface)
    { url: 'https://pubs.acs.org/action/showFeed?type=axatoc&feed=rss&jc=mpohbp', source: 'Molecular Pharmaceutics (ACS)', category: 'Molecular Pharmaceutics' },
    // ── European Journal of Pharmaceutical Sciences (Elsevier — key European/global outlet)
    { url: 'https://rss.sciencedirect.com/publication/science/09280987', source: 'European Journal of Pharmaceutical Sciences', category: 'Pharmaceutical Sciences' },
    // ── PubMed — pharmacology/drug discovery (NIH — primary global index)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=pharmacology+drug+discovery&format=rss', source: 'PubMed Pharmacology', category: 'Pharmacology Research' },
    // ── Science Daily pharmacy/pharma for accessible headline news
    { url: 'https://rss.sciencedaily.com/releases/health_medicine/pharmacology.xml', source: 'Science Daily Pharmacology', category: 'Pharmacology News' },
  ],

  nursingsaathi: [
    // ── International Journal of Nursing Studies (Elsevier — #1 in nursing by impact, IF ~7.5)
    { url: 'https://rss.sciencedirect.com/publication/science/00207489', source: 'Int. Journal of Nursing Studies', category: 'Nursing Research' },
    // ── Journal of Advanced Nursing (Wiley — elite empirical nursing, IF ~3.8)
    { url: 'https://onlinelibrary.wiley.com/feed/13652648/most-recent', source: 'Journal of Advanced Nursing', category: 'Nursing Research' },
    // ── Journal of Clinical Nursing (Wiley — top clinical practice journal)
    { url: 'https://onlinelibrary.wiley.com/feed/13652702/most-recent', source: 'Journal of Clinical Nursing', category: 'Clinical Nursing' },
    // ── Worldviews on Evidence-Based Nursing (Wiley/Sigma Theta Tau — premier for EBP in nursing)
    { url: 'https://onlinelibrary.wiley.com/feed/17416787/most-recent', source: 'Worldviews on Evidence-Based Nursing', category: 'Evidence-Based Nursing' },
    // ── Nursing Outlook (Elsevier — AAN flagship for policy and leadership)
    { url: 'https://rss.sciencedirect.com/publication/science/00296554', source: 'Nursing Outlook', category: 'Nursing Policy & Leadership' },
    // ── Nurse Education Today (Elsevier — leading for nursing education research)
    { url: 'https://rss.sciencedirect.com/publication/science/02606917', source: 'Nurse Education Today', category: 'Nursing Education' },
    // ── Journal of Nursing Management (Wiley — top for nursing administration/management)
    { url: 'https://onlinelibrary.wiley.com/feed/13652834/most-recent', source: 'Journal of Nursing Management', category: 'Nursing Management' },
    // ── Intensive and Critical Care Nursing (Elsevier — specialist critical care nursing)
    { url: 'https://rss.sciencedirect.com/publication/science/09645395', source: 'Intensive and Critical Care Nursing', category: 'Critical Care Nursing' },
    // ── PubMed nursing — comprehensive nursing research index (NIH)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=nursing+research+evidence+based&format=rss', source: 'PubMed Nursing', category: 'Nursing Research' },
    // ── Annual Review of Nursing Research (Springer — authoritative reviews for nursing science)
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=11547', source: 'Annual Review of Nursing Research', category: 'Nursing Reviews' },
    // ── Science Daily health/medicine headlines for accessible nursing news
    { url: 'https://rss.sciencedaily.com/releases/health_medicine.xml', source: 'Science Daily Health', category: 'Nursing News' },
    // ── WHO — global nursing/health policy and evidence
    { url: 'https://www.who.int/rss-feeds/news-english.xml', source: 'WHO', category: 'Global Health & Nursing' },
    // ── BMC Nursing (BioMed Central — fully open access, India-accessible, high reliability)
    { url: 'https://bmcnurs.biomedcentral.com/articles/most-recent/rss.xml', source: 'BMC Nursing', category: 'Nursing Research' },
    // ── Nursing Open (Wiley open access — broad clinical + education scope)
    { url: 'https://onlinelibrary.wiley.com/feed/20470302/most-recent', source: 'Nursing Open', category: 'Open Access Nursing' },
    // ── Nursing Times (UK — leading practice-facing nursing news, widely read globally)
    { url: 'https://www.nursingtimes.net/?feed=rss2', source: 'Nursing Times', category: 'Nursing Practice News' },
    // ── Medscape Nursing (clinical updates, drug news, case studies for practising nurses)
    { url: 'https://www.medscape.com/rss/news', source: 'Medscape', category: 'Clinical Nursing Updates' },
    // ── PubMed — India nursing research (India-specific evidence base)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=nursing+India+clinical+evidence&format=rss', source: 'PubMed India Nursing', category: 'Indian Nursing Research' },
    // ── PubMed — community & public health nursing (primary care, rural health, CHO context)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=community+health+nursing+public+health&format=rss', source: 'PubMed Community Health', category: 'Community Health Nursing' },
    // ── PubMed — paediatric nursing (SNCU, NICU, child health — high exam + clinical relevance)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=pediatric+neonatal+nursing+clinical&format=rss', source: 'PubMed Paediatric Nursing', category: 'Paediatric Nursing' },
    // ── PubMed — oncology nursing (rapidly growing specialty in India)
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=oncology+palliative+nursing+care&format=rss', source: 'PubMed Oncology Nursing', category: 'Oncology Nursing' },
  ],
  psychsaathi: [
    // ── Annual Review of Psychology (IF ~26 — consistently #1 review journal in psychology)
    { url: 'https://www.annualreviews.org/rss/content/journals/psych/loi', source: 'Annual Review of Psychology', category: 'Psychology Reviews' },
    // ── Psychological Bulletin (APA — #1 for meta-analyses and comprehensive reviews, IF ~16)
    { url: 'https://content.apa.org/journals/bul.rss', source: 'Psychological Bulletin', category: 'Psychology Reviews & Meta-Analyses' },
    // ── Psychological Review (APA — top theoretical and computational modeling journal)
    { url: 'https://content.apa.org/journals/rev.rss', source: 'Psychological Review', category: 'Theoretical Psychology' },
    // ── American Psychologist (APA flagship — broad high-impact articles across all subfields)
    { url: 'https://content.apa.org/journals/amp.rss', source: 'American Psychologist', category: 'Psychology' },
    // ── Psychological Science (APS flagship — highest-ranked empirical journal, IF ~8)
    { url: 'https://journals.sagepub.com/action/showFeed?jc=pss&type=etoc&feed=rss', source: 'Psychological Science', category: 'Empirical Psychology' },
    // ── Perspectives on Psychological Science (APS — high-impact reviews with societal implications)
    { url: 'https://journals.sagepub.com/action/showFeed?jc=pps&type=etoc&feed=rss', source: 'Perspectives on Psychological Science', category: 'Psychology Perspectives' },
    // ── Nature Human Behaviour (Nature portfolio — elite multidisciplinary behavioral science, IF ~29)
    { url: 'https://www.nature.com/nathumbehav.rss', source: 'Nature Human Behaviour', category: 'Behavioral Science' },
    // ── Behavioral and Brain Sciences (Cambridge — major theoretical papers with open peer commentary)
    { url: 'https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/rss', source: 'Behavioral and Brain Sciences', category: 'Theoretical Psychology' },
    // ── Journal of Abnormal Psychology (APA — leading clinical/psychopathology journal)
    { url: 'https://content.apa.org/journals/abn.rss', source: 'Journal of Abnormal Psychology', category: 'Clinical Psychology' },
    // ── Journal of Personality and Social Psychology (APA — definitive social/personality, IF ~8)
    { url: 'https://content.apa.org/journals/psp.rss', source: 'Journal of Personality and Social Psychology', category: 'Social Psychology' },
    // ── Current Directions in Psychological Science (APS — concise reviews across all subfields)
    { url: 'https://journals.sagepub.com/action/showFeed?jc=cdp&type=etoc&feed=rss', source: 'Current Directions in Psychological Science', category: 'Psychology Updates' },
    // ── Developmental Psychology (APA — top developmental science outlet)
    { url: 'https://content.apa.org/journals/dev.rss', source: 'Developmental Psychology', category: 'Developmental Psychology' },
    // ── PubMed psychology — comprehensive cross-disciplinary psychology research index
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=psychology+mental+health&format=rss', source: 'PubMed Psychology', category: 'Psychology Research' },
    // ── Science Daily mind/brain headlines (accessible news layer across all psych subfields)
    { url: 'https://rss.sciencedaily.com/releases/mind_brain.xml', source: 'Science Daily Mind & Brain', category: 'Psychology News' },
  ],
  maathsaathi: [
    { url: 'https://rss.sciencedaily.com/releases/computers_math.xml', source: 'Science Daily', category: 'Mathematics' },
    { url: 'https://arxiv.org/rss/math', source: 'arXiv Math', category: 'Mathematics Research' },
    { url: 'https://arxiv.org/rss/math.NT', source: 'arXiv Number Theory', category: 'Number Theory' },
    { url: 'https://arxiv.org/rss/math.AG', source: 'arXiv Algebraic Geometry', category: 'Algebraic Geometry' },
    { url: 'https://www.ams.org/rss/notices.rss', source: 'AMS Notices', category: 'Mathematics Community' },
    { url: 'https://www.ams.org/rss/jams.rss', source: 'JAMS', category: 'Mathematics Research' },
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=209', source: 'Inventiones Mathematicae', category: 'Mathematics Research' },
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=10240', source: 'IHÉS Publications', category: 'Mathematics Research' },
    { url: 'https://projecteuclid.org/feeds/euclid.dmj.xml', source: 'Duke Mathematical Journal', category: 'Mathematics Research' },
    { url: 'https://www.mathunion.org/feed', source: 'IMU', category: 'Global Mathematics' },
  ],

  chemsaathi: [
    { url: 'https://feeds.rsc.org/rss/cc', source: 'Royal Society of Chemistry', category: 'Chemistry' },
    { url: 'https://www.nature.com/nchem.rss', source: 'Nature Chemistry', category: 'Chemistry Research' },
    { url: 'https://pubs.acs.org/action/showFeed?type=axatoc&feed=rss&jc=jacsat', source: 'JACS (ACS)', category: 'Chemistry Research' },
    { url: 'https://pubs.acs.org/action/showFeed?type=axatoc&feed=rss&jc=iechad', source: 'Ind. Eng. Chem. Research', category: 'Industrial Chemistry' },
    { url: 'https://rss.arxiv.org/rss/physics.chem-ph', source: 'arXiv Chemical Physics', category: 'Chemical Physics' },
  ],
  biosaathi: [
    // Flagship multidisciplinary
    { url: 'https://www.cell.com/cell/rss/current', source: 'Cell', category: 'Biology Research' },
    { url: 'https://www.nature.com/nature.rss', source: 'Nature', category: 'Biology Research' },
    { url: 'https://www.science.org/rss/news_current.xml', source: 'Science', category: 'Biology Research' },
    { url: 'https://www.pnas.org/rss/current.xml', source: 'PNAS', category: 'Biology Research' },
    // Elite Nature Reviews
    { url: 'https://www.nature.com/nrm.rss', source: 'Nature Reviews Molecular Cell Biology', category: 'Cell Biology' },
    { url: 'https://www.nature.com/nrg.rss', source: 'Nature Reviews Genetics', category: 'Genetics' },
    { url: 'https://www.nature.com/nrmicro.rss', source: 'Nature Reviews Microbiology', category: 'Microbiology' },
    // Open access leaders
    { url: 'https://elifesciences.org/rss/recent.xml', source: 'eLife', category: 'Biology Research' },
    { url: 'https://journals.plos.org/plosbiology/feed/atom', source: 'PLOS Biology', category: 'Biology Research' },
    // Key databases & reviews
    { url: 'https://academic.oup.com/rss/site_5507/advanceAccess_5181.xml', source: 'Nucleic Acids Research', category: 'Molecular Biology' },
    { url: 'https://www.annualreviews.org/rss/content/journals/biochem/loi', source: 'Annual Review of Biochemistry', category: 'Biochemistry' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=biology+research&format=rss', source: 'PubMed Biology', category: 'Biology Research' },
    { url: 'https://arxiv.org/rss/q-bio', source: 'arXiv q-bio', category: 'Quantitative Biology' },
    { url: 'https://rss.sciencedaily.com/releases/biology.xml', source: 'Science Daily', category: 'Biology' },
  ],

  mechsaathi: [
    // Fast, reliable feeds first
    { url: 'https://www.theengineer.co.uk/feed/', source: 'The Engineer', category: 'Mechanical Engineering' },
    { url: 'https://www.nature.com/nmat.rss', source: 'Nature Materials', category: 'Advanced Materials' },
    { url: 'https://rss.arxiv.org/rss/physics.flu-dyn', source: 'arXiv Fluid Dynamics', category: 'Fluid Mechanics' },
    { url: 'https://rss.arxiv.org/rss/cond-mat.mtrl-sci', source: 'arXiv Materials Science', category: 'Materials' },
    { url: 'https://rss.sciencedirect.com/publication/science/08906955', source: 'Int. J. Machine Tools & Manufacture', category: 'Manufacturing' },
    { url: 'https://rss.sciencedirect.com/publication/science/00207403', source: 'Int. J. Mechanical Sciences', category: 'Mechanical Sciences' },
  ],
  civilsaathi: [
    { url: 'https://www.constructiondive.com/feeds/news/', source: 'Construction Dive', category: 'Construction News' },
    { url: 'https://www.nature.com/natsustain.rss', source: 'Nature Sustainability', category: 'Sustainable Engineering' },
    { url: 'https://rss.arxiv.org/rss/eess.SY', source: 'arXiv Systems & Control', category: 'Structural Control' },
    { url: 'https://rss.sciencedirect.com/publication/science/09265805', source: 'Automation in Construction', category: 'Construction Automation' },
    { url: 'https://rss.sciencedirect.com/publication/science/09500618', source: 'Construction and Building Materials', category: 'Building Materials' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=civil+engineering+infrastructure&format=rss', source: 'PubMed Civil', category: 'Civil Research' },
  ],
  elecsaathi: [
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Electronics' },
    { url: 'https://www.nature.com/natelectron.rss', source: 'Nature Electronics', category: 'Electronics Research' },
    { url: 'https://ieeexplore.ieee.org/rss/recentArticles/5498878.rss', source: 'Proceedings of the IEEE', category: 'Electronics Research' },
    { url: 'https://ieeexplore.ieee.org/rss/recentArticles/9648.rss', source: 'IEEE Comms Surveys', category: 'Telecommunications' },
    { url: 'https://onlinelibrary.wiley.com/feed/15214095/most-recent', source: 'Advanced Materials', category: 'Electronic Materials' },
    { url: 'https://rss.sciencedaily.com/releases/computers_math/computer_science.xml', source: 'Science Daily', category: 'Electronics' },
  ],
  compsaathi: [
    // ── ACM Computing Surveys (elite survey journal — #1 in CS by citations)
    { url: 'https://dl.acm.org/action/showFeed?ui-lang=en&type=etoc&feed=rss&jc=csur', source: 'ACM Computing Surveys', category: 'CS Surveys' },
    // ── IEEE TPAMI (flagship for vision/AI, IF ~24 — hugely cited globally)
    { url: 'https://ieeexplore.ieee.org/rss/recentArticles/34.rss', source: 'IEEE TPAMI', category: 'AI & Computer Vision' },
    // ── Communications of the ACM (broad flagship — ACM's premier outlet)
    { url: 'https://cacm.acm.org/rss/acmTechNews.xml', source: 'ACM CACM', category: 'CS Research' },
    // ── Journal of Machine Learning Research (open-access gold standard for ML)
    { url: 'https://www.jmlr.org/jmlr.xml', source: 'JMLR', category: 'Machine Learning' },
    // ── Journal of the ACM (top for theoretical CS — Turing-adjacent results)
    { url: 'https://dl.acm.org/action/showFeed?ui-lang=en&type=etoc&feed=rss&jc=jacm', source: 'Journal of the ACM', category: 'Theoretical CS' },
    // ── Nature Machine Intelligence (elite for AI/ML breakthroughs)
    { url: 'https://www.nature.com/natmachintell.rss', source: 'Nature Machine Intelligence', category: 'AI Research' },
    // ── IEEE TNNLS (Transactions on Neural Networks and Learning Systems)
    { url: 'https://ieeexplore.ieee.org/rss/recentArticles/5962385.rss', source: 'IEEE TNNLS', category: 'Neural Networks & ML' },
    // ── International Journal of Computer Vision (Springer — leading in vision)
    { url: 'https://link.springer.com/search.rss?search-within=Journal&facet-journal-id=11263', source: 'Int. Journal of Computer Vision', category: 'Computer Vision' },
    // ── Artificial Intelligence Journal (Elsevier — long-standing top AI journal since 1970)
    { url: 'https://rss.sciencedirect.com/publication/science/00043702', source: 'Artificial Intelligence (Elsevier)', category: 'Artificial Intelligence' },
    // ── ACM Transactions on Database Systems (elite for databases)
    { url: 'https://dl.acm.org/action/showFeed?ui-lang=en&type=etoc&feed=rss&jc=tods', source: 'ACM TODS', category: 'Database Systems' },
    // ── ACM Transactions on Computer Systems (top for systems/architecture)
    { url: 'https://dl.acm.org/action/showFeed?ui-lang=en&type=etoc&feed=rss&jc=tocs', source: 'ACM TOCS', category: 'Computer Systems' },
    // ── arXiv subfields — primary global preprint server
    { url: 'https://rss.arxiv.org/rss/cs.AI', source: 'arXiv CS.AI', category: 'AI Preprints' },
    { url: 'https://rss.arxiv.org/rss/cs.LG', source: 'arXiv CS.LG', category: 'Machine Learning Preprints' },
    { url: 'https://rss.arxiv.org/rss/cs.CV', source: 'arXiv CS.CV', category: 'Computer Vision Preprints' },
    { url: 'https://rss.arxiv.org/rss/cs.CL', source: 'arXiv CS.CL', category: 'NLP Preprints' },
    // ── Science Daily for accessible CS headline news
    { url: 'https://rss.sciencedaily.com/releases/computers_math/artificial_intelligence.xml', source: 'Science Daily CS', category: 'CS News' },
  ],


  envirosaathi: [
    { url: 'https://rss.sciencedaily.com/releases/earth_climate.xml', source: 'Science Daily', category: 'Environmental Science' },
    { url: 'https://arxiv.org/rss/eess.SP', source: 'arXiv', category: 'Environmental Research' },
  ],
  bizsaathi: [
    { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', source: 'Economic Times', category: 'Business' },
    { url: 'https://www.livemint.com/rss/news', source: 'Mint', category: 'Business' },
  ],
  finsaathi: [
    { url: 'https://rbi.org.in/rss/Rss.aspx', source: 'RBI', category: 'Finance' },
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times Markets', category: 'Finance' },
  ],
  mktsaathi: [
    { url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms', source: 'Economic Times Industry', category: 'Marketing' },
    { url: 'https://www.livemint.com/rss/brand-stories', source: 'Mint', category: 'Marketing' },
  ],
  hrsaathi: [
    { url: 'https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms', source: 'Economic Times', category: 'HR' },
  ],
  archsaathi: [
    { url: 'https://www.archdaily.com/feed', source: 'ArchDaily', category: 'Architecture' },
    { url: 'https://www.dezeen.com/architecture/feed/', source: 'Dezeen Architecture', category: 'Architecture & Design' },
    { url: 'https://www.architecturalrecord.com/rss/topic/news', source: 'Architectural Record', category: 'Architecture News' },
    { url: 'https://www.architectural-review.com/rss', source: 'Architectural Review', category: 'Architecture & Criticism' },
    { url: 'https://www.domusweb.it/en.rss.xml', source: 'Domus', category: 'Architecture & Design' },
    { url: 'https://www.tandfonline.com/feed/rss/rjar20', source: 'Tandfonline RJAR', category: 'Architecture Research' },
    { url: 'https://www.tandfonline.com/feed/rss/tasr20', source: 'Architectural Science Review', category: 'Architecture Research' },
    { url: 'https://rss.sciencedirect.com/publication/science/20952635', source: 'Frontiers of Arch Research', category: 'Architecture Research' },
    { url: 'https://www.ribapublishing.com/rss', source: 'RIBA Publishing', category: 'Architecture Practice' },
  ],

  historysaathi: [
    { url: 'https://www.historytoday.com/rss.xml', source: 'History Today', category: 'History' },
    { url: 'https://rss.sciencedaily.com/releases/fossils_ruins.xml', source: 'Science Daily', category: 'Archaeology' },
  ],
  econsaathi: [
    // Top 5 global economics journals
    { url: 'https://academic.oup.com/rss/site_5504/advanceAccess_5171.xml', source: 'QJE', category: 'Economics Research' },
    { url: 'https://www.aeaweb.org/journals/aer/rss.xml', source: 'American Economic Review', category: 'Economics Research' },
    { url: 'https://onlinelibrary.wiley.com/feed/14680262/most-recent', source: 'Econometrica', category: 'Economics Research' },
    { url: 'https://www.journals.uchicago.edu/action/showFeed?type=etoc&feed=rss&jc=jpe', source: 'Journal of Political Economy', category: 'Economics Research' },
    { url: 'https://academic.oup.com/rss/site_5508/advanceAccess_5174.xml', source: 'Review of Economic Studies', category: 'Economics Research' },
    // AEA journals suite
    { url: 'https://www.aeaweb.org/journals/aeli/rss.xml', source: 'AER: Insights', category: 'Economics Research' },
    { url: 'https://www.aeaweb.org/journals/app/rss.xml', source: 'AEJ: Applied Economics', category: 'Applied Economics' },
    { url: 'https://www.aeaweb.org/journals/pol/rss.xml', source: 'AEJ: Economic Policy', category: 'Economic Policy' },
    { url: 'https://www.aeaweb.org/journals/mac/rss.xml', source: 'AEJ: Macroeconomics', category: 'Macroeconomics' },
    { url: 'https://www.aeaweb.org/journals/mic/rss.xml', source: 'AEJ: Microeconomics', category: 'Microeconomics' },
    { url: 'https://www.aeaweb.org/journals/jel/rss.xml', source: 'Journal of Economic Literature', category: 'Economics Surveys' },
    { url: 'https://www.aeaweb.org/journals/jep/rss.xml', source: 'Journal of Economic Perspectives', category: 'Economics Overview' },
    // Working papers & news
    { url: 'https://feeds.nberwp.org/feed', source: 'NBER Working Papers', category: 'Economics Research' },
    { url: 'https://rbi.org.in/rss/Rss.aspx', source: 'RBI', category: 'Indian Economics' },
    { url: 'https://economictimes.indiatimes.com/rssfeeds/7771282.cms', source: 'Economic Times', category: 'Economics News' },
  ],

  // ── New Saathis (migration 047) ────────────────────────────────────────────
  'chemengg-saathi': [
    { url: 'https://www.chemengonline.com/feed/', source: 'Chem Eng Online', category: 'Process Engineering' },
    { url: 'https://www.nature.com/nchem.rss', source: 'Nature Chemistry', category: 'Chemical Sciences' },
    { url: 'https://rss.arxiv.org/rss/physics.chem-ph', source: 'arXiv Chemical Physics', category: 'Chemical Engineering' },
    { url: 'https://pubs.acs.org/action/showFeed?type=axatoc&feed=rss&jc=iechad', source: 'Ind. Eng. Chem. Research', category: 'Chemical Engineering' },
  ],

  biotechsaathi: [
    { url: 'https://www.nature.com/nbt.rss', source: 'Nature Biotechnology', category: 'Biotechnology' },
    { url: 'https://www.genengnews.com/feed/', source: 'GEN News', category: 'Biotech Industry' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=biotechnology&format=rss', source: 'PubMed Biotech', category: 'Biotech Research' },
    { url: 'https://www.biotechniques.com/feed/', source: 'BioTechniques', category: 'Lab Methods' },
  ],

  aerospacesaathi: [
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', source: 'NASA', category: 'Space Science' },
    { url: 'https://www.esa.int/rssfeed/Our_Activities/Space_News', source: 'ESA', category: 'Space Exploration' },
    { url: 'https://aerospaceamerica.aiaa.org/feed/', source: 'AIAA', category: 'Aerospace' },
    { url: 'https://www.flightglobal.com/rss', source: 'Flight Global', category: 'Aviation' },
  ],

  electronicssaathi: [
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Electronics' },
    { url: 'https://www.electronicsforu.com/feed', source: 'Electronics For You', category: 'Electronics India' },
    { url: 'https://www.electronicsweekly.com/feed/', source: 'Electronics Weekly', category: 'Electronics News' },
    { url: 'https://eepower.com/feed/', source: 'EE Power', category: 'Power Electronics' },
  ],

  // ── New Saathis (migration 070+) ──────────────────────────────────────────

  physicsaathi: [
    { url: 'https://rss.arxiv.org/rss/physics', source: 'arXiv Physics', category: 'Physics Research' },
    { url: 'https://rss.arxiv.org/rss/hep-ph', source: 'arXiv HEP Phenomenology', category: 'Particle Physics' },
    { url: 'https://rss.arxiv.org/rss/cond-mat', source: 'arXiv Condensed Matter', category: 'Condensed Matter' },
    { url: 'https://rss.arxiv.org/rss/quant-ph', source: 'arXiv Quantum Physics', category: 'Quantum Physics' },
    { url: 'https://www.nature.com/nphys.rss', source: 'Nature Physics', category: 'Physics Research' },
    { url: 'https://journals.aps.org/prl/recent.xml', source: 'Physical Review Letters', category: 'Physics Research' },
    { url: 'https://rss.sciencedaily.com/releases/matter_energy.xml', source: 'Science Daily Physics', category: 'Physics News' },
    { url: 'https://physicsworld.com/feed/', source: 'Physics World', category: 'Physics News' },
  ],

  accountsaathi: [
    { url: 'https://economictimes.indiatimes.com/wealth/tax/rssfeeds/837555174.cms', source: 'Economic Times Tax', category: 'Taxation' },
    { url: 'https://www.livemint.com/rss/money', source: 'Mint Money', category: 'Finance & Accounting' },
    { url: 'https://rbi.org.in/rss/Rss.aspx', source: 'RBI', category: 'Banking & Regulation' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=accounting+audit+finance&format=rss', source: 'PubMed Accounting', category: 'Accounting Research' },
    { url: 'https://rss.sciencedaily.com/releases/science_society/economics.xml', source: 'Science Daily Economics', category: 'Economic Research' },
  ],

  polscisaathi: [
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu National', category: 'Indian Politics' },
    { url: 'https://prsindia.org/rss.xml', source: 'PRS India', category: 'Legislative Research' },
    { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'PIB India', category: 'Government Policy' },
    { url: 'https://www.cambridge.org/core/journals/american-political-science-review/rss', source: 'APSR', category: 'Political Science Research' },
    { url: 'https://journals.sagepub.com/action/showFeed?jc=cps&type=etoc&feed=rss', source: 'Comparative Political Studies', category: 'Comparative Politics' },
    { url: 'https://rss.sciencedaily.com/releases/science_society/political_science.xml', source: 'Science Daily PolSci', category: 'Political Science News' },
  ],

  statssaathi: [
    { url: 'https://rss.arxiv.org/rss/stat', source: 'arXiv Statistics', category: 'Statistics Research' },
    { url: 'https://rss.arxiv.org/rss/stat.ML', source: 'arXiv Statistical ML', category: 'Statistical Machine Learning' },
    { url: 'https://rss.arxiv.org/rss/stat.AP', source: 'arXiv Applied Statistics', category: 'Applied Statistics' },
    { url: 'https://rss.sciencedaily.com/releases/computers_math/statistics.xml', source: 'Science Daily Statistics', category: 'Statistics News' },
    { url: 'https://www.nature.com/natmethods.rss', source: 'Nature Methods', category: 'Statistical Methods' },
  ],

  geosaathi: [
    { url: 'https://www.nature.com/ngeo.rss', source: 'Nature Geoscience', category: 'Earth Science' },
    { url: 'https://rss.sciencedaily.com/releases/earth_climate.xml', source: 'Science Daily Earth', category: 'Earth & Climate' },
    { url: 'https://rss.sciencedaily.com/releases/earth_climate/geography.xml', source: 'Science Daily Geography', category: 'Geography' },
    { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu National', category: 'Indian Geography Context' },
    { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'PIB India', category: 'Government Geography' },
  ],

  agrisaathi: [
    { url: 'https://rss.sciencedaily.com/releases/plants_animals/agriculture_and_food.xml', source: 'Science Daily Agriculture', category: 'Agricultural Science' },
    { url: 'https://www.nature.com/nplants.rss', source: 'Nature Plants', category: 'Plant Science' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=agriculture+crop+science+India&format=rss', source: 'PubMed Agriculture', category: 'Agricultural Research' },
    { url: 'https://economictimes.indiatimes.com/news/economy/agriculture/rssfeeds/15891793.cms', source: 'Economic Times Agriculture', category: 'Indian Agriculture' },
    { url: 'https://www.downtoearth.org.in/rss/agriculture', source: 'Down To Earth', category: 'Agriculture & Environment' },
  ],

};

// UPSC feeds shared across all verticals
const UPSC_FEEDS: FeedDef[] = [
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu National', category: 'UPSC' },
  { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'PIB India', category: 'UPSC' },
  { url: 'https://prsindia.org/rss.xml', source: 'PRS India', category: 'UPSC' },
];

// ---------------------------------------------------------------------------
// Trusted source domains — hard-coded authenticity guardrail per Saathi.
// Articles whose URLs don't match any domain in this list are rejected.
// An empty array = no domain restriction (fail open for that Saathi).
// ---------------------------------------------------------------------------

const TRUSTED_DOMAINS: Record<string, string[]> = {
  kanoonsaathi:    ['barandbench.com', 'livelaw.in', 'thehindu.com', 'lawmin.gov.in', 'sci.gov.in', 'prsindia.org', 'indiacode.nic.in'],
  medicosaathi:    ['nejm.org', 'thelancet.com', 'jamanetwork.com', 'bmj.com', 'nature.com', 'cochranelibrary.com', 'pubmed.ncbi.nlm.nih.gov', 'who.int', 'sciencedaily.com'],
  pharmasaathi:    ['nature.com', 'cell.com', 'sciencedirect.com', 'springer.com', 'acs.org', 'wiley.com', 'pubmed.ncbi.nlm.nih.gov', 'sciencedaily.com'],
  nursingsaathi:   ['sciencedirect.com', 'wiley.com', 'springer.com', 'pubmed.ncbi.nlm.nih.gov', 'who.int', 'sciencedaily.com'],
  psychsaathi:     ['apa.org', 'sagepub.com', 'nature.com', 'cambridge.org', 'pubmed.ncbi.nlm.nih.gov', 'sciencedaily.com'],
  maathsaathi:     ['sciencedaily.com', 'arxiv.org', 'ams.org', 'springer.com', 'projecteuclid.org', 'mathunion.org'],
  chemsaathi:      ['rsc.org', 'sciencedaily.com', 'acs.org', 'nature.com'],
  biosaathi:       ['cell.com', 'nature.com', 'science.org', 'pnas.org', 'elifesciences.org', 'plos.org', 'oup.com', 'annualreviews.org', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'sciencedaily.com'],
  mechsaathi:      ['sciencedirect.com', 'wiley.com', 'asmedigitalcollection.asme.org', 'annualreviews.org', 'nature.com', 'arxiv.org', 'sciencedaily.com'],
  civilsaathi:     ['sciencedirect.com', 'wiley.com', 'ascelibrary.org', 'nature.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'sciencedaily.com'],
  elecsaathi:      ['spectrum.ieee.org', 'nature.com', 'ieeexplore.ieee.org', 'wiley.com', 'sciencedaily.com'],
  compsaathi:      ['dl.acm.org', 'ieeexplore.ieee.org', 'jmlr.org', 'nature.com', 'sciencedirect.com', 'springer.com', 'arxiv.org', 'sciencedaily.com'],
  envirosaathi:    ['sciencedaily.com', 'arxiv.org', 'nature.com'],
  bizsaathi:       ['economictimes.indiatimes.com', 'livemint.com'],
  finsaathi:       ['rbi.org.in', 'economictimes.indiatimes.com'],
  mktsaathi:       ['economictimes.indiatimes.com', 'livemint.com'],
  hrsaathi:        ['economictimes.indiatimes.com'],
  archsaathi:      ['archdaily.com', 'dezeen.com', 'architecturalrecord.com', 'architectural-review.com', 'domusweb.it', 'tandfonline.com', 'sciencedirect.com'],
  historysaathi:   ['historytoday.com', 'sciencedaily.com'],
  econsaathi:      ['oup.com', 'aeaweb.org', 'wiley.com', 'uchicago.edu', 'nber.org', 'rbi.org.in', 'economictimes.indiatimes.com'],
  biotechsaathi:   ['nature.com', 'sciencedaily.com', 'genengnews.com', 'pubmed.ncbi.nlm.nih.gov'],
  aerospacesaathi: ['nasa.gov', 'esa.int', 'aiaa.org', 'isro.gov.in', 'sciencedaily.com'],
  electronicssaathi: ['spectrum.ieee.org', 'sciencedaily.com', 'electronicsforu.com'],
  physicsaathi:    ['arxiv.org', 'nature.com', 'aps.org', 'sciencedaily.com', 'physicsworld.com'],
  accountsaathi:   ['economictimes.indiatimes.com', 'livemint.com', 'rbi.org.in', 'pubmed.ncbi.nlm.nih.gov', 'sciencedaily.com'],
  polscisaathi:    ['thehindu.com', 'prsindia.org', 'pib.gov.in', 'cambridge.org', 'sagepub.com', 'sciencedaily.com'],
  statssaathi:     ['arxiv.org', 'sciencedaily.com', 'nature.com'],
  geosaathi:       ['nature.com', 'sciencedaily.com', 'thehindu.com', 'pib.gov.in'],
  agrisaathi:      ['sciencedaily.com', 'nature.com', 'pubmed.ncbi.nlm.nih.gov', 'economictimes.indiatimes.com', 'downtoearth.org.in'],
};

function isDomainTrusted(url: string, saathiKey: string): boolean {
  const trusted = TRUSTED_DOMAINS[saathiKey];
  // If no list defined for this Saathi, fail open (allow all)
  if (!trusted || trusted.length === 0) return true;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return trusted.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Professor note generation via Groq
// ---------------------------------------------------------------------------

const SAATHI_SUBJECTS: Record<string, string> = {
  kanoonsaathi:    'Law and Legal Studies',
  medicosaathi:    'Medicine and Clinical Sciences',
  pharmasaathi:    'Pharmaceutical Sciences and Drug Discovery',
  nursingsaathi:   'Nursing and Healthcare',
  psychsaathi:     'Psychology and Behavioural Sciences',
  maathsaathi:     'Mathematics',
  chemsaathi:      'Chemistry',
  biosaathi:       'Biology and Life Sciences',
  mechsaathi:      'Mechanical Engineering',
  civilsaathi:     'Civil and Structural Engineering',
  elecsaathi:      'Electrical and Electronics Engineering',
  compsaathi:      'Computer Science and Artificial Intelligence',
  envirosaathi:    'Environmental Engineering',
  bizsaathi:       'Business and Management',
  finsaathi:       'Finance and Economics',
  mktsaathi:       'Marketing and Brand Strategy',
  hrsaathi:        'Human Resources and Organisational Behaviour',
  archsaathi:      'Architecture and Design',
  historysaathi:   'History and Social Sciences',
  econsaathi:      'Economics',
  biotechsaathi:   'Biotechnology and Bioengineering',
  aerospacesaathi: 'Aerospace and Space Engineering',
  electronicssaathi: 'Electronics Engineering',
  physicsaathi:      'Physics',
  accountsaathi:     'Accounting, Auditing, and Taxation',
  polscisaathi:      'Political Science and Governance',
  statssaathi:       'Statistics and Data Science',
  geosaathi:         'Geography and Earth Sciences',
  agrisaathi:        'Agriculture and Crop Science',
};

async function generateProfessorNote(title: string, source: string, saathiKey: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  const subject = SAATHI_SUBJECTS[saathiKey] ?? 'this field';

  const prompt = `Acting as a Lead Professor in ${subject}, explain this news to a student in exactly 2 sentences:
Sentence 1: What happened? (state the development clearly)
Sentence 2: Why it matters for their future career in ${subject}. (be specific, not generic)

News headline: "${title}"
Source: ${source}

Rules: No bullet points. No labels like "Sentence 1". Just 2 clean sentences. Be direct and inspiring.`;

  try {
    type GroqResp = { choices: Array<{ message: { content: string } }> };
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 120,
        temperature: 0.6,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as GroqResp;
    return data.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// RSS parsing — pure text parsing, no external parser library needed
// ---------------------------------------------------------------------------

type RssItem = {
  title: string;
  url: string;
  publishedAt: string | null;
};

function extractText(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRx = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRx);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();

  // Handle plain text
  const plainRx = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRx);
  return plainMatch?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() ?? '';
}

function parseRssFeed(xml: string, maxItems = 10): RssItem[] {
  const items: RssItem[] = [];

  // Split on <item> or <entry> tags (RSS 2.0 and Atom)
  const itemRx = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRx.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];

    const title = extractText(block, 'title');
    // For links: try <link>, then <link href="..."/>, then <guid isPermaLink="true">
    const linkPlain = extractText(block, 'link');
    const linkAtomMatch = block.match(/<link[^>]+href="([^"]+)"/i);
    const url = linkAtomMatch?.[1] ?? linkPlain;

    const pubDate =
      extractText(block, 'pubDate') ||
      extractText(block, 'published') ||
      extractText(block, 'updated') ||
      null;

    if (!title || !url) continue;

    let publishedAt: string | null = null;
    if (pubDate) {
      try {
        publishedAt = new Date(pubDate).toISOString();
      } catch {
        publishedAt = null;
      }
    }

    items.push({ title, url, publishedAt });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Fetch one feed with a timeout
// ---------------------------------------------------------------------------

async function fetchFeed(feedUrl: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'EdUsaathiAI-RSSBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Accept both GET (cron trigger) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── Auth check: x-cron-secret OR service_role Bearer ────────────────────────
  const incomingSecret = req.headers.get('x-cron-secret');
  const authBearer     = req.headers.get('Authorization')?.replace('Bearer ', '');
  const isAuthed       = (CRON_SECRET && incomingSecret === CRON_SECRET)
                      || (authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('Using service role:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  console.log('SUPABASE_URL set:', !!SUPABASE_URL);

  // Build slug → UUID map using the slug column directly
  const { data: verticalRows } = await admin.from('verticals').select('id, name, slug');
  const verticalUUIDs: Record<string, string> = {};
  for (const v of (verticalRows ?? [])) {
    // Primary: use slug column as-is (matches RSS_FEEDS keys)
    verticalUUIDs[v.slug as string] = v.id as string;
    // Secondary: also map lowercased name without spaces (fallback)
    const nameSlug = (v.name as string).toLowerCase().replace(/\s+/g, '');
    if (!verticalUUIDs[nameSlug]) verticalUUIDs[nameSlug] = v.id as string;
  }
  // Handle typo: RSS_FEEDS uses 'envirosaathi', DB has 'EnviroSaathi' → slug 'envirosathi'
  if (verticalUUIDs['envirosathi']) verticalUUIDs['envirosaathi'] = verticalUUIDs['envirosathi'];
  console.log('[rss-fetch] Vertical UUID map:', JSON.stringify(verticalUUIDs));

  const failedFeeds: { vertical: string; url: string; source: string; reason: string }[] = [];
  const results: Record<string, { inserted: number; skipped: number; rejected: number; errors: string[] }> = {};
  let totalInserted = 0;

  for (const [verticalId, feeds] of Object.entries(RSS_FEEDS)) {
    results[verticalId] = { inserted: 0, skipped: 0, rejected: 0, errors: [] };
    let professorNotesGenerated = 0;

    // Each vertical gets its own feeds + shared UPSC feeds
    const allFeeds = [...feeds, ...UPSC_FEEDS];

    for (const feed of allFeeds) {
      const xml = await fetchFeed(feed.url);
      if (!xml) {
        const reason = `Failed to fetch: ${feed.url}`;
        results[verticalId].errors.push(reason);
        failedFeeds.push({ vertical: verticalId, url: feed.url, source: feed.source, reason });
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      const items = parseRssFeed(xml, 10);

      for (const item of items) {
        const verticalUUID = verticalUUIDs[verticalId] ?? null;
        if (!verticalUUID) {
          console.error('NO UUID for vertical:', verticalId, '— skipping item');
          continue;
        }

        // ── 24-hour rule: skip articles older than 24 hours ──────────────────
        if (item.publishedAt) {
          const age = Date.now() - new Date(item.publishedAt).getTime();
          if (age > 24 * 60 * 60 * 1000) {
            results[verticalId].skipped++;
            continue;
          }
        }

        // ── Domain verification — hard-coded authenticity guardrail ───────────
        const trusted = isDomainTrusted(item.url, verticalId);
        if (!trusted) {
          console.warn(`[rss-fetch] REJECTED (untrusted domain): ${item.url.slice(0, 80)}`);
          results[verticalId].rejected++;
          continue;
        }

        // ── Professor note — top 3 new articles per Saathi get an explanation ─
        let professorNote: string | null = null;
        if (professorNotesGenerated < PROFESSOR_NOTES_PER_SAATHI) {
          professorNote = await generateProfessorNote(item.title, feed.source, verticalId);
          if (professorNote) professorNotesGenerated++;
        }

        const { error: upsertError } = await admin.from('news_items').upsert(
          {
            vertical_id: verticalUUID,
            source: feed.source,
            category: feed.category,
            title: item.title.slice(0, 500),
            url: item.url.slice(0, 1000),
            published_at: item.publishedAt,
            fetched_at: new Date().toISOString(),
            is_active: true,
            domain_verified: true,
            ...(professorNote ? { professor_note: professorNote } : {}),
          },
          { onConflict: 'url', ignoreDuplicates: false }
        );

        if (upsertError) {
          if (!upsertError.message.includes('duplicate') && !upsertError.message.includes('unique')) {
            results[verticalId].errors.push(`DB error for ${item.url}: ${upsertError.message}`);
            results[verticalId].skipped++;
          } else {
            results[verticalId].skipped++;
          }
        } else {
          console.log('INSERTED:', item.title.slice(0, 50));
          results[verticalId].inserted++;
          totalInserted++;
        }
      }

      // 200ms between fetches to avoid rate limiting from RSS providers
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Deactivate news items older than 7 days to keep the feed fresh
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin
    .from('news_items')
    .update({ is_active: false })
    .lt('fetched_at', cutoff)
    .eq('is_active', true);

  // ── Feed health logging — fire-and-forget ──────────────────────────────────
  // Logs failed feeds so admin dashboard can surface broken sources.
  if (failedFeeds.length > 0) {
    admin.from('rss_feed_health').upsert(
      failedFeeds.map(f => ({
        vertical_id:   verticalUUIDs[f.vertical] ?? f.vertical,
        feed_url:      f.url,
        source_name:   f.source,
        error_message: f.reason,
        failed_at:     new Date().toISOString(),
        resolved_at:   null,
      })),
      { onConflict: 'feed_url' }
    ).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('rss_feed_health upsert failed:', error.message);
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  return new Response(
    JSON.stringify({
      ok: true,
      totalInserted,
      verticals: Object.keys(RSS_FEEDS).length,
      results,
      runAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
});
