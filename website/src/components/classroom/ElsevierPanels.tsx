'use client'

import { useState, useCallback } from 'react'

type ScienceDirectArticle = {
  title: string; authors: string; publication: string
  date: string; doi: string; link: string
}

type ScopusCitation = {
  title: string; authors: string; publication: string
  date: string; doi: string; citedByCount: string; link: string
}

export function ScienceDirectPanel() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<ScienceDirectArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setArticles([])
    try {
      const res = await fetch(`/api/classroom/elsevier?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Search failed'); setLoading(false); return }
      setArticles(data.articles ?? [])
      if (data.articles?.length === 0) setError('No articles found')
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search ScienceDirect... e.g. CRISPR, drug delivery"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {articles.map((a, i) => (
          <div key={i} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <a href={a.link} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
              {a.title}
            </a>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{a.authors}</p>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
              {a.publication} &middot; {a.date} {a.doi && <>· DOI: {a.doi}</>}
            </p>
          </div>
        ))}
        {articles.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📖</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search full-text research articles</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>ScienceDirect — Elsevier</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ScopusPanel() {
  const [query, setQuery] = useState('')
  const [citations, setCitations] = useState<ScopusCitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setCitations([])
    try {
      const res = await fetch(`/api/classroom/scopus?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Search failed'); setLoading(false); return }
      setCitations(data.citations ?? [])
      if (data.citations?.length === 0) setError('No citations found')
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search Scopus citations... e.g. machine learning cancer"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {citations.map((c, i) => (
          <div key={i} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <a href={c.link} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
              {c.title}
            </a>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.authors}</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {c.publication} &middot; {c.date}
              </p>
              {Number(c.citedByCount) > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {c.citedByCount} cited
                </span>
              )}
            </div>
          </div>
        ))}
        {citations.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📊</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search citation database</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Scopus — Elsevier</p>
          </div>
        )}
      </div>
    </div>
  )
}
