// ─────────────────────────────────────────────────────────────────────────────
// artifactClient — thin fetch wrappers for the faculty-solo artifact log.
// Used by SaveArtifactButton and FacultyArtifactRail. Zero state. All state
// lives in the consuming hook.
// ─────────────────────────────────────────────────────────────────────────────

export type SavedArtifact = {
  id:                 string
  saathi_slug:        string
  tool_id:            string
  title:              string | null
  source_url:         string | null
  payload_json:       Record<string, unknown>
  session_bucket_id:  string
  created_at:         string
}

export type SaveArtifactInput = {
  saathi_slug:        string
  tool_id:            string
  title?:             string
  payload_json:       Record<string, unknown>
  source_url?:        string
  session_bucket_id:  string
}

export async function saveArtifact(input: SaveArtifactInput): Promise<SavedArtifact | null> {
  try {
    const res = await fetch('/api/faculty-solo/artifacts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(input),
    })
    if (!res.ok) return null
    const data = await res.json() as { artifact?: SavedArtifact }
    return data.artifact ?? null
  } catch {
    return null
  }
}

export async function listTodaysArtifacts(saathiSlug?: string): Promise<SavedArtifact[]> {
  try {
    const url = saathiSlug
      ? `/api/faculty-solo/artifacts?since=today&saathi_slug=${encodeURIComponent(saathiSlug)}`
      : '/api/faculty-solo/artifacts?since=today'
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json() as { artifacts?: SavedArtifact[] }
    return data.artifacts ?? []
  } catch {
    return []
  }
}

// ── Delivery channels — email + WhatsApp ────────────────────────────────────

export type ExportResult = {
  status:  'sent' | 'pending' | 'failed'
  detail?: string
  to?:     string
  reason?: string
}

export async function emailArtifact(artifactId: string): Promise<ExportResult> {
  try {
    const res = await fetch('/api/faculty-solo/export/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ artifact_id: artifactId }),
    })
    const data = await res.json() as ExportResult & { error?: string }
    if (!res.ok) return { status: 'failed', detail: data.error ?? 'send_failed' }
    return data
  } catch {
    return { status: 'failed', detail: 'network_error' }
  }
}

export async function whatsappArtifact(artifactId: string): Promise<ExportResult> {
  try {
    const res = await fetch('/api/faculty-solo/export/whatsapp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ artifact_id: artifactId }),
    })
    const data = await res.json() as ExportResult & { error?: string }
    if (!res.ok && !data.status) return { status: 'failed', detail: data.error ?? 'send_failed' }
    return data
  } catch {
    return { status: 'failed', detail: 'network_error' }
  }
}

/** Session-bundle exports — one call, one channel, server renders and delivers. */
export async function shareTodaysSession(
  channel:    'email' | 'whatsapp',
  saathiSlug: string,
): Promise<ExportResult & { count?: number }> {
  try {
    const res = await fetch('/api/faculty-solo/export/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ channel, saathi_slug: saathiSlug }),
    })
    const data = await res.json() as ExportResult & { error?: string; count?: number }
    if (!res.ok && !data.status) return { status: 'failed', detail: data.error ?? 'send_failed' }
    return data
  } catch {
    return { status: 'failed', detail: 'network_error' }
  }
}

// ── Session bucket — one UUID per ~2h sitting, persisted in sessionStorage ──

const BUCKET_KEY    = 'faculty_solo_bucket_id'
const BUCKET_TS_KEY = 'faculty_solo_bucket_ts'
const TWO_HOURS_MS  = 2 * 60 * 60 * 1000

export function currentSessionBucketId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  try {
    const existing = sessionStorage.getItem(BUCKET_KEY)
    const ts       = Number(sessionStorage.getItem(BUCKET_TS_KEY) ?? '0')
    if (existing && Date.now() - ts < TWO_HOURS_MS) {
      sessionStorage.setItem(BUCKET_TS_KEY, String(Date.now()))
      return existing
    }
    const fresh = crypto.randomUUID()
    sessionStorage.setItem(BUCKET_KEY, fresh)
    sessionStorage.setItem(BUCKET_TS_KEY, String(Date.now()))
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}
