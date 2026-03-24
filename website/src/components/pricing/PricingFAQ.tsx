'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes — upgrade instantly, downgrade at next billing cycle. No lock-ins, no penalties.',
  },
  {
    q: 'What happens when I hit my daily limit?',
    a: 'A 48-hour cooling period begins (24h on Pro, 0h on Unlimited). Your soul profile, notes, and Check-in history stay intact. You can still read the Board and News while cooling.',
  },
  {
    q: 'Is my soul profile safe if I cancel?',
    a: 'Yes. Your Saathi remembers you for 1 year after cancellation. Resubscribe anytime and pick up exactly where you left off — same soul memory, same topics, same journey.',
  },
  {
    q: 'What is the no-refund policy on Unlimited?',
    a: "Unlimited is a commitment tier. You can pause anytime instead of cancelling. We don't offer refunds because you can pause immediately — pausing freezes billing until you're ready to return.",
  },
  {
    q: 'Do you offer student discounts?',
    a: 'Our ₹199/month IS the student price. We built EdUsaathiAI specifically for Indian students — 8× cheaper than ChatGPT Plus. Every plan is already a student plan.',
  },
  {
    q: 'What is Founding Student Access?',
    a: 'First 500 students get 60 days of full Plus access completely free — no card required. After 60 days, choose a plan or continue on free. Your soul memory stays either way.',
  },
];

export default function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#C9993A' }}>FAQ</p>
        <h2 className="font-playfair text-3xl md:text-4xl font-bold text-white">Questions answered</h2>
      </motion.div>

      <div className="space-y-3">
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: isOpen ? 'rgba(201,153,58,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isOpen ? 'rgba(201,153,58,0.3)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              >
                <span className="font-semibold text-sm text-white">{faq.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-lg"
                  style={{ color: '#C9993A' }}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
