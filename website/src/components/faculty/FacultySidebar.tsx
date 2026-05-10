'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Saathi } from '@/types'

type Props = {
  saathi: Saathi | null
  facultyName: string
  upiId: string | null
  onUpiEdit?: () => void
  pendingRequestCount?: number
  unreadQuestionCount?: number
}

type NavItem = {
  id: string
  icon: string
  label: string
  href: string
  badge?: number
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'var(--text-xs)', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--text-ghost)', padding: '10px 22px 4px', margin: 0,
    }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 16px' }} />
}

export function FacultySidebar({
  saathi, facultyName, upiId, onUpiEdit,
  pendingRequestCount = 0, unreadQuestionCount = 0,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const color = saathi?.primary ?? 'var(--gold)'

  const HQ_ITEMS: NavItem[] = [
    { id: 'chat', icon: '🎓', label: 'My Saathi Chat', href: '/chat' },
    { id: 'sessions', icon: '📋', label: 'My Sessions', href: '/faculty/sessions' },
    { id: 'live', icon: '🎙️', label: 'Live Lectures', href: '/faculty/live' },
    { id: 'requests', icon: '📨', label: 'Session Requests', href: '/faculty/requests', badge: pendingRequestCount },
  ]

  const TEACH_ITEMS: NavItem[] = [
    { id: 'questions', icon: '❓', label: 'Student Questions', href: '/faculty', badge: unreadQuestionCount },
    { id: 'demand', icon: '📊', label: 'Student Demand', href: '/faculty/demand' },
    { id: 'qp', icon: '📝', label: 'Question Papers', href: '/faculty/question-paper' },
    { id: 'material', icon: '📚', label: 'Study Material', href: '/faculty/create-material' },
    { id: 'research', icon: '🔬', label: 'Research Interns', href: '/faculty/research' },
  ]

  const EARNINGS_ITEMS: NavItem[] = [
    { id: 'payouts', icon: '💰', label: 'Payouts', href: '/faculty/sessions#payouts' },
    { id: 'analytics', icon: '📈', label: 'Analytics', href: '/faculty/analytics' },
  ]

  const PROFILE_ITEMS: NavItem[] = [
    { id: 'profile', icon: '👤', label: 'Profile', href: '/profile' },
    { id: 'mentor-settings', icon: '🎯', label: 'Mentor Settings', href: '/faculty/mentor-settings' },
    { id: 'nominate', icon: '👨‍🏫', label: 'Suggest a Colleague', href: '/faculty/nominations' },
  ]

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    return (
      <Link
        href={item.href}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: 'calc(100% - 16px)', padding: '8px 14px',
          borderRadius: '10px', margin: '1px 8px',
          cursor: 'pointer', textDecoration: 'none',
          transition: 'all 200ms ease',
          background: isActive ? 'var(--saathi-light)' : 'transparent',
          border: isActive ? '1px solid var(--saathi-border)' : '1px solid transparent',
          boxShadow: isActive ? `inset 2px 0 0 ${color}` : 'none',
        }}
      >
        <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
        <span style={{
          fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 500,
          color: isActive ? 'var(--saathi-text)' : 'var(--text-secondary)',
          lineHeight: 1.3, flex: 1,
        }}>
          {item.label}
        </span>
        {item.badge && item.badge > 0 ? (
          <span style={{
            background: color, color: '#fff', fontSize: '10px', fontWeight: 700,
            borderRadius: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center',
          }}>
            {item.badge}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <aside
      className="hidden h-full w-[260px] shrink-0 flex-col overflow-hidden md:flex"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/faculty" style={{ textDecoration: 'none' }}>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            EdU<span style={{ color: 'var(--saathi-primary)' }}>saathi</span>AI
          </h1>
          <p style={{ fontSize: '10px', color: 'var(--text-ghost)', margin: '2px 0 0' }}>
            Faculty Workspace
          </p>
        </Link>
      </div>

      {/* Active Saathi card */}
      {saathi && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{
            background: 'var(--saathi-bg)', border: '1.5px solid var(--saathi-border)',
          }}>
            <span className="text-2xl">{saathi.emoji}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {saathi.name}
              </p>
              <p className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--saathi-text)' }}>
                {saathi.tagline}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable nav */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SectionLabel>Faculty HQ</SectionLabel>
        {HQ_ITEMS.map(item => <NavLink key={item.id} item={item} />)}

        <Divider />

        <SectionLabel>Teach</SectionLabel>
        {TEACH_ITEMS.map(item => <NavLink key={item.id} item={item} />)}

        <Divider />

        <SectionLabel>Earnings</SectionLabel>
        {EARNINGS_ITEMS.map(item => <NavLink key={item.id} item={item} />)}

        <Divider />

        <SectionLabel>Profile</SectionLabel>
        {PROFILE_ITEMS.map(item => <NavLink key={item.id} item={item} />)}
      </div>

      {/* Footer: UPI + sign out */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 16px 6px' }}>
        {/* UPI ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: 'var(--text-xs)' }}>💳</span>
          <span style={{
            fontSize: 'var(--text-xs)', fontWeight: 600,
            color: upiId ? 'var(--text-secondary)' : 'var(--warning)',
          }}>
            {upiId ? `UPI: ${upiId}` : 'Set UPI ID'}
          </span>
          {onUpiEdit && (
            <button onClick={onUpiEdit} style={{
              fontSize: '10px', color: 'var(--saathi-primary)',
              background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto',
            }}>
              {upiId ? 'Edit' : 'Add'}
            </button>
          )}
        </div>

        <button
          onClick={async () => {
            const s = createClient()
            await s.auth.signOut()
            useAuthStore.getState().setProfile(null)
            sessionStorage.clear()
            router.push('/login')
          }}
          className="w-full rounded-lg py-1.5 text-center transition-all duration-150"
          style={{
            fontSize: 'var(--text-xs)', fontWeight: 500,
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
