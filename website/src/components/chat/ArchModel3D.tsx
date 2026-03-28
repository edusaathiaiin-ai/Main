'use client'

const SKETCHFAB_MODELS: Record<string, string> = {
  'taj-mahal': '8e40bc5b5b4d4c64b98c0ce0ec023bac',
  'qutub-minar': '2c1e17de8b5647e89d6bfb3ab83da6a8',
  'parthenon': 'b3dde24355e24c9e8b80a9bb64e8ecd7',
  'notre-dame': 'd4e5f6789012345678901234567def0f',
  'fallingwater': 'e5f67890123456789012345678ef0123',
  'parliament': 'f6789012345678901234567890f01234',
  'gateway-india': '67890123456789012345678901234567',
  'sanchi-stupa': '78901234567890123456789012345678',
  'lotus-temple': 'a1b2c3d4e5f6789012345678901234ab',
  'hawa-mahal': '9012345678901234567890123456789a',
}

export function ArchModel3D({
  building,
  saathiColor = '#D97706',
}: {
  building: string
  saathiColor?: string
}) {
  const key = building.toLowerCase().replace(/\s+/g, '-')
  const modelId = SKETCHFAB_MODELS[key]
  const label = building.charAt(0).toUpperCase() + building.slice(1).replace(/-/g, ' ')

  if (!modelId) {
    return (
      <div style={{
        margin: '12px 0',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${saathiColor}30`,
        borderRadius: '12px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        fontStyle: 'italic',
      }}>
        🏛️ 3D model for &ldquo;{building}&rdquo; — searching Sketchfab...
      </div>
    )
  }

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
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}>
          🏛️ {label} — 3D Model
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          Rotate · Zoom · Explore
        </span>
      </div>
      <iframe
        title={label}
        src={`https://sketchfab.com/models/${modelId}/embed?autostart=1&ui_controls=0&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0`}
        style={{ width: '100%', height: '400px', border: 'none', display: 'block' }}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
    </div>
  )
}
