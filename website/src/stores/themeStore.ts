import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeStore = {
  mode: 'dark' | 'light'
  toggleMode: () => void
  setMode: (mode: 'dark' | 'light') => void
}

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
