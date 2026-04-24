import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import {
  updateAdminNotes,
  updateEducationInstitutionFields,
  openWhatsApp,
  openEmail,
} from '../actions'
import { EducationInstitutionActions } from './EducationInstitutionActions'

export const dynamic = 'force-dynamic'

type Status =
  | 'pending'
  | 'demo'
  | 'trial'
  | 'active'
  | 'suspended'
  | 'churned'

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-slate-700 text-slate-300',
  demo: 'bg-blue-500/20 text-blue-300',
  trial: 'bg-amber-500/20 text-amber-300',
  active: 'bg-emerald-500/20 text-emerald-300',
  suspended: 'bg-red-500/20 text-red-300',
  churned: 'bg-slate-700 text-slate-500',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pending',
  demo: 'Demo Scheduled',
  trial: 'Trial',
  active: 'Active',
  suspended: 'Suspended',
  churned: 'Churned',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const admin = getAdminClient()

  const { data: inst } = await admin
    .from('education_institutions')
    .select('*')
    .eq('id', id)
    .single()

  if (!inst) notFound()

  const status = inst.status as Status
  const trialDays = daysUntil(inst.trial_ends_at as string | null)

  // ── Rosters ───────────────────────────────────────────────────────────
  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, email, education_institution_joined_at, education_institution_role')
    .eq('education_institution_id', id)
    .eq('education_institution_role', 'student')
    .order('education_institution_joined_at', { ascending: false })
    .limit(200)

  const { data: faculty } = await admin
    .from('profiles')
    .select('id, full_name, email, education_institution_joined_at, education_institution_role')
    .eq('education_institution_id', id)
    .in('education_institution_role', ['faculty', 'principal'])
    .order('education_institution_joined_at', { ascending: false })
    .limit(50)

  // ── Today's daily window usage ────────────────────────────────────────
  const todayIso = new Date().toISOString().slice(0, 10)
  const minutesUsed =
    inst.daily_reset_date === todayIso
      ? ((inst.daily_minutes_used as number) ?? 0)
      : 0
  const minutesBudget = (inst.daily_minutes_budget as number) ?? 180
  const windowPct = minutesBudget > 0 ? (minutesUsed / minutesBudget) * 100 : 0

  const activeSaathis = (inst.active_saathi_slugs as string[] | null) ?? []

  return (
    <div className="p-6 max-w-5xl">
      <Link
        href="/education-institutions"
        className="text-slate-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to education institutions
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {inst.name as string}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {inst.city as string}
            {inst.state ? ` · ${inst.state}` : ''}
            {inst.affiliation ? ` · ${inst.affiliation}` : ''}
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-semibold ${STATUS_BADGE[status]}`}
        >
          {STATUS_LABEL[status]}
          {status === 'trial' && trialDays !== null && trialDays >= 0 && (
            <span className="ml-1 text-amber-200/70 font-normal">
              · {trialDays}d left
            </span>
          )}
        </span>
      </div>

      {/* ── Status control buttons + quick actions ─────────────────── */}
      <div className="mb-6">
        <EducationInstitutionActions
          id={id}
          status={status}
          principalEmail={(inst.principal_email as string | null) ?? null}
        />
      </div>

      {/* ── Quick contact actions (server actions via mailto/wa.me) ── */}
      <div className="flex gap-3 mb-8">
        <form action={openWhatsApp}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            📱 Send WhatsApp
          </button>
        </form>
        <form action={openEmail}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            ✉️ Send Email
          </button>
        </form>
      </div>

      {/* ── Editable core fields ────────────────────────────────────── */}
      <Section title="Institution details">
        <form action={updateEducationInstitutionFields} className="space-y-4">
          <input type="hidden" name="id" value={id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                name="name"
                defaultValue={inst.name as string}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="City">
              <input
                name="city"
                defaultValue={inst.city as string}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="State">
              <input
                name="state"
                defaultValue={(inst.state as string | null) ?? 'Gujarat'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Affiliation">
              <input
                name="affiliation"
                defaultValue={(inst.affiliation as string | null) ?? ''}
                placeholder="e.g. Gujarat University"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Principal name">
              <input
                name="principal_name"
                defaultValue={(inst.principal_name as string | null) ?? ''}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Principal email">
              <input
                name="principal_email"
                type="email"
                defaultValue={inst.principal_email as string}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Declared capacity (students)">
              <input
                name="declared_capacity"
                type="number"
                min={1}
                defaultValue={(inst.declared_capacity as number) ?? 200}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Daily minutes budget">
              <input
                name="daily_minutes_budget"
                type="number"
                min={0}
                defaultValue={(inst.daily_minutes_budget as number) ?? 180}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </Field>
          </div>

          <Field label="Active Saathi slugs (comma-separated)">
            <input
              name="active_saathi_slugs"
              defaultValue={activeSaathis.join(', ')}
              placeholder="e.g. biosaathi, chemsaathi, maathsaathi"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </Field>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl px-5 py-2 text-sm transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </Section>

      <div className="h-5" />

      {/* ── Lifecycle timeline ─────────────────────────────────────── */}
      <Section title="Lifecycle">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Created">
            <span className="text-white">
              {fmtDate(inst.created_at as string)}
            </span>
          </Row>
          <Row label="Trial started">
            <span className="text-white">
              {fmtDate(inst.trial_started_at as string | null)}
            </span>
          </Row>
          <Row label="Trial ends">
            <span className="text-white">
              {fmtDate(inst.trial_ends_at as string | null)}
              {status === 'trial' &&
                trialDays !== null &&
                trialDays >= 0 && (
                  <span className="ml-1.5 text-xs text-slate-500">
                    ({trialDays}d)
                  </span>
                )}
            </span>
          </Row>
          <Row label="Billing activated">
            <span className="text-white">
              {fmtDate(inst.activated_at as string | null)}
            </span>
          </Row>
        </div>
      </Section>

      <div className="h-5" />

      {/* ── Daily window ───────────────────────────────────────────── */}
      <Section title="Today’s daily window">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-white font-bold text-2xl">
            {minutesUsed}
            <span className="text-slate-500 text-sm font-normal">
              {' '}/ {minutesBudget} min
            </span>
          </span>
          <span className="text-xs text-slate-500">{windowPct.toFixed(0)}% used</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${Math.min(100, windowPct)}%` }}
          />
        </div>
        {inst.daily_reset_date !== todayIso && (
          <p className="text-xs text-slate-600 mt-2">
            Last reset: {fmtDate(inst.daily_reset_date as string | null)} — counter idle
          </p>
        )}
      </Section>

      <div className="h-5" />

      {/* ── Admin notes ─────────────────────────────────────────────── */}
      <Section title="Admin notes (private)">
        <form action={updateAdminNotes}>
          <input type="hidden" name="id" value={id} />
          <textarea
            name="admin_notes"
            defaultValue={(inst.admin_notes as string | null) ?? ''}
            rows={6}
            placeholder="Private notes — never shown to the institution."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl px-5 py-2 text-sm transition-colors"
            >
              Save notes
            </button>
          </div>
        </form>
      </Section>

      <div className="h-5" />

      {/* ── Onboarding answer ──────────────────────────────────────── */}
      {inst.onboarding_answer && (
        <>
          <Section title="Onboarding answer">
            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
              {inst.onboarding_answer as string}
            </p>
          </Section>
          <div className="h-5" />
        </>
      )}

      {/* ── Student roster ─────────────────────────────────────────── */}
      <Section
        title={`Students (${students?.length ?? 0})`}
      >
        {!students?.length ? (
          <p className="text-slate-500 text-sm py-2">No students joined yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left py-2.5 pr-6">Name</th>
                  <th className="text-left py-2.5 pr-6">Email</th>
                  <th className="text-left py-2.5 pr-4">Joined</th>
                  <th className="text-left py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id as string}
                    className="border-b border-slate-800/40"
                  >
                    <td className="py-2.5 pr-6 text-white">
                      {(s.full_name as string | null) ?? '—'}
                    </td>
                    <td className="py-2.5 pr-6 text-slate-400">
                      {s.email as string}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 text-xs">
                      {fmtDate(s.education_institution_joined_at as string | null)}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/users/${s.id}`}
                        className="text-amber-400 hover:text-amber-300 text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="h-5" />

      {/* ── Faculty / principal roster ─────────────────────────────── */}
      <Section title={`Faculty & principal (${faculty?.length ?? 0})`}>
        {!faculty?.length ? (
          <p className="text-slate-500 text-sm py-2">
            No faculty linked yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left py-2.5 pr-6">Name</th>
                  <th className="text-left py-2.5 pr-6">Email</th>
                  <th className="text-left py-2.5 pr-4">Role</th>
                  <th className="text-left py-2.5 pr-4">Joined</th>
                  <th className="text-left py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => (
                  <tr
                    key={f.id as string}
                    className="border-b border-slate-800/40"
                  >
                    <td className="py-2.5 pr-6 text-white">
                      {(f.full_name as string | null) ?? '—'}
                    </td>
                    <td className="py-2.5 pr-6 text-slate-400">
                      {f.email as string}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300 capitalize text-xs">
                      {(f.education_institution_role as string | null) ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 text-xs">
                      {fmtDate(f.education_institution_joined_at as string | null)}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/users/${f.id}`}
                        className="text-amber-400 hover:text-amber-300 text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <h2 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-sm">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}
