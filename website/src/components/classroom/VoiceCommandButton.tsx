'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Extend window type for cross-browser SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface Props {
  onTranscript:         (text: string) => void  // fires after 2s silence
  onInterimTranscript:  (text: string) => void  // fires in real time
  disabled?:            boolean
}

export function VoiceCommandButton({
  onTranscript,
  onInterimTranscript,
  disabled,
}: Props) {
  const [listening,  setListening]  = useState(false)
  const [supported,  setSupported]  = useState(false)
  const recognitionRef  = useRef<SpeechRecognition | null>(null)
  const silenceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalBufferRef  = useRef<string>('')

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    setSupported(!!SR)
  }, [])

  const stopListening = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    recognitionRef.current?.stop()
    setListening(false)
    finalBufferRef.current = ''
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang              = 'en-IN'
    // Indian English — significantly better recognition for
    // Indian faculty accents (Gujarat, Tamil Nadu, Maharashtra etc.)
    // than en-US. Critical for domain terms like
    // "troponin", "Haworth projection", "mandamus", "eigenvalue".
    recognition.continuous        = true
    recognition.interimResults    = true
    recognition.maxAlternatives   = 1

    recognition.onresult = (event) => {
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalBufferRef.current += t + ' '
        } else {
          interim = t
        }
      }

      // Show live transcript in command bar
      const display = (finalBufferRef.current + interim).trim()
      if (display) onInterimTranscript(display)

      // Reset silence timer on every speech event
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
      silenceTimer.current = setTimeout(() => {
        const full = finalBufferRef.current.trim()
          || interim.trim()
        if (full) onTranscript(full)
        stopListening()
      }, 2000)
    }

    recognition.onerror = () => stopListening()
    recognition.onend   = () => {
      // Auto-restart if still supposed to be listening
      // (Chrome stops after ~60s of silence)
      if (listening) recognition.start()
      else setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [listening, onTranscript, onInterimTranscript, stopListening])

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening])

  const toggle = () => listening ? stopListening() : startListening()

  // Render nothing if browser does not support
  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop listening (click to stop)' : 'Speak a command'}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      style={{
        background:    listening ? 'var(--gold)' : 'var(--bg-elevated)',
        border:        `1px solid ${listening ? 'var(--gold)' : 'var(--border-subtle)'}`,
        borderRadius:  '8px',
        padding:       '6px 10px',
        cursor:        disabled ? 'not-allowed' : 'pointer',
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        fontSize:      '13px',
        color:         listening ? '#fff' : 'var(--text-secondary)',
        transition:    'all 200ms ease',
        flexShrink:    0,
        animation:     listening ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
      }}
    >
      🎤
      {listening && (
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-body)' }}>
          Listening...
        </span>
      )}
    </button>
  )
}
