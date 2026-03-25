import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

const NAV = [
  { href: '/users', label: 'Users' },
  { href: '/revenue', label: 'Revenue' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/observability', label: 'Observability' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-amber-400 font-bold text-base">EdUsaathiAI</div>
          <div className="text-slate-500 text-xs mt-0.5">Admin</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-600 mb-2 px-1">admin.edusaathiai.in</div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {children}
      </main>
    </div>
  );
}
