import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// All 20 Saathis for the filter dropdown
const SAATHIS = [
  { slug: 'kanoonsaathi',   name: 'KanoonSaathi'  },
  { slug: 'maathsaathi',    name: 'MaathSaathi'   },
  { slug: 'chemsaathi',     name: 'ChemSaathi'    },
  { slug: 'biosaathi',      name: 'BioSaathi'     },
  { slug: 'pharmasaathi',   name: 'PharmaSaathi'  },
  { slug: 'medicosaathi',   name: 'MedicoSaathi'  },
  { slug: 'nursingsaathi',  name: 'NursingSaathi' },
  { slug: 'psychsaathi',    name: 'PsychSaathi'   },
  { slug: 'mechsaathi',     name: 'MechSaathi'    },
  { slug: 'civilsaathi',    name: 'CivilSaathi'   },
  { slug: 'elecsaathi',     name: 'ElecSaathi'    },
  { slug: 'compsaathi',     name: 'CompSaathi'    },
  { slug: 'envirosathi',    name: 'EnviroSaathi'  },
  { slug: 'bizsaathi',      name: 'BizSaathi'     },
  { slug: 'finsaathi',      name: 'FinSaathi'     },
  { slug: 'mktsaathi',      name: 'MktSaathi'     },
  { slug: 'hrsaathi',       name: 'HRSaathi'      },
  { slug: 'archsaathi',     name: 'ArchSaathi'    },
  { slug: 'historysaathi',  name: 'HistorySaathi' },
  { slug: 'econsaathi',     name: 'EconSaathi'    },
]

type SearchParams = Promise<{ q?: string; plan?: string; saathi?: string; page?: string }>

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { q, plan, saathi, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const pageSize = 30
  const offset = (pageNum - 1) * pageSize

  const admin = getAdminClient()

  // Resolve saathi slug → vertical UUID for filtering
  let saathiUuid: string | null = null
  if (saathi) {
    const { data: vertical } = await admin
      .from('verticals')
      .select('id')
      .eq('slug', saathi)
      .single()
    saathiUuid = vertical?.id ?? null
  }

  let query = admin
    .from('profiles')
    .select(
      'id, full_name, email, role, primary_saathi_id, country_code, created_at, plan_id, subscription_status, verticals!profiles_primary_saathi_id_fkey(slug)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (q)          query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  if (plan)       query = query.eq('plan_id', plan)
  if (saathiUuid) query = query.eq('primary_saathi_id', saathiUuid)

  const { data: users, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  // Per-Saathi counts for the filter pills
  const { data: saathiCounts } = await admin
    .from('profiles')
    .select('primary_saathi_id, verticals!profiles_primary_saathi_id_fkey(slug)')
    .not('primary_saathi_id', 'is', null)

  const countBySaathi: Record<string, number> = {}
  for (const row of saathiCounts ?? []) {
    const slug = (row.verticals as unknown as { slug: string } | null)?.slug
    if (slug) countBySaathi[slug] = (countBySaathi[slug] ?? 0) + 1
  }

  const statusColor: Record<string, string> = {
    active: 'text-emerald-400',
    inactive: 'text-slate-500',
    cancelled: 'text-red-400',
    failed: 'text-orange-400',
  }

  const planChip: Record<string, string> = {
    free: 'bg-slate-700 text-slate-300',
    'plus-monthly': 'bg-amber-500/20 text-amber-300',
    'plus-annual': 'bg-amber-500/30 text-amber-200',
    institution: 'bg-violet-500/20 text-violet-300',
  }

  // Build pagination href preserving all active filters
  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q)      params.set('q', q)
    if (plan)   params.set('plan', plan)
    if (saathi) params.set('saathi', saathi)
    params.set('page', String(p))
    return `/users?${params.toString()}`
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-6">Users</h1>

      {/* ── Search + plan filter ──────────────────────────────────────── */}
      <form className="flex gap-3 mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <select
          name="plan"
          defaultValue={plan ?? ''}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="plus-monthly">Plus Monthly</option>
          <option value="plus-annual">Plus Annual</option>
          <option value="institution">Institution</option>
        </select>
        {/* Preserve saathi filter across plan/search submits */}
        {saathi && <input type="hidden" name="saathi" value={saathi} />}
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl px-5 py-2 text-sm transition-colors"
        >
          Search
        </button>
      </form>

      {/* ── Saathi filter pills ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={`/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(plan ? { plan } : {}) }).toString()}`}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !saathi
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          All Saathis
        </Link>
        {SAATHIS.filter(s => (countBySaathi[s.slug] ?? 0) > 0)
          .sort((a, b) => (countBySaathi[b.slug] ?? 0) - (countBySaathi[a.slug] ?? 0))
          .map(s => {
            const active = saathi === s.slug
            const params = new URLSearchParams({
              ...(q    ? { q }    : {}),
              ...(plan ? { plan } : {}),
              saathi: s.slug,
            })
            return (
              <Link
                key={s.slug}
                href={`/users?${params.toString()}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {s.name}
                <span className={`ml-1.5 ${active ? 'text-slate-800' : 'text-slate-600'}`}>
                  {countBySaathi[s.slug] ?? 0}
                </span>
              </Link>
            )
          })}
      </div>

      {/* ── Active filter summary ─────────────────────────────────────── */}
      {(saathi || plan || q) && (
        <p className="text-xs text-slate-500 mb-4">
          Showing <span className="text-white font-medium">{count ?? 0}</span> users
          {saathi && <> in <span className="text-amber-400">{SAATHIS.find(s => s.slug === saathi)?.name ?? saathi}</span></>}
          {plan   && <> · plan: <span className="text-amber-400">{plan}</span></>}
          {q      && <> · matching <span className="text-amber-400">"{q}"</span></>}
          {' · '}
          <Link href="/users" className="text-slate-400 hover:text-white underline underline-offset-2">
            Clear filters
          </Link>
        </p>
      )}

      {/* ── Users table ───────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3.5">Name</th>
              <th className="text-left px-4 py-3.5">Email</th>
              <th className="text-left px-4 py-3.5">Plan</th>
              <th className="text-left px-4 py-3.5">Status</th>
              <th className="text-left px-4 py-3.5">Saathi</th>
              <th className="text-left px-4 py-3.5">Joined</th>
              <th className="px-4 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-5 py-3.5 text-white font-medium">
                  <div className="flex items-center gap-2">
                    {u.full_name ?? '—'}
                    {!u.full_name && !u.primary_saathi_id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 font-semibold whitespace-nowrap">
                        Incomplete signup
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-400">{u.email}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${planChip[u.plan_id] ?? planChip.free}`}
                  >
                    {u.plan_id === 'free'
                      ? 'Free'
                      : u.plan_id === 'plus-monthly'
                        ? 'Plus Monthly'
                        : u.plan_id === 'plus-annual'
                          ? 'Plus Annual'
                          : 'Institution'}
                  </span>
                </td>
                <td
                  className={`px-4 py-3.5 text-xs font-medium ${statusColor[u.subscription_status] ?? 'text-slate-500'}`}
                >
                  {u.subscription_status}
                </td>
                <td className="px-4 py-3.5 text-slate-400 text-xs">
                  {(u.verticals as unknown as { slug: string } | null)?.slug ?? '—'}
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/users/${u.id}`}
                    className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {!users?.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-slate-500 text-sm"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
          <span>
            Page {pageNum} of {totalPages} · {count} total
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={pageHref(pageNum - 1)}
                className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={pageHref(pageNum + 1)}
                className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
