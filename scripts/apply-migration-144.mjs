// One-off applier for supabase/migrations/144_principal_rls.sql
// Same pattern as apply-migration-142.mjs / apply-migration-143.mjs.
//
// Usage:
//   DATABASE_URL=$(doppler secrets get DATABASE_URL --plain --project edusaathiai --config prd) \
//     node scripts/apply-migration-144.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from '../website/node_modules/pg/lib/index.js';

const { Client } = pg;

const here    = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, '..', 'supabase', 'migrations', '144_principal_rls.sql');
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

  // Verify the two new policies are now present
  const { rows } = await client.query(`
    SELECT schemaname, tablename, policyname, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'principal_read_own_education_institution',
        'principal_read_own_stats_cache'
      )
    ORDER BY tablename, policyname
  `);

  if (rows.length !== 2) {
    console.error(`Expected 2 policies; found ${rows.length}`);
    process.exit(1);
  }

  console.log('Applied. Principal-read policies now active:');
  console.table(rows);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
