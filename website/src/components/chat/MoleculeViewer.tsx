'use client'

import { useState, useEffect } from 'react'

export function MoleculeViewer({ name }: { name: string }) {
  const [imgUrl, setImgUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/PNG`

  useEffect(() => {
    async function run() {
      await Promise.resolve()
      setLoading(true)
      setError(false)
      setImgUrl('')

      const img = new window.Image()
      img.onload = () => {
        setImgUrl(pubchemUrl)
        setLoading(false)
      }
      img.onerror = () => {
        setError(true)
        setLoading(false)
      }
      img.src = pubchemUrl
    }
    void run()
  }, [name, pubchemUrl])

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '0.5px solid rgba(201,153,58,0.2)',
        display: 'inline-block',
        maxWidth: '280px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          color: '#C9993A',
          fontWeight: 600,
          margin: '0 0 10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        🧪 {name}
      </p>

      {loading && (
        <div
          style={{
            width: '200px',
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid rgba(201,153,58,0.3)',
              borderTopColor: '#C9993A',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {!loading && !error && imgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={`Chemical structure of ${name}`}
          style={{
            maxWidth: '100%',
            borderRadius: '8px',
            background: '#fff',
            padding: '8px',
            display: 'block',
          }}
        />
      )}

      {!loading && error && (
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          Structure not found for &quot;{name}&quot;
        </p>
      )}

      <p
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.2)',
          margin: '8px 0 0',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        Source: PubChem (NIH)
      </p>
    </div>
  )
}
