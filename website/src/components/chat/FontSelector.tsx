'use client'

import { useState, useRef, useEffect } from 'react'
import {
  useFontStore,
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
  const btnBg      = isLegalTheme ? '#F0F0F0'                     : 'rgba(255,255,255,0.07)'
  const btnBorder  = isLegalTheme ? '0.5px solid #D0D0D0'         : '0.5px solid rgba(255,255,255,0.15)'
  const btnColor   = isLegalTheme ? '#555555'                     : 'rgba(255,255,255,0.55)'
  const popBg      = isLegalTheme ? '#FFFFFF'                     : '#0B1F3A'
  const popBorder  = isLegalTheme ? '1px solid #E0E0E0'           : '1px solid rgba(255,255,255,0.1)'
  const popShadow  = isLegalTheme ? '0 8px 24px rgba(0,0,0,0.12)' : '0 8px 32px rgba(0,0,0,0.5)'
  const labelColor = isLegalTheme ? 'rgba(0,0,0,0.35)'            : 'rgba(255,255,255,0.3)'
  const divColor   = isLegalTheme ? '#EEEEEE'                     : 'rgba(255,255,255,0.07)'
  const textColor  = isLegalTheme ? '#333333'                     : 'rgba(255,255,255,0.8)'

  const chipBase   = isLegalTheme
    ? { background: '#F4F4F4', border: '1px solid #E0E0E0', color: '#444444' }
    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }
  const chipActive = isLegalTheme
    ? { background: '#1A1A1A', border: '1px solid #1A1A1A', color: '#FFFFFF' }
    : { background: 'rgba(201,153,58,0.2)', border: '1px solid #C9993A', color: '#C9993A' }

  const toggleBase = isLegalTheme
    ? { background: '#F0F0F0', border: '1px solid #D8D8D8' }
    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }
  const toggleOn = { background: '#C9993A', border: '1px solid #C9993A' }

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
          background: open
            ? isLegalTheme ? '#E4E4E4' : 'rgba(255,255,255,0.12)'
            : btnBg,
          border:  btnBorder,
          color:   btnColor,
          cursor:  'pointer',
          fontFamily: FONT_FAMILY_MAP[fontType],
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isLegalTheme
            ? '#E4E4E4' : 'rgba(255,255,255,0.12)'
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = btnBg
        }}
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
              const dotColor = isLegalTheme
                ? FONT_COLOR_LIGHT_MAP[c]
                : FONT_COLOR_MAP[c]
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
                      ? `2px solid ${isLegalTheme ? '#1A1A1A' : '#C9993A'}`
                      : `2px solid ${isLegalTheme ? '#D0D0D0' : 'rgba(255,255,255,0.15)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    boxShadow: active
                      ? `0 0 0 3px ${isLegalTheme ? 'rgba(0,0,0,0.1)' : 'rgba(201,153,58,0.25)'}`
                      : 'none',
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
                background: highContrast ? '#FFFFFF' : (isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.4)'),
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
                background: reduceMotion ? '#FFFFFF' : (isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.4)'),
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
