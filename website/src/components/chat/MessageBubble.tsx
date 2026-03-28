'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import type { ChatMessage } from '@/types';
import { MermaidBlock } from './MermaidBlock';
import { MoleculeViewer } from './MoleculeViewer';
import { MindMap } from './MindMap';
import { VoiceOutput } from './VoiceOutput';
import { Molecule3DViewer } from './Molecule3DViewer';
import { MechanismViewer, type MechanismType } from './MechanismViewer';
import { AnatomyViewer, type AnatomyPart } from './AnatomyViewer';
import { CircuitSimulator, type CircuitType } from './CircuitSimulator';

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
  | { type: 'circuit'; name: string };

// ─── Sequential segment parser ────────────────────────────────────────────────

type MatchCandidate = {
  index: number;
  length: number;
  segment: Segment;
};

function parseMessageContent(text: string): Segment[] {
  const result: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: MatchCandidate | null = null;
    const currentIndex = (): number => earliest?.index ?? Infinity;

    // 1. Block math $$...$$
    const blockMath = /\$\$([\s\S]+?)\$\$/.exec(remaining);
    if (blockMath && blockMath.index < currentIndex()) {
      earliest = {
        index: blockMath.index,
        length: blockMath[0].length,
        segment: { type: 'block-math', content: blockMath[1].trim() },
      };
    }

    // 2. Mermaid ```mermaid ... ```
    const mermaid = /```mermaid\n([\s\S]+?)```/.exec(remaining);
    if (mermaid && mermaid.index < currentIndex()) {
      earliest = {
        index: mermaid.index,
        length: mermaid[0].length,
        segment: { type: 'mermaid', content: mermaid[1].trim() },
      };
    }

    // 3. Generic code block ```lang ... ```
    const codeBlock = /```(\w+)?\n([\s\S]+?)```/.exec(remaining);
    if (codeBlock && codeBlock.index < currentIndex()) {
      earliest = {
        index: codeBlock.index,
        length: codeBlock[0].length,
        segment: {
          type: 'code',
          language: codeBlock[1] ?? 'text',
          content: codeBlock[2],
        },
      };
    }

    // 4. Molecule tag [MOLECULE: name]
    const molecule = /\[MOLECULE:\s*([^\]]+)\]/.exec(remaining);
    if (molecule && molecule.index < currentIndex()) {
      earliest = {
        index: molecule.index,
        length: molecule[0].length,
        segment: { type: 'molecule', name: molecule[1].trim() },
      };
    }

    // 4b. Mind map tag [MINDMAP]...[/MINDMAP]
    const mindmap = /\[MINDMAP\]([\s\S]+?)\[\/MINDMAP\]/.exec(remaining);
    if (mindmap && mindmap.index < currentIndex()) {
      earliest = {
        index: mindmap.index,
        length: mindmap[0].length,
        segment: { type: 'mindmap', content: mindmap[1].trim() },
      };
    }

    // 4c. Molecule 3D tag [MOLECULE3D: name]
    const mol3d = /\[MOLECULE3D:\s*([^\]]+)\]/i.exec(remaining);
    if (mol3d && mol3d.index < currentIndex()) {
      earliest = {
        index: mol3d.index,
        length: mol3d[0].length,
        segment: { type: 'molecule3d' as const, name: mol3d[1].trim() },
      };
    }

    // 4d. Mechanism tag [MECHANISM: name]
    const mechMatch = /\[MECHANISM:\s*([^\]]+)\]/i.exec(remaining);
    if (mechMatch && mechMatch.index < currentIndex()) {
      earliest = {
        index: mechMatch.index,
        length: mechMatch[0].length,
        segment: { type: 'mechanism' as const, name: mechMatch[1].trim() },
      };
    }

    // 4e. Anatomy tag [ANATOMY: name]
    const anatomyMatch = /\[ANATOMY:\s*([^\]]+)\]/i.exec(remaining);
    if (anatomyMatch && anatomyMatch.index < currentIndex()) {
      earliest = {
        index: anatomyMatch.index,
        length: anatomyMatch[0].length,
        segment: { type: 'anatomy' as const, name: anatomyMatch[1].trim() },
      };
    }

    // 4f. Circuit tag [CIRCUIT: name]
    const circuitMatch = /\[CIRCUIT:\s*([^\]]+)\]/i.exec(remaining);
    if (circuitMatch && circuitMatch.index < currentIndex()) {
      earliest = {
        index: circuitMatch.index,
        length: circuitMatch[0].length,
        segment: { type: 'circuit' as const, name: circuitMatch[1].trim() },
      };
    }

    // 5. Inline math $...$ (guard against $$)
    const inlineMath = /(?<!\$)\$([^$\n]+?)\$(?!\$)/.exec(remaining);
    if (inlineMath && inlineMath.index < currentIndex()) {
      earliest = {
        index: inlineMath.index,
        length: inlineMath[0].length,
        segment: { type: 'inline-math', content: inlineMath[1] },
      };
    }

    if (!earliest) {
      // No more patterns — rest is plain text
      if (remaining.length > 0) {
        result.push({ type: 'text', content: remaining });
      }
      break;
    }

    // Plain text before this match
    if (earliest.index > 0) {
      result.push({ type: 'text', content: remaining.slice(0, earliest.index) });
    }

    result.push(earliest.segment);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return result;
}

// ─── Segment renderer ─────────────────────────────────────────────────────────

function RenderSegments({ segments, primaryColor }: { segments: Segment[]; primaryColor: string }) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'text':
            return (
              <span
                key={i}
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
              >
                {seg.content}
              </span>
            );

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
            );

          case 'inline-math':
            return <InlineMath key={i} math={seg.content} />;

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
            );

          case 'mermaid':
            return <MermaidBlock key={i} chart={seg.content} />;

          case 'molecule':
            return <MoleculeViewer key={i} name={seg.name} />;

          case 'mindmap':
            return <MindMap key={i} markdown={seg.content} />;

          case 'molecule3d':
            return <Molecule3DViewer key={i} molecule={seg.name} saathiColor={primaryColor} />;

          case 'mechanism':
            return <MechanismViewer key={i} mechanism={seg.name as MechanismType} saathiColor={primaryColor} />;

          case 'anatomy':
            return <AnatomyViewer key={i} part={seg.name as AnatomyPart} saathiColor={primaryColor} />;

          case 'circuit':
            return <CircuitSimulator key={i} circuit={seg.name as CircuitType} saathiColor={primaryColor} />;

          default:
            return null;
        }
      })}
    </>
  );
}

// ─── MessageBubble component ──────────────────────────────────────────────────

type Props = {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingText?: string;
  botName?: string;
  showBotLabel?: boolean;
  onFlag?: (messageId: string) => void;
  primaryColor?: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 ml-0.5 rounded-sm align-middle"
      style={{ background: 'rgba(255,255,255,0.6)' }}
      animate={{ opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
    />
  );
}

function ThreeDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.5)' }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({
  message,
  isStreaming,
  streamingText,
  botName,
  showBotLabel,
  onFlag,
  primaryColor = '#C9993A',
}: Props) {
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === 'user';

  const displayText = isStreaming && !isUser ? (streamingText ?? '') : message.content;
  const isEmpty = !displayText && isStreaming;

  // Parse rich segments only for non-streaming assistant messages
  const segments = (!isStreaming && !isUser)
    ? parseMessageContent(message.content)
    : null;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1 mb-3`}>
      {/* Bot label */}
      {!isUser && showBotLabel && botName && (
        <span className="text-[11px] font-medium ml-1 mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {botName}
        </span>
      )}

      <div
        className="relative group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-3 text-[15px] leading-relaxed break-words"
          style={
            isUser
              ? {
                  background: 'var(--user-bubble-bg, var(--accent, #C9993A))',
                  color: 'var(--user-bubble-text, #060F1D)',
                  borderRadius: '18px 18px 4px 18px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontWeight: 500,
                  maxWidth: '70%',
                }
              : {
                  background: 'var(--bg-message, #0F2847)',
                  color: 'var(--text-primary, #fff)',
                  borderRadius: '4px 18px 18px 18px',
                  fontFamily: 'var(--font-dm-sans)',
                  maxWidth: '75%',
                  border: '0.5px solid var(--border, rgba(255,255,255,0.07))',
                  transition: 'background 0.4s ease, border-color 0.3s ease',
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

        {/* Flag button */}
        {!isUser && !isStreaming && onFlag && hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onFlag(message.id)}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)' }}
            title="Flag this message"
          >
            🚩
          </motion.button>
        )}
      </div>

      {/* Timestamp + Voice output for assistant messages */}
      {!isStreaming && (
        <div className="flex items-center gap-2 mx-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted, rgba(255,255,255,0.2))' }}>
            {formatTime(message.createdAt)}
          </span>
          {!isUser && message.content && (
            <VoiceOutput text={message.content} saathiColor={primaryColor} />
          )}
        </div>
      )}
    </div>
  );
}
