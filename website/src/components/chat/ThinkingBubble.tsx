'use client'

import { useState, useEffect } from 'react'

export function ThinkingBubble({ saathiName, saathiEmoji }: { saathiName: string; saathiEmoji: string }) {
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = [
    `${saathiName} is thinking...`,
    `${saathiName} is preparing your answer...`,
    `Finding the best explanation for you...`,
    `Almost ready...`,
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [messages.length])

  return (
    <div
      className="flex items-start gap-2.5 mb-3"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: 'var(--saathi-light)',
        border: '1px solid var(--saathi-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', flexShrink: 0,
      }}>
        {saathiEmoji}
      </div>

      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: '0 12px 12px 12px',
        padding: '10px 14px',
        maxWidth: '280px',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="thinking-dot"
              style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'var(--saathi-primary)',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p style={{
          fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          margin: 0, transition: 'opacity 0.3s ease',
        }}>
          {messages[messageIndex]}
        </p>
      </div>
    </div>
  )
}
