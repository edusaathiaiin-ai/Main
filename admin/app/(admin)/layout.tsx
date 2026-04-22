import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { LogoutButton } from '@/components/LogoutButton'

type NavItem = { href: string; label: string; emoji: string; badge?: number | null }
type NavSection = { title?: string; items: NavItem[] }

async function getPendingCounts() {
  const admin = getAdminClient()
  const [apps, noms] = await Promise.all([
    admin.from('faculty_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('faculty_nominations').select('id', { count: 'exact', head: true }).eq('status', 'invited'),
  ])
  return {
    pendingApplications: apps.count ?? 0,
    pendingNominations: noms.count ?? 0,
  }
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/users', label: 'Users', emoji: '👥' },
      { href: '/revenue', label: 'Revenue', emoji: '💳' },
      { href: '/moderation', label: 'Moderation', emoji: '🛡️' },
      { href: '/observability', label: 'Observability', emoji: '📡' },
    ],
  },
  {
    title: 'Session 4',
    items: [
      { href: '/whatsapp', label: 'WhatsApp', emoji: '📱' },
      { href: '/suspensions', label: 'Suspensions', emoji: '🚨' },
      { href: '/faculty', label: 'Faculty', emoji: '👨‍🏫' },
      { href: '/faculty/nominations', label: 'Nominations', emoji: '🎓' },
      { href: '/faculty/applications', label: 'Applications', emoji: '📋' },
      { href: '/sessions', label: 'Sessions (1:1)', emoji: '🔍' },
      { href: '/live', label: 'Live Lectures', emoji: '🎙️' },
      { href: '/requests', label: 'Requests', emoji: '✉️' },
      { href: '/payouts', label: 'Payouts', emoji: '💸' },
      { href: '/refunds', label: 'Refunds', emoji: '↩️' },
      { href: '/financials', label: 'Financials', emoji: '💰' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { href: '/careers', label: 'Careers', emoji: '🎯' },
      { href: '/learning-intents', label: 'Learning Intents', emoji: '🧠' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/saathi-stats',      label: 'Saathi Stats',      emoji: '📊' },
      { href: '/horizons',          label: 'Horizons',          emoji: '🌅' },
      { href: '/nudge-centre',      label: 'Nudge Centre',      emoji: '🔔' },
      { href: '/fact-corrections',  label: 'Fact Corrections',  emoji: '🔬' },
      { href: '/platform-health',   label: 'Platform Health',   emoji: '⚙️' },
    ],
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  const { pendingApplications, pendingNominations } = await getPendingCounts()

  // Inject live badge counts into nav items
  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.map((n) => {
      if (n.href === '/faculty/applications') return { ...n, badge: pendingApplications || null }
      if (n.href === '/faculty/nominations') return { ...n, badge: pendingNominations || null }
      return n
    }),
  }))

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-amber-400 font-bold text-base">EdUsaathiAI</div>
          <div className="text-slate-500 text-xs mt-0.5">Admin Console</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <span className="text-base leading-none">{n.emoji}</span>
                    <span className="flex-1">{n.label}</span>
                    {n.badge != null && n.badge > 0 && (
                      <span style={{ background: '#EF4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 700, marginLeft: '6px' }}>
                        {n.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-600 mb-2 px-1">
            edusaathiai-admin.vercel.app
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-950">{children}</main>
    </div>
  )
}
