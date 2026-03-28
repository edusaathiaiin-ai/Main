'use client'

export type CircuitType =
  | 'rc-circuit'
  | 'rl-circuit'
  | 'rc-filter'
  | 'op-amp-inverting'
  | 'full-wave-rectifier'
  | 'bridge-rectifier'
  | 'transistor-switch'
  | '555-timer'

const CIRCUIT_BASE = 'https://www.falstad.com/circuit/circuitjs.html'

const CIRCUITS: Partial<Record<CircuitType, string>> = {
  'rc-circuit': `${CIRCUIT_BASE}?ctz=CQAgjCAMB0l3BWEBmAHAJmgdgGYoFZcQ8k4SQAmS2AKAEsAnFAUxzBJrgBZiQUAdAE4gALIJlw4gA`,
  'rl-circuit': `${CIRCUIT_BASE}`,
  'full-wave-rectifier': `${CIRCUIT_BASE}`,
  'transistor-switch': `${CIRCUIT_BASE}`,
}

const CIRCUIT_LABELS: Record<CircuitType, string> = {
  'rc-circuit': 'RC Circuit',
  'rl-circuit': 'RL Circuit',
  'rc-filter': 'RC Filter',
  'op-amp-inverting': 'Op-Amp Inverting Amplifier',
  'full-wave-rectifier': 'Full-Wave Rectifier',
  'bridge-rectifier': 'Bridge Rectifier',
  'transistor-switch': 'Transistor Switch',
  '555-timer': '555 Timer Circuit',
}

export function CircuitSimulator({
  circuit,
  saathiColor = '#6366F1',
}: {
  circuit: CircuitType
  saathiColor?: string
}) {
  const circuitUrl = CIRCUITS[circuit] ?? CIRCUIT_BASE

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
          ⚡ Live Circuit Simulation — {CIRCUIT_LABELS[circuit]}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          Interactive — modify and observe
        </span>
      </div>
      <iframe
        src={circuitUrl}
        style={{ width: '100%', height: '400px', border: 'none', display: 'block', background: '#fff' }}
        title={`Circuit Simulator — ${circuit}`}
      />
    </div>
  )
}
