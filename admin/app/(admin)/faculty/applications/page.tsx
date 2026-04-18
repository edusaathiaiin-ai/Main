import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

type Application = {
  id: string
  full_name: string
  email: string
  wa_phone: string
  primary_saathi_slug: string
  additional_saathi_slugs: string[]
  highest_qualification: string
  current_institution: string | null
  years_experience: number
  session_fee_rupees: number
  short_bio: string
  linkedin_url: string | null
  areas_of_expertise: string | null
  status: string
  created_at: string
}

const STATUS_CHIP: Record<string, string> = {
  pending:  'bg-amber-500/20 text-amber-300',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
}

export default async function ApplicationsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  const { data } = await admin
    .from('faculty_applications')
    .select('*')
    .order('created_at', { ascending: false })

  const applications = (data ?? []) as Application[]

  const pending = applications.filter((a) => a.status === 'pending').length
  const approved = applications.filter((a) => a.status === 'approved').length
  const rejected = applications.filter((a) => a.status === 'rejected').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Faculty Applications</h1>
        <Link href="/faculty/nominations" className="text-xs text-amber-400 hover:text-amber-300">
          View Nominations →
        </Link>
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Total', value: applications.length, color: 'text-white' },
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          { label: 'Approved', value: approved, color: 'text-emerald-400' },
          { label: 'Rejected', value: rejected, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 min-w-[100px]">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-slate-500 text-sm">
          No applications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-[3px] ${
                app.status === 'pending' ? 'border-l-amber-500' :
                app.status === 'approved' ? 'border-l-emerald-500' :
                'border-l-red-500'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-[15px]">{app.full_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STATUS_CHIP[app.status] ?? STATUS_CHIP.pending}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {app.email} · {app.wa_phone} · {app.primary_saathi_slug}
                  </div>
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
                <div><span className="text-slate-600">Qualification:</span> <span className="text-slate-300">{app.highest_qualification}</span></div>
                <div><span className="text-slate-600">Institution:</span> <span className="text-slate-300">{app.current_institution ?? '—'}</span></div>
                <div><span className="text-slate-600">Experience:</span> <span className="text-slate-300">{app.years_experience} years</span></div>
                <div><span className="text-slate-600">Fee/hr:</span> <span className="text-slate-300">₹{app.session_fee_rupees}</span></div>
                {app.linkedin_url && (
                  <div className="col-span-2">
                    <span className="text-slate-600">LinkedIn:</span>{' '}
                    <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">{app.linkedin_url}</a>
                  </div>
                )}
                {app.areas_of_expertise && (
                  <div className="col-span-2">
                    <span className="text-slate-600">Expertise:</span> <span className="text-slate-300">{app.areas_of_expertise}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="bg-slate-800/50 rounded-lg px-3 py-2 border-l-2 border-amber-500/40 mb-3">
                <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{app.short_bio}&rdquo;</p>
              </div>

              {/* Actions */}
              {app.status === 'pending' && (
                <div className="flex gap-2">
                  <form action={`/api/faculty-application-action`} method="POST">
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
                      ✓ Approve
                    </button>
                  </form>
                  <form action={`/api/faculty-application-action`} method="POST">
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="action" value="reject" />
                    <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                      Decline
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
