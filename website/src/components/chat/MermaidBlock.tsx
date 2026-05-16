'use client'

import { useEffect, useRef, useState } from 'react'

export function MermaidBlock({
  chart,
  saathiColor = '#B8860B',
}: {
  chart: string
  saathiColor?: string
}) {
  const [svg, setSvg] = useState<string>('')
  const [failed, setFailed] = useState(false)
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default

        // Re-initialise every render: theme vars must track the active
        // Saathi colour, and a module-level init-once guard would freeze
        // the first Saathi's palette for the whole session.
        // suppressErrorRendering: true stops Mermaid injecting its default
        // "bomb" error SVG into document.body on a parse failure — we render
        // our own warm fallback instead (Engineering Philosophy: silent
        // resilience, never a blank or alarming screen).
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily:
            'var(--font-body, "Plus Jakarta Sans", system-ui, sans-serif)',
          themeVariables: {
            background: '#FFFFFF',
            primaryColor: '#FFFFFF',
            primaryTextColor: '#1A1814',
            primaryBorderColor: saathiColor,
            secondaryColor: '#FAFAF8',
            secondaryTextColor: '#1A1814',
            secondaryBorderColor: saathiColor,
            tertiaryColor: '#F5E6C8',
            tertiaryTextColor: '#1A1814',
            lineColor: saathiColor,
            textColor: '#1A1814',
            mainBkg: '#FFFFFF',
            nodeBorder: saathiColor,
            clusterBkg: '#FAFAF8',
            edgeLabelBackground: '#FFFFFF',
            titleColor: '#1A1814',
          },
        })

        // Validate before rendering. With suppressErrors mermaid.parse
        // resolves false (instead of throwing) on bad syntax, so we never
        // attempt a doomed render that could leak DOM artifacts.
        const valid = await mermaid.parse(chart, { suppressErrors: true })
        if (cancelled) return
        if (!valid) {
          setFailed(true)
          return
        }

        const { svg: renderedSvg } = await mermaid.render(idRef.current, chart)
        if (!cancelled) setSvg(renderedSvg)
      } catch (err) {
        if (!cancelled) {
          setFailed(true)
          console.error('[MermaidBlock] render failed:', err)
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [chart, saathiColor])

  // Warm, non-alarming fallback. The student still gets the underlying
  // text content — never a dead end.
  if (failed) {
    return (
      <div
        style={{
          margin: '12px 0',
          padding: '14px 16px',
          background: 'var(--saathi-bg, rgba(184,134,11,0.06))',
          border: '0.5px solid var(--border, rgba(0,0,0,0.08))',
          borderRadius: '12px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary, #4A4740)',
            margin: '0 0 8px',
            fontWeight: 500,
          }}
        >
          Couldn&apos;t draw this as a diagram — here&apos;s the outline:
        </p>
        <pre
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--text-primary, #1A1814)',
            background: 'var(--bg-surface, #FFFFFF)',
            border: '0.5px solid var(--border, rgba(0,0,0,0.06))',
            borderRadius: '8px',
            padding: '10px 12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          }}
        >
          {chart}
        </pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          background: 'var(--bg-surface, #FFFFFF)',
          border: '0.5px solid var(--border, rgba(0,0,0,0.06))',
          borderRadius: '10px',
          margin: '12px 0',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: `2px solid ${saathiColor}40`,
            borderTopColor: saathiColor,
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '16px',
        background: 'var(--bg-surface, #FFFFFF)',
        borderRadius: '12px',
        border: `0.5px solid ${saathiColor}33`,
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
