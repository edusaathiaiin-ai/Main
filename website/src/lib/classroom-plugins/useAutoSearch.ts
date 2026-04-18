'use client'

import { useEffect, useRef } from 'react'
import { useAutoQuery } from './AutoQueryContext'

/**
 * Universal auto-search hook. Any panel calls this with its tool name
 * and a search function. When the TA command bar fires a matching tool,
 * the panel auto-executes the search. No props needed — reads from context.
 *
 * Usage:
 *   const query = useAutoSearch('rcsb', (params) => {
 *     const q = params.protein_name ?? params.pdb_id ?? ''
 *     doSearch(q)
 *     return q // returned value is set as the input field value
 *   })
 */
export function useAutoSearch(
  toolName: string | string[],
  onSearch: (params: Record<string, unknown>) => string | void,
): string | null {
  const { autoQuery, clearAutoQuery } = useAutoQuery()
  const lastExecuted = useRef<string | null>(null)

  const tools = Array.isArray(toolName) ? toolName : [toolName]
  const isMatch = autoQuery && tools.includes(autoQuery.tool)

  useEffect(() => {
    if (!isMatch || !autoQuery) return
    const key = `${autoQuery.tool}:${JSON.stringify(autoQuery.params)}`
    if (key === lastExecuted.current) return

    lastExecuted.current = key
    const result = onSearch(autoQuery.params)
    clearAutoQuery()

    return () => {}
  }, [isMatch, autoQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isMatch && autoQuery) {
    const p = autoQuery.params
    return (p.query as string) ?? (p.protein_name as string) ?? (p.pdb_id as string) ?? (p.compound_name as string) ?? null
  }
  return null
}
