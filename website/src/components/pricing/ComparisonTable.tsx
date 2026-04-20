'use client'

import { motion } from 'framer-motion'

const FEATURES = [
  {
    label: 'Daily chats',
    free: '5',
    plus: '20',
    pro: '50',
    unlimited: '∞ (zero cooling)',
  },
  {
    label: 'Cooling period',
    free: '48 hours',
    plus: '48 hours',
    pro: '24 hours',
    unlimited: 'None ✓',
  },
  {
    label: 'Bots available',
    free: 'Bot 1 + 5',
    plus: 'All 5 bots',
    pro: 'All 5 bots',
    unlimited: 'All 5 bots',
  },
  {
    label: 'Saathis',
    free: '1',
    plus: 'All 20',
    pro: 'All 20',
    unlimited: 'All 20',
  },
  {
    label: 'Check-ins',
    free: '1/month',
    plus: 'Unlimited',
    pro: 'Unlimited',
    unlimited: 'Unlimited',
  },
  { label: 'Notes export', free: '✗', plus: '✓', pro: '✓', unlimited: '✓' },
  {
    label: 'Response speed',
    free: 'Standard',
    plus: 'Standard',
    pro: 'Priority',
    unlimited: 'Fastest',
  },
  {
    label: 'Pause subscription',
    free: '✗',
    plus: '✓',
    pro: '✓',
    unlimited: '✓',
  },
  {
    label: 'Refund policy',
    free: 'N/A',
    plus: 'Pro-rata',
    pro: 'Pro-rata',
    unlimited: 'No refunds',
  },
  {
    label: 'Price',
    free: '₹0',
    plus: '₹99/mo',
    pro: '₹499/mo',
    unlimited: '₹4,999/mo',
  },
]

const COLS = ['Feature', 'Free', 'Plus', 'Pro', 'Unlimited']

function cellColor(value: string): string {
  if (value === '✓' || value === 'None ✓') return '#4ADE80'
  if (value === '✗') return 'rgba(255,255,255,0.2)'
  return 'rgba(255,255,255,0.7)'
}

export default function ComparisonTable() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mb-8 text-center">
        <p
          className="mb-2 text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Compare
        </p>
        <h2 className="font-playfair text-3xl font-bold text-white md:text-4xl">
          Everything side by side
        </h2>
      </div>

      {/* Table wrapper — horizontally scrollable on mobile */}
      <div
        className="overflow-x-auto rounded-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <table className="w-full min-w-[600px] border-collapse">
          {/* Sticky header */}
          <thead>
            <tr
              style={{
                background: 'rgba(11,31,58,0.95)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {COLS.map((col, i) => (
                <th
                  key={col}
                  className="sticky top-0 px-5 py-4 text-left text-xs font-bold tracking-wide"
                  style={{
                    color: i === 2 ? '#C9993A' : 'rgba(255,255,255,0.5)',
                    background:
                      i === 2 ? 'rgba(201,153,58,0.08)' : 'rgba(11,31,58,0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    minWidth: i === 0 ? 160 : 100,
                  }}
                >
                  {i === 2 ? (
                    <span className="flex items-center gap-1.5">
                      {col}
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: '#C9993A', color: '#060F1D' }}
                      >
                        Popular
                      </span>
                    </span>
                  ) : (
                    col
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  background:
                    ri % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Feature label */}
                <td
                  className="px-5 py-3.5 text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {row.label}
                </td>
                {/* Free */}
                <td
                  className="px-5 py-3.5 text-center text-sm"
                  style={{ color: cellColor(row.free) }}
                >
                  {row.free}
                </td>
                {/* Plus — gold highlight */}
                <td
                  className="px-5 py-3.5 text-center text-sm font-semibold"
                  style={{
                    color: cellColor(row.plus),
                    background: 'rgba(201,153,58,0.05)',
                    borderLeft: '1px solid rgba(201,153,58,0.15)',
                    borderRight: '1px solid rgba(201,153,58,0.15)',
                  }}
                >
                  {row.plus}
                </td>
                {/* Pro */}
                <td
                  className="px-5 py-3.5 text-center text-sm"
                  style={{ color: cellColor(row.pro) }}
                >
                  {row.pro}
                </td>
                {/* Unlimited */}
                <td
                  className="px-5 py-3.5 text-center text-sm"
                  style={{ color: cellColor(row.unlimited) }}
                >
                  {row.unlimited}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}
