import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { NudgeBuilder } from './NudgeBuilder'
import { AutoRuleToggle } from './AutoRuleToggle'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ tab?: string }>

const NUDGE_TEMPLATES = [
  {
    id: 'complete_profile',
    icon: '👤',
    title: 'Complete your profile',
    segment: 'Students with completeness < 50%',
    channel: 'in-app + email',
    preview:
      'Your Saathi knows only {X}% of you. Complete your profile for a deeper learning experience →',
  },
  {
    id: 'inactive_7d',
    icon: '😴',
    title: "You haven't chatted in 7 days",
    segment: 'Users with no session in 7 days',
    channel: 'in-app + email',
    preview:
      'Your {saathi_name} misses you. Come back and continue where you left off →',
  },
  {
    id: 'upload_doc',
    icon: '📄',
    title: 'Upload verification document',
    segment: 'Retired faculty with no doc uploaded',
    channel: 'in-app + email',
    preview:
      'Complete your Emeritus verification to unlock all features. Upload takes 2 minutes →',
  },
  {
    id: 'intent_supporters',
    icon: '🔥',
    title: 'Your lecture request has supporters',
    segment: 'Faculty with intent requests',
    channel: 'email',
    preview: '{X} students want to learn {topic}. Create a session →',
  },
  {
    id: 'posting_expiring',
    icon: '⏰',
    title: 'Internship posting expires soon',
    segment: 'Institutions with postings expiring in 7 days',
    channel: 'email',
    preview:
      'Your {title} posting expires in {X} days. Renew to keep receiving applications →',
  },
  {
    id: 'pending_requests',
    icon: '✉️',
    title: 'Pending session requests',
    segment: 'Faculty with unresponded requests',
    channel: 'email',
    preview: 'You have {X} unread session requests waiting. Review them →',
  },
  {
    id: 'trial_ending',
    icon: '⏳',
    title: 'Trial ends in 3 days',
    segment: 'Faculty on trial expiring soon',
    channel: 'email',
    preview:
      'Your EdUsaathiAI Pro trial ends in 3 days. Continue for ₹599/month or return to Free →',
  },
  {
    id: 'wallet_expiring',
    icon: '💰',
    title: 'Wallet credit expiring',
    segment: 'Students with wallet balance expiring in 30 days',
    channel: 'in-app + email',
    preview:
      'You have ₹{X} wallet credit expiring on {date}. Renew your subscription to use it →',
  },
] as const

const AUTO_RULES = [
  {
    id: 'inactive_student',
    title: 'Inactive student nudge',
    trigger: 'No session in 7 days',
    channel: 'in-app + email',
    template: 'inactive_7d',
    maxPerWeek: 1,
  },
  {
    id: 'trial_expiry',
    title: 'Trial expiry nudge',
    trigger: 'Faculty trial expires in 3 days',
    channel: 'email',
    template: 'trial_ending',
    maxPerWeek: 1,
  },
  {
    id: 'doc_upload',
    title: 'Document upload reminder',
    trigger: 'Retired faculty, no doc, >48h old',
    channel: 'in-app + email',
    template: 'upload_doc',
    maxTotal: 3,
  },
  {
    id: 'intent_expiry',
    title: 'Intent expiry nudge',
    trigger: 'Intent expires in 14 days',
    channel: 'in-app',
    template: 'complete_profile',
    maxPerWeek: 1,
  },
  {
    id: 'unanswered_req',
    title: 'Unanswered session requests',
    trigger: 'Request unanswered for 48 hours',
    channel: 'email',
    template: 'pending_requests',
    maxPerWeek: 1,
  },
] as const

export default async function NudgeCentrePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()
  const { tab = 'templates' } = await searchParams
  const admin = getAdminClient()

  // Nudge log (if table exists)
  const { data: nudgeLogs } = await admin
    .from('nudge_log')
    .select('id, template_id, segment, reach, sent_at, sent_by')
    .order('sent_at', { ascending: false })
    .limit(50)

  // Auto-rule statuses (if table exists)
  const { data: ruleStatuses } = await admin
    .from('auto_nudge_rules')
    .select('rule_id, is_active, triggered_today, triggered_total')

  const ruleMap = new Map((ruleStatuses ?? []).map((r) => [r.rule_id, r]))

  // Reach estimates
  const [
    { count: lowCompleteness },
    { count: inactiveStudents },
    { count: pendingDocs },
    { count: expiringPostings },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .lt('profile_completeness_pct', 50),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student'),
    admin
      .from('faculty_profiles')
      .select('*', { count: 'exact', head: true })
      .not('verification_doc_url', 'is', null)
      .eq('employment_status', 'retired'),
    admin
      .from('internship_postings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
  ])

  const reachMap: Record<string, number> = {
    complete_profile: lowCompleteness ?? 0,
    inactive_7d: Math.floor((inactiveStudents ?? 0) * 0.15),
    upload_doc: pendingDocs ?? 0,
    posting_expiring: expiringPostings ?? 0,
  }

  const TABS = [
    { id: 'templates', label: '📋 Templates' },
    { id: 'custom', label: '✏️ Custom Nudge' },
    { id: 'rules', label: '⚙️ Auto-Rules' },
    { id: 'history', label: '📜 History' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nudge Centre</h1>
        <p className="text-sm text-slate-400 mt-1">
          Send targeted nudges to specific user segments · schedule auto-rules
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`?tab=${t.id}`}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* ── Templates ────────────────────────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {NUDGE_TEMPLATES.map((tpl) => {
            const reach = reachMap[tpl.id] ?? '?'
            return (
              <div
                key={tpl.id}
                className="rounded-xl p-4 bg-slate-800/60 border border-slate-700 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tpl.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {tpl.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tpl.segment}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic px-1">
                  &ldquo;{tpl.preview}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 mr-1">
                      {tpl.channel}
                    </span>
                    {reach > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                        ~{reach} users
                      </span>
                    )}
                  </div>
                  <NudgeBuilder
                    templateId={tpl.id}
                    templateTitle={tpl.title}
                    estimatedReach={typeof reach === 'number' ? reach : 0}
                    compact
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Custom Nudge Builder ─────────────────────────────────────────── */}
      {tab === 'custom' && (
        <NudgeBuilder
          templateId="custom"
          templateTitle="Custom Nudge"
          estimatedReach={inactiveStudents ?? 0}
        />
      )}

      {/* ── Auto-Rules ───────────────────────────────────────────────────── */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Set-and-forget automation
          </p>
          {AUTO_RULES.map((rule) => {
            const status = ruleMap.get(rule.id)
            return (
              <div
                key={rule.id}
                className="rounded-xl p-4 bg-slate-800/60 border border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {rule.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Trigger: {rule.trigger} · Channel: {rule.channel}
                    </p>
                    {'maxTotal' in rule ? (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Max {rule.maxTotal}× total per user
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Max {rule.maxPerWeek}× per week per user
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      Today: {status?.triggered_today ?? 0}
                    </p>
                    <p className="text-xs text-slate-600">
                      All time: {status?.triggered_total ?? 0}
                    </p>
                    <div className="mt-2">
                      <AutoRuleToggle
                        ruleId={rule.id}
                        isActive={status?.is_active ?? false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-800">
                {['Date', 'Template', 'Segment', 'Reach', 'Sent by'].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(nudgeLogs ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {new Date(log.sent_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 text-xs">
                    {log.template_id ?? 'custom'}
                  </td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">
                    {log.segment ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-white font-semibold text-xs">
                    {log.reach ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs font-mono">
                    {(log.sent_by as string)?.slice(0, 8) ?? 'system'}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(nudgeLogs ?? []).length === 0 && (
            <p className="text-center text-slate-600 py-12">
              No nudges sent yet
            </p>
          )}
        </div>
      )}
    </div>
  )
}
