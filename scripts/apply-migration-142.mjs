// One-off applier for supabase/migrations/142_traces_split_ttfb.sql
// Runs the migration inside a transaction. Safe to re-run because the SQL
// uses ADD COLUMN IF NOT EXISTS.
//
// Usage:
//   DATABASE_URL=$(doppler secrets get DATABASE_URL --plain --project edusaathiai --config prd) \
//     node scripts/apply-migration-142.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from '../website/node_modules/pg/lib/index.js';

const { Client } = pg;

const here     = dirname(fileURLToPath(import.meta.url));
const sqlPath  = resolve(here, '..', 'supabase', 'migrations', '142_traces_split_ttfb.sql');
const sql      = readFileSync(sqlPath, 'utf8');

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

// Doppler's DATABASE_URL has an unencoded `@` in the password, which breaks
// URL parsing in pg's connectionString path. Split on the LAST `@` instead
// (everything before is auth, after is host) and percent-encode any `@` in
// the auth half before reconstructing.
function safeEncode(rawConn) {
  const schemeMatch = rawConn.match(/^([a-z]+:\/\/)(.*)$/i);
  if (!schemeMatch) return rawConn;
  const scheme = schemeMatch[1];
  const rest   = schemeMatch[2];
  const lastAt = rest.lastIndexOf('@');
  if (lastAt < 0) return rawConn;
  const auth   = rest.slice(0, lastAt).replace(/@/g, '%40');
  const host   = rest.slice(lastAt);
  return `${scheme}${auth}${host}`;
}

const client = new Client({
  connectionString: safeEncode(rawUrl),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');

  const { rows } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'traces'
      AND column_name IN ('prep_ms', 'ai_ttfb_ms', 'ttfb_ms')
    ORDER BY column_name
  `);
  console.log('Applied. traces timing columns:');
  console.table(rows);
} catch (err) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
