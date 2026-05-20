// ─────────────────────────────────────────────────────────────────────────────
// /education-institutions/[slug]/faculty — Institution-Faculty branded landing
// (Phase 1.3). Sibling of /admin (principal dashboard).
//
// THIS IS NOT /faculty. The platform `/faculty` is for standalone platform
// faculty (role='faculty' + a faculty_profiles row + earnings/payout). An
// institution-invited faculty is a DISTINCT identity (additive — main role
// stays as-is, e.g. 'student'); they teach for the college, not directly for
// EdUsaathiAI. This page is their coherent, branded home.
//
// Gating hierarchy (explicit, the locked precedence):
//   1. Auth — logged in, else /login?next=…
//   2. Institution USABLE — status ∈ (trial, active) AND principal_lifecycle
//      = 'active'. If not → friendly "currently inactive" page (not generic).
//   3. Membership — caller has an education_institution_members row for THIS
//      institution with member_role='faculty'. If not → 404 (info-hide,
//      consistent with the principal dashboard's pattern).
//   4. Member status — 'active' → branded landing. 'paused'/'removed' →
//      friendly "your access is paused — contact your principal" page.
//
// Lookups via service-role after the auth check, mirroring the principal
// dashboard pattern — decouples gating from RLS edge cases and lets us show
// the correct friendly state for every lifecycle combination.
//
// Phase 1 v1 is the IDENTITY + GATING. The full teaching toolchain remains
// platform-faculty-gated; Phase 2 reconciles those guards to also accept
// institution-faculty.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const metadata = {
  title: 'Faculty — EdUsaathiAI',
  description: 'Your institution-faculty home on EdUsaathiAI',
}

type Institution = {
  id: string
  slug: string
  name: string
  city: string | null
  state: string | null
  status: 'pending' | 'demo' | 'trial' | 'active' | 'suspended' | 'churned'
  principal_lifecycle: 'active' | 'paused'
}

type Member = {
  id: string
  member_role: 'principal' | 'faculty'
  status: 'invited' | 'active' | 'paused' | 'removed'
  full_name: string | null
}

export default async function InstitutionFaculty({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // 1. Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(
      `/login?next=/education-institutions/${encodeURIComponent(slug)}/faculty`,
    )
  }

  // 2/3/4. Privileged lookups (service-role after auth verified).
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: institution } = await admin
    .from('education_institutions')
    .select('id, slug, name, city, state, status, principal_lifecycle')
    .eq('slug', slug)
    .maybeSingle<Institution>()

  if (!institution) notFound()

  const { data: member } = await admin
    .from('education_institution_members')
    .select('id, member_role, status, full_name')
    .eq('education_institution_id', institution.id)
    .eq('user_id', user.id)
    .maybeSingle<Member>()

  // Info-hide: not a faculty member of this institution → 404 (don't reveal
  // institution membership to non-members; mirrors the principal page).
  if (!member || member.member_role !== 'faculty') notFound()

  const institutionUsable =
    (institution.status === 'trial' || institution.status === 'active') &&
    institution.principal_lifecycle === 'active'

  if (!institutionUsable) {
    return <InactiveInstitution institution={institution} />
  }
  if (member.status === 'paused' || member.status === 'removed') {
    return (
      <PausedMember
        institutionName={institution.name}
        status={member.status}
      />
    )
  }

  // member.status === 'invited' shouldn't normally reach here (accept-invite
  // flips it to 'active' before redirecting), but if it does — treat as
  // active (they completed the flow); the row exists by their user_id.
  return (
    <FacultyLanding
      institution={institution}
      memberName={member.full_name ?? user.email ?? 'Faculty'}
    />
  )
}

// ── Subviews ────────────────────────────────────────────────────────────────

function FacultyLanding({
  institution,
  memberName,
}: {
  institution: Institution
  memberName: string
}) {
  const firstName = memberName.split(' ')[0]
  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}
        >
          {institution.name} · Faculty
        </p>
        <h1
          className="mt-1 text-3xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome, {firstName}.
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {institution.city}
          {institution.state ? `, ${institution.state}` : ''}
        </p>

        <section
          className="mt-8 rounded-2xl p-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You&rsquo;re part of <strong>{institution.name}</strong>&rsquo;s
            faculty on EdUsaathiAI. Your teaching tools — multiplayer canvas,
            30 subject-tailored Saathis, the Research Archive, and the
            one-click AI assistant — are coming to this dashboard shortly.
          </p>
          <p
            className="mt-3 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            For now, questions or anything not working? Email{' '}
            <a
              href="mailto:admin@edusaathiai.in"
              style={{ color: 'var(--gold)', textDecoration: 'underline' }}
            >
              admin@edusaathiai.in
            </a>
            .
          </p>
        </section>

        <footer
          className="mt-12 text-[11px]"
          style={{ color: 'var(--text-ghost)' }}
        >
          {institution.name} · EdUsaathiAI · Faculty (Phase 1)
        </footer>
      </div>
    </main>
  )
}

function InactiveInstitution({ institution }: { institution: Institution }) {
  return (
    <FriendlyState
      title={`${institution.name}'s access is currently inactive`}
      body={
        <>
          The institution&rsquo;s account is currently{' '}
          <strong>{institution.principal_lifecycle === 'paused'
            ? 'paused by the principal'
            : `marked ${institution.status}`}</strong>.
          Teaching access through EdUsaathiAI resumes once this is lifted.
          Please contact your principal, or{' '}
          <a
            href="mailto:admin@edusaathiai.in"
            style={{ color: 'var(--gold)', textDecoration: 'underline' }}
          >
            admin@edusaathiai.in
          </a>{' '}
          if you believe this is a mistake.
        </>
      }
    />
  )
}

function PausedMember({
  institutionName,
  status,
}: {
  institutionName: string
  status: 'paused' | 'removed'
}) {
  return (
    <FriendlyState
      title={
        status === 'paused'
          ? `Your faculty access to ${institutionName} is paused`
          : `Your faculty access to ${institutionName} has been removed`
      }
      body={
        <>
          Please contact your principal at {institutionName} to{' '}
          {status === 'paused' ? 'resume' : 'restore'} access. Questions can
          also go to{' '}
          <a
            href="mailto:admin@edusaathiai.in"
            style={{ color: 'var(--gold)', textDecoration: 'underline' }}
          >
            admin@edusaathiai.in
          </a>
          .
        </>
      }
    />
  )
}

function FriendlyState({
  title,
  body,
}: {
  title: string
  body: React.ReactNode
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div
        className="mx-auto max-w-md rounded-2xl p-8"
        style={{
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          color: '#78350F',
        }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: '#78350F' }}
        >
          {title}
        </h1>
        <p className="mt-3 text-sm" style={{ color: '#92400E' }}>
          {body}
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Back to your Saathi →
        </Link>
      </div>
    </main>
  )
}
