'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Web Speech API type declarations (not in default TypeScript lib)
interface ISpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  onstart: ((ev: Event) => void) | null
  onresult: ((ev: ISpeechRecognitionEvent) => void) | null
  onerror: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition
}

type VoiceInputProps = {
  onTranscript: (text: string) => void
  disabled?: boolean
  saathiColor?: string
}

export function VoiceInput({
  onTranscript,
  disabled,
  saathiColor = '#C9993A'
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(() =>
    typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window
    )
  )
  const [language, setLanguage] = useState('hi-IN')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const LANGUAGES = [
    { code: 'hi-IN', label: 'हिंदी' },
    { code: 'en-IN', label: 'English' },
    { code: 'gu-IN', label: 'ગુજરાતી' },
    { code: 'mr-IN', label: 'मराठी' },
    { code: 'ta-IN', label: 'தமிழ்' },
    { code: 'te-IN', label: 'తెలుగు' },
    { code: 'kn-IN', label: 'ಕನ್ನಡ' },
    { code: 'bn-IN', label: 'বাংলা' },
  ]

  function startListening() {
    const w = window as typeof window & {
      webkitSpeechRecognition?: ISpeechRecognitionConstructor
      SpeechRecognition?: ISpeechRecognitionConstructor
    }
    const SpeechRecognitionAPI = w.webkitSpeechRecognition ?? w.SpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      setTranscript(final || interim)

      if (final) {
        onTranscript(final.trim())
        setIsListening(false)
        setTranscript('')
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
      setTranscript('')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
    setTranscript('')
  }

  if (!supported) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)',
          borderRadius: '8px',
          padding: '4px 8px',
          fontSize: '11px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code} style={{ background: '#0B1F3A' }}>
            {l.label}
          </option>
        ))}
      </select>

      <motion.button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        animate={{
          scale: isListening ? [1, 1.1, 1] : 1,
          background: isListening ? saathiColor : 'rgba(255,255,255,0.06)',
        }}
        transition={{ scale: isListening ? { repeat: Infinity, duration: 1 } : { duration: 0.2 } }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: `1.5px solid ${isListening ? saathiColor : 'rgba(255,255,255,0.1)'}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isListening ? '#fff' : 'rgba(255,255,255,0.4)',
          fontSize: '16px',
          position: 'relative',
          boxShadow: isListening ? `0 0 20px ${saathiColor}40` : 'none',
        }}
        title={isListening ? 'Click to stop' : 'Hold to speak'}
      >
        {isListening ? '⏹' : '🎤'}
        {isListening && (
          <motion.div
            animate={{ scale: [1, 2], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: saathiColor,
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              position: 'absolute',
              bottom: '52px',
              right: 0,
              background: '#0B1F3A',
              border: `1px solid ${saathiColor}50`,
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#fff',
              maxWidth: '280px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 10,
            }}
          >
            <span style={{ color: saathiColor, marginRight: '6px', fontSize: '10px' }}>● LIVE</span>
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
