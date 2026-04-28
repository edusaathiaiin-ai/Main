'use client'

// ─────────────────────────────────────────────────────────────────────────────
// TabUnlockContext — Liveblocks-backed progressive tab reveal state.
// Phase I-2 / Classroom redesign #5.
//
// Storage shape lives on liveblocks.config.ts:
//   storage.unlockedTabs: string[]    // plugin tab ids unlocked this session
//
// Three ways an entry lands here:
//   1. AI command bar tool result → the classroom page calls unlock(tabId)
//   2. Faculty clicks "Show all tools ↓" → unlockAll(allTabIds)
//   3. Already in storage from earlier in the session — read on mount
//
// First plugin tab is ALWAYS visible regardless of this list. That rule
// lives on the plugin render side (filter logic) so this storage stays
// plugin-agnostic.
//
// useTabUnlock() returns a no-op fallback when used outside the provider
// (e.g. when liveblocksAvailable === false). Faculty can still use the
// classroom; the unlock state is just session-local instead of synced.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from 'react'
import { useStorage, useMutation } from './liveblocks.config'

type Ctx = {
  unlockedTabIds: string[]
  unlock:    (id: string)        => void
  unlockAll: (ids: readonly string[]) => void
}

const FALLBACK: Ctx = {
  unlockedTabIds: [],
  unlock:    () => {},
  unlockAll: () => {},
}

const TabUnlockCtx = createContext<Ctx | null>(null)

export function TabUnlockProvider({ children }: { children: ReactNode }) {
  // useStorage returns null until the room is loaded; treat as empty.
  const fromStorage = useStorage((root) => root.unlockedTabs)
  const unlockedTabIds = (fromStorage ?? []) as string[]

  const merge = useMutation(({ storage }, newIds: readonly string[]) => {
    const cur  = (storage.get('unlockedTabs') as string[] | undefined) ?? []
    const next = Array.from(new Set([...cur, ...newIds]))
    // Skip the write if the merge would be a no-op — saves Liveblocks ops
    // and avoids a re-broadcast to all peers.
    if (next.length === cur.length) return
    storage.set('unlockedTabs', next)
  }, [])

  const value: Ctx = {
    unlockedTabIds,
    unlock:    (id)  => merge([id]),
    unlockAll: (ids) => merge(ids),
  }

  return <TabUnlockCtx.Provider value={value}>{children}</TabUnlockCtx.Provider>
}

/** Read tab-unlock state. Returns a no-op fallback when not inside the
 *  provider (e.g. when running outside a Liveblocks room). */
export function useTabUnlock(): Ctx {
  return useContext(TabUnlockCtx) ?? FALLBACK
}
