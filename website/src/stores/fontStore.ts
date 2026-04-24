import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'
import type React from 'react'

export type FontSize  = 'S' | 'M' | 'L' | 'XL'
export type FontType  = 'sans' | 'serif' | 'classic' | 'native'
export type FontColor = 'default' | 'warm' | 'cool' | 'sage' | 'rose'

// ─── Size ────────────────────────────────────────────────────────────────────

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  S:  '14px',
  M:  '16px',
  L:  '18px',
  XL: '21px',
}

export const FONT_LINE_HEIGHT_MAP: Record<FontSize, string> = {
  S:  '1.6',
  M:  '1.7',
  L:  '1.8',
  XL: '1.9',
}

// ─── Font family ─────────────────────────────────────────────────────────────

export const FONT_FAMILY_MAP: Record<FontType, string> = {
  sans:    'var(--font-dm-sans), DM Sans, sans-serif',
  serif:   'Georgia, "Times New Roman", serif',
  classic: '"Times New Roman", Times, serif',
  native:  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif',
}

export const FONT_TYPE_LABELS: Record<FontType, string> = {
  sans:    'Sans',
  serif:   'Serif',
  classic: 'Classic',
  native:  'Native',
}

export const FONT_TYPE_PREVIEW: Record<FontType, string> = {
  sans:    'DM Sans',
  serif:   'Georgia',
  classic: 'Times',
  native:  'System',
}

// ─── Colour — colorblind-safe palette, light-theme only ─────────────────────
// Tested against deuteranopia, protanopia, and tritanopia.
// All values designed for readability on the Saathi-tinted light backgrounds
// (cream, mint, lavender, pale blue, etc.). The platform is LIGHT THEME —
// dark-text-on-light-bg is the only supported combination for chat.
//
// The 'default' option is intentionally a CSS var, not a hex — it resolves
// to each Saathi's own --text-primary, so the reply text always matches the
// active Saathi's ink (deep green on BioSaathi, deep navy on CompSaathi, etc.)
// without a per-Saathi switch inside this file. Single source of truth.

export const FONT_COLOR_LIGHT_MAP: Record<FontColor, string> = {
  default: 'var(--text-primary)',
  warm:    '#8A6A00',
  cool:    '#1A6A8A',
  sage:    '#2A5A30',
  rose:    '#8A2A40',
}

// Back-compat alias — any legacy import still resolves to the same palette.
export const FONT_COLOR_MAP = FONT_COLOR_LIGHT_MAP

export const FONT_COLOR_LABELS: Record<FontColor, string> = {
  default: 'Default',
  warm:    'Warm',
  cool:    'Cool',
  sage:    'Sage',
  rose:    'Rose',
}

// ─── Store ───────────────────────────────────────────────────────────────────

type FontStore = {
  fontSize:      FontSize
  fontType:      FontType
  fontColor:     FontColor
  highContrast:  boolean
  reduceMotion:  boolean
  setFontSize:     (size:  FontSize)  => void
  setFontType:     (type:  FontType)  => void
  setFontColor:    (color: FontColor) => void
  setHighContrast: (val:   boolean)   => void
  setReduceMotion: (val:   boolean)   => void
}

export const useFontStore = create<FontStore>()(
  persist(
    (set) => ({
      fontSize:     'L',
      fontType:     'sans',
      fontColor:    'default',
      highContrast: false,
      reduceMotion: false,
      setFontSize:     (fontSize)     => set({ fontSize }),
      setFontType:     (fontType)     => set({ fontType }),
      setFontColor:    (fontColor)    => set({ fontColor }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: 'edusaathiai-font-prefs' }
  )
)

// ─── DOM sync hook — call once in FontSelector or a root provider ────────────
// Wires data-font-size and data-high-contrast on <html> so CSS vars auto-scale

export function useFontStoreSync() {
  const { fontSize, highContrast } = useFontStore()

  useEffect(() => {
    const sizeMap: Record<FontSize, string> = {
      S: 'default', M: 'default', L: 'large', XL: 'xlarge',
    }
    const attr = sizeMap[fontSize]
    if (attr === 'default') {
      document.documentElement.removeAttribute('data-font-size')
    } else {
      document.documentElement.setAttribute('data-font-size', attr)
    }
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-high-contrast',
      highContrast ? 'true' : 'false'
    )
  }, [highContrast])
}

// ─── Style helper — used in MessageBubble ────────────────────────────────────

export function getChatFontStyle(
  fontSize: FontSize,
  fontType: FontType,
  fontColor: FontColor,
  // Legacy param — retained so older callsites keep compiling. Ignored.
  // Saathi chat is always light theme; text color always resolves from
  // var(--text-primary) or the user's chosen palette swatch.
  _legacyIsLegalTheme: boolean = false,
  highContrast: boolean = false,
): React.CSSProperties {
  return {
    fontFamily: FONT_FAMILY_MAP[fontType],
    fontSize:   FONT_SIZE_MAP[fontSize],
    lineHeight: FONT_LINE_HEIGHT_MAP[fontSize],
    color: highContrast ? '#000000' : FONT_COLOR_LIGHT_MAP[fontColor],
  }
}
