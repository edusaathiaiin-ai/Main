'use client'

export type AnatomyPart =
  | 'heart' | 'brain' | 'lungs'
  | 'kidney' | 'liver' | 'eye'
  | 'ear' | 'spine' | 'hand'

const BIODIGITAL_MODELS: Record<AnatomyPart, string> = {
  heart: 'https://human.biodigital.com/widget/?be=2Owr&ui-anatomy-descriptions=true&ui-panel=false',
  brain: 'https://human.biodigital.com/widget/?be=2Oye&ui-panel=false',
  lungs: 'https://human.biodigital.com/widget/?be=2dB6&ui-panel=false',
  kidney: 'https://human.biodigital.com/widget/?be=2Owg&ui-panel=false',
  liver: 'https://human.biodigital.com/widget/?be=2Ows&ui-panel=false',
  eye: 'https://human.biodigital.com/widget/?be=2Owt&ui-panel=false',
  ear: 'https://human.biodigital.com/widget/?be=2Owv&ui-panel=false',
  spine: 'https://human.biodigital.com/widget/?be=2Oww&ui-panel=false',
  hand: 'https://human.biodigital.com/widget/?be=2Owx&ui-panel=false',
}

export function AnatomyViewer({
  part,
  saathiColor = '#EF4444',
}: {
  part: AnatomyPart
  saathiColor?: string
}) {
  const modelUrl = BIODIGITAL_MODELS[part]
  const label = part.charAt(0).toUpperCase() + part.slice(1)

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '14px',
      overflow: 'hidden',
      border: `0.5px solid ${saathiColor}30`,
    }}>
      <div style={{
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: `0.5px solid ${saathiColor}20`,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          🫀 3D Anatomy — {label}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          Rotate · Zoom · Click to explore
        </span>
      </div>
      <iframe
        src={modelUrl}
        style={{ width: '100%', height: '400px', border: 'none', display: 'block' }}
        allowFullScreen
        title={`3D ${part} anatomy`}
      />
      <div style={{
        padding: '6px 14px',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        Powered by BioDigital Human
      </div>
    </div>
  )
}
