'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BotSelector } from '@/components/chat/BotSelector';
import type { Saathi, Profile, QuotaState } from '@/types';


type Props = {
  profile: Profile;
  activeSaathi: Saathi;
  activeSlot: 1 | 2 | 3 | 4 | 5;
  quota: QuotaState;
  onSlotChange: (slot: 1 | 2 | 3 | 4 | 5) => void;
  onLockedTap: (botName: string) => void;
  onSignOut: () => void;
  sessionCount?: number;
};

const UPGRADE_MESSAGES = [
  { min: 0,  max: 2,  text: 'Try Saathi Plus →',          sub: '₹199/month' },
  { min: 3,  max: 5,  text: 'Enjoying this? Go Plus →',   sub: 'Unlimited learning' },
  { min: 6,  max: 9,  text: 'Your Saathi remembers you ✦', sub: 'Upgrade to protect this' },
  { min: 10, max: 999, text: '10 sessions together 🎉',    sub: 'Become a Plus member' },
];

function UpgradePill({ sessionCount }: { sessionCount: number }) {
  const msg =
    UPGRADE_MESSAGES.find((m) => sessionCount >= m.min && sessionCount <= m.max) ??
    UPGRADE_MESSAGES[0];

  function handleClick() {
    sessionStorage.setItem('upgrade_return_url', window.location.pathname);
    sessionStorage.setItem('upgrade_trigger', 'sidebar_pill');
  }

  return (
    <Link
      href="/pricing?trigger=sidebar"
      onClick={handleClick}
      style={{
        display: 'block',
        margin: '8px 12px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(201,153,58,0.15), rgba(201,153,58,0.05))',
        border: '0.5px solid rgba(201,153,58,0.35)',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <p style={{ fontSize: '12px', fontWeight: '600', color: '#C9993A', margin: '0 0 2px' }}>
        {msg.text}
      </p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
        {msg.sub}
      </p>
    </Link>
  );
}

const NAV_LINKS = [
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/board', icon: '🏛️', label: 'Board' },
  { href: '/news', icon: '📰', label: 'News' },
  { href: '/profile', icon: '👤', label: 'Profile' },
];

export function Sidebar({
  profile,
  activeSaathi,
  activeSlot,
  quota,
  onSlotChange,
  onLockedTap,
  onSignOut,
  sessionCount = 0,
}: Props) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-[280px] shrink-0 h-full overflow-hidden"
      style={{
        background: '#060F1D',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <Link href="/chat">
          <h1 className="font-playfair text-xl font-bold text-white">
            EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
          </h1>
        </Link>
      </div>

      {/* Active Saathi card */}
      <div className="px-3 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: `${activeSaathi.primary}18`, border: `0.5px solid ${activeSaathi.primary}33` }}
        >
          <span className="text-2xl">{activeSaathi.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{activeSaathi.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {activeSaathi.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Bot selector */}
      <div className="py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <BotSelector
          activeSlot={activeSlot}
          userRole={profile.role}
          planId={profile.plan_id}
          primaryColor={activeSaathi.primary}
          onSelect={onSlotChange}
          onLockedTap={onLockedTap}
        />
      </div>

      {/* Quota indicator */}
      <div className="px-5 py-3" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        {quota.isCooling ? (
          <p className="text-xs font-medium" style={{ color: '#F59E0B' }}>
            ☕ Cooling — chats resume soon
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Daily quota
              </span>
              <span className="text-xs font-semibold" style={{ color: quota.remaining <= 3 ? '#FD8C4E' : 'rgba(255,255,255,0.5)' }}>
                {quota.remaining} / {quota.limit}
              </span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${(quota.remaining / quota.limit) * 100}%` }}
                style={{ background: quota.remaining <= 3 ? '#F59E0B' : activeSaathi.primary }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all duration-150"
              style={{
                background: active ? `${activeSaathi.primary}18` : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10,
                cursor: 'pointer',
              }}
            >
              <span className="text-base w-5 text-center">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade pill — free plan only */}
      {profile.plan_id === 'free' && <UpgradePill sessionCount={sessionCount} />}


      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: activeSaathi.primary, color: '#060F1D' }}
          >
            {(profile.full_name ?? profile.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {profile.full_name ?? 'User'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {profile.plan_id} plan
              {sessionCount >= 3 && (
                <span style={{ marginLeft: '6px' }}>
                  {sessionCount >= 25 ? '🦋' : sessionCount >= 15 ? '💥' : sessionCount >= 8 ? '🔥' : '✨'}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full text-xs py-2 rounded-lg text-center transition-colors duration-150"
          style={{ color: 'rgba(255,255,255,0.25)', border: '0.5px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
