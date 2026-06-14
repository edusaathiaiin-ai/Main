'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMic, FiSquare } from 'react-icons/fi'

// Web Speech API types come from @types/dom-speech-recognition (global).

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
  const recognitionRef = useRef<SpeechRecognition | null>(null)

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
    const SpeechRecognitionAPI =
      window.webkitSpeechRecognition ?? window.SpeechRecognition

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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
          fontFamily: 'var(--font-body)',
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
        title={isListening ? 'Click to stop' : 'Click to speak'}
      >
        {isListening ? <FiSquare size={16} /> : <FiMic size={18} />}
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

      {/* Live transcript & Voice animation popup */}
      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              position: 'absolute',
              bottom: '52px',
              right: 0,
              background: popupBg,
              border: popupBorder,
              borderRadius: '16px',
              padding: '12px 16px',
              boxShadow: popupShadow,
              zIndex: 50,
              width: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Header with status and 5 bouncing balls */}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: saathiColor, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                {isListening ? 'Listening' : 'Speech'}
              </span>

              {/* 5 Google Voice style bouncy dots */}
              {isListening && (
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', alignItems: 'center' }}>
                  {[
                    { color: '#4285F4', delay: 0 },
                    { color: '#EA4335', delay: 0.1 },
                    { color: '#FBBC05', delay: 0.2 },
                    { color: '#34A853', delay: 0.3 },
                    { color: saathiColor || '#C9993A', delay: 0.4 },
                  ].map((dot, idx) => (
                    <motion.div
                      key={idx}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: dot.color,
                        boxShadow: `0 0 4px ${dot.color}aa`,
                      }}
                      animate={{
                        y: [-3, 3, -3],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: dot.delay,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Transcript text content */}
            <div
              style={{
                fontSize: '13px',
                lineHeight: '1.5',
                color: transcript ? popupColor : 'var(--text-tertiary)',
                wordBreak: 'break-word',
                maxHeight: '100px',
                overflowY: 'auto',
                fontStyle: transcript ? 'normal' : 'italic',
              }}
            >
              {transcript || 'Say something...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

