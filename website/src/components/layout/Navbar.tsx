'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  title?: string
  showBack?: boolean
}

export function Navbar({ title, showBack }: Props) {
  const pathname = usePathname()

  const PAGE_TITLES: Record<string, string> = {
    '/board': 'Community Board',
    '/news': 'Latest News',
    '/profile': 'Your Profile',
    '/pricing': 'Plans & Pricing',
  }

  const displayTitle = title ?? PAGE_TITLES[pathname] ?? ''

  return (
    <header
      className="z-20 flex h-14 shrink-0 items-center justify-between px-4 md:hidden"
      style={{
        background: 'rgba(6,15,29,0.85)',
        borderBottom: '0.5px solid var(--bg-elevated)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {showBack ? (
        <Link
          href="/chat"
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Chat
        </Link>
      ) : (
        <span className="font-display text-base font-bold text-white">
          EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
        </span>
      )}
      {displayTitle && (
        <span className="font-display text-base font-semibold text-white">
          {displayTitle}
        </span>
      )}
      <div className="w-12" />
    </header>
  )
}
