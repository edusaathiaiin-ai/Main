'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/board', icon: '🏛️', label: 'Board' },
  { href: '/news', icon: '📰', label: 'News' },
  { href: '/flashcards', icon: '🃏', label: 'Cards' },
  { href: '/profile', icon: '👤', label: 'Profile' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2"
      style={{
        background: 'rgba(6,15,29,0.9)',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-150"
            style={{
              color: active ? '#C9993A' : 'rgba(255,255,255,0.35)',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 10,
              cursor: 'pointer',
            }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[9px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
