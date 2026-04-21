import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeStore = {
  mode: 'dark' | 'light'
  toggleMode: () => void
  setMode: (mode: 'dark' | 'light') => void
}

// Version 2 = one-time reset to light default (April 2026).
// Existing users with persisted mode='dark' from before the platform-wide
// light-theme decision will be migrated to 'light' on next load.
// Their subsequent toggles are preserved normally.
const THEME_STORE_VERSION = 2

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'light',
      toggleMode: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'edusaathiai-theme',
      version: THEME_STORE_VERSION,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const s = persistedState as Partial<ThemeStore> | undefined
        // v1 → v2: force light default once, discarding the old persisted mode
        if (fromVersion < 2) {
          return { ...(s ?? {}), mode: 'light' } as ThemeStore
        }
        return (s ?? { mode: 'light' }) as ThemeStore
      },
    }
  )
)
