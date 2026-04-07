'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useFontStore } from '@/stores/fontStore'
import { useChatStore } from '@/stores/chatStore'

type Props = {
  text: string
  saathiColor?: string
  isLegalTheme?: boolean
}

// ─── Ambient audio map — Saathi slug → public asset path ─────────────────────
// Files must exist at /public/audio/ambient/<name>.mp3
// If the file is missing, fetch fails silently and no ambient plays.

const SAATHI_AMBIENT: Record<string, string> = {
  biosaathi:       '/audio/ambient/ocean.mp3',
  envirosaathi:    '/audio/ambient/forest.mp3',
  mechsaathi:      '/audio/ambient/workshop.mp3',
  elecsaathi:      '/audio/ambient/electricity.mp3',
  chemsaathi:      '/audio/ambient/lab.mp3',
  compsaathi:      '/audio/ambient/keyboard.mp3',
  maathsaathi:     '/audio/ambient/library.mp3',
  historysaathi:   '/audio/ambient/library.mp3',
  kanoonsaathi:    '/audio/ambient/library.mp3',
  econsaathi:      '/audio/ambient/cafe.mp3',
  bizsaathi:       '/audio/ambient/cafe.mp3',
  psychsaathi:     '/audio/ambient/rain.mp3',
  medicosaathi:    '/audio/ambient/hospital.mp3',
  nursingsaathi:   '/audio/ambient/hospital.mp3',
  pharmasaathi:    '/audio/ambient/lab.mp3',
  civilsaathi:     '/audio/ambient/construction.mp3',
  archsaathi:      '/audio/ambient/wind.mp3',
  finsaathi:       '/audio/ambient/cafe.mp3',
  mktsaathi:       '/audio/ambient/city.mp3',
  hrsaathi:        '/audio/ambient/office.mp3',
}

const AMBIENT_VOLUME = 0.12   // subtle — voice always dominant

// ─── Strip markdown and special tags before speaking ─────────────────────────

function cleanForSpeech(raw: string): string {
  return raw
    .replace(/\$\$[\s\S]+?\$\$/g, ', math expression, ')
    .replace(/\$[^$\n]+?\$/g, ', math expression, ')
    .replace(/```[\s\S]+?```/g, ', code block, ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[MOLECULE[^\]]*\]/gi, '')
    .replace(/\[MOLECULE3D[^\]]*\]/gi, '')
    .replace(/\[MINDMAP\][\s\S]+?\[\/MINDMAP\]/gi, '')
    .replace(/\[MECHANISM[^\]]*\]/gi, '')
    .replace(/\[ANATOMY[^\]]*\]/gi, '')
    .replace(/\[CIRCUIT[^\]]*\]/gi, '')
    .replace(/\[ARCHMODEL[^\]]*\]/gi, '')
    .replace(/\[ARCH_TIMELINE\]/gi, '')
    .replace(/\[GOLDEN_RATIO[^\]]*\]/gi, '')
    .replace(/\[SCENE360[^\]]*\]/gi, '')
    .replace(/\[FLOORPLAN\][\s\S]+?\[\/FLOORPLAN\]/gi, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/^>\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim()
}

// ─── Script detection ─────────────────────────────────────────────────────────

function detectLang(text: string): string {
  const sample = text.slice(0, 300)
  if (/[\u0A80-\u0AFF]/.test(sample)) return 'gu-IN'
  if (/[\u0900-\u097F]/.test(sample)) return 'hi-IN'
  if (/[\u0B80-\u0BFF]/.test(sample)) return 'ta-IN'
  if (/[\u0C00-\u0C7F]/.test(sample)) return 'te-IN'
  if (/[\u0C80-\u0CFF]/.test(sample)) return 'kn-IN'
  if (/[\u0980-\u09FF]/.test(sample)) return 'bn-IN'
  return 'en-IN'
}

// ─── Voice preference ─────────────────────────────────────────────────────────

function getPreferredVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) ??
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  )
}

// ─── Ambient audio engine ─────────────────────────────────────────────────────

class AmbientEngine {
  private ctx: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private buffer: AudioBuffer | null = null
  private loadedFor: string | null = null

  async load(url: string): Promise<void> {
    if (this.loadedFor === url) return   // already loaded
    try {
      const res = await fetch(url)
      if (!res.ok) return               // file not found — silent fail
      const arrayBuffer = await res.arrayBuffer()
      if (!this.ctx) this.ctx = new AudioContext()
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer)
      this.loadedFor = url
    } catch {
      // Network error or decode failure — no ambient, no crash
    }
  }

  play(): void {
    if (!this.ctx || !this.buffer) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    // Fade-in gain node
    this.gain = this.ctx.createGain()
    this.gain.gain.setValueAtTime(0, this.ctx.currentTime)
    this.gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, this.ctx.currentTime + 1.5)
    this.gain.connect(this.ctx.destination)

    this.source = this.ctx.createBufferSource()
    this.source.buffer = this.buffer
    this.source.loop = true
    this.source.connect(this.gain)
    this.source.start()
  }

  stop(): void {
    if (!this.gain || !this.ctx) return
    const stopAt = this.ctx.currentTime + 1.0
    this.gain.gain.linearRampToValueAtTime(0, stopAt)
    this.source?.stop(stopAt)
    this.source = null
    this.gain = null
  }

  destroy(): void {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
    this.buffer = null
    this.loadedFor = null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VoiceOutput({
  text,
  saathiColor = '#C9993A',
  isLegalTheme = false,
}: Props) {
  const [speaking, setSpeaking] = useState(false)
  const { reduceMotion } = useFontStore()
  const saathiId = useChatStore((s) => s.activeSaathiId) ?? ''
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const ambientRef = useRef<AmbientEngine | null>(null)

  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  // Init ambient engine once
  useEffect(() => {
    ambientRef.current = new AmbientEngine()
    return () => {
      ambientRef.current?.destroy()
    }
  }, [])

  // Pre-load ambient for active Saathi when component mounts
  useEffect(() => {
    const url = SAATHI_AMBIENT[saathiId]
    if (url && ambientRef.current) {
      void ambientRef.current.load(url)
    }
  }, [saathiId])

  // Cancel TTS on unmount
  useEffect(() => {
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel()
        ambientRef.current?.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function speak() {
    const cleaned = cleanForSpeech(text)
    if (!cleaned) return

    const lang = detectLang(cleaned)
    const utterance = new SpeechSynthesisUtterance(cleaned)
    utteranceRef.current = utterance
    utterance.lang = lang
    utterance.rate = 0.9
    utterance.pitch = 1.0

    utterance.onstart = () => {
      setSpeaking(true)
      ambientRef.current?.play()
    }
    utterance.onend = () => {
      setSpeaking(false)
      ambientRef.current?.stop()
    }
    utterance.onerror = () => {
      setSpeaking(false)
      ambientRef.current?.stop()
    }

    const doSpeak = () => {
      const voice = getPreferredVoice(lang)
      if (voice) utterance.voice = voice
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
    } else {
      doSpeak()
    }
  }

  function stop() {
    window.speechSynthesis.cancel()
    ambientRef.current?.stop()
    setSpeaking(false)
  }

  function handleToggle() {
    if (!supported) return
    speaking ? stop() : speak()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  if (!supported) return null

  const idleColor = isLegalTheme
    ? 'rgba(0,0,0,0.2)'
    : 'rgba(255,255,255,0.22)'

  return (
    <button
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      title={speaking ? 'Stop reading' : 'Read aloud'}
      aria-label={speaking ? 'Stop reading aloud' : 'Read message aloud'}
      aria-pressed={speaking}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        lineHeight: 1,
      }}
    >
      {speaking ? (
        <motion.span
          style={{ fontSize: '13px', color: saathiColor, display: 'block' }}
          animate={reduceMotion ? {} : { opacity: [1, 0.35, 1] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          ⏹
        </motion.span>
      ) : (
        <span
          style={{
            fontSize: '13px',
            color: idleColor,
            display: 'block',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = saathiColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = idleColor)}
          onFocus={(e) => (e.currentTarget.style.color = saathiColor)}
          onBlur={(e) => (e.currentTarget.style.color = idleColor)}
          aria-hidden="true"
        >
          🔊
        </span>
      )}
    </button>
  )
}
