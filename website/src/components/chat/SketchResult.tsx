'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MechanismViewer, type MechanismType } from './MechanismViewer'
import { CircuitSimulator, type CircuitType } from './CircuitSimulator'
import { FloorPlanViewer, type FloorPlanData } from './FloorPlanViewer'
import { MermaidBlock } from './MermaidBlock'

// ─── Sketch result types ──────────────────────────────────────────────────────

type MechComponent = {
  type: 'gear' | 'pulley' | 'belt' | 'chain' | 'lever' | 'spring' | 'bearing' | 'shaft' | 'crank' | 'cam'
  teeth?: number
  radius?: number
  position?: string
  label?: string
}

type ElecComponent = {
  type: string
  value?: string
  position?: string
  label?: string
}

type Room = {
  name: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

type SketchData =
  | {
      saathi: 'mechsaathi'
      mechanism_type: string
      components: MechComponent[]
      equations: string[]
      description: string
      mermaid?: string
    }
  | {
      saathi: 'archsaathi'
      drawing_type: string
      rooms: Room[]
      structural_elements?: string[]
      description: string
      scale?: string
      title?: string
    }
  | {
      saathi: 'elecsaathi' | 'electronicssaathi'
      circuit_type: string
      components: ElecComponent[]
      connections: string[]
      equations: string[]
      description: string
      circuit_name?: string
    }
  | {
      saathi: string
      description: string
      mermaid?: string
      equations?: string[]
    }

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  data:          SketchData
  saathiColor?:  string
  isLegalTheme?: boolean
}

// ─── Equation display ─────────────────────────────────────────────────────────

function EquationList({
  equations,
  saathiColor,
  isLegalTheme,
}: {
  equations: string[]
  saathiColor: string
  isLegalTheme: boolean
}) {
  if (!equations.length) return null
  return (
    <div style={{
      marginTop:    '12px',
      padding:      '12px 14px',
      borderRadius: '10px',
      background:   isLegalTheme ? '#F5F5F5' : 'var(--bg-elevated)',
      border:       isLegalTheme ? '1px solid #E8E8E8' : '0.5px solid var(--bg-elevated)',
    }}>
      <p style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: saathiColor, margin: '0 0 8px',
      }}>
        Key Equations
      </p>
      {equations.map((eq, i) => (
        <p key={i} style={{
          fontSize: '12px', fontFamily: 'Georgia, serif', fontStyle: 'italic',
          color: isLegalTheme ? '#333333' : 'var(--text-secondary)',
          margin: i < equations.length - 1 ? '0 0 5px' : 0, lineHeight: 1.5,
        }}>
          {eq}
        </p>
      ))}
    </div>
  )
}

// ─── Component badges ─────────────────────────────────────────────────────────

function ComponentBadges({
  components,
  saathiColor,
  isLegalTheme,
}: {
  components: Array<{ type: string; value?: string; label?: string; teeth?: number; radius?: number }>
  saathiColor: string
  isLegalTheme: boolean
}) {
  if (!components.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
      {components.map((c, i) => (
        <span key={i} style={{
          fontSize: '10px', fontWeight: 600,
          color: saathiColor,
          background: `${saathiColor}12`,
          border: `0.5px solid ${saathiColor}30`,
          borderRadius: '5px', padding: '3px 8px',
        }}>
          {c.label ?? c.type}
          {c.teeth  ? ` (${c.teeth}T)` : ''}
          {c.radius ? ` (r=${c.radius})` : ''}
          {c.value  ? ` ${c.value}` : ''}
        </span>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SketchResult({
  data,
  saathiColor = '#C9993A',
  isLegalTheme = false,
}: Props) {
  const [showRaw, setShowRaw] = useState(false)

  const borderColor = isLegalTheme ? '#E0E0E0'   : `${saathiColor}25`
  const headerBg    = isLegalTheme ? '#FAFAFA'   : `${saathiColor}08`
  const textColor   = isLegalTheme ? '#1A1A1A'   : '#FFFFFF'
  const mutedColor  = isLegalTheme ? '#666666'   : 'var(--text-secondary)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        margin: '12px 0', borderRadius: '16px', overflow: 'hidden',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px', background: headerBg,
        borderBottom: `0.5px solid ${borderColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: saathiColor }}>
            ✦ Sketch Analysis Complete
          </span>
        </div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: textColor, margin: '0 0 3px' }}>
          {data.description}
        </p>
        {'mechanism_type' in data && (
          <p style={{ fontSize: '11px', color: mutedColor, margin: 0 }}>
            Mechanism type: {data.mechanism_type.replace(/_/g, ' ')}
          </p>
        )}
        {'drawing_type' in data && (
          <p style={{ fontSize: '11px', color: mutedColor, margin: 0 }}>
            Drawing type: {(data as { drawing_type: string }).drawing_type.replace(/_/g, ' ')}
          </p>
        )}
        {'circuit_type' in data && (
          <p style={{ fontSize: '11px', color: mutedColor, margin: 0 }}>
            Circuit type: {(data as { circuit_type: string }).circuit_type.toUpperCase()}
            {'circuit_name' in data && ` — ${(data as { circuit_name?: string }).circuit_name}`}
          </p>
        )}
      </div>

      {/* Content area */}
      <div style={{ padding: '14px 16px', background: isLegalTheme ? '#FFFFFF' : 'rgba(0,0,0,0.2)' }}>

        {/* ── MechSaathi ─────────────────────────────────────────────── */}
        {data.saathi === 'mechsaathi' && 'mechanism_type' in data && (() => {
          const d = data as Extract<SketchData, { saathi: 'mechsaathi' }>
          const mechType = d.mechanism_type as MechanismType
          return (
            <>
              <ComponentBadges components={d.components} saathiColor={saathiColor} isLegalTheme={isLegalTheme} />
              <div style={{ marginTop: '12px' }}>
                {d.mermaid
                  ? <MermaidBlock chart={d.mermaid} />
                  : <MechanismViewer mechanism={mechType} saathiColor={saathiColor} />
                }
              </div>
              <EquationList equations={d.equations} saathiColor={saathiColor} isLegalTheme={isLegalTheme} />
            </>
          )
        })()}

        {/* ── ArchSaathi ─────────────────────────────────────────────── */}
        {data.saathi === 'archsaathi' && 'rooms' in data && (() => {
          const d = data as Extract<SketchData, { saathi: 'archsaathi' }>
          const fpData: FloorPlanData = {
            rooms: d.rooms,
            scale: d.scale,
            title: d.title ?? d.description,
          }
          return d.rooms.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              <FloorPlanViewer data={fpData} saathiColor={saathiColor} />
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: mutedColor, margin: 0 }}>
              No room data extracted. Try a clearer sketch with room labels and approximate dimensions.
            </p>
          )
        })()}

        {/* ── ElecSaathi ─────────────────────────────────────────────── */}
        {(data.saathi === 'elecsaathi' || data.saathi === 'electronicssaathi')
          && 'circuit_type' in data && (() => {
          const d = data as Extract<SketchData, { saathi: 'elecsaathi' | 'electronicssaathi' }>
          const circuitName = (d as { circuit_name?: string }).circuit_name ?? d.circuit_type
          return (
            <>
              <ComponentBadges components={d.components} saathiColor={saathiColor} isLegalTheme={isLegalTheme} />
              <div style={{ marginTop: '12px' }}>
                <CircuitSimulator circuit={circuitName as CircuitType} saathiColor={saathiColor} />
              </div>
              <EquationList equations={d.equations} saathiColor={saathiColor} isLegalTheme={isLegalTheme} />
            </>
          )
        })()}

        {/* ── Fallback — mermaid or plain text ───────────────────────── */}
        {!['mechsaathi', 'archsaathi', 'elecsaathi', 'electronicssaathi'].includes(data.saathi) && (
          <>
            {'mermaid' in data && data.mermaid && <MermaidBlock chart={data.mermaid} />}
            {'equations' in data && data.equations && (
              <EquationList equations={data.equations ?? []} saathiColor={saathiColor} isLegalTheme={isLegalTheme} />
            )}
          </>
        )}

        {/* Debug toggle */}
        <button
          onClick={() => setShowRaw((v) => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: mutedColor, fontSize: '10px', marginTop: '12px', padding: 0, display: 'block',
          }}
        >
          {showRaw ? '▲ Hide raw data' : '▼ Show raw analysis data'}
        </button>
        {showRaw && (
          <pre style={{
            marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            background: isLegalTheme ? '#F4F4F4' : 'rgba(0,0,0,0.3)',
            fontSize: '10px', color: mutedColor, overflow: 'auto',
            maxHeight: '200px', lineHeight: 1.5,
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </motion.div>
  )
}
