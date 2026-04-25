/**
 * rpc-smoke.test.ts
 *
 * Layer 3 of the defensive-tests pattern. Slug test catches drift in the
 * 30-Saathi list; guardrail test catches weakening of the paper-citation
 * prompt; invisible-text test catches white-on-light-bg regressions; and
 * THIS test catches schema-level bugs in our Postgres RPCs that the type
 * system can't see.
 *
 * The bug that motivated it
 * ─────────────────────────
 *   On 2026-04-24 a student paid ₹49 for a live session. Razorpay
 *   captured the payment. The verify-live-booking edge function then
 *   threw 500 because book_live_session_seat() raised
 *   ERROR 42702: column reference "seats_booked" is ambiguous
 *   on the very first execution. The bug had been dormant for months —
 *   gateway 401s ate every booking attempt before the RPC was reached.
 *   Once auth was unblocked, the latent bug fired on the first paid
 *   call and the student lost money.
 *
 * What this test does
 * ───────────────────
 *   For each money- or economy-affecting RPC, calls it inside a
 *   BEGIN/ROLLBACK transaction with realistic-shaped inputs. The
 *   ROLLBACK guarantees nothing persists. We assert two things:
 *
 *     (a) The function EXECUTES — i.e. Postgres doesn't throw a
 *         schema-level error code (42702 ambiguous, 42703 column
 *         missing, 42883 function missing, 42P01 relation missing,
 *         42601 syntax). These would have caught the 42702 bug on
 *         the very first run.
 *
 *     (b) Business-logic errors via RAISE EXCEPTION (P0001, P0002)
 *         are FINE — they prove the function is running and its
 *         own validation is firing. We do NOT assert on specific
 *         error messages because those evolve.
 *
 * Opt-in by design
 * ────────────────
 *   The test needs a real Postgres connection (Supabase pooler URL).
 *   If DATABASE_URL is not set, every assertion skips silently. So:
 *     - Pre-commit hook stays fast (no DB round-trip).
 *     - CI runs with `doppler run -- npm run test:rpc-smoke` — the
 *       Doppler shim injects DATABASE_URL and the suite runs.
 *     - Manual confidence run before deploy: same command locally.
 *
 *   The connection MUST be a service-role-equivalent account (the
 *   RPCs are SECURITY DEFINER but their internal lookups bypass RLS
 *   only when called by service_role). Doppler's DATABASE_URL points
 *   at the Supabase pooler with the service role automatically.
 *
 * Adding a new RPC
 * ────────────────
 *   1. Append a `describe.each(...)` row in the array below with
 *      (name, args[], optional fixture-loader function).
 *   2. The runner wraps it in BEGIN/ROLLBACK and asserts the
 *      schema-error guard.
 *   3. No need to rewrite the runner.
 */

import { Client } from 'pg'

// ─── Postgres error codes that mean "the function is broken" ──────────
// These are deterministic schema/syntax bugs; any of them firing on the
// first call means the RPC body is wrong. We FAIL the test when these
// surface. Business-logic codes (P0001 RAISE, P0002 NO_DATA_FOUND,
// 23xxx constraint violations) are acceptable — they prove the function
// is running.
const SCHEMA_ERROR_CODES = new Set([
  '42702', // column reference is ambiguous   ← the actual 2026-04-24 bug
  '42703', // column does not exist
  '42883', // function does not exist
  '42P01', // undefined_table / relation does not exist
  '42P02', // undefined_parameter
  '42601', // syntax error
  '42P10', // invalid_column_reference
  '42704', // undefined_object
  '42P17', // invalid_object_definition
  '0A000', // feature_not_supported
])

// ─── Test inputs ──────────────────────────────────────────────────────
// All UUIDs are well-formed but intentionally not pointing at real
// rows. The RPCs will hit their normal business-logic guards
// (session_not_found, no rows in lookups) and return clean errors —
// proving they ran end-to-end without schema bugs. ROLLBACK discards
// any inserts the function did before it raised the business error.
const FAKE_SESSION   = '00000000-0000-0000-0000-000000000001'
const FAKE_STUDENT   = '00000000-0000-0000-0000-000000000002'
const FAKE_VERTICAL  = '00000000-0000-0000-0000-000000000003'

type RpcCase = {
  name: string
  sql: string         // parameterised SQL with $1, $2, ...
  args: unknown[]
}

// Order matters only for readability. Add new cases in any position.
const RPC_CASES: RpcCase[] = [
  {
    name: 'book_live_session_seat — paid booking path',
    sql:  `SELECT * FROM book_live_session_seat($1::uuid, $2::uuid, $3::text, $4::uuid[], $5::int, $6::text, $7::text, $8::text)`,
    args: [FAKE_SESSION, FAKE_STUDENT, 'full', null, 4900, 'standard', 'order_smoke', 'pay_smoke'],
  },
  {
    name: 'release_faculty_payout — 1:1 session payout',
    sql:  `SELECT * FROM release_faculty_payout($1::uuid, $2::text)`,
    args: [FAKE_SESSION, null],
  },
  {
    name: 'release_live_session_payout — group session payout',
    sql:  `SELECT * FROM release_live_session_payout($1::uuid, $2::text)`,
    args: [FAKE_SESSION, null],
  },
  {
    name: 'award_saathi_points — service-role path',
    sql:  `SELECT * FROM award_saathi_points($1::uuid, $2::text, $3::int, $4::text, $5::jsonb)`,
    args: [FAKE_STUDENT, 'chat_session', 10, 'free', '{}'],
  },
  {
    name: 'check_companionship — soul lookup',
    sql:  `SELECT * FROM check_companionship($1::uuid, $2::uuid)`,
    args: [FAKE_STUDENT, FAKE_VERTICAL],
  },
  {
    name: 'can_post_board_question — quota check',
    sql:  `SELECT * FROM can_post_board_question($1::uuid)`,
    args: [FAKE_STUDENT],
  },
  {
    // RETURNS TABLE — the first run of this test caught a 42702 here
    // (vertical_id ambiguity vs the RETURNS TABLE variable). Fixed in
    // migration 141. Keeping the case in the list locks the regression.
    name: 'get_saathi_suggestions — recommendation engine (had 42702)',
    sql:  `SELECT * FROM get_saathi_suggestions($1::uuid)`,
    args: [FAKE_STUDENT],
  },
  {
    name: 'unlock_saathi — points-to-access conversion',
    sql:  `SELECT * FROM unlock_saathi($1::uuid, $2::uuid, $3::int)`,
    args: [FAKE_STUDENT, FAKE_VERTICAL, 500],
  },
  // The two trigram search RPCs had been silently broken since
  // migration 051 — `SET search_path = ''` couldn't resolve the
  // unqualified similarity() function from pg_trgm. Edge functions
  // had a console.warn fallback to inline ILIKE, so onboarding worked
  // in degraded mode for months without anyone noticing. Fixed in 141
  // by qualifying every similarity() call as public.similarity().
  {
    name: 'search_colleges — fuzzy trigram (had 42883 — empty search_path)',
    sql:  `SELECT * FROM search_colleges($1::text, $2::int)`,
    args: ['xavier', 5],
  },
  {
    name: 'search_courses — fuzzy trigram (had 42883 — empty search_path)',
    sql:  `SELECT * FROM search_courses($1::text, $2::int)`,
    args: ['biochemistry', 3],
  },
  {
    name: 'check_faculty_email_exists — email lookup',
    sql:  `SELECT * FROM check_faculty_email_exists($1::text)`,
    args: ['test@example.com'],
  },
]

// ─── The suite ────────────────────────────────────────────────────────
// Pick the first non-empty connection string from the candidates below.
// Supabase has effectively deprecated the direct hostname (`db.<ref>
// .supabase.co:5432`) — DNS no longer resolves it for most projects —
// so we prefer the pooler URLs (Vercel-Postgres-integration names) and
// fall back through the alternates. Whichever Doppler / .env supplies
// first is what we use.
const DB_URL_CANDIDATES = [
  'POSTGRES_URL',                  // Vercel/Supabase pooled (preferred)
  'POSTGRES_PRISMA_URL',           // Vercel/Supabase pooled with pgbouncer params
  'DATABASE_URL',                  // generic
  'SUPABASE_DB_URL',               // legacy
  'POSTGRES_URL_NON_POOLING',      // direct (last resort)
  'DIRECT_URL',                    // direct (last resort)
] as const

function pickConnectionString(): { url?: string; source?: string } {
  for (const name of DB_URL_CANDIDATES) {
    const v = process.env[name]
    if (v && v.trim().length > 0) return { url: v, source: name }
  }
  return {}
}

const { url: dbUrl, source: dbUrlSource } = pickConnectionString()
const skip = !dbUrl

describe('RPC smoke — schema-level bugs in money/economy paths', () => {
  let client: Client | null = null

  beforeAll(async () => {
    if (skip) return
    client = new Client({ connectionString: dbUrl })
    await client.connect()
  })

  afterAll(async () => {
    if (client) await client.end()
  })

  it('database connection string available (sanity)', () => {
    if (skip) {
      // eslint-disable-next-line no-console
      console.warn(
        `[rpc-smoke] No database URL in env. Looked for: ${DB_URL_CANDIDATES.join(', ')}. ` +
        'All RPC tests skipped. Run via `doppler run -- npm run test:rpc-smoke` to exercise.',
      )
    } else {
      // eslint-disable-next-line no-console
      console.log(`[rpc-smoke] Using ${dbUrlSource} for connection.`)
    }
    // Always passes — opt-in test design.
    expect(true).toBe(true)
  })

  for (const tc of RPC_CASES) {
    const itDb = skip ? it.skip : it
    itDb(`${tc.name} executes without a schema-level error`, async () => {
      if (!client) throw new Error('client not connected')

      await client.query('BEGIN')
      try {
        try {
          await client.query(tc.sql, tc.args)
          // If we reach here, the function ran without raising at all.
          // That's also fine — clean schema, clean execution.
          expect(true).toBe(true)
        } catch (err) {
          const e = err as { code?: string; message?: string }
          if (e.code && SCHEMA_ERROR_CODES.has(e.code)) {
            // Schema-level bug — fail loudly with the original code.
            throw new Error(
              `[rpc-smoke] SCHEMA BUG in ${tc.name}: ` +
              `Postgres ${e.code} — ${e.message ?? '(no message)'}\n` +
              `This is the kind of bug that aborts every real call. Fix ` +
              `the function definition before deploying. See ` +
              `migration 138 (book_live_session_seat 42702) for an example.`,
            )
          }
          // Business-logic raise (P0001, P0002, 23xxx, etc.) — that's
          // the function's OWN validation firing on synthetic inputs.
          // Means it ran. Test passes.
          expect(true).toBe(true)
        }
      } finally {
        // Always rollback — even on failure — so nothing the RPC may
        // have inserted before raising leaks beyond the test transaction.
        await client.query('ROLLBACK')
      }
    })
  }
})
