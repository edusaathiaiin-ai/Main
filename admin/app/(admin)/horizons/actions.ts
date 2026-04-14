'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

type HorizonInsert = {
  saathi_slug:         string
  title:               string
  category:            string
  difficulty:          string
  description:         string
  inspiration:         string | null
  today_action:        string
  today_prompt:        string | null
  academic_levels:     string[]
  author_display_name: string
  author_credentials:  string | null
  is_active:           boolean
  last_verified_at:    string  // ISO now()
  needs_verification:  boolean
}

const CATEGORIES   = ['international', 'certification', 'crossover', 'entrepreneurship', 'research', 'today']
const DIFFICULTIES = ['ambitious', 'reachable', 'today']
const LEVELS       = ['school', 'bachelor', 'master', 'phd']

/**
 * Flip a horizon to verified. Sets last_verified_at = now() and
 * needs_verification = false so the UI re-surfaces Layer-2 data.
 */
export async function markHorizonVerified(formData: FormData) {
  await requireAdmin()

  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Missing horizon id')

  const admin = getAdminClient()
  const { error } = await admin
    .from('saathi_horizons')
    .update({
      needs_verification: false,
      last_verified_at:   new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/horizons')
}

/**
 * Create a new horizon. All Layer-1 fields required, Layer-2 (deadlines,
 * external_links) intentionally omitted from the MVP form — admin can
 * edit the row directly in Supabase SQL editor to add those, or we add
 * a dedicated edit UI later.
 */
export async function createHorizon(formData: FormData) {
  await requireAdmin()

  const saathi_slug  = String(formData.get('saathi_slug')  ?? '').trim()
  const title        = String(formData.get('title')        ?? '').trim()
  const category     = String(formData.get('category')     ?? '').trim()
  const difficulty   = String(formData.get('difficulty')   ?? '').trim()
  const description  = String(formData.get('description')  ?? '').trim()
  const inspiration  = String(formData.get('inspiration')  ?? '').trim()
  const today_action = String(formData.get('today_action') ?? '').trim()
  const today_prompt = String(formData.get('today_prompt') ?? '').trim()
  const author_name  = String(formData.get('author_display_name') ?? '').trim()
  const author_creds = String(formData.get('author_credentials')  ?? '').trim()

  const levelsRaw = formData.getAll('academic_levels').map(String)
  const levels = levelsRaw.filter((l) => LEVELS.includes(l))

  // Guards
  if (!saathi_slug)   throw new Error('Saathi is required')
  if (!title)         throw new Error('Title is required')
  if (!CATEGORIES.includes(category))     throw new Error('Invalid category')
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Invalid difficulty')
  if (!description)   throw new Error('Description is required')
  if (!today_action)  throw new Error('Today action is required')

  const row: HorizonInsert = {
    saathi_slug,
    title,
    category,
    difficulty,
    description,
    inspiration:         inspiration || null,
    today_action,
    today_prompt:        today_prompt || null,
    academic_levels:     levels.length > 0 ? levels : ['bachelor', 'master', 'phd'],
    author_display_name: author_name || 'EdUsaathiAI Research',
    author_credentials:  author_creds || null,
    is_active:           true,
    last_verified_at:    new Date().toISOString(),
    needs_verification:  false,
  }

  const admin = getAdminClient()
  const { error } = await admin.from('saathi_horizons').insert(row)
  if (error) throw new Error(error.message)

  revalidatePath('/horizons')
}
