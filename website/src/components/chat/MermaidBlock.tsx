'use client';

import { useEffect, useRef, useState } from 'react';

let mermaidInitialized = false;

export function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              primaryColor: '#0B1F3A',
              primaryTextColor: '#ffffff',
              primaryBorderColor: '#C9993A',
              lineColor: '#C9993A',
              secondaryColor: '#0B1F3A',
              tertiaryColor: '#060F1D',
              background: '#060F1D',
            },
          });
          mermaidInitialized = true;
        }

        const { svg: renderedSvg } = await mermaid.render(idRef.current, chart);
        if (!cancelled) setSvg(renderedSvg);
      } catch (err) {
        if (!cancelled) {
          setError('Could not render diagram');
          console.error('[MermaidBlock] error:', err);
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div style={{
        padding: '12px',
        background: 'rgba(239,68,68,0.1)',
        borderRadius: '8px',
        margin: '12px 0',
      }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {error}
        </p>
        <pre style={{
          marginTop: '8px',
          fontSize: '11px',
          opacity: 0.4,
          overflowX: 'auto',
          color: 'rgba(255,255,255,0.6)',
          whiteSpace: 'pre-wrap',
        }}>
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        margin: '12px 0',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '2px solid rgba(201,153,58,0.3)',
          borderTopColor: '#C9993A',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '0.5px solid rgba(201,153,58,0.2)',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
