import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { MarkVerifiedButton, AddHorizonButton } from './HorizonActions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type HorizonRow = {
  id:                 string
  saathi_slug:        string
  title:              string
  category:           string
  difficulty:         string
  needs_verification: boolean
  last_verified_at:   string | null
  is_active:          boolean
  author_display_name:string | null
}

type VerticalRow = {
  slug: string
  name: string
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit',
  })
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export default async function HorizonsPage({
  searchParams,
}: {
  searchParams: Promise<{ saathi?: string }>
}) {
  await requireAdmin()
  const { saathi: filterSlug } = await searchParams
  const admin = getAdminClient()

  // ── Fetch horizons (optionally filtered) ───────────────────────────────
  let query = admin
    .from('saathi_horizons')
    .select(`
      id, saathi_slug, title, category, difficulty,
      needs_verification, last_verified_at, is_active,
      author_display_name
    `)
    .order('saathi_slug',   { ascending: true })
    .order('needs_verification', { ascending: false })  // stale first
    .order('title', { ascending: true })

  if (filterSlug) {
    query = query.eq('saathi_slug', filterSlug)
  }

  const { data: rowsRaw } = await query
  const rows = (rowsRaw ?? []) as HorizonRow[]

  // ── Fetch all Saathi slugs for filter dropdown + add form ──────────────
  const { data: verticalsRaw } = await admin
    .from('verticals')
    .select('slug, name')
    .order('name')

  const verticals = (verticalsRaw ?? []) as VerticalRow[]
  const allSlugs  = verticals.map((v) => v.slug)

  // ── Group by saathi_slug for section headers ───────────────────────────
  const grouped = new Map<string, HorizonRow[]>()
  for (const r of rows) {
    const bucket = grouped.get(r.saathi_slug) ?? []
    bucket.push(r)
    grouped.set(r.saathi_slug, bucket)
  }
  const groupedEntries = Array.from(grouped.entries())

  // ── Summary stats ──────────────────────────────────────────────────────
  const total   = rows.length
  const stale   = rows.filter((r) => r.needs_verification).length
  const active  = rows.filter((r) => r.is_active).length

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Saathi Horizons</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aspirational career pathways surfaced in every chat. Keep entries
            fresh: any row unverified for 90+ days is auto-flagged by the
            Monday cron and its Layer-2 details (deadlines, links) hide on
            the student UI.
          </p>
        </div>
        <AddHorizonButton saathiSlugs={allSlugs} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total horizons"        value={total} />
        <StatCard label="Active"                value={active} />
        <StatCard label="Need re-verification" value={stale} tone={stale > 0 ? 'warn' : 'ok'} />
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          Filter
        </span>
        <div className="flex flex-wrap gap-2">
          <FilterLink href="/horizons" active={!filterSlug}>
            All Saathis ({verticals.length})
          </FilterLink>
          {verticals.map((v) => (
            <FilterLink
              key={v.slug}
              href={`/horizons?saathi=${encodeURIComponent(v.slug)}`}
              active={filterSlug === v.slug}
            >
              {v.name}
            </FilterLink>
          ))}
        </div>
      </div>

      {/* Grouped tables */}
      {groupedEntries.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500 text-sm">
          No horizons match this filter.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEntries.map(([slug, items]) => {
            const vertical = verticals.find((v) => v.slug === slug)
            return (
              <section
                key={slug}
                className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden"
              >
                <header className="flex items-baseline justify-between px-5 py-3 border-b border-slate-800">
                  <h2 className="text-sm font-semibold text-white">
                    {vertical?.name ?? slug}
                    <span className="ml-2 text-slate-500 font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <code className="text-[11px] text-slate-600">{slug}</code>
                </header>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-800">
                      <th className="text-left px-5 py-2 font-semibold">Title</th>
                      <th className="text-left px-3 py-2 font-semibold">Category</th>
                      <th className="text-left px-3 py-2 font-semibold">Difficulty</th>
                      <th className="text-left px-3 py-2 font-semibold">Needs re-verify</th>
                      <th className="text-left px-3 py-2 font-semibold">Last verified</th>
                      <th className="text-right px-5 py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((h) => {
                      const days = daysSince(h.last_verified_at)
                      return (
                        <tr
                          key={h.id}
                          className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="text-white font-medium">{h.title}</div>
                            {h.author_display_name && (
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                by {h.author_display_name}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-400">{h.category}</td>
                          <td className="px-3 py-3 text-slate-400">{h.difficulty}</td>
                          <td className="px-3 py-3">
                            {h.needs_verification ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                                Yes
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {fmtDate(h.last_verified_at)}
                            {days !== null && (
                              <span className="block text-[10px] text-slate-600">
                                {days}d ago
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <MarkVerifiedButton horizonId={h.id} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Small bits ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'ok' | 'warn'
}) {
  const toneClass =
    tone === 'warn' ? 'text-amber-400' :
    tone === 'ok'   ? 'text-emerald-400' :
                      'text-white'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-amber-500 text-slate-950'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}
