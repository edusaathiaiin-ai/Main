'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    function run() {
      if (!localStorage.getItem('cookie_consent')) {
        setShow(true)
      }
    }
    run()
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'true')
    setShow(false)
  }

  // Safe early return for SSR
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    function run() {
      setMounted(true)
    }
    run()
  }, [])
  if (!mounted) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 bottom-0 left-0 z-[100] px-4 py-4 shadow-2xl md:py-5"
          style={{ background: '#0B1F3A', borderTop: '2px solid #C9993A' }}
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 md:flex-row">
            <p
              className="m-0 flex-1 text-sm font-medium"
              style={{ color: '#FAF7F2', fontFamily: 'var(--font-dm-sans)' }}
            >
              EdUsaathiAI uses essential cookies for authentication only. No
              tracking. No ads.
            </p>
            <div className="flex w-full items-center justify-end gap-4 md:w-auto">
              <Link
                href="/privacy"
                className="text-sm whitespace-nowrap underline underline-offset-4 transition-opacity hover:opacity-80"
                style={{ color: '#FAF7F2', fontFamily: 'var(--font-dm-sans)' }}
              >
                Privacy Policy
              </Link>
              <button
                onClick={accept}
                className="rounded-lg px-6 py-2.5 text-sm font-bold whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: '#C9993A',
                  color: '#060F1D',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
