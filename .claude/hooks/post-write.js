#!/usr/bin/env node
/**
 * Claude Code post-write hook
 * Auto-formats TypeScript/JavaScript files after Claude writes them.
 */

const { execSync } = require('child_process')
const path = require('path')

const input = JSON.parse(process.argv[2] || '{}')
const filePath = input.tool_input?.file_path || input.tool_input?.path || ''

// Only format source files
const FORMATTABLE = /\.(ts|tsx|js|jsx)$/
if (!FORMATTABLE.test(filePath)) process.exit(0)

// Don't format generated/vendor files
const SKIP = [
  /node_modules/,
  /\.next\//,
  /dist\//,
  /\.min\./,
  /supabase\/functions\/_shared/,
]
if (SKIP.some((re) => re.test(filePath))) process.exit(0)

// Determine which prettier config to use
const isAdmin = filePath.includes('/admin/')
const cwd = isAdmin
  ? path.join(process.env.HOME || '', 'EdUsaathiAI', 'admin')
  : path.join(process.env.HOME || '', 'EdUsaathiAI', 'website')

try {
  execSync(`npx prettier --write "${filePath}"`, {
    cwd,
    stdio: 'pipe',
    timeout: 15000,
  })
} catch {
  // Non-fatal — prettier failure should not block the write
}

process.exit(0)
