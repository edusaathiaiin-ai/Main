'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type AutoQuery = {
  tool: string
  params: Record<string, unknown>
} | null

const AutoQueryContext = createContext<{
  autoQuery: AutoQuery
  clearAutoQuery: () => void
}>({ autoQuery: null, clearAutoQuery: () => {} })

export const useAutoQuery = () => useContext(AutoQueryContext)

export function AutoQueryProvider({
  children,
  value,
  onClear,
}: {
  children: ReactNode
  value: AutoQuery
  onClear: () => void
}) {
  return (
    <AutoQueryContext.Provider value={{ autoQuery: value, clearAutoQuery: onClear }}>
      {children}
    </AutoQueryContext.Provider>
  )
}
