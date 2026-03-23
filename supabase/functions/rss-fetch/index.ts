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

// Startup env check
console.log('[rss-fetch] ENV check:', {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  servicekeyPrefix: SUPABASE_SERVICE_ROLE_KEY.slice(0, 10) || 'MISSING',
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
    { url: 'https://rss.sciencedaily.com/releases/health_medicine.xml', source: 'Science Daily', category: 'Nursing' },
  ],
  psychsaathi: [
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=psychology+education&format=rss', source: 'PubMed', category: 'Psychology' },
    { url: 'https://rss.sciencedaily.com/releases/mind_brain.xml', source: 'Science Daily', category: 'Psychology' },
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
    { url: 'https://rss.sciencedaily.com/releases/chemistry.xml', source: 'Science Daily', category: 'Chemistry' },
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
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Engineering' },
    { url: 'https://rss.sciencedaily.com/releases/matter_energy/engineering.xml', source: 'Science Daily', category: 'Mechanical Engineering' },
    { url: 'https://asmedigitalcollection.asme.org/rss/site_5/5.xml', source: 'ASME Journals', category: 'Mechanical Engineering' },
    { url: 'https://www.nature.com/nmat.rss', source: 'Nature Materials', category: 'Materials Engineering' },
    { url: 'https://www.annualreviews.org/rss/content/journals/fluid/loi', source: 'Annual Review of Fluid Mechanics', category: 'Fluid Mechanics' },
    { url: 'https://onlinelibrary.wiley.com/feed/15214095/most-recent', source: 'Advanced Materials', category: 'Materials Science' },
    { url: 'https://www.science.org/rss/news_current.xml', source: 'Science', category: 'Engineering Research' },
  ],
  civilsaathi: [
    { url: 'https://rss.sciencedaily.com/releases/matter_energy/civil_engineering.xml', source: 'Science Daily', category: 'Civil Engineering' },
    { url: 'https://ascelibrary.org/rss/mostread', source: 'ASCE Library', category: 'Civil Engineering' },
    { url: 'https://www.nature.com/natsustain.rss', source: 'Nature Sustainability', category: 'Sustainable Engineering' },
    { url: 'https://rss.sciencedaily.com/releases/earth_climate/geology.xml', source: 'Science Daily Geoscience', category: 'Geotechnical Engineering' },
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Engineering' },
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

};

// UPSC feeds shared across all verticals
const UPSC_FEEDS: FeedDef[] = [
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu National', category: 'UPSC' },
  { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'PIB India', category: 'UPSC' },
  { url: 'https://prsindia.org/rss.xml', source: 'PRS India', category: 'UPSC' },
];

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

  // ── CRON_SECRET auth check ─────────────────────────────────────────────────
  // The cron job sends x-cron-secret instead of the service role key.
  // This prevents the service role key from ever appearing in SQL.
  const incomingSecret = req.headers.get('x-cron-secret');
  if (!CRON_SECRET || incomingSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('Using service role:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  console.log('SUPABASE_URL set:', !!SUPABASE_URL);

  // Build slug → UUID map: 'KanoonSaathi'.toLowerCase() === 'kanoonsaathi'
  const { data: verticalRows } = await admin.from('verticals').select('id, name');
  const verticalUUIDs: Record<string, string> = {};
  for (const v of (verticalRows ?? [])) {
    const slug = (v.name as string).toLowerCase().replace(/\s+/g, '');
    verticalUUIDs[slug] = v.id as string;
  }
  // Handle typo: RSS_FEEDS uses 'envirosaathi', DB has 'EnviroSaathi' → 'envirosathi'
  if (verticalUUIDs['envirosathi']) verticalUUIDs['envirosaathi'] = verticalUUIDs['envirosathi'];
  console.log('[rss-fetch] Vertical UUID map:', JSON.stringify(verticalUUIDs));

  const failedFeeds: { vertical: string; url: string; source: string; reason: string }[] = [];
  const results: Record<string, { inserted: number; skipped: number; errors: string[] }> = {};
  let totalInserted = 0;

  for (const [verticalId, feeds] of Object.entries(RSS_FEEDS)) {
    results[verticalId] = { inserted: 0, skipped: 0, errors: [] };

    // Each vertical gets its own feeds + shared UPSC feeds
    const allFeeds = [...feeds, ...UPSC_FEEDS];

    for (const feed of allFeeds) {
      const xml = await fetchFeed(feed.url);
      if (!xml) {
        const reason = `Failed to fetch: ${feed.url}`;
        results[verticalId].errors.push(reason);
        failedFeeds.push({ vertical: verticalId, url: feed.url, source: feed.source, reason });
        // 200ms delay even on failure to avoid hammering on retries
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
          },
          { onConflict: 'url', ignoreDuplicates: false }
        );

        if (upsertError) {
          console.error('UPSERT ERROR:', JSON.stringify({
            vertical: verticalId,
            source: feed.source,
            url: item.url.slice(0, 80),
            error: upsertError,
          }));
          // Duplicate URL = expected — silently skip
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
        vertical_id:   f.vertical,
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
