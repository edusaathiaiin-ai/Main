#!/usr/bin/env node
// ============================================================
// Phase 3: NAAC College Bulk Import Script
// Usage:
//   1. Download CSV from https://www.naac.gov.in/institutions
//      (Click "Export" or "Download" on the accreditation list)
//   2. Save as: scripts/naac_colleges.csv
//   3. Run: node scripts/seed-naac.js
//
// Required env vars (in .env or shell):
//   SUPABASE_URL=https://vpmpuxosyrijknbxautx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
// ============================================================

const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── CSV Parser (no external deps) ───────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ── NAAC Grade normaliser ────────────────────────────────────────────────────
function normaliseGrade(raw) {
  if (!raw) return null;
  const g = raw.trim().toUpperCase();
  if (g.startsWith('A++')) return 'A++';
  if (g.startsWith('A+'))  return 'A+';
  if (g.startsWith('A'))   return 'A';
  if (g.startsWith('B++')) return 'B++';
  if (g.startsWith('B+'))  return 'B+';
  if (g.startsWith('B'))   return 'B';
  if (g.startsWith('C'))   return 'C';
  return null;
}

// ── Map NAAC CSV row → colleges table row ───────────────────────────────────
// NAAC CSV typically has columns like:
//   Institution Name, State, City/District, University, Type, Grade/CGPA, Cycle
// Column names vary by export — we try multiple common names.
function mapRow(row) {
  const name   = row['institution_name'] || row['name_of_institution'] || row['college_name'] || row['name'] || '';
  const state  = row['state'] || row['state_name'] || '';
  const city   = row['city'] || row['district'] || row['city/district'] || row['district/city'] || state;
  const uni    = row['university'] || row['affiliated_university'] || row['university_name'] || null;
  const type   = row['type'] || row['institution_type'] || row['management'] || null;
  const grade  = normaliseGrade(row['grade'] || row['naac_grade'] || row['cgpa_grade'] || row['accreditation_grade'] || '');

  if (!name || !state) return null;

  // Normalise type
  let college_type = null;
  if (type) {
    const t = type.toLowerCase();
    if (t.includes('govt') || t.includes('government')) college_type = 'govt';
    else if (t.includes('aided')) college_type = 'govt';
    else if (t.includes('deemed')) college_type = 'deemed';
    else if (t.includes('autonomous')) college_type = 'autonomous';
    else if (t.includes('central')) college_type = 'central';
    else college_type = 'private';
  }

  return {
    name: name.trim().slice(0, 400),
    aliases: [],
    city: city.trim() || state.trim(),
    state: state.trim(),
    university: uni?.trim().slice(0, 400) || null,
    college_type,
    naac_grade: grade,
    courses: [],
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = path.join(__dirname, 'naac_colleges.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`
❌  File not found: ${csvPath}

Steps to get the NAAC data:
  1. Visit https://www.naac.gov.in/institutions
  2. Click the "Export" button (top right of the table)
  3. Save as: ${csvPath}
  4. Re-run: node scripts/seed-naac.js
`);
    process.exit(1);
  }

  console.log('📂  Reading NAAC CSV...');
  const text = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);
  console.log(`    Found ${rows.length} raw rows`);

  const mapped = rows.map(mapRow).filter(Boolean);
  console.log(`    Mapped ${mapped.length} valid college rows`);

  if (mapped.length === 0) {
    console.error('❌  No rows mapped. Check the CSV column names in this script.');
    console.log('    CSV header:', Object.keys(rows[0] || {}).join(', '));
    process.exit(1);
  }

  // ── Batch insert in chunks of 200 ────────────────────────────────────────
  const CHUNK = 200;
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from('colleges')
      .upsert(chunk, {
        onConflict: 'name,city',   // unique by (name, city) — no duplicate seeding
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`❌  Batch ${Math.floor(i / CHUNK) + 1} error:`, error.message);
      skipped += chunk.length;
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r    Inserted ${inserted}/${mapped.length}...`);
    }
  }

  console.log(`\n\n✅  Done!`);
  console.log(`    Inserted: ${inserted}`);
  console.log(`    Skipped:  ${skipped} (duplicates or errors)`);

  // ── Final count ──────────────────────────────────────────────────────────
  const { count: total } = await supabase
    .from('colleges')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📊  Total colleges in DB: ${total}`);
  console.log('\n🎯  Phase 3 complete — EdUsaathiAI now has comprehensive Indian college coverage!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
