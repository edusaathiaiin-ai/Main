/**
 * supabase/functions/curate-resources/index.ts
 *
 * Treasure Chest — curated learning resources per Saathi, refreshed weekly.
 *
 * POST { saathiId: string, forceRefresh?: boolean }
 *   → returns { resources: Resource[], cached: boolean, week: number }
 *
 * Flow:
 *   1. Verify JWT auth
 *   2. Calculate current ISO week number
 *   3. Return cached resources if this week's data exists (and forceRefresh=false)
 *   4. Otherwise call Claude to generate 12+ curated resources
 *   5. Save to explore_resources table, delete prior weeks for this vertical
 *   6. Return resources
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')             ?? '';
const SUPABASE_ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY')        ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY        = Deno.env.get('ANTHROPIC_API_KEY')        ?? '';


type Resource = {
  title:             string;
  description:       string;
  url:               string;
  resource_type:     string;
  emoji:             string;
  author:            string | null;
  publisher:         string | null;
  year:              number | null;
  is_free:           boolean;
  is_indian_context: boolean;
  display_order:     number;
  is_featured:       boolean;
};

type GeneratedResponse = { resources: Resource[] };

// ── ISO week number ──────────────────────────────────────────────────────────
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

// ── Subject hints for the prompt ─────────────────────────────────────────────
function subjectHint(slug: string): string {
  const hints: Record<string, string> = {
    kanoonsaathi: `
      - Indian Kanoon, SCC Online, Manupatra, Bar and Bench, Live Law
      - V.N. Shukla Constitutional Law, N.D. Kapoor Company Law textbooks
      - CLAT & AILET preparation resources
      - Supreme Court of India website (sci.gov.in)
      - SSRN Law working papers`,

    maathsaathi: `
      - NPTEL mathematics lecture series (free)
      - Paul's Online Math Notes (tutorial.math.lamar.edu)
      - MIT OpenCourseWare 18.01/18.02/18.06
      - 3Blue1Brown YouTube channel (visualisation)
      - GATE mathematics previous years + resources`,

    chemsaathi: `
      - Royal Society of Chemistry (rsc.org)
      - ACS Publications (pubs.acs.org)
      - Khan Academy Chemistry
      - NEET chemistry resources and NCERT solutions
      - ChemSpider, PubChem for compound lookup`,

    biosaathi: `
      - NCBI / PubMed Central (free papers)
      - Khan Academy Biology
      - Nature.com and Cell.com open access
      - CSIR NET Life Sciences resources
      - NEET biology preparation and NCERT materials`,

    pharmasaathi: `
      - PubChem (pubchem.ncbi.nlm.nih.gov)
      - DrugBank (go.drugbank.com)
      - WHO Model List of Essential Medicines
      - CDSCO India drug approvals (cdsco.gov.in)
      - GPAT preparation resources, Pharmacology by KD Tripathi`,

    medicosaathi: `
      - PubMed, UpToDate, Medscape
      - AIIMS and PGI study materials
      - Harrison's Principles, Gray's Anatomy
      - NEXT/NEET-PG exam preparation resources
      - NMC guidelines (nmc.org.in)`,

    nursingsaathi: `
      INDIAN REGULATORY & EXAMINATION BODIES (highest priority for Indian nursing students):
      - Indian Nursing Council — INC India (indiannursingcouncil.org): B.Sc/M.Sc/GNM syllabi, notifications, circulars
      - National Nursing Council (nnc.org.in): exam schedules, registration requirements
      - Trained Nurses Association of India — TNAI (tnaionline.org): professional standards, CPD
      - Nursing Officer recruitment: AIIMS NORCET, ESIC, NHM State exams, Indian Railway, DSSSB
      - State Nursing Council websites — Maharashtra, Karnataka, Tamil Nadu, Gujarat etc.
      - NCLEX-RN/NCLEX-PN — for students targeting USA/UK/Australia nursing licensure

      TEXTBOOKS & CLINICAL REFERENCES (core curriculum):
      - Potter & Perry: Fundamentals of Nursing (India edition, Elsevier) — gold standard for B.Sc Nursing
      - Kozier & Erb's Fundamentals of Nursing (Pearson)
      - Taylor's Clinical Nursing Skills (Wolters Kluwer)
      - Lippincott's Manual of Nursing Practice (LWW)
      - Brunner & Suddarth's Textbook of Medical-Surgical Nursing
      - Medical-Surgical Nursing by Ignatavicius & Workman
      - Essentials of Pediatric Nursing by Wong's
      - Doenges' Nursing Care Plans (NANDA nursing diagnoses)

      OPEN-ACCESS & FREE RESOURCES (India-accessible, no paywall):
      - PubMed/MEDLINE (pubmed.ncbi.nlm.nih.gov) — comprehensive nursing research index
      - CINAHL subject heading reference (structure searches via INC/institutional access)
      - BMC Nursing (bmcnurs.biomedcentral.com) — fully open access
      - Nursing Open — Wiley open access nursing journal
      - PLOS Medicine — open access for health and nursing policy
      - DOAJ (doaj.org) — Directory of Open Access Journals — filter by nursing
      - WHO Nursing & Midwifery (who.int/teams/nursing-midwifery) — global guidelines, workforce data

      CLINICAL PRACTICE TOOLS:
      - Nursing Times (nursingtimes.net) — clinical updates, CPD, practice articles
      - Medscape Nurses (medscape.com/nurses) — drug references, case studies, clinical alerts
      - NANDA International (nanda.org) — official nursing diagnosis taxonomy
      - NMC UK (nmc.org.uk) — Code of Conduct, practice standards (referenced globally)
      - RCN (rcn.org.uk) — Royal College of Nursing clinical guidelines
      - Cochrane Nursing (nursing.cochrane.org) — systematic reviews for EBP

      SPECIALTY AREAS TO PRIORITISE FOR INDIAN NURSING STUDENTS:
      - Critical care / ICU nursing (high demand in India — SNCU, MICU, CICU)
      - Community health nursing & primary healthcare (NHM, ASHA, ANM roles)
      - Midwifery & obstetric nursing (SNCU, labour room, maternal mortality reduction)
      - Paediatric & neonatal nursing (NICU, SNCU — major government focus)
      - Oncology nursing (rapidly expanding in India)
      - Mental health nursing (DMHP, community psychiatry)
      - Evidence-based practice frameworks (PARIHS, JBI model)

      EXAM PREPARATION RESOURCES:
      - AIIMS NORCET previous year papers and mock tests
      - Arpit Nursing Academy (YouTube — free NORCET/NCLEX content in Hindi/English)
      - NCLEX preparation: Saunders Comprehensive Review (Elsevier), UWorld Nursing
      - GNM/B.Sc/M.Sc nursing entrance: state-specific preparation`,

    psychsaathi: `
      - American Psychological Association (apa.org)
      - Psychology Today
      - NCERT Psychology textbooks (free)
      - DSM-5 reference resources
      - UGC NET Psychology preparation`,

    mechsaathi: `
      - NPTEL Mechanical Engineering courses
      - MIT OpenCourseWare Mechanical
      - R.S. Khurmi Machine Design, Cengel Thermodynamics
      - GATE Mechanical preparation resources
      - ASME Digital Collection`,

    civilsaathi: `
      - IS codes (BIS India)
      - NPTEL Civil Engineering courses
      - R.K. Bansal Fluid Mechanics
      - GATE Civil preparation
      - Indian Roads Congress (irc.nic.in)`,

    elecsaathi: `
      - IEEE Xplore (ieeexplore.ieee.org)
      - NPTEL Electrical Engineering
      - Sadiku Fundamentals of Electric Circuits
      - GATE EE preparation resources
      - All About Circuits (allaboutcircuits.com)`,

    compsaathi: `
      - LeetCode, Codeforces competitive programming
      - MIT OpenCourseWare 6.006 Algorithms
      - GeeksforGeeks (geeksforgeeks.org)
      - GATE CS resources and NPTEL CS courses
      - GitHub trending repositories`,

    envirosathi: `
      - UNEP and MoEFCC India (moef.gov.in)
      - NPTEL Environmental Science
      - Environmental Science by G. Tyler Miller
      - CSIR NET Environmental Sciences resources
      - Down To Earth magazine (downtoearth.org.in)`,

    bizsaathi: `
      - Harvard Business Review (hbr.org)
      - Economic Times Strategy section
      - MBA textbooks: Kotler, Porter, Drucker
      - CAT/XAT preparation resources
      - IBEF India Brand Equity Foundation`,

    finsaathi: `
      - RBI publications and annual report (rbi.org.in)
      - SEBI investor education (sebi.gov.in)
      - Investopedia (investopedia.com)
      - CA IPCC / CFA preparation
      - Economic Survey of India (indiabudget.gov.in)`,

    mktsaathi: `
      - Marketing Week, Campaign India
      - Philip Kotler Marketing Management
      - Google Digital Garage (free certification)
      - WARC and Nielsen India reports
      - CAT marketing case studies`,

    hrsaathi: `
      - SHRM (shrm.org)
      - Ministry of Labour and Employment India (labour.gov.in)
      - Gary Dessler Human Resource Management
      - UGC NET HRM preparation
      - Economic Times HR section`,

    archsaathi: `
      - ArchDaily (archdaily.com)
      - Dezeen (dezeen.com)
      - Council of Architecture India (coa.gov.in)
      - NATA preparation resources
      - Francis D.K. Ching Architecture books`,

    historysaathi: `
      - NCERT History textbooks (ncert.nic.in)
      - Bipan Chandra Modern India
      - JSTOR open access historical papers
      - UPSC History optional preparation
      - Archaeological Survey of India (asi.nic.in)`,

    econsaathi: `
      - World Bank Open Data (data.worldbank.org)
      - NBER Working Papers (nber.org)
      - RBI Handbook of Statistics (rbi.org.in)
      - UPSC Economics optional resources
      - Economic Survey and India Budget documents`,

    physisaathi: `
      - NPTEL Physics courses
      - MIT OpenCourseWare Physics 8.01/8.02
      - Halliday Resnick Krane Fundamentals of Physics
      - GATE Physics preparation, CSIR NET Physical Sciences
      - arXiv.org physics preprints (free)`,

    biotechsaathi: `
      - NCBI Bookshelf free biology textbooks
      - Journal of Biotechnology (Elsevier)
      - DBT India (dbtindia.gov.in)
      - GATE Biotechnology resources
      - iBiology.org free video lectures`,

    electronicssaathi: `
      - IEEE Xplore (ieeexplore.ieee.org)
      - NPTEL Electronics and Communication
      - Razavi Design of Analog CMOS Integrated Circuits
      - GATE ECE preparation resources
      - Sedra/Smith Microelectronic Circuits`,

    'chemengg saathi': `
      - AIChE (aiche.org) resources and journals
      - NPTEL Chemical Engineering courses
      - Perry's Chemical Engineers' Handbook
      - GATE Chemical Engineering preparation
      - Coulson & Richardson Chemical Engineering volumes`,

    aerospacesaathi: `
      - NASA Technical Reports Server (ntrs.nasa.gov)
      - AIAA (aiaa.org) open access
      - Anderson Introduction to Flight
      - GATE Aerospace preparation resources
      - ISRO student connect programmes`,
  };
  return hints[slug] ?? '- Include only well-known, authoritative sources for this subject.';
}

// ── Static fallback resources (used when AI generation fails) ─────────────────
function staticFallback(slug: string): Resource[] {
  const fallbacks: Record<string, Resource[]> = {
    kanoonsaathi: [
      {
        title: 'Indian Kanoon',
        description: 'Free access to Indian court judgements, statutes, and legal documents. Essential for case law research.',
        url: 'https://indiankanoon.org',
        resource_type: 'website',
        emoji: '⚖️',
        author: null, publisher: null, year: null,
        is_free: true, is_indian_context: true,
        display_order: 1, is_featured: true,
      },
      {
        title: 'Live Law',
        description: 'Real-time reporting on Supreme Court and High Court news, judgements, and legal analysis.',
        url: 'https://www.livelaw.in',
        resource_type: 'website',
        emoji: '📰',
        author: null, publisher: null, year: null,
        is_free: true, is_indian_context: true,
        display_order: 2, is_featured: true,
      },
      {
        title: 'Constitution of India — Full Text',
        description: 'Complete text of the Indian Constitution with all amendments. The primary source for all constitutional law study.',
        url: 'https://www.india.gov.in/sites/upload_files/npi/files/coi_part_full.pdf',
        resource_type: 'paper',
        emoji: '📜',
        author: null, publisher: 'Government of India', year: null,
        is_free: true, is_indian_context: true,
        display_order: 3, is_featured: true,
      },
      {
        title: 'Bar and Bench',
        description: 'Independent legal news platform covering courts, law firms, and policy in India.',
        url: 'https://www.barandbench.com',
        resource_type: 'website',
        emoji: '🏛️',
        author: null, publisher: null, year: null,
        is_free: true, is_indian_context: true,
        display_order: 4, is_featured: false,
      },
    ],

    compsaathi: [
      {
        title: 'GeeksforGeeks',
        description: 'Comprehensive tutorials on data structures, algorithms, system design, and interview prep. Aligned with GATE and placements.',
        url: 'https://www.geeksforgeeks.org',
        resource_type: 'website',
        emoji: '💻',
        author: null, publisher: null, year: null,
        is_free: true, is_indian_context: true,
        display_order: 1, is_featured: true,
      },
      {
        title: 'MIT OpenCourseWare — Introduction to Algorithms',
        description: 'World-class algorithms course from MIT, free and open. Covers sorting, graphs, dynamic programming.',
        url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
        resource_type: 'website',
        emoji: '🎓',
        author: 'Erik Demaine', publisher: 'MIT OCW', year: 2011,
        is_free: true, is_indian_context: false,
        display_order: 2, is_featured: true,
      },
      {
        title: 'LeetCode',
        description: 'Practice platform for coding interviews with 2000+ problems. Used by every top tech company for screening.',
        url: 'https://leetcode.com',
        resource_type: 'tool',
        emoji: '🧩',
        author: null, publisher: null, year: null,
        is_free: true, is_indian_context: false,
        display_order: 3, is_featured: true,
      },
    ],

    maathsaathi: [
      {
        title: 'NPTEL Mathematics Courses',
        description: 'Free IIT-quality math courses covering calculus, linear algebra, probability, and more — with certificate option.',
        url: 'https://nptel.ac.in/course.html',
        resource_type: 'website',
        emoji: '📐',
        author: null, publisher: 'IITs via NPTEL', year: null,
        is_free: true, is_indian_context: true,
        display_order: 1, is_featured: true,
      },
      {
        title: "Paul's Online Math Notes",
        description: 'Clear, well-organized notes and practice problems for calculus, differential equations, and linear algebra.',
        url: 'https://tutorial.math.lamar.edu',
        resource_type: 'website',
        emoji: '📓',
        author: 'Paul Dawkins', publisher: null, year: null,
        is_free: true, is_indian_context: false,
        display_order: 2, is_featured: true,
      },
      {
        title: '3Blue1Brown',
        description: 'Visual mathematics YouTube channel with stunning animations. "Essence of Calculus" and "Essence of Linear Algebra" are essential.',
        url: 'https://www.youtube.com/@3blue1brown',
        resource_type: 'youtube',
        emoji: '▶️',
        author: 'Grant Sanderson', publisher: null, year: null,
        is_free: true, is_indian_context: false,
        display_order: 3, is_featured: true,
      },
    ],
  };
  return fallbacks[slug] ?? [];
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let saathiId = 'kanoonsaathi';
  let forceRefresh = false;
  try {
    const body = await req.json() as { saathiId?: string; forceRefresh?: boolean };
    saathiId    = body.saathiId    ?? saathiId;
    forceRefresh = body.forceRefresh ?? false;
  } catch { /* body absent — use defaults */ }

  const weekNumber = getISOWeekNumber(new Date());

  // ── Cache check ────────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const { data: cached } = await admin
      .from('explore_resources')
      .select('*')
      .eq('vertical_id', saathiId)
      .eq('week_number', weekNumber)
      .order('display_order', { ascending: true });

    if (cached && cached.length > 0) {
      return new Response(
        JSON.stringify({ resources: cached, cached: true, week: weekNumber }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── Get vertical details ──────────────────────────────────────────────────
  const { data: vertical } = await admin
    .from('verticals')
    .select('id, name')
    .eq('id', saathiId)
    .single();

  const saathiName = vertical?.name ?? saathiId;
  const slug       = vertical?.id   ?? saathiId;

  // ── Generate with Claude ──────────────────────────────────────────────────
  const prompt = `You are curating the definitive weekly reading list for ${saathiName} students in India.

Return ONLY valid JSON — no markdown fences, no preamble, no explanation. Just the JSON object:

{
  "resources": [
    {
      "title": "Resource title",
      "description": "2 sentences — exactly why this is essential and what the student will gain",
      "url": "https://real-working-url.com",
      "resource_type": "book|article|website|youtube|journal|tool|paper",
      "emoji": "📖",
      "author": "Full name or null",
      "publisher": "Publisher name or null",
      "year": 2024,
      "is_free": true,
      "is_indian_context": false,
      "display_order": 1,
      "is_featured": false
    }
  ]
}

REQUIREMENTS — follow exactly:

1. Include EXACTLY these resource types:
   • 3 books (1 classic foundational + 1 recent + 1 exam-focused Indian textbook)
   • 3 websites or portals (official .edu / .gov / .org preferred)
   • 2 YouTube channels (verified educational, not random uploads)
   • 2 journals or databases (open-access preferred)
   • 2 tools or free online resources
   Total: 12 resources minimum

2. Indian student context:
   • At least 3 resources must be is_indian_context: true
   • Include resources relevant to major Indian exams for this field
   • Align with Indian university syllabi where applicable

3. Quality rules:
   • Every URL must be a REAL, publicly accessible URL — no made-up or guessed URLs
   • Books: use standard Amazon / Goodreads / publisher URLs if no dedicated site
   • YouTube: use channel URL format https://www.youtube.com/@channelname
   • Mark is_featured: true for the top 3 picks only
   • display_order starts at 1 (featured items should be 1, 2, 3)

4. For ${saathiName} specifically, prioritise:
${subjectHint(slug)}

Today: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':        ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) throw new Error(`Anthropic ${aiRes.status}`);

    const aiData = await aiRes.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = aiData.content?.find((b) => b.type === 'text');
    if (!textBlock?.text) throw new Error('No text in response');

    // Strip any accidental markdown fences
    const clean = textBlock.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(clean) as GeneratedResponse;
    if (!Array.isArray(parsed.resources) || parsed.resources.length === 0) {
      throw new Error('Empty resources array');
    }

    // ── Persist: delete old weeks, insert new ────────────────────────────────
    await admin
      .from('explore_resources')
      .delete()
      .eq('vertical_id', saathiId)
      .neq('week_number', weekNumber);

    const toInsert = parsed.resources.map((r) => ({
      ...r,
      vertical_id: saathiId,
      week_number: weekNumber,
      curated_by:  'ai',
      // Ensure valid resource_type — default to 'website' if unknown
      resource_type: ['book','article','website','youtube','journal','tool','paper']
        .includes(r.resource_type) ? r.resource_type : 'website',
    }));

    const { data: saved } = await admin
      .from('explore_resources')
      .insert(toInsert)
      .select();

    return new Response(
      JSON.stringify({ resources: saved ?? toInsert, cached: false, week: weekNumber }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('curate-resources generation error:', err);

    // Return static fallback — still useful for student
    const fallback = staticFallback(slug);
    return new Response(
      JSON.stringify({
        resources: fallback,
        cached:    false,
        week:      weekNumber,
        fallback:  true,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
