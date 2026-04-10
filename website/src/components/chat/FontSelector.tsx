'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useFontStore,
  useFontStoreSync,
  FONT_SIZE_MAP,
  FONT_FAMILY_MAP,
  FONT_TYPE_LABELS,
  FONT_TYPE_PREVIEW,
  FONT_COLOR_MAP,
  FONT_COLOR_LIGHT_MAP,
  FONT_COLOR_LABELS,
} from '@/stores/fontStore'
import type { FontSize, FontType, FontColor } from '@/stores/fontStore'

type Props = {
  isLegalTheme?: boolean
}

const SIZES:  FontSize[]  = ['S', 'M', 'L', 'XL']
const TYPES:  FontType[]  = ['sans', 'serif', 'classic', 'native']
const COLORS: FontColor[] = ['default', 'warm', 'cool', 'sage', 'rose']

export function FontSelector({ isLegalTheme = false }: Props) {
  const {
    fontSize, fontType, fontColor,
    highContrast, reduceMotion,
    setFontSize, setFontType, setFontColor,
    setHighContrast, setReduceMotion,
  } = useFontStore()

  useFontStoreSync()  // wires data-font-size and data-high-contrast on <html>

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const btnBg      = 'var(--bg-elevated)'
  const btnBorder  = '1px solid var(--border-subtle)'
  const btnColor   = 'var(--text-secondary)'
  const popBg      = 'var(--bg-surface)'
  const popBorder  = '1px solid var(--border-medium)'
  const popShadow  = 'var(--shadow-lg)'
  const labelColor = 'var(--text-ghost)'
  const divColor   = 'var(--border-subtle)'
  const textColor  = 'var(--text-primary)'

  const chipBase   = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
  const chipActive = { background: 'var(--saathi-light)', border: '1px solid var(--saathi-border)', color: 'var(--saathi-text)' }

  const toggleBase = { background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)' }
  const toggleOn   = { background: 'var(--saathi-primary)', border: '1px solid var(--saathi-primary)' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Aa trigger ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Reading preferences"
        aria-label="Reading preferences"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200"
        style={{
          background: open ? 'var(--bg-sunken)' : btnBg,
          border:  btnBorder,
          color:   btnColor,
          cursor:  'pointer',
          fontFamily: FONT_FAMILY_MAP[fontType],
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunken)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = btnBg }}
      >
        Aa
      </button>

      {/* ── Popover ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 50,
            width: '216px',
            borderRadius: '16px',
            background: popBg,
            border:     popBorder,
            boxShadow:  popShadow,
            padding:    '16px',
          }}
        >

          {/* ── Size ───────────────────────────────────────────────────── */}
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: labelColor, marginBottom: '8px' }}>
            Size
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: '6px', marginBottom: '14px' }}>
            {SIZES.map((s) => {
              const active = fontSize === s
              return (
                <button key={s} onClick={() => setFontSize(s)}
                  style={{ borderRadius: '8px', padding: '6px 0',
                    fontSize: FONT_SIZE_MAP[s], fontWeight: active ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                    ...(active ? chipActive : chipBase) }}>
                  {s}
                </button>
              )
            })}
          </div>

          <div style={{ height: '0.5px', background: divColor, marginBottom: '14px' }} />

          {/* ── Font ───────────────────────────────────────────────────── */}
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: labelColor, marginBottom: '8px' }}>
            Font
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px',
            marginBottom: '14px' }}>
            {TYPES.map((t) => {
              const active = fontType === t
              return (
                <button key={t} onClick={() => setFontType(t)}
                  style={{ borderRadius: '8px', padding: '7px 10px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', cursor: 'pointer',
                    transition: 'all 0.15s', fontFamily: FONT_FAMILY_MAP[t],
                    ...(active ? chipActive : chipBase) }}>
                  <span style={{ fontSize: '12px', fontWeight: active ? 600 : 400 }}>
                    {FONT_TYPE_LABELS[t]}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.55,
                    fontStyle: t === 'classic' || t === 'serif' ? 'italic' : 'normal' }}>
                    {FONT_TYPE_PREVIEW[t]}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ height: '0.5px', background: divColor, marginBottom: '14px' }} />

          {/* ── Colour ─────────────────────────────────────────────────── */}
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: labelColor, marginBottom: '10px' }}>
            Text colour
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center',
            marginBottom: '14px' }}>
            {COLORS.map((c) => {
              const active = fontColor === c
              const dotColor = FONT_COLOR_LIGHT_MAP[c]
              return (
                <button
                  key={c}
                  onClick={() => setFontColor(c)}
                  title={FONT_COLOR_LABELS[c]}
                  style={{
                    width: active ? '26px' : '22px',
                    height: active ? '26px' : '22px',
                    borderRadius: '50%',
                    background: dotColor,
                    border: active
                      ? '2px solid var(--saathi-primary)'
                      : '2px solid var(--border-medium)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    boxShadow: active ? '0 0 0 3px var(--saathi-border)' : 'none',
                  }}
                  aria-label={FONT_COLOR_LABELS[c]}
                  aria-pressed={active}
                />
              )
            })}
          </div>

          <div style={{ height: '0.5px', background: divColor, marginBottom: '14px' }} />

          {/* ── Accessibility toggles ───────────────────────────────────── */}
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: labelColor, marginBottom: '10px' }}>
            Accessibility
          </p>

          {/* High contrast */}
          <div style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: textColor,
                margin: '0 0 1px' }}>
                High contrast
              </p>
              <p style={{ fontSize: '9px', color: labelColor, margin: 0 }}>
                Maximum text clarity
              </p>
            </div>
            <button
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label="Toggle high contrast"
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                flexShrink: 0,
                ...(highContrast ? toggleOn : toggleBase),
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                left: highContrast ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: highContrast ? '#FFFFFF' : 'var(--text-ghost)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {/* Reduce motion */}
          <div style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: textColor,
                margin: '0 0 1px' }}>
                Reduce motion
              </p>
              <p style={{ fontSize: '9px', color: labelColor, margin: 0 }}>
                Fewer animations
              </p>
            </div>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              aria-pressed={reduceMotion}
              aria-label="Toggle reduce motion"
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                flexShrink: 0,
                ...(reduceMotion ? toggleOn : toggleBase),
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                left: reduceMotion ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: reduceMotion ? '#FFFFFF' : 'var(--text-ghost)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
