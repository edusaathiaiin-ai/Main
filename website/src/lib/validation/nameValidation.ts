// website/src/lib/validation/nameValidation.ts

// Common fake/placeholder names to reject
const BLOCKED_NAMES = [
  'test', 'user', 'admin', 'guest', 'demo',
  'na', 'n/a', 'none', 'null', 'undefined',
  'anonymous', 'anon', 'unknown', 'temp',
  'abc', 'xyz', 'aaa', 'bbb', 'ccc',
  'abcd', 'abcdef', 'abcdefg',
  'asdf', 'qwerty', 'zxcv',
  'firstname', 'lastname', 'fullname',
  'yourname', 'name here', 'enter name',
  'first name', 'last name',
]

// Detect keyboard mashing — same letter repeated
function isKeyboardMash(name: string): boolean {
  const lower = name.toLowerCase().replace(/\s/g, '')

  // All same character: "aaaa", "bbbb"
  if (/^(.)\1+$/.test(lower)) return true

  // Sequential keyboard: "abcd", "qwer", "zxcv", "asdf"
  const sequences = ['abcde', 'qwert', 'yuiop', 'asdfg',
                     'hjkl', 'zxcvb', '12345', '67890']
  for (const seq of sequences) {
    if (lower.includes(seq)) return true
  }

  // Too many repeated characters (e.g. "aaabbb")
  const charFreq: Record<string, number> = {}
  for (const c of lower) {
    charFreq[c] = (charFreq[c] ?? 0) + 1
  }
  const maxFreq = Math.max(...Object.values(charFreq))
  if (maxFreq > lower.length * 0.6) return true

  return false
}

// Detect if name has enough vowels to be pronounceable
function isPronounceableName(name: string): boolean {
  const lower = name.toLowerCase()
  const letters = lower.replace(/[^a-z]/g, '')
  if (letters.length === 0) return false

  const vowels = (letters.match(/[aeiou]/g) ?? []).length
  const vowelRatio = vowels / letters.length

  // Real names have at least 18% vowels
  // "Prarthi" = 3/7 = 43% ✅
  // "ABCDEF"  = 1/6 = 16% ❌
  // "Khushi"  = 2/6 = 33% ✅
  // "Shlok"   = 1/5 = 20% ✅ (border)
  return vowelRatio >= 0.18
}

// Check if it looks like a real name
function hasNamePattern(name: string): boolean {
  const trimmed = name.trim()

  // Must start with a letter (not number or symbol)
  if (!/^[a-zA-Z\u0900-\u097F]/.test(trimmed)) return false

  // No more than 3 words (first + middle + last is fine)
  const words = trimmed.split(/\s+/)
  if (words.length > 3) return false

  // Each word must be at least 2 characters
  if (words.some(w => w.length < 2)) return false

  // No numbers mixed in (no "John123" or "User2")
  if (/\d/.test(trimmed)) return false

  // No special characters except hyphen and apostrophe
  // (for names like "O'Brien" or "Mary-Anne")
  if (/[^a-zA-Z\u0900-\u097F\s\-']/.test(trimmed)) return false

  return true
}

export function validateDisplayName(name: string): {
  valid: boolean
  error: string | null
} {
  const trimmed = name.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }

  if (trimmed.length > 40) {
    return { valid: false, error: 'Name must be under 40 characters' }
  }

  // Check blocked list
  const lower = trimmed.toLowerCase()
  if (BLOCKED_NAMES.some(b => lower === b || lower.replace(/\s/g, '') === b)) {
    return { valid: false, error: 'Please enter your real name' }
  }

  // Must be pronounceable (skip for Devanagari-only names — ratio check is Latin-only)
  const hasLatinLetters = /[a-zA-Z]/.test(trimmed)
  if (hasLatinLetters && !isPronounceableName(trimmed)) {
    return { valid: false, error: 'Please enter your real name' }
  }

  // No keyboard mashing
  if (isKeyboardMash(trimmed)) {
    return { valid: false, error: 'Please enter your real name' }
  }

  // Must follow name pattern
  if (!hasNamePattern(trimmed)) {
    return { valid: false, error: 'Please enter your real name — no numbers or symbols' }
  }

  return { valid: true, error: null }
}
