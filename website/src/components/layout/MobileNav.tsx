'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/board', icon: '🏛️', label: 'Board' },
  { href: '/explore', icon: '🗺️', label: 'Explore' },
  { href: null, icon: '⊞', label: 'More', isMore: true },
  { href: '/profile', icon: '👤', label: 'Profile' },
] as const

const DISCOVER_ITEMS = [
  { icon: '🎓', label: 'Faculty Finder', href: '/faculty-finder' },
  { icon: '🔖', label: 'Saved Faculty', href: '/saved-faculty' },
  { icon: '🎯', label: 'Internships', href: '/internships' },
  { icon: '📢', label: 'I Want to Learn', href: '/learn' },
]

const TOOL_ITEMS = [
  { icon: '🃏', label: 'Flash Cards', href: '/flashcards' },
  { icon: '📊', label: 'My Progress', href: '/progress' },
  { icon: '📰', label: 'News', href: '/news' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* ── Bottom nav bar ─────────────────────────────────────────────── */}
      <nav
        className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-around px-2 py-2 md:hidden"
        style={{
          background: 'rgba(6,15,29,0.9)',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          if ('isMore' in item && item.isMore) {
            return (
              <button
                key="more"
                data-tour="nav-more"
                onClick={() => setShowMore(true)}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-1"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: showMore ? '#C9993A' : 'rgba(255,255,255,0.35)',
                }}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            )
          }

          const active = pathname === item.href
          const tourAttr =
            item.href === '/chat'
              ? 'nav-chat'
              : item.href === '/board'
                ? 'nav-board'
                : item.href === '/explore'
                  ? 'nav-explore'
                  : item.href === '/profile'
                    ? 'nav-profile'
                    : undefined
          return (
            <Link
              key={item.href}
              href={item.href!}
              data-tour={tourAttr}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-all duration-150"
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
          )
        })}
      </nav>

      {/* ── More bottom sheet ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showMore && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              className="md:hidden"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 40,
              }}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden"
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#0B1F3A',
                borderTop: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: '20px 20px 0 0',
                padding: '16px 16px 48px',
                zIndex: 50,
              }}
            >
              {/* Handle bar */}
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  margin: '0 auto 20px',
                }}
              />

              {/* Section: Discover */}
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#C9993A',
                  textTransform: 'uppercase',
                  margin: '0 0 10px',
                }}
              >
                Discover
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                {DISCOVER_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Section: Tools */}
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase',
                  margin: '0 0 8px',
                }}
              >
                Tools
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {TOOL_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
