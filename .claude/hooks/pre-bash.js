#!/usr/bin/env node
/**
 * Claude Code pre-bash safety hook
 * Blocks destructive commands before they run.
 */

const input = JSON.parse(process.argv[2] || '{}')
const command = (input.tool_input?.command || '').trim()

// ─── Destructive SQL patterns ──────────────────────────────────────────────
const BLOCKED_SQL = [
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\s+profiles\b/i,
  /\bTRUNCATE\b/i,
  /\bDROP\s+DATABASE\b/i,
]

// ─── Destructive git patterns ──────────────────────────────────────────────
const BLOCKED_GIT = [
  /git\s+push\s+.*--force\b/,
  /git\s+push\s+.*-f\b/,
  /git\s+reset\s+--hard\b/,
  /git\s+clean\s+-[a-z]*f/,
]

// ─── Secret exposure patterns ──────────────────────────────────────────────
const BLOCKED_SECRET = [
  /\bcat\s+.*\.env\b/,
  /\bcat\s+.*\.env\.local\b/,
  /echo\s+.*SECRET/i,
  /echo\s+.*API_KEY/i,
  /echo\s+.*PASSWORD/i,
  /printenv\s+.*KEY/i,
  /printenv\s+.*SECRET/i,
]

// ─── Supabase dangerous ops ────────────────────────────────────────────────
const BLOCKED_SUPABASE = [
  /supabase\s+db\s+reset/,
  /supabase\s+db\s+push\s+--linked/,
]

// ─── Protected files (warn but don't block) ────────────────────────────────
const PROTECTED_FILE_PATTERNS = [
  /resolveVerticalId\.ts/,
  /verticalIds\.ts/,
  /supabase\/migrations\//,
]

function check() {
  for (const re of BLOCKED_SQL) {
    if (re.test(command)) {
      console.error(
        `[pre-bash] BLOCKED: Destructive SQL detected: "${command.slice(0, 80)}"`
      )
      process.exit(1)
    }
  }

  for (const re of BLOCKED_GIT) {
    if (re.test(command)) {
      console.error(
        `[pre-bash] BLOCKED: Destructive git command: "${command.slice(0, 80)}"`
      )
      process.exit(1)
    }
  }

  for (const re of BLOCKED_SECRET) {
    if (re.test(command)) {
      console.error(
        `[pre-bash] BLOCKED: Secret exposure risk: "${command.slice(0, 80)}"`
      )
      process.exit(1)
    }
  }

  for (const re of BLOCKED_SUPABASE) {
    if (re.test(command)) {
      console.error(
        `[pre-bash] BLOCKED: Dangerous Supabase op: "${command.slice(0, 80)}"`
      )
      process.exit(1)
    }
  }

  // Warn on protected files (don't block — may be legitimate read)
  for (const re of PROTECTED_FILE_PATTERNS) {
    if (re.test(command)) {
      console.error(
        `[pre-bash] WARNING: Command touches protected path (${re.source}). Verify intent.`
      )
      // Don't exit — just warn
    }
  }
}

check()
process.exit(0)
