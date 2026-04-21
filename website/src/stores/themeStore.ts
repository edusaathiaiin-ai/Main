import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeStore = {
  mode: 'dark' | 'light'
  toggleMode: () => void
  setMode: (mode: 'dark' | 'light') => void
}

// Default is LIGHT. User's own toggle choice is respected and persists.
// No forced migration — if a user genuinely prefers dark (e.g. night mobile
// reading), their setting must survive platform-wide default changes.
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'light',
      toggleMode: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'edusaathiai-theme' }
  )
)
