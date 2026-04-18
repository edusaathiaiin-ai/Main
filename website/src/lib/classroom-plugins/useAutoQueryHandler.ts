'use client'

import { useEffect } from 'react'
import { useAutoQuery } from './AutoQueryContext'

export function useAutoQueryHandler(
  tool: string,
  onMatch: (params: Record<string, unknown>) => void
) {
  const { autoQuery, clearAutoQuery } = useAutoQuery()

  useEffect(() => {
    if (!autoQuery) return
    if (autoQuery.tool !== tool) return
    onMatch(autoQuery.params)
    clearAutoQuery()
  }, [autoQuery]) // eslint-disable-line react-hooks/exhaustive-deps
}
