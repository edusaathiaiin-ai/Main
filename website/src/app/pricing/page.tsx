'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

import FoundingBanner from '@/components/pricing/FoundingBanner'
import BillingToggle from '@/components/pricing/BillingToggle'
import PricingCard from '@/components/pricing/PricingCard'
import ComparisonTable from '@/components/pricing/ComparisonTable'
import PricingFAQ from '@/components/pricing/PricingFAQ'
import { ImmersiveFuture } from '@/components/pricing/ImmersiveFuture'

// ── Env flag — set NEXT_PUBLIC_PAYMENTS_ACTIVE=true when Razorpay is live ─────
const PAYMENTS_ACTIVE = process.env.NEXT_PUBLIC_PAYMENTS_ACTIVE === 'true'
type BillingCycle = 'monthly' | 'annual'

// ── ChatGPT comparison data ───────────────────────────────────────────────────
const CHATGPT_CONS = [
  'No subject specialisation — generic AI for everything',
  'No soul memory — resets every conversation',
  'No Indian curriculum alignment',
  'No exam-mode for UPSC / GATE / NEET',
  'No Check-ins or study rhythm tracking',
  'Costs ₹1,650/month — 8× more expensive',
  'Not built for Indian students',
]

const EDUSAATHI_PROS = [
  '20 specialised Saathis — Law, Medicine, UPSC, Maths…',
  'Soul memory — knows your name, journey, struggles',
  'Indian curriculum + regional exam patterns',
  'Exam-mode with high-yield topic structure',
  'Saathi Check-ins + study rhythm tracking',
  'Only ₹99/month — less than a pizza delivery',
  'Built exclusively for Indian students',
]

// ── Founding Access Modal (shown when PAYMENTS_ACTIVE=false) ─────────────────
const FOUNDING_BENEFITS = [
  'All 5 bot slots across every Saathi — fully unlocked',
  '20 conversations per day per bot slot',
  'Soul memory — your Saathi learns and remembers you',
  'Unlimited Saathi Check-ins to track your growth',
  'Indian curriculum alignment + exam-mode for UPSC, GATE, NEET',
  'Special Founding Member rate locked in when payments open',
]

function FoundingModal({
  onClose,
  returnUrl,
  userEmail,
}: {
  onClose: () => void
  returnUrl: string
  userEmail: string
}) {
  const router = useRouter()

  function handleBack() {
    onClose()
    router.push(returnUrl)
  }

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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: '#0B1F3A',
          border: '1.5px solid rgba(201,153,58,0.4)',
        }}
      >
        <div className="mb-4 text-center text-4xl">✦</div>
        <h3 className="font-playfair mb-2 text-center text-2xl font-bold text-white">
          You&apos;re early — beautifully so
        </h3>
        <p
          className="mb-5 text-center text-sm"
          style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}
        >
          Payments are opening very soon. As a Founding Student, you already
          have{' '}
          <strong className="text-white">
            full Plus access for 60 days — completely free.
          </strong>
        </p>

        {/* 6 benefits with gold checkmarks */}
        <ul className="mb-5 space-y-2.5">
          {FOUNDING_BENEFITS.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-0.5 shrink-0 font-bold"
                style={{ color: '#C9993A' }}
              >
                ✓
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{benefit}</span>
            </li>
          ))}
        </ul>

        {userEmail && (
          <p
            className="mb-5 text-center text-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            We&apos;ll notify{' '}
            <strong style={{ color: '#C9993A' }}>{userEmail}</strong> the moment
            paid plans go live.
          </p>
        )}

        <button
          onClick={handleBack}
          className="mb-2 w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
          style={{ background: '#C9993A', color: '#060F1D' }}
        >
          Got it — back to learning →
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-xl py-2.5 text-xs transition-all"
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')
          }
        >
          Stay on pricing page
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── WhatsApp post-payment modal ───────────────────────────────────────────────
function WaPostPaymentModal({ onDone }: { onDone: () => void }) {
  const [input,   setInput]   = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [step,    setStep]    = useState<'idle' | 'sending' | 'sent' | 'saving'>('idle')

  function validate(v: string): string | null {
    const d = v.replace(/\D/g, '')
    if (d.length !== 10) return 'Enter a valid 10-digit Indian mobile number'
    if (!/^[6-9]/.test(d)) return 'Enter a valid 10-digit Indian mobile number'
    return null
  }

  async function sendVerification() {
    const err = validate(input)
    if (err) { setError(err); return }
    setError(null); setStep('sending')
    try {
      const res  = await fetch('/api/whatsapp-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `91${input}` }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Could not send. Try again.'); setStep('idle') }
      else setStep('sent')
    } catch { setError('Network error. Try again.'); setStep('idle') }
  }

  async function savePhone() {
    setStep('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles')
        .update({ wa_phone: `+91${input}`, wa_state: 'active' })
        .eq('id', user.id)
    }
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#FAFAF8', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: 'rgba(37,211,102,0.12)' }}
          >
            💬
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#1A1814' }}>
              Add your WhatsApp to receive your plan confirmation instantly
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#7A7570' }}>
              10-digit Indian mobile number
            </p>
          </div>
        </div>

        {step === 'idle' || step === 'sending' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div
                className="flex items-center rounded-xl px-3 text-sm font-bold select-none"
                style={{ background: 'rgba(184,134,11,0.1)', color: '#B8860B', border: '1px solid rgba(184,134,11,0.2)', whiteSpace: 'nowrap' }}
              >
                +91
              </div>
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null) }}
                placeholder="10-digit number"
                inputMode="numeric"
                maxLength={10}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{
                  background: '#F5F4F2', color: '#1A1814',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.1)'}`,
                }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
            <button
              disabled={step === 'sending' || input.length !== 10}
              onClick={sendVerification}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: '#25D366', color: '#fff' }}
            >
              {step === 'sending' ? 'Sending…' : 'Send verification message'}
            </button>
            <button onClick={onDone} className="w-full text-center text-xs" style={{ color: '#7A7570' }}>
              Skip for now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)' }}>
              <p className="text-sm font-semibold" style={{ color: '#1A1814' }}>
                Did you receive our WhatsApp message?
              </p>
              <p className="mt-0.5 text-xs" style={{ color: '#7A7570' }}>
                We sent a test message to +91 {input}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={step === 'saving'}
                onClick={savePhone}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
                style={{ background: '#25D366', color: '#fff' }}
              >
                {step === 'saving' ? 'Saving…' : 'Yes, save it'}
              </button>
              <button
                onClick={() => { setStep('idle'); setInput(''); setError(null) }}
                className="flex-1 rounded-xl py-2.5 text-sm"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#4A4740' }}
              >
                No, re-enter
              </button>
            </div>
            {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showFoundingModal, setShowFoundingModal] = useState(false)
  const [foundingReturnUrl, setFoundingReturnUrl] = useState('/chat')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showWaModal, setShowWaModal] = useState(false)
  const isCreatingOrder = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      setUserEmail(session?.user?.email ?? '')
    })
  }, [])

  function ensureRazorpayLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve()
        return
      }
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )
      if (existing) {
        // Script tag exists but not yet executed — wait briefly
        const poll = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(poll)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(poll)
          reject(new Error('Razorpay load timeout'))
        }, 10000)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        resolve()
      }
      script.onerror = () => reject(new Error('Razorpay script failed to load'))
      document.body.appendChild(script)
      setTimeout(() => reject(new Error('Razorpay load timeout')), 10000)
    })
  }

  async function handleUpgrade(planId: string) {
    if (isCreatingOrder.current) return
    isCreatingOrder.current = true

    const returnUrl = sessionStorage.getItem('upgrade_return_url') ?? '/chat'
    setPaymentError('')

    if (!isLoggedIn) {
      sessionStorage.setItem('upgrade_return_url', returnUrl)
      router.push('/login?redirect=/pricing')
      isCreatingOrder.current = false
      return
    }
    if (!PAYMENTS_ACTIVE) {
      setFoundingReturnUrl(returnUrl)
      setShowFoundingModal(true)
      isCreatingOrder.current = false
      return
    }

    setIsLoading(true)
    try {
      await ensureRazorpayLoaded()

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/pricing')
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?redirect=/pricing')
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ planId, billing }),
        }
      )

      const order = (await res.json()) as {
        orderId?: string
        amount?: number
        currency?: string
        error?: string
      }
      if (!order.orderId)
        throw new Error(
          order.error || `Order creation failed (HTTP ${res.status})`
        )

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount: order.amount ?? 0,
        currency: order.currency ?? 'INR',
        order_id: order.orderId,
        name: 'EdUsaathiAI',
        description: `Saathi ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        theme: { color: '#C9993A' },
        handler: () => {
          try { sessionStorage.removeItem('upgrade_return_url') } catch { /* noop */ }
          try { sessionStorage.removeItem('upgrade_trigger') } catch { /* noop */ }
          setShowWaModal(true)
        },
        modal: { ondismiss: () => setIsLoading(false) },
      })
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setPaymentError(
        msg.includes('timeout') || msg.includes('failed to load')
          ? 'Payment could not load. Please refresh and try again.'
          : 'Payment failed. Please try again.'
      )
      setIsLoading(false)
    } finally {
      isCreatingOrder.current = false
    }
  }

  return (
    <>
      {/* Razorpay script — loaded always, onLoad marks it ready */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {
          /* script ready */
        }}
        onError={() =>
          setPaymentError('Payment gateway failed to load. Please refresh.')
        }
      />

      <main
        className="relative min-h-screen"
        style={{
          background:
            'linear-gradient(180deg, #060F1D 0%, #0B1F3A 40%, #060F1D 100%)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none fixed"
          style={{
            width: 900,
            height: 900,
            top: '10%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, rgba(201,153,58,0.05) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="mb-10 text-center">
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 text-xs font-bold tracking-widest uppercase"
              style={{ color: '#C9993A' }}
            >
              Simple, honest pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-playfair mb-4 text-5xl font-bold text-white md:text-6xl"
            >
              Your Saathi. Your price.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-lg text-base"
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
          <div className="mb-10 flex justify-center">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>

          {/* ── 4 Pricing Cards ─────────────────────────────────────── */}
          {/* Plus first on mobile via order class */}
          <div className="mb-20 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {/* Mobile order: Plus (0), Free (1), Pro (2), Unlimited (3) */}
            <div className="order-2 sm:order-1">
              <PricingCard
                id="free"
                billing={billing}
                onUpgrade={handleUpgrade}
                index={0}
              />
            </div>
            <div className="order-1 sm:order-2">
              <PricingCard
                id="plus"
                billing={billing}
                onUpgrade={handleUpgrade}
                index={1}
              />
            </div>
            <div className="order-3 sm:order-3">
              <PricingCard
                id="pro"
                billing={billing}
                onUpgrade={handleUpgrade}
                index={2}
              />
            </div>
            <div className="order-4 sm:order-4">
              <PricingCard
                id="unlimited"
                billing={billing}
                onUpgrade={handleUpgrade}
                index={3}
              />
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
            <div className="mb-10 text-center">
              <p
                className="mb-2 text-xs font-bold tracking-widest uppercase"
                style={{ color: '#C9993A' }}
              >
                Why not ChatGPT?
              </p>
              <h2 className="font-playfair text-3xl font-bold text-white md:text-4xl">
                8× cheaper. Built for you.
              </h2>
            </div>

            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
              {/* ChatGPT */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    🤖
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">ChatGPT Plus</p>
                    <p
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      ₹1,650 / month
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {CHATGPT_CONS.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className="mt-0.5 shrink-0 font-bold"
                        style={{ color: 'rgba(239,68,68,0.7)' }}
                      >
                        ✗
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* EdUsaathiAI */}
              <div
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: 'rgba(201,153,58,0.06)',
                  border: '1.5px solid rgba(201,153,58,0.35)',
                  boxShadow: '0 0 40px rgba(201,153,58,0.08)',
                }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                    style={{ background: 'rgba(201,153,58,0.2)' }}
                  >
                    🧠
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: '#E5B86A' }}
                    >
                      EdUsaathiAI Plus
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <span className="line-through opacity-50">₹199</span> ₹99 / month
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {EDUSAATHI_PROS.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className="mt-0.5 shrink-0 font-bold"
                        style={{ color: '#4ADE80' }}
                      >
                        ✓
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price badge */}
                <div
                  className="mt-5 pt-5"
                  style={{ borderTop: '1px solid rgba(201,153,58,0.2)' }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      vs ChatGPT Plus at ₹1,650/mo
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-sm font-bold"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      Save ₹1,551/mo
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

          {/* ── Immersive Future ─────────────────────────────────────── */}
          <div className="mb-20">
            <ImmersiveFuture />
          </div>

          {/* ── Bottom CTA ───────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl py-16 text-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(201,153,58,0.1) 0%, rgba(11,31,58,0.8) 50%, rgba(201,153,58,0.1) 100%)',
              border: '1px solid rgba(201,153,58,0.2)',
            }}
          >
            <p
              className="mb-3 text-xs font-bold tracking-widest uppercase"
              style={{ color: '#C9993A' }}
            >
              Ready to begin?
            </p>
            <h2 className="font-playfair mb-4 text-4xl font-bold text-white md:text-5xl">
              Your Saathi is waiting.
            </h2>
            <p
              className="mx-auto mb-8 max-w-md text-base"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Join 312 founding students getting full access free. No card. No
              catch.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => router.push('/login')}
                className="rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:brightness-110"
                style={{ background: '#C9993A', color: '#060F1D' }}
              >
                Start free — no card required →
              </button>
              <button
                onClick={() => handleUpgrade('plus')}
                disabled={isLoading}
                className="rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:brightness-110"
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Upgrade to Plus · ₹99/mo →
              </button>
            </div>
            {paymentError && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-4 max-w-sm rounded-lg px-4 py-2 text-xs"
                style={{
                  color: '#F87171',
                  background: 'rgba(239,68,68,0.1)',
                  border: '0.5px solid rgba(239,68,68,0.3)',
                }}
              >
                {paymentError}
              </motion.p>
            )}
          </motion.section>
        </div>

        {/* ── Founding access modal ────────────────────────────────── */}
        <AnimatePresence>
          {showFoundingModal && (
            <FoundingModal
              onClose={() => setShowFoundingModal(false)}
              returnUrl={foundingReturnUrl}
              userEmail={userEmail}
            />
          )}
        </AnimatePresence>

        {/* ── WhatsApp post-payment modal ───────────────────────────── */}
        <AnimatePresence>
          {showWaModal && (
            <WaPostPaymentModal
              onDone={() => {
                setShowWaModal(false)
                window.location.replace('/chat?upgraded=true')
              }}
            />
          )}
        </AnimatePresence>
      </main>
    </>
  )
}
