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
  new (): ISpeechRecognition
}

type VoiceInputProps = {
  onTranscript: (text: string) => void
  disabled?: boolean
  saathiColor?: string
  isLegalTheme?: boolean
}

export function VoiceInput({
  onTranscript,
  disabled,
  saathiColor = '#C9993A',
  isLegalTheme = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const [language, setLanguage] = useState('hi-IN')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const LANGUAGES = [
    { code: 'hi-IN', label: 'हिं' },
    { code: 'en-IN', label: 'EN' },
    { code: 'gu-IN', label: 'ગુ' },
    { code: 'mr-IN', label: 'म' },
    { code: 'ta-IN', label: 'த' },
    { code: 'te-IN', label: 'తె' },
    { code: 'kn-IN', label: 'ಕ' },
    { code: 'bn-IN', label: 'বাং' },
  ]

  // Theme tokens
  const selectBg     = 'var(--bg-surface)'
  const selectBorder = '1px solid var(--border-subtle)'
  const selectColor  = 'var(--text-secondary)'
  const optionBg     = 'var(--bg-surface)'
  const micIdleBg    = `${saathiColor}18`
  const micIdleBorder= `1.5px solid ${saathiColor}55`
  const micIdleColor = `${saathiColor}CC`
  const popupBg      = 'var(--bg-surface)'
  const popupBorder  = `1px solid ${saathiColor}50`
  const popupColor   = 'var(--text-primary)'
  const popupShadow  = 'var(--shadow-md)'

  function startListening() {
    const w = window as typeof window & {
      webkitSpeechRecognition?: ISpeechRecognitionConstructor
      SpeechRecognition?: ISpeechRecognitionConstructor
    }
    const SpeechRecognitionAPI =
      w.webkitSpeechRecognition ?? w.SpeechRecognition

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
      }}
    >
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Speech recognition language"
        style={{
          background: selectBg,
          border: selectBorder,
          color: selectColor,
          borderRadius: '8px',
          padding: '4px 6px',
          fontSize: '11px',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        {LANGUAGES.map((l) => (
          <option
            key={l.code}
            value={l.code}
            style={{ background: optionBg }}
          >
            {l.label}
          </option>
        ))}
      </select>

      {/* Mic button */}
      <motion.button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        animate={{
          scale: isListening ? [1, 1.1, 1] : 1,
          background: isListening ? saathiColor : micIdleBg,
        }}
        transition={{
          scale: isListening
            ? { repeat: Infinity, duration: 1 }
            : { duration: 0.2 },
        }}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: isListening
            ? `1.5px solid ${saathiColor}`
            : micIdleBorder,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isListening ? '#fff' : micIdleColor,
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

      {/* Live transcript popup */}
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
              background: popupBg,
              border: popupBorder,
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '13px',
              color: popupColor,
              maxWidth: '280px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: popupShadow,
              zIndex: 10,
            }}
          >
            <span
              style={{
                color: saathiColor,
                marginRight: '6px',
                fontSize: '10px',
              }}
            >
              ● LIVE
            </span>
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
