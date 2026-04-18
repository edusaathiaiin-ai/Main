'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

type Pod = { title: string; content: string; image_url: string | null }

type Props = {
  initialQuery?: string | null
  onQueryConsumed?: () => void
  onArtifact?: (a: { type: string; source: string; source_url?: string; data: Record<string, unknown>; timestamp: string }) => unknown
}

export function WolframPanel({ initialQuery, onQueryConsumed, onArtifact }: Props) {
  const [query, setQuery] = useState('')
  const autoSearched = useRef(false)
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialQuery && !autoSearched.current) {
      autoSearched.current = true
      setQuery(initialQuery)
      onQueryConsumed?.()
      setTimeout(() => doSearch(initialQuery), 100)
    }
  }, [initialQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true); setError(''); setPods([])
    try {
      const res = await fetch(`/api/classroom/wolfram?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error ?? 'No result'); setLoading(false); return }
      setPods(data.pods ?? [])
      onArtifact?.({
        type: 'wolfram_query',
        source: 'Wolfram Alpha',
        source_url: `https://www.wolframalpha.com/input?i=${encodeURIComponent(q.trim())}`,
        data: {
          input: q.trim(),
          plaintext_result: data.pods?.[0]?.content ?? '',
          pods: data.pods ?? [],
          computation_time_ms: (data.timing ?? 0) * 1000,
        },
        timestamp: new Date().toISOString(),
      })
    } catch { setError('Wolfram request failed') }
    setLoading(false)
  }

  const handleSearch = useCallback(() => { doSearch(query) }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Ask Wolfram... e.g. binding energy of troponin"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Compute'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {pods.map((pod, i) => (
          <div key={i} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>{pod.title}</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{pod.content}</p>
            {pod.image_url && (
              <img src={pod.image_url} alt={pod.title} style={{ marginTop: '8px', maxWidth: '100%', borderRadius: '8px' }} />
            )}
          </div>
        ))}
        {pods.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🔣</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Compute anything</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Wolfram Alpha</p>
          </div>
        )}
      </div>
    </div>
  )
}
