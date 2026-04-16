import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { StatCard } from '@/components/ui/StatCard'
import NominationsClient from './NominationsClient'

export const dynamic = 'force-dynamic'

export default async function NominationsPage() {
  await requireAdmin()
  const admin = getAdminClient()

  // Fetch all nominations with student nominator joined
  const { data: nominations } = await admin
    .from('faculty_nominations')
    .select(`
      *,
      nominator:nominated_by_user_id (
        full_name,
        email,
        institution_name,
        city
      )
    `)
    .order('created_at', { ascending: false })

  // For faculty nominators, resolve via faculty_profiles → profiles
  const rows = nominations ?? []
  const facultyNominatorIds = rows
    .filter((n) => n.nominator_type === 'faculty' && n.nominated_by_faculty_id)
    .map((n) => n.nominated_by_faculty_id as string)

  let facultyNames: Record<string, string> = {}
  if (facultyNominatorIds.length > 0) {
    const { data: fps } = await admin
      .from('faculty_profiles')
      .select('id, user_id, profiles!inner(full_name)')
      .in('id', facultyNominatorIds)
    for (const fp of fps ?? []) {
      const p = (fp as unknown as { profiles: { full_name: string } }).profiles
      const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name
      if (name) facultyNames[fp.id as string] = name
    }
  }

  // Enrich rows with resolved nominator name
  const enriched = rows.map((n) => ({
    ...n,
    resolved_nominator_name:
      n.nominator_type === 'student'
        ? (n.nominator as { full_name?: string } | null)?.full_name ?? 'Unknown student'
        : facultyNames[n.nominated_by_faculty_id as string] ?? 'Unknown faculty',
  }))

  // Summary counts
  const counts = {
    total: rows.length,
    invited: rows.filter((n) => n.status === 'invited').length,
    applied: rows.filter((n) => n.status === 'applied').length,
    verified: rows.filter((n) => n.status === 'verified').length,
    eminent: rows.filter((n) => n.status === 'eminent').length,
    declined: rows.filter((n) => n.status === 'declined').length,
  }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Faculty Nominations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Students and faculty who have recommended educators to join EdUsaathiAI.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Total" value={counts.total} />
        <StatCard
          label="Invited"
          value={counts.invited}
          dot={counts.invited > 0 ? 'amber' : undefined}
        />
        <StatCard
          label="Applied"
          value={counts.applied}
          dot={counts.applied > 0 ? 'amber' : undefined}
        />
        <StatCard label="Verified" value={counts.verified} dot={counts.verified > 0 ? 'green' : undefined} />
        <StatCard label="Eminent" value={counts.eminent} accent={counts.eminent > 0} />
        <StatCard label="Declined" value={counts.declined} dot={counts.declined > 0 ? 'red' : undefined} />
      </div>

      <NominationsClient nominations={enriched} />
    </div>
  )
}
