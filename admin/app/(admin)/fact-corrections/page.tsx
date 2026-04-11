import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { CorrectionRow } from './CorrectionRow'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ status?: string }>

const STATUS_TABS = [
  { id: 'pending',   label: '⏳ Pending',   color: 'text-amber-400'  },
  { id: 'verified',  label: '✅ Verified',  color: 'text-emerald-400' },
  { id: 'rejected',  label: '❌ Rejected',  color: 'text-red-400'    },
  { id: 'duplicate', label: '🔁 Duplicate', color: 'text-slate-400'  },
]

export default async function FactCorrectionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { status = 'pending' } = await searchParams
  const admin = getAdminClient()

  const [{ data: corrections }, { data: counts }] = await Promise.all([
    admin
      .from('fact_corrections')
      .select('*, profiles:reporter_id(full_name)')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100),

    // Count per status for tab badges
    admin
      .from('fact_corrections')
      .select('status')
      .in('status', ['pending', 'verified', 'rejected', 'duplicate']),
  ])

  const countMap = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fact Corrections</h1>
        <p className="text-sm text-slate-400 mt-1">
          Student-reported factual errors in Saathi responses · verify to inject fix + award 50 SP
        </p>
      </div>

      {/* How it works strip */}
      <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300 mb-2">How the loop works</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['1. Student reports', 'CTA after every chat response → form with wrong claim, correct claim, optional source URL'],
            ['2. Admin notified', 'Instant email to admin@edusaathiai.in with full details + credibility signals'],
            ['3. Admin reviews here', 'Verify → correction injected into Saathi system prompt. Reject → noted. Duplicate → merged.'],
            ['4. Reporter rewarded', 'Verify sends +50 SP + confirmation email to reporter automatically'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg p-3 bg-slate-800/60 border border-slate-700/60">
              <p className="font-semibold text-white/70 mb-1">{title}</p>
              <p className="text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status tab bar */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <a
            key={t.id}
            href={`?status=${t.id}`}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              status === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
            {(countMap[t.id] ?? 0) > 0 && (
              <span className={`text-[10px] font-bold ${t.color}`}>
                {countMap[t.id]}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-wider">
              <th className="text-left px-5 py-3">Saathi</th>
              <th className="text-left px-4 py-3">Reporter</th>
              <th className="text-left px-4 py-3">Wrong claim</th>
              <th className="text-left px-4 py-3">Correct claim</th>
              <th className="text-center px-4 py-3">Source</th>
              <th className="text-center px-4 py-3">Flag</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(corrections ?? []).map(c => (
              <CorrectionRow key={c.id} c={c as Parameters<typeof CorrectionRow>[0]['c']} />
            ))}
            {!(corrections ?? []).length && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-600 text-sm">
                  No {status} corrections
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600">
        Click any row to expand · corrections verified here are automatically injected into the Saathi system prompt via <code>verify-correction</code> Edge Function
      </p>
    </div>
  )
}
