'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  title?: string;
  showBack?: boolean;
};

export function Navbar({ title, showBack }: Props) {
  const pathname = usePathname();

  const PAGE_TITLES: Record<string, string> = {
    '/board': 'Community Board',
    '/news': 'Latest News',
    '/profile': 'Your Profile',
    '/pricing': 'Plans & Pricing',
  };

  const displayTitle = title ?? PAGE_TITLES[pathname] ?? '';

  return (
    <header
      className="md:hidden flex items-center justify-between px-4 h-14 shrink-0 z-20"
      style={{
        background: 'rgba(6,15,29,0.85)',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {showBack ? (
        <Link href="/chat" className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          ← Chat
        </Link>
      ) : (
        <span className="font-playfair text-base font-bold text-white">
          EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
        </span>
      )}
      {displayTitle && (
        <span className="font-playfair text-base font-semibold text-white">{displayTitle}</span>
      )}
      <div className="w-12" />
    </header>
  );
}
