'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

import FoundingBanner from '@/components/pricing/FoundingBanner';
import BillingToggle from '@/components/pricing/BillingToggle';
import PricingCard from '@/components/pricing/PricingCard';
import ComparisonTable from '@/components/pricing/ComparisonTable';
import PricingFAQ from '@/components/pricing/PricingFAQ';

// ── Env flag — set NEXT_PUBLIC_PAYMENTS_ACTIVE=true when Razorpay is live ─────
const PAYMENTS_ACTIVE = process.env.NEXT_PUBLIC_PAYMENTS_ACTIVE === 'true';
type BillingCycle = 'monthly' | 'annual';

// ── ChatGPT comparison data ───────────────────────────────────────────────────
const CHATGPT_CONS = [
  'No subject specialisation — generic AI for everything',
  'No soul memory — resets every conversation',
  'No Indian curriculum alignment',
  'No exam-mode for UPSC / GATE / NEET',
  'No Check-ins or study rhythm tracking',
  'Costs ₹1,650/month — 8× more expensive',
  'Not built for Indian students',
];

const EDUSAATHI_PROS = [
  '20 specialised Saathis — Law, Medicine, UPSC, Maths…',
  'Soul memory — knows your name, journey, struggles',
  'Indian curriculum + regional exam patterns',
  'Exam-mode with high-yield topic structure',
  'Saathi Check-ins + study rhythm tracking',
  'Only ₹199/month — less than a pizza delivery',
  'Built exclusively for Indian students by IAES Ahmedabad',
];

// ── Coming Soon Modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,29,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0. }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: '#0B1F3A', border: '1.5px solid rgba(201,153,58,0.4)' }}
      >
        <div className="text-4xl mb-4">✦</div>
        <h3 className="font-playfair text-2xl font-bold text-white mb-3">Payment coming soon!</h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
          You have <strong style={{ color: '#C9993A' }}>Founding Student Access</strong> — full Plus features{' '}
          <strong className="text-white">free for 60 days</strong>. No card required.{' '}
          We&apos;re activating payments soon — you&apos;ll be notified first.
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
          style={{ background: '#C9993A', color: '#060F1D' }}
        >
          Got it — enjoy my free access →
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  async function handleUpgrade(planId: string) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/pricing`);
      return;
    }
    if (!PAYMENTS_ACTIVE) {
      setShowModal(true);
      return;
    }

    // Payments active — call Razorpay Edge Function
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login?redirect=/pricing'); return; }

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId, billing }),
      });

      const order = await res.json() as { id: string; amount: number; currency: string };
      if (!order.id) throw new Error('Order creation failed');

      // Open Razorpay checkout
      const rzp = new (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'EdUsaathiAI',
        description: `Saathi ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        theme: { color: '#C9993A' },
        handler: () => {
          // Payment success — refresh page
          window.location.href = '/pricing?success=1';
        },
      });
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Razorpay script (needed for checkout) */}
      {PAYMENTS_ACTIVE && (
        /* eslint-disable-next-line @next/next/no-sync-scripts */
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      )}

      <main
        className="min-h-screen relative"
        style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 40%, #060F1D 100%)' }}
      >
        {/* Ambient glow */}
        <div
          className="fixed pointer-events-none"
          style={{
            width: 900, height: 900,
            top: '10%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(201,153,58,0.05) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="text-center mb-10">
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: '#C9993A' }}
            >
              Simple, honest pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-playfair text-5xl md:text-6xl font-bold text-white mb-4"
            >
              Your Saathi. Your price.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base max-w-lg mx-auto"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Start free. Upgrade when you&apos;re ready.{' '}
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                Cancel anytime — except Unlimited which you pause.
              </span>
            </motion.p>
          </div>

          {/* ── Founding Banner ──────────────────────────────────────── */}
          <div className="mb-10">
            <FoundingBanner />
          </div>

          {/* ── Billing Toggle ───────────────────────────────────────── */}
          <div className="flex justify-center mb-10">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>

          {/* ── 4 Pricing Cards ─────────────────────────────────────── */}
          {/* Plus first on mobile via order class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-20">
            {/* Mobile order: Plus (0), Free (1), Pro (2), Unlimited (3) */}
            <div className="order-2 sm:order-1">
              <PricingCard id="free" billing={billing} onUpgrade={handleUpgrade} index={0} />
            </div>
            <div className="order-1 sm:order-2">
              <PricingCard id="plus" billing={billing} onUpgrade={handleUpgrade} index={1} />
            </div>
            <div className="order-3 sm:order-3">
              <PricingCard id="pro" billing={billing} onUpgrade={handleUpgrade} index={2} />
            </div>
            <div className="order-4 sm:order-4">
              <PricingCard id="unlimited" billing={billing} onUpgrade={handleUpgrade} index={3} />
            </div>
          </div>

          {/* ── Comparison Table ─────────────────────────────────────── */}
          <div className="mb-20">
            <ComparisonTable />
          </div>

          {/* ── ChatGPT vs EdUsaathiAI ───────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <div className="text-center mb-10">
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#C9993A' }}>
                Why not ChatGPT?
              </p>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-white">
                8× cheaper. Built for you.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* ChatGPT */}
              <div
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    🤖
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">ChatGPT Plus</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>₹1,650 / month</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {CHATGPT_CONS.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 mt-0.5 font-bold" style={{ color: 'rgba(239,68,68,0.7)' }}>✗</span>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* EdUsaathiAI */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: 'rgba(201,153,58,0.06)',
                  border: '1.5px solid rgba(201,153,58,0.35)',
                  boxShadow: '0 0 40px rgba(201,153,58,0.08)',
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(201,153,58,0.2)' }}>
                    🧠
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#E5B86A' }}>EdUsaathiAI Plus</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>₹199 / month</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {EDUSAATHI_PROS.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 mt-0.5 font-bold" style={{ color: '#4ADE80' }}>✓</span>
                      <span style={{ color: 'rgba(255,255,255,0.75)' }}>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Price badge */}
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(201,153,58,0.2)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>vs ChatGPT Plus at ₹1,650/mo</span>
                    <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: '#C9993A', color: '#060F1D' }}>
                      Save ₹1,451/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── FAQ ─────────────────────────────────────────────────── */}
          <div className="mb-20">
            <PricingFAQ />
          </div>

          {/* ── Bottom CTA ───────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-16 rounded-3xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(201,153,58,0.1) 0%, rgba(11,31,58,0.8) 50%, rgba(201,153,58,0.1) 100%)',
              border: '1px solid rgba(201,153,58,0.2)',
            }}
          >
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#C9993A' }}>
              Ready to begin?
            </p>
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-4">
              Your Saathi is waiting.
            </h2>
            <p className="text-base mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Join 312 founding students getting full access free. No card. No catch.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 hover:-translate-y-0.5"
                style={{ background: '#C9993A', color: '#060F1D' }}
              >
                Start free — no card required →
              </button>
              <button
                onClick={() => handleUpgrade('plus')}
                disabled={isLoading}
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Upgrade to Plus · ₹199/mo
              </button>
            </div>
          </motion.section>

        </div>

        {/* ── Payment coming soon modal ────────────────────────────── */}
        <AnimatePresence>
          {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
        </AnimatePresence>
      </main>
    </>
  );
}
