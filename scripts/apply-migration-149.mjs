// One-off applier for supabase/migrations/149_exports_log.sql
//
// Usage:
//   DATABASE_URL=$(doppler secrets get DATABASE_URL --plain --project edusaathiai --config prd) \
//     node scripts/apply-migration-149.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from '../website/node_modules/pg/lib/index.js';

const { Client } = pg;

const here    = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, '..', 'supabase', 'migrations', '149_exports_log.sql');
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

  const { rows } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'exports_log'
    ORDER BY ordinal_position
  `);
  console.log('Applied. exports_log columns:');
  console.table(rows);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
