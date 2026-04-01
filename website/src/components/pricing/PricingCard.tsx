'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export type BillingCycle = 'monthly' | 'annual';

export interface PricingCardProps {
  id: 'free' | 'plus' | 'pro' | 'unlimited';
  billing: BillingCycle;
  onUpgrade: (planId: string) => void;
  index: number;
  disabled?: boolean;
}

// ── Plan definitions (UI layer — prices from spec) ────────────────────────────

const PLAN_DEFS = {
  free: {
    name: 'Free Forever',
    emoji: '✦',
    badge: null,
    badgeColor: null,
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    glow: null,
    priceMonthly: 0,
    priceAnnual: 0,
    priceLabel: '₹0',
    priceSuffix: '/ forever',
    annualNote: null,
    tagline: 'Start your journey',
    features: [
      { text: 'Bot 1 + Bot 5 only', included: true },
      { text: '5 chats per day', included: true },
      { text: '1 Saathi vertical', included: true },
      { text: 'Community Board', included: true },
      { text: 'News Tab', included: true },
      { text: 'Bot 2, 3, 4 (locked)', included: false },
      { text: 'Saathi Check-in', included: false },
      { text: 'Notes export', included: false },
    ],
    ctaLabel: 'Begin for free →',
    ctaStyle: 'outline' as const,
    ctaColor: 'rgba(255,255,255,0.15)',
    ctaTextColor: 'rgba(255,255,255,0.7)',
    subText: null,
    featured: false,
  },
  plus: {
    name: 'Saathi Plus',
    emoji: '⚡',
    badge: 'Most Popular',
    badgeColor: '#C9993A',
    bg: 'rgba(11,31,58,0.9)',
    border: '#C9993A',
    glow: '0 0 40px rgba(201,153,58,0.2)',
    priceMonthly: 199,
    priceAnnual: 125,
    priceLabel: '₹199',
    priceSuffix: '/mo',
    annualNote: '₹125/mo · billed ₹1,499/year',
    tagline: 'Less than your weekly pizza',
    features: [
      { text: 'All 5 bots', included: true },
      { text: '20 chats per day per bot', included: true },
      { text: 'All 24 Saathis', included: true },
      { text: 'Unlimited Check-ins', included: true },
      { text: 'Notes export', included: true },
      { text: 'Pause anytime', included: true },
      { text: '48hr cooling period', included: true },
    ],
    ctaLabel: 'Upgrade to Plus →',
    ctaStyle: 'filled' as const,
    ctaColor: '#C9993A',
    ctaTextColor: '#060F1D',
    subText: 'Cancel anytime · No hidden fees',
    featured: true,
  },
  pro: {
    name: 'Saathi Pro',
    emoji: '🚀',
    badge: 'Power User',
    badgeColor: '#7C3AED',
    bg: 'rgba(91,33,182,0.08)',
    border: 'rgba(139,92,246,0.3)',
    glow: null,
    priceMonthly: 499,
    priceAnnual: 333,
    priceLabel: '₹499',
    priceSuffix: '/mo',
    annualNote: '₹333/mo · billed ₹3,999/year',
    tagline: 'For serious learners',
    features: [
      { text: 'Everything in Plus', included: true },
      { text: '50 chats per day', included: true },
      { text: '24hr cooling only', included: true },
      { text: 'Priority bot response', included: true },
      { text: 'Pause anytime', included: true },
    ],
    ctaLabel: 'Upgrade to Pro →',
    ctaStyle: 'filled' as const,
    ctaColor: '#7C3AED',
    ctaTextColor: '#fff',
    subText: null,
    featured: false,
  },
  unlimited: {
    name: 'Saathi Unlimited',
    emoji: '🔥',
    badge: '🔥 Zero Cooling',
    badgeColor: '#EF4444',
    bg: '#0B1F3A',
    border: '#EF4444',
    glow: null,
    priceMonthly: 4999,
    priceAnnual: null,
    priceLabel: '₹4,999',
    priceSuffix: '/mo',
    annualNote: 'Monthly only — no annual plan',
    tagline: 'For those who are serious',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'ZERO cooling period', included: true },
      { text: '20 chats every single day', included: true },
      { text: 'Fastest bot response', included: true },
      { text: 'Pause anytime', included: true },
      { text: 'No refunds policy', included: false },
    ],
    ctaLabel: 'Go Unlimited →',
    ctaStyle: 'filled' as const,
    ctaColor: '#EF4444',
    ctaTextColor: '#fff',
    subText: 'No refunds — pause anytime instead',
    featured: false,
  },
} as const;

export default function PricingCard({ id, billing, onUpgrade, index, disabled = false }: PricingCardProps) {
  const plan = PLAN_DEFS[id];
  const router = useRouter();

  // Compute displayed price
  const showAnnual = billing === 'annual' && id !== 'unlimited' && id !== 'free';
  const displayPrice = showAnnual ? `₹${plan.priceAnnual ?? plan.priceMonthly}` : plan.priceLabel;
  const displaySuffix = plan.priceSuffix;

  function handleCTA() {
    if (id === 'free') {
      router.push('/login');
      return;
    }
    onUpgrade(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative flex flex-col rounded-2xl p-6 h-full"
      style={{
        background: plan.bg,
        border: `${plan.featured ? '2px' : '1px'} solid ${plan.border}`,
        boxShadow: plan.glow ?? undefined,
      }}
    >
      {/* Featured badge */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div
            className="px-4 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap"
            style={{
              background: plan.badgeColor ?? '#C9993A',
              color: plan.badgeColor === '#C9993A' ? '#060F1D' : '#fff',
            }}
          >
            {plan.badge}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{plan.emoji}</span>
          <h3 className="font-playfair text-lg font-bold text-white">{plan.name}</h3>
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-end gap-1.5">
          <motion.span
            key={displayPrice}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-playfair text-4xl font-bold text-white"
          >
            {displayPrice}
          </motion.span>
          {id !== 'free' && (
            <span className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{displaySuffix}</span>
          )}
        </div>
        {plan.annualNote && (
          <motion.p
            key={billing + id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs mt-1"
            style={{ color: showAnnual ? '#4ADE80' : 'rgba(255,255,255,0.3)' }}
          >
            {showAnnual ? plan.annualNote : ''}
          </motion.p>
        )}
        {id === 'unlimited' && (
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Monthly only — no annual plan
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2.5 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-0.5 shrink-0 font-bold"
              style={{ color: f.included ? '#4ADE80' : 'rgba(255,255,255,0.2)' }}
            >
              {f.included ? '✓' : '✗'}
            </span>
            <span style={{ color: f.included ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto">
        <button
          onClick={handleCTA}
          disabled={disabled}
          className="w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            plan.ctaStyle === 'outline'
              ? {
                  background: 'transparent',
                  border: `1.5px solid ${plan.border}`,
                  color: 'rgba(255,255,255,0.65)',
                }
              : {
                  background: plan.ctaColor,
                  color: plan.ctaTextColor,
                  border: 'none',
                }
          }
        >
          {plan.ctaLabel}
        </button>
        {plan.subText && (
          <p className="text-center text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {plan.subText}
          </p>
        )}
      </div>
    </motion.div>
  );
}
