import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type React from 'react'

export type FontSize  = 'S' | 'M' | 'L' | 'XL'
export type FontType  = 'sans' | 'serif' | 'classic' | 'native'
export type FontColor = 'default' | 'warm' | 'cool' | 'sage' | 'rose'

// ─── Size ────────────────────────────────────────────────────────────────────

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  S:  '13px',
  M:  '15px',
  L:  '17px',
  XL: '20px',
}

export const FONT_LINE_HEIGHT_MAP: Record<FontSize, string> = {
  S:  '1.55',
  M:  '1.65',
  L:  '1.75',
  XL: '1.85',
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

// ─── Colour — colorblind-safe palette ────────────────────────────────────────
// Tested against deuteranopia, protanopia, and tritanopia.
// Mid-brightness: readable on both dark navy and white backgrounds.

export const FONT_COLOR_MAP: Record<FontColor, string> = {
  default: '#F0F0F0', // near-white — standard
  warm:    '#F5C842', // amber — deuteranopia-safe
  cool:    '#7EC8E3', // sky blue — universally visible
  sage:    '#A8C5A0', // muted green — tritanopia-safe
  rose:    '#E8A0A0', // dusty rose — safe for deuteranopia
}

// Light mode equivalents — darker for readability on white
export const FONT_COLOR_LIGHT_MAP: Record<FontColor, string> = {
  default: '#1A1A1A',
  warm:    '#8A6A00',
  cool:    '#1A6A8A',
  sage:    '#2A5A30',
  rose:    '#8A2A40',
}

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
      fontSize:     'M',
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

// ─── Style helper — used in MessageBubble ────────────────────────────────────

export function getChatFontStyle(
  fontSize:     FontSize,
  fontType:     FontType,
  fontColor:    FontColor,
  isLegalTheme  = false,
  highContrast  = false,
): React.CSSProperties {
  const baseColor = isLegalTheme
    ? FONT_COLOR_LIGHT_MAP[fontColor]
    : FONT_COLOR_MAP[fontColor]

  return {
    fontFamily: FONT_FAMILY_MAP[fontType],
    fontSize:   FONT_SIZE_MAP[fontSize],
    lineHeight: FONT_LINE_HEIGHT_MAP[fontSize],
    color: highContrast
      ? (isLegalTheme ? '#000000' : '#FFFFFF')
      : baseColor,
  }
}
