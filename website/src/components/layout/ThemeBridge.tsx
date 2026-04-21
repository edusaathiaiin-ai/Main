'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

/**
 * Client-only bridge: syncs the user's theme preference from zustand
 * to a <body data-mode="day|night"> attribute so globals.css CSS variables
 * can flip platform-wide (light/dark surfaces, text, borders).
 *
 * Previously lived inside ChatWindow, which meant toggling theme only
 * affected /chat. Mounted at the (app)/layout level now — toggle works
 * everywhere the user logs in.
 */
export function ThemeBridge() {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    document.body.setAttribute('data-mode', mode === 'light' ? 'day' : 'night')
    return () => {
      // Don't strip on unmount — another page may mount. Only update.
    }
  }, [mode])

  return null
}
