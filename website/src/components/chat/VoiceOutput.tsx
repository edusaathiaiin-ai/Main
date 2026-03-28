'use client'

import { useState, useRef, useEffect } from 'react'

type VoiceOutputProps = {
  text: string
  saathiColor?: string
}

export function VoiceOutput({ text, saathiColor = '#C9993A' }: VoiceOutputProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speed, setSpeed] = useState(0.95)
  const [supported, setSupported] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setSupported('speechSynthesis' in window)
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  function getIndianVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    const indian = voices.find(v =>
      v.lang === 'en-IN' ||
      v.name.includes('India') ||
      v.name.includes('Ravi') ||
      v.name.includes('Veena')
    )
    return indian ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }

  function speak() {
    if (!supported) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .slice(0, 3000)

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utteranceRef.current = utterance

    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        utterance.voice = getIndianVoice()
      }
    } else {
      utterance.voice = getIndianVoice()
    }

    utterance.rate = speed
    utterance.pitch = 1.0
    utterance.volume = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  if (!supported) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={speak}
        style={{
          background: isSpeaking ? `${saathiColor}20` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: '6px',
          color: isSpeaking ? saathiColor : 'rgba(255,255,255,0.25)',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title={isSpeaking ? 'Stop reading' : 'Read aloud'}
      >
        {isSpeaking ? '⏸' : '🔊'}
      </button>

      {isSpeaking && (
        <select
          value={speed}
          onChange={(e) => {
            const newSpeed = parseFloat(e.target.value)
            setSpeed(newSpeed)
            if (utteranceRef.current) {
              window.speechSynthesis.cancel()
              utteranceRef.current.rate = newSpeed
              window.speechSynthesis.speak(utteranceRef.current)
            }
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="0.75" style={{ background: '#0B1F3A' }}>0.75×</option>
          <option value="0.95" style={{ background: '#0B1F3A' }}>1×</option>
          <option value="1.25" style={{ background: '#0B1F3A' }}>1.25×</option>
          <option value="1.5" style={{ background: '#0B1F3A' }}>1.5×</option>
        </select>
      )}
    </div>
  )
}
