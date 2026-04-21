import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewAs = 'faculty' | 'student'

interface ViewAsState {
  viewAs: ViewAs
  setViewAs: (v: ViewAs) => void
}

export const useViewAsStore = create<ViewAsState>()(
  persist(
    (set) => ({
      viewAs: 'faculty',
      setViewAs: (v) => set({ viewAs: v }),
    }),
    { name: 'edu-view-as' }
  )
)
