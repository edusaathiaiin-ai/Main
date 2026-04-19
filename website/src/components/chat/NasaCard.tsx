'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NasaImage = {
  title: string
  description: string
  thumbnail: string
  nasa_id: string
}

export function NasaCard({ query }: { query: string }) {
  const [images, setImages] = useState<NasaImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchNasa() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError(true); setLoading(false); return }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-nasa`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'images', query }),
          }
        )
        if (!res.ok) throw new Error('NASA fetch failed')
        const data = await res.json()
        setImages(data.items ?? [])
      } catch { setError(true) }
      setLoading(false)
    }
    fetchNasa()
  }, [query])

  if (error || (!loading && images.length === 0)) return null

  return (
    <div style={{
      margin: '8px 0',
      background: 'var(--bg-elevated)',
      borderRadius: '10px',
      border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid #1E3A5F',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
      }}>
        <span style={{ fontSize: '14px' }}>🚀</span>
        <span style={{
          fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          NASA Image Library
        </span>
        {loading && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Searching...</span>
        )}
      </div>

      {/* Query */}
      <div style={{
        padding: '0 14px 8px', fontSize: '12px',
        color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
      }}>
        {query}
      </div>

      {/* Image grid */}
      {!loading && images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: images.length <= 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: '2px', padding: '0 2px 2px',
        }}>
          {images.slice(0, 6).map((img, i) => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
              <img
                src={img.thumbnail}
                alt={img.title}
                loading="lazy"
                style={{
                  width: '100%', height: '120px', objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '16px 6px 4px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              }}>
                <p style={{
                  fontSize: '9px', fontWeight: 600, color: '#fff',
                  margin: 0, lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {img.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            NASA — National Aeronautics and Space Administration
          </span>
          <a
            href={`https://images.nasa.gov/search?q=${encodeURIComponent(query)}&media=image`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}
          >
            More images →
          </a>
        </div>
      )}
    </div>
  )
}
