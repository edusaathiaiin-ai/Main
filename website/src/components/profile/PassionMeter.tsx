'use client'

import { motion } from 'framer-motion'

interface PassionMeterProps {
  value: number // 0-100
  label?: string
}

export default function PassionMeter({
  value,
  label = 'Passion intensity',
}: PassionMeterProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Gold fill */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#passion-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient
              id="passion-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#C9993A" />
              <stop offset="100%" stopColor="#E5B86A" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-playfair text-2xl font-bold"
            style={{ color: '#C9993A' }}
          >
            {clampedValue}
          </motion.span>
        </div>
      </div>
      <p
        className="text-xs font-semibold tracking-wide"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {label}
      </p>
    </div>
  )
}
