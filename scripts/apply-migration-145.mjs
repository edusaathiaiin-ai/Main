// One-off applier for supabase/migrations/145_institution_minutes_window.sql
// Same pattern as apply-migration-142/143/144.
//
// Usage:
//   DATABASE_URL=$(doppler secrets get DATABASE_URL --plain --project edusaathiai --config prd) \
//     node scripts/apply-migration-145.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from '../website/node_modules/pg/lib/index.js';

const { Client } = pg;

const here    = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, '..', 'supabase', 'migrations', '145_institution_minutes_window.sql');
const sql     = readFileSync(sqlPath, 'utf8');

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) { console.error('Missing DATABASE_URL'); process.exit(1); }

function safeEncode(rawConn) {
  const m = rawConn.match(/^([a-z]+:\/\/)(.*)$/i);
  if (!m) return rawConn;
  const lastAt = m[2].lastIndexOf('@');
  if (lastAt < 0) return rawConn;
  return `${m[1]}${m[2].slice(0, lastAt).replace(/@/g, '%40')}${m[2].slice(lastAt)}`;
}

const client = new Client({ connectionString: safeEncode(rawUrl), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);

  // Verify the function exists
  const fn = await client.query(`
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'increment_institution_minutes'
  `);
  console.log('increment_institution_minutes function:');
  console.table(fn.rows);

  // Verify the cron job is scheduled
  const cron = await client.query(`
    SELECT jobname, schedule
    FROM cron.job
    WHERE jobname = 'cron-institution-window-reset'
  `);
  console.log('\ncron-institution-window-reset schedule:');
  console.table(cron.rows);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
