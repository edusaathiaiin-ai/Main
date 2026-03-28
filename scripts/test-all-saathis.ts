/**
 * scripts/test-all-saathis.ts
 *
 * Sends one message to every Saathi (bot slot 1) and reports pass/fail.
 * Verifies the SSE stream actually returns content — not just an HTTP 200.
 *
 * Usage:
 *   TEST_USER_JWT=<your_jwt> npx tsx scripts/test-all-saathis.ts
 *
 * Get your JWT:
 *   1. Log in to edusaathiai.in
 *   2. DevTools → Application → Cookies → sb-vpmpuxosyrijknbxautx-auth-token
 *   3. Copy the access_token value
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Load env from root .env.local ─────────────────────────────────────────────
function loadEnv(filePath: string): Record<string, string> {
  try {
    return Object.fromEntries(
      fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
    );
  } catch {
    return {};
  }
}

const env = loadEnv(path.join(process.cwd(), '.env.local'));

const SUPABASE_URL  = env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const ANON_KEY      = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const TEST_USER_JWT = process.env['TEST_USER_JWT'] ?? '';

if (!TEST_USER_JWT) {
  console.error('❌ Missing TEST_USER_JWT environment variable.');
  console.error('   Run: TEST_USER_JWT=<your_jwt> npx tsx scripts/test-all-saathis.ts');
  process.exit(1);
}

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

// ── All 24 Saathis ────────────────────────────────────────────────────────────
const SAATHIS = [
  { id: 'kanoonsaathi',       name: 'KanoonSaathi'      },
  { id: 'maathsaathi',        name: 'MaathSaathi'       },
  { id: 'chemsaathi',         name: 'ChemSaathi'        },
  { id: 'biosaathi',          name: 'BioSaathi'         },
  { id: 'pharmasaathi',       name: 'PharmaSaathi'      },
  { id: 'medicosaathi',       name: 'MedicoSaathi'      },
  { id: 'nursingsaathi',      name: 'NursingSaathi'     },
  { id: 'psychsaathi',        name: 'PsychSaathi'       },
  { id: 'mechsaathi',         name: 'MechSaathi'        },
  { id: 'civilsaathi',        name: 'CivilSaathi'       },
  { id: 'elecsaathi',         name: 'ElecSaathi'        },
  { id: 'compsaathi',         name: 'CompSaathi'        },
  { id: 'envirosathi',        name: 'EnviroSaathi'      },
  { id: 'bizsaathi',          name: 'BizSaathi'         },
  { id: 'finsaathi',          name: 'FinSaathi'         },
  { id: 'mktsaathi',          name: 'MktSaathi'         },
  { id: 'hrsaathi',           name: 'HRSaathi'          },
  { id: 'archsaathi',         name: 'ArchSaathi'        },
  { id: 'historysaathi',      name: 'HistorySaathi'     },
  { id: 'econsaathi',         name: 'EconSaathi'        },
  { id: 'chemengg saathi',    name: 'ChemEnggSaathi'    },
  { id: 'biotechsaathi',      name: 'BioTechSaathi'     },
  { id: 'aerospacesaathi',    name: 'AerospaceSaathi'   },
  { id: 'electronicssaathi',  name: 'ElectronicsSaathi' },
] as const;

// ── Test one Saathi ───────────────────────────────────────────────────────────
type TestResult =
  | { saathi: string; status: 'pass';  ms: number; preview: string }
  | { saathi: string; status: 'fail';  ms: number; code: number; body: string }
  | { saathi: string; status: 'error'; ms: number; err: string };

async function testSaathi(saathi: { id: string; name: string }): Promise<TestResult> {
  const start = Date.now();

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TEST_USER_JWT}`,
        'apikey':        ANON_KEY,
      },
      body: JSON.stringify({
        saathiId: saathi.id,
        botSlot:  1,
        message:  'Hello, introduce yourself in one sentence.',
        history:  [],
      }),
    });

    const ms = Date.now() - start;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { saathi: saathi.name, status: 'fail', ms, code: res.status, body: body.slice(0, 120) };
    }

    // Consume SSE stream — read until first real delta or [DONE]
    const reader = res.body?.getReader();
    if (!reader) {
      return { saathi: saathi.name, status: 'fail', ms, code: 200, body: 'no response body' };
    }

    const decoder = new TextDecoder();
    let preview = '';
    let streamMs = ms;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break outer;
        try {
          const parsed = JSON.parse(data) as { delta?: string; error?: string };
          if (parsed.error) {
            reader.releaseLock();
            return { saathi: saathi.name, status: 'fail', ms: Date.now() - start, code: 200, body: parsed.error };
          }
          if (parsed.delta && !preview) {
            preview = parsed.delta;
            streamMs = Date.now() - start;
            reader.releaseLock();
            break outer;
          }
        } catch { /* ignore malformed SSE lines */ }
      }
    }

    if (!preview) {
      return { saathi: saathi.name, status: 'fail', ms: streamMs, code: 200, body: 'stream ended with no content' };
    }

    return { saathi: saathi.name, status: 'pass', ms: streamMs, preview: preview.trim().slice(0, 60) };

  } catch (err) {
    return {
      saathi: saathi.name,
      status: 'error',
      ms: Date.now() - start,
      err: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Run all 24 in parallel ────────────────────────────────────────────────────
(async () => {
console.log(`\nTesting ${SAATHIS.length} Saathis against ${SUPABASE_URL}\n`);

const results = await Promise.all(SAATHIS.map(testSaathi));

// ── Print results ─────────────────────────────────────────────────────────────
for (const r of results) {
  if (r.status === 'pass') {
    console.log(`✅  ${r.saathi.padEnd(20)} ${String(r.ms).padStart(5)}ms  "${r.preview}"`);
  } else if (r.status === 'fail') {
    console.log(`❌  ${r.saathi.padEnd(20)} ${String(r.ms).padStart(5)}ms  HTTP ${r.code} — ${r.body}`);
  } else {
    console.log(`💥  ${r.saathi.padEnd(20)} ${String(r.ms).padStart(5)}ms  ${r.err}`);
  }
}

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status !== 'pass').length;

console.log(`\n${'─'.repeat(60)}`);
console.log(`Passed: ${passed}/${SAATHIS.length}   Failed: ${failed}/${SAATHIS.length}`);
console.log(`${'─'.repeat(60)}\n`);

if (failed > 0) process.exit(1);
})();
