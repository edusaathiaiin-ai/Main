'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFontStore, getChatFontStyle } from '@/stores/fontStore'
import 'katex/dist/katex.min.css'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { InlineMath, BlockMath } from 'react-katex'
import type { ChatMessage } from '@/types'
import { MermaidBlock } from './MermaidBlock'
import { MoleculeViewer } from './MoleculeViewer'
import { MindMap } from './MindMap'
import { VoiceOutput } from './VoiceOutput'
import { Molecule3DViewer } from './Molecule3DViewer'
import { MechanismViewer, type MechanismType } from './MechanismViewer'
import { AnatomyViewer, type AnatomyPart } from './AnatomyViewer'
import { CircuitSimulator, type CircuitType } from './CircuitSimulator'
import { ArchModel3D } from './ArchModel3D'
import { ArchTimeline } from './ArchTimeline'
import { GoldenRatioTool } from './GoldenRatioTool'
import { FloorPlanViewer, type FloorPlanData } from './FloorPlanViewer'
import { Scene360Viewer } from './Scene360Viewer'
import { SketchResult } from './SketchResult'
import { ReportErrorButton } from './ReportErrorButton'

// ─── Segment types ────────────────────────────────────────────────────────────

type Segment =
  | { type: 'text'; content: string }
  | { type: 'block-math'; content: string }
  | { type: 'inline-math'; content: string }
  | { type: 'mermaid'; content: string }
  | { type: 'molecule'; name: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'mindmap'; content: string }
  | { type: 'molecule3d'; name: string }
  | { type: 'mechanism'; name: string }
  | { type: 'anatomy'; name: string }
  | { type: 'circuit'; name: string }
  | { type: 'archmodel'; name: string }
  | { type: 'floorplan'; content: string }
  | { type: 'arch_timeline' }
  | { type: 'golden_ratio'; width: number; height: number }
  | { type: 'scene360'; name: string }
  | { type: 'sketch'; content: string }

// ─── Sequential segment parser ────────────────────────────────────────────────

type MatchCandidate = {
  index: number
  length: number
  segment: Segment
}

function parseMessageContent(text: string): Segment[] {
  const result: Segment[] = []
  let remaining = text

  while (remaining.length > 0) {
    let earliest: MatchCandidate | null = null
    const currentIndex = (): number => earliest?.index ?? Infinity

    // 1. Block math $$...$$
    const blockMath = /\$\$([\s\S]+?)\$\$/.exec(remaining)
    if (blockMath && blockMath.index < currentIndex()) {
      earliest = {
        index: blockMath.index,
        length: blockMath[0].length,
        segment: { type: 'block-math', content: blockMath[1].trim() },
      }
    }

    // 2. Mermaid ```mermaid ... ```
    const mermaid = /```mermaid\n([\s\S]+?)```/.exec(remaining)
    if (mermaid && mermaid.index < currentIndex()) {
      earliest = {
        index: mermaid.index,
        length: mermaid[0].length,
        segment: { type: 'mermaid', content: mermaid[1].trim() },
      }
    }

    // 3. Generic code block ```lang ... ```
    const codeBlock = /```(\w+)?\n([\s\S]+?)```/.exec(remaining)
    if (codeBlock && codeBlock.index < currentIndex()) {
      earliest = {
        index: codeBlock.index,
        length: codeBlock[0].length,
        segment: {
          type: 'code',
          language: codeBlock[1] ?? 'text',
          content: codeBlock[2],
        },
      }
    }

    // 4. Molecule tag [MOLECULE: name]
    const molecule = /\[MOLECULE:\s*([^\]]+)\]/.exec(remaining)
    if (molecule && molecule.index < currentIndex()) {
      earliest = {
        index: molecule.index,
        length: molecule[0].length,
        segment: { type: 'molecule', name: molecule[1].trim() },
      }
    }

    // 4b. Mind map tag [MINDMAP]...[/MINDMAP]
    const mindmap = /\[MINDMAP\]([\s\S]+?)\[\/MINDMAP\]/.exec(remaining)
    if (mindmap && mindmap.index < currentIndex()) {
      earliest = {
        index: mindmap.index,
        length: mindmap[0].length,
        segment: { type: 'mindmap', content: mindmap[1].trim() },
      }
    }

    // 4c. Molecule 3D tag [MOLECULE3D: name]
    const mol3d = /\[MOLECULE3D:\s*([^\]]+)\]/i.exec(remaining)
    if (mol3d && mol3d.index < currentIndex()) {
      earliest = {
        index: mol3d.index,
        length: mol3d[0].length,
        segment: { type: 'molecule3d' as const, name: mol3d[1].trim() },
      }
    }

    // 4d. Mechanism tag [MECHANISM: name]
    const mechMatch = /\[MECHANISM:\s*([^\]]+)\]/i.exec(remaining)
    if (mechMatch && mechMatch.index < currentIndex()) {
      earliest = {
        index: mechMatch.index,
        length: mechMatch[0].length,
        segment: { type: 'mechanism' as const, name: mechMatch[1].trim() },
      }
    }

    // 4e. Anatomy tag [ANATOMY: name]
    const anatomyMatch = /\[ANATOMY:\s*([^\]]+)\]/i.exec(remaining)
    if (anatomyMatch && anatomyMatch.index < currentIndex()) {
      earliest = {
        index: anatomyMatch.index,
        length: anatomyMatch[0].length,
        segment: { type: 'anatomy' as const, name: anatomyMatch[1].trim() },
      }
    }

    // 4f. Circuit tag [CIRCUIT: name]
    const circuitMatch = /\[CIRCUIT:\s*([^\]]+)\]/i.exec(remaining)
    if (circuitMatch && circuitMatch.index < currentIndex()) {
      earliest = {
        index: circuitMatch.index,
        length: circuitMatch[0].length,
        segment: { type: 'circuit' as const, name: circuitMatch[1].trim() },
      }
    }

    // 4g. ArchModel tag [ARCHMODEL: name]
    const archModel = /\[ARCHMODEL:\s*([^\]]+)\]/i.exec(remaining)
    if (archModel && archModel.index < currentIndex()) {
      earliest = {
        index: archModel.index,
        length: archModel[0].length,
        segment: { type: 'archmodel' as const, name: archModel[1].trim() },
      }
    }

    // 4h. FloorPlan tag [FLOORPLAN]...[/FLOORPLAN]
    const floorPlan = /\[FLOORPLAN\]([\s\S]+?)\[\/FLOORPLAN\]/i.exec(remaining)
    if (floorPlan && floorPlan.index < currentIndex()) {
      earliest = {
        index: floorPlan.index,
        length: floorPlan[0].length,
        segment: { type: 'floorplan' as const, content: floorPlan[1] },
      }
    }

    // 4i. Arch Timeline tag [ARCH_TIMELINE]
    const archTimeline = /\[ARCH_TIMELINE\]/i.exec(remaining)
    if (archTimeline && archTimeline.index < currentIndex()) {
      earliest = {
        index: archTimeline.index,
        length: archTimeline[0].length,
        segment: { type: 'arch_timeline' as const },
      }
    }

    // 4l. Sketch tag [SKETCH]...[/SKETCH]
    const sketch = /\[SKETCH\]([\s\S]+?)\[\/SKETCH\]/i.exec(remaining)
    if (sketch && sketch.index < currentIndex()) {
      earliest = {
        index: sketch.index,
        length: sketch[0].length,
        segment: { type: 'sketch' as const, content: sketch[1].trim() },
      }
    }

    // 4k. Scene360 tag [SCENE360: name]
    const scene360 = /\[SCENE360:\s*([^\]]+)\]/i.exec(remaining)
    if (scene360 && scene360.index < currentIndex()) {
      earliest = {
        index: scene360.index,
        length: scene360[0].length,
        segment: { type: 'scene360' as const, name: scene360[1].trim() },
      }
    }

    // 4j. Golden Ratio tag [GOLDEN_RATIO: width=N height=N]
    const goldenRatio =
      /\[GOLDEN_RATIO:\s*width=(\d+(?:\.\d+)?)\s+height=(\d+(?:\.\d+)?)\]/i.exec(
        remaining
      )
    if (goldenRatio && goldenRatio.index < currentIndex()) {
      earliest = {
        index: goldenRatio.index,
        length: goldenRatio[0].length,
        segment: {
          type: 'golden_ratio' as const,
          width: parseFloat(goldenRatio[1]),
          height: parseFloat(goldenRatio[2]),
        },
      }
    }

    // 5. Inline math $...$ (guard against $$)
    const inlineMath = /(?<!\$)\$([^$\n]+?)\$(?!\$)/.exec(remaining)
    if (inlineMath && inlineMath.index < currentIndex()) {
      earliest = {
        index: inlineMath.index,
        length: inlineMath[0].length,
        segment: { type: 'inline-math', content: inlineMath[1] },
      }
    }

    if (!earliest) {
      // No more patterns — rest is plain text
      if (remaining.length > 0) {
        result.push({ type: 'text', content: remaining })
      }
      break
    }

    // Plain text before this match
    if (earliest.index > 0) {
      result.push({ type: 'text', content: remaining.slice(0, earliest.index) })
    }

    result.push(earliest.segment)
    remaining = remaining.slice(earliest.index + earliest.length)
  }

  return result
}

// ─── Segment renderer ─────────────────────────────────────────────────────────

function SketchResultWrapper({ content, saathiColor }: { content: string; saathiColor: string }) {
  const saathiId = useChatStore((s) => s.activeSaathiId) ?? ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = JSON.parse(content)
    // Inject saathiId if not present
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!data.saathi) data.saathi = saathiId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return <SketchResult data={data} saathiColor={saathiColor} />
  } catch {
    return null
  }
}

function Scene360ViewerWrapper({ scene, saathiColor }: { scene: string; saathiColor: string }) {
  const saathiId = useChatStore((s) => s.activeSaathiId) ?? undefined
  return <Scene360Viewer scene={scene} saathiId={saathiId} saathiColor={saathiColor} />
}

function RenderSegments({
  segments,
  primaryColor,
}: {
  segments: Segment[]
  primaryColor: string
}) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'text':
            return (
              <span key={i} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {seg.content}
              </span>
            )

          case 'block-math':
            return (
              <div
                key={i}
                style={{
                  margin: '12px 0',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  overflowX: 'auto',
                }}
              >
                <BlockMath math={seg.content} />
              </div>
            )

          case 'inline-math':
            return <InlineMath key={i} math={seg.content} />

          case 'code':
            return (
              <div
                key={i}
                style={{
                  margin: '12px 0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                }}
              >
                {seg.language && seg.language !== 'text' && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '4px 12px',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.4)',
                      borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {seg.language}
                  </div>
                )}
                <pre
                  style={{
                    margin: 0,
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#E5E7EB',
                    fontSize: '13px',
                    overflowX: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  <code>{seg.content}</code>
                </pre>
              </div>
            )

          case 'mermaid':
            return <MermaidBlock key={i} chart={seg.content} />

          case 'molecule':
            return <MoleculeViewer key={i} name={seg.name} />

          case 'mindmap':
            return <MindMap key={i} markdown={seg.content} />

          case 'molecule3d':
            return (
              <Molecule3DViewer
                key={i}
                molecule={seg.name}
                saathiColor={primaryColor}
              />
            )

          case 'mechanism':
            return (
              <MechanismViewer
                key={i}
                mechanism={seg.name as MechanismType}
                saathiColor={primaryColor}
              />
            )

          case 'anatomy':
            return (
              <AnatomyViewer
                key={i}
                part={seg.name as AnatomyPart}
                saathiColor={primaryColor}
              />
            )

          case 'circuit':
            return (
              <CircuitSimulator
                key={i}
                circuit={seg.name as CircuitType}
                saathiColor={primaryColor}
              />
            )

          case 'archmodel':
            return (
              <ArchModel3D
                key={i}
                building={seg.name}
                saathiColor={primaryColor}
              />
            )

          case 'sketch':
            return <SketchResultWrapper key={i} content={seg.content} saathiColor={primaryColor} />

          case 'scene360':
            return <Scene360ViewerWrapper key={i} scene={seg.name} saathiColor={primaryColor} />

          case 'arch_timeline':
            return <ArchTimeline key={i} saathiColor={primaryColor} />

          case 'golden_ratio':
            return (
              <GoldenRatioTool
                key={i}
                initialWidth={seg.width}
                initialHeight={seg.height}
                saathiColor={primaryColor}
              />
            )

          case 'floorplan': {
            // Parse simple YAML-like room data
            const rooms: FloorPlanData['rooms'] = []
            const roomRegex =
              /- name:\s*(.+?)\n\s*x:\s*(\d+(?:\.\d+)?),\s*y:\s*(\d+(?:\.\d+)?)\n\s*width:\s*(\d+(?:\.\d+)?),\s*height:\s*(\d+(?:\.\d+)?)(?:\n\s*color:\s*(\w+))?/g
            let match: RegExpExecArray | null
            while ((match = roomRegex.exec(seg.content)) !== null) {
              rooms.push({
                name: match[1].trim(),
                x: parseFloat(match[2]),
                y: parseFloat(match[3]),
                width: parseFloat(match[4]),
                height: parseFloat(match[5]),
                color: match[6]?.trim(),
              })
            }
            const scaleMatch = /scale:\s*(\S+)/.exec(seg.content)
            const titleMatch = /title:\s*(.+)/.exec(seg.content)
            const fpData: FloorPlanData = {
              rooms,
              scale: scaleMatch?.[1],
              title: titleMatch?.[1]?.trim(),
            }
            return rooms.length > 0 ? (
              <FloorPlanViewer
                key={i}
                data={fpData}
                saathiColor={primaryColor}
              />
            ) : (
              <div
                key={i}
                style={{
                  margin: '12px 0',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  overflowX: 'auto',
                }}
              >
                <pre>
                  <code>{seg.content}</code>
                </pre>
              </div>
            )
          }

          default:
            return null
        }
      })}
    </>
  )
}

// ─── Save Flashcard inline modal ─────────────────────────────────────────────

function SaveFlashcardMini({
  defaultFront,
  defaultBack,
  primaryColor,
  onClose,
}: {
  defaultFront: string
  defaultBack: string
  primaryColor: string
  onClose: () => void
}) {
  const [front, setFront] = useState(defaultFront.slice(0, 200))
  const [back, setBack] = useState(defaultBack.slice(0, 400))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saathiId = useChatStore((s) => s.activeSaathiId) ?? 'kanoonsaathi'
  const userId = useAuthStore((s) => s.profile?.id)

  const save = useCallback(async () => {
    if (!front.trim() || !back.trim() || !userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('flashcards').insert({
        user_id: userId,
        vertical_id: saathiId,
        front: front.trim(),
        back: back.trim(),
      })

      // Award flashcard points (fire-and-forget)
      const profile = useAuthStore.getState().profile
      void supabase.rpc('award_saathi_points', {
        p_user_id:     userId,
        p_action_type: 'flashcard_saved',
        p_base_points: 5,
        p_plan_id:     profile?.plan_id ?? 'free',
        p_metadata:    { saathi_id: saathiId },
      })

      setSaved(true)
      setTimeout(onClose, 1200)
    } finally {
      setSaving(false)
    }
  }, [front, back, userId, saathiId, onClose])

  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          marginTop: '8px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(34,197,94,0.1)',
          border: '0.5px solid rgba(34,197,94,0.3)',
          fontSize: '12px',
          color: '#4ADE80',
          fontWeight: 600,
        }}
      >
        🃏 Flashcard saved!
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{ overflow: 'hidden', marginTop: '8px' }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.3)',
          border: `0.5px solid ${primaryColor}30`,
        }}
      >
        <p
          style={{
            fontSize: '10px',
            color: primaryColor,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          🃏 Save as Flashcard
        </p>
        <div style={{ marginBottom: '8px' }}>
          <label
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.35)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Front (question)
          </label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: '#fff',
              fontSize: '12px',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.35)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Back (answer)
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: '#fff',
              fontSize: '12px',
              lineHeight: 1.5,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => void save()}
            disabled={saving || !front.trim() || !back.trim()}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              background: primaryColor,
              border: 'none',
              color: '#060F1D',
              fontSize: '12px',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── MessageBubble component ──────────────────────────────────────────────────

type Props = {
  message: ChatMessage
  isStreaming?: boolean
  streamingText?: string
  botName?: string
  showBotLabel?: boolean
  onFlag?: (messageId: string) => void
  primaryColor?: string
  isLegalTheme?: boolean
  // For factual error reporting
  verticalId?: string
  verticalSlug?: string
  verticalName?: string
  botSlot?: number
  sessionId?: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function TypingCursor() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-4 w-0.5 rounded-sm align-middle"
      style={{ background: 'rgba(255,255,255,0.6)' }}
      animate={{ opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
    />
  )
}

function ThreeDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.5)' }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
        />
      ))}
    </span>
  )
}

export function MessageBubble({
  message,
  isStreaming,
  streamingText,
  botName,
  showBotLabel,
  onFlag,
  primaryColor = '#C9993A',
  isLegalTheme = false,
  verticalId,
  verticalSlug,
  verticalName,
  botSlot,
  sessionId,
}: Props) {
  const { fontSize, fontType, fontColor, highContrast, reduceMotion } = useFontStore()
  const [hovered, setHovered] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const isUser = message.role === 'user'

  const displayText =
    isStreaming && !isUser ? (streamingText ?? '') : message.content
  const isEmpty = !displayText && isStreaming

  // Parse rich segments only for non-streaming assistant messages
  const segments =
    !isStreaming && !isUser ? parseMessageContent(message.content) : null

  return (
    <div
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-3 gap-1`}
    >
      {/* Bot label */}
      {!isUser && showBotLabel && botName && (
        <span
          className="mb-0.5 ml-1 text-[11px] font-medium"
          style={{ color: 'var(--text-ghost)' }}
        >
          {botName}
        </span>
      )}

      <div
        className="group relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="px-4 py-3 leading-relaxed break-words"
          style={
            isUser
              ? {
                  background: 'var(--saathi-primary)',
                  color: '#FFFFFF',
                  borderRadius: '18px 18px 4px 18px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  maxWidth: '70%',
                  fontSize: '15px',
                }
              : {
                  background: 'var(--bg-surface)',
                  maxWidth: '75%',
                  borderRadius: '4px 18px 18px 18px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'background 0.4s ease, border-color 0.3s ease',
                  ...getChatFontStyle(fontSize, fontType, fontColor, true, highContrast),
                }
          }
        >
          {isEmpty ? (
            <ThreeDots />
          ) : segments ? (
            // Rich rendering for completed assistant messages
            <RenderSegments segments={segments} primaryColor={primaryColor} />
          ) : (
            // Streaming or user messages — plain text
            <>
              <span className="whitespace-pre-wrap">{displayText}</span>
              {isStreaming && !isUser && <TypingCursor />}
            </>
          )}
        </motion.div>

        {/* Save flashcard + Flag buttons */}
        {!isUser && !isStreaming && hovered && (
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              display: 'flex',
              gap: '4px',
            }}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowSave((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs message-action-btn"
              style={{
                background: showSave ? 'var(--saathi-light)' : 'var(--bg-elevated)',
                border: '1px solid var(--saathi-border)',
              }}
              title="Save as flashcard"
              aria-label="Save as flashcard"
            >
              🃏
            </motion.button>
            {onFlag && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onFlag(message.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs message-action-btn"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '0.5px solid rgba(239,68,68,0.3)',
                }}
                title="Flag this message"
                aria-label="Flag this message"
              >
                🚩
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp + Voice output for assistant messages */}
      {!isStreaming && (
        <div className="mx-1 flex items-center gap-2">
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-ghost)' }}
          >
            {formatTime(message.createdAt)}
          </span>
          {!isUser && message.content && (
            <VoiceOutput text={message.content} saathiColor={primaryColor} />
          )}
        </div>
      )}

      {/* Factual error report button — assistant messages only, after streaming completes */}
      {!isUser && !isStreaming && verticalId && verticalSlug && verticalName && botSlot !== undefined && (
        <div style={{ marginTop: '2px' }}>
          <ReportErrorButton
            verticalId={verticalId}
            verticalSlug={verticalSlug}
            verticalName={verticalName}
            botSlot={botSlot}
            sessionId={sessionId}
            messageExcerpt={message.content.slice(0, 500)}
            isLegalTheme={isLegalTheme}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* Inline flashcard save panel */}
      <AnimatePresence>
        {!isUser && !isStreaming && showSave && (
          <SaveFlashcardMini
            defaultFront=""
            defaultBack={message.content.slice(0, 400)}
            primaryColor={primaryColor}
            onClose={() => setShowSave(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
