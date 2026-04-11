'use client'

import { useState } from 'react'

export type CircuitType =
  | 'rc-circuit'
  | 'rl-circuit'
  | 'lc-circuit'
  | 'full-wave-rectifier'
  | 'half-wave-rectifier'
  | 'op-amp-inverting'
  | 'op-amp-noninverting'
  | 'transistor-switch'
  | 'voltage-divider'
  | '555-astable'
  | 'rc-filter' // legacy alias
  | 'bridge-rectifier' // legacy alias
  | '555-timer' // legacy alias

type CircuitConfig = {
  label: string
  description: string
  url: string
}

const BASE = 'https://www.falstad.com/circuit/circuitjs.html'

const CIRCUIT_CONFIG: Partial<Record<CircuitType, CircuitConfig>> = {
  'rc-circuit': {
    label: 'RC Circuit',
    description: 'Resistor-Capacitor charging and discharging transient',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMB2ALGXBmMAOgFYaIIB2bKkBAbWt2QFMBaMMAKAEsQ2IAFhBo0FKAjZSozEJhRJsMDBAGSFCWHIDGtGgA4Bbfn3D4e-EDlJwGY6EDnV02VhQCmIAG4BzAMwA7gDO6AAmpgAubAAGrgCuDgAmygCcIABuAI4ArgA2QcHIAB4AngBGADQAZgCGrgCWDQCOzgCujQBOjQBsZSAALiCuanIIABY10FqaugZGzm4eLGwMLJY2DtaBDiEdDYysTjCOsJBO0JLkFBjoDCCLZBjIS2Aw`,
  },
  'rl-circuit': {
    label: 'RL Circuit',
    description: 'Resistor-Inductor transient response and time constant',
    url: `${BASE}?cct=%24%201%200.000005%2010.2%2050%205%2050%205e-11%0Av%20192%20352%20192%20192%200%201%2060%205%200%200%200.5%0Ar%20192%20192%20352%20192%200%20100%0Al%20352%20192%20352%20352%200%200.1%200%0Aw%20192%20352%20352%20352%200`,
  },
  'lc-circuit': {
    label: 'LC Oscillator',
    description: 'Inductor-Capacitor resonant oscillation and energy exchange',
    url: `${BASE}?cct=%24%201%205e-7%2010.2%2050%205%2050%205e-11%0Ac%20224%20176%20224%20336%200%201e-5%205%0Al%20384%20176%20384%20336%200%200.001%200%0Aw%20224%20176%20384%20176%200%0Aw%20224%20336%20384%20336%200`,
  },
  'full-wave-rectifier': {
    label: 'Full-Wave Rectifier',
    description: 'Bridge rectifier converting AC to pulsating DC',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMCmBmALGXBmMAOgFYaIIQkBWbADiwgFMBaMMAKADMQB2EFEB2fEW7ggA4AlBBCCJIUJADmISqrCKYAIzX4A7gGcADgCsAVgCcAFgDMABksBLGxo0A`,
  },
  'half-wave-rectifier': {
    label: 'Half-Wave Rectifier',
    description: 'Single diode AC to DC conversion with filter capacitor',
    url: `${BASE}?cct=%24%201%200.000005%2010.2%2050%205%2050%205e-11%0Av%20128%20368%20128%20176%200%201%2060%20170%200%200%200.5%0Ad%20128%20176%20384%20176%200%200.805904%0Ar%20384%20176%20384%20368%200%2010000%0Ac%20480%20176%20480%20368%200%200.00047%0Aw%20384%20176%20480%20176%200%0Aw%20384%20368%20480%20368%200%0Aw%20128%20368%20384%20368%200`,
  },
  'op-amp-inverting': {
    label: 'Op-Amp Inverting Amplifier',
    description:
      'Operational amplifier in inverting configuration with feedback',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMBGA7ARgOwgIDMSAHCBMFIJAFMBaMMAKADMQB2EFEB2fEW7ggA4AlBBCCJIUJADmISqrCKYAIzX4A7gGcADgCsAVgCcAFgDMABksBLGxo0A`,
  },
  'op-amp-noninverting': {
    label: 'Non-Inverting Op-Amp',
    description:
      'Op-amp in non-inverting amplifier configuration — gain = 1 + R1/R2',
    url: `${BASE}?cct=%24%201%200.000005%2010.2%2050%205%2050%205e-11%0Aa%20288%20192%20416%20192%200%2015%200%201e6%200.5%0Av%20128%20336%20128%20208%200%201%2060%201%200%200%200.5%0Ar%20416%20192%20512%20192%200%2020000%0Ar%20512%20192%20512%20336%200%2010000%0Aw%20512%20192%20512%20176%200%0Aw%20512%20176%20288%20176%200%0Aw%20128%20208%20288%20208%200%0Aw%20128%20336%20512%20336%200%0Ag%20128%20336%20128%20368%200`,
  },
  'transistor-switch': {
    label: 'Transistor Switch',
    description:
      'BJT transistor operating as a digital switch — saturation and cutoff',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMBOBmBCALCAbWAHYQwATAZjAFMBaMMAKADkQCsIWQA2EAE5cIMMPzRTkIHDlVSpygA4AlBDFwSoPWnWJiY0MCTC5WAIwA2ZgHcAzgAcATlYBmIAC4MXEA`,
  },
  'voltage-divider': {
    label: 'Voltage Divider',
    description:
      'Resistive voltage divider — output voltage as fraction of input',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMBmAHAdhgTgBYIA6AWmQgFMBaMMAKADMQB2EFEB2fEW7ggA4AlBBCCJIUJADmISqrCKYAIzX4A7gGcADgCsAVgCcAFgDMABksBLGxo0A`,
  },
  '555-astable': {
    label: '555 Timer — Astable',
    description: '555 IC in astable mode generating a continuous square wave',
    url: `${BASE}?cct=%24%201%200.000005%2010.2%2050%205%2050%205e-11%0A555%20160%20128%20304%20320%200%200%0Av%2080%20368%2080%20128%200%200%200%209%200%200%200.5%0Ar%2080%20128%20160%20160%200%2010000%0Ar%20160%20160%20160%20208%200%2010000%0Ac%20160%20256%20160%20368%200%201e-5%200%0Aw%20160%20208%20160%20256%200%0Aw%2080%20128%20304%20160%200%0Aw%20304%20208%20304%20160%200%0Aw%20160%20304%2080%20368%200%0Aw%2080%20368%20160%20368%200`,
  },
  // Legacy aliases — reuse their canonical pre-loaded URLs
  'rc-filter': {
    label: 'RC Filter',
    description: 'RC low-pass filter response',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMB2ALGXBmMAOgFYaIIB2bKkBAbWt2QFMBaMMAKAEsQ2IAFhBo0FKAjZSozEJhRJsMDBAGSFCWHIDGtGgA4Bbfn3D4e-EDlJwGY6EDnV02VhQCmIAG4BzAMwA7gDO6AAmpgAubAAGrgCuDgAmygCcIABuAI4ArgA2QcHIAB4AngBGADQAZgCGrgCWDQCOzgCujQBOjQBsZSAALiCuanIIABY10FqaugZGzm4eLGwMLJY2DtaBDiEdDYysTjCOsJBO0JLkFBjoDCCLZBjIS2Aw`,
  },
  'bridge-rectifier': {
    label: 'Bridge Rectifier',
    description: 'Full-wave bridge rectifier',
    url: `${BASE}?ctz=CQAgjCAMB0l3BWEAmaBOMCmBmALGXBmMAOgFYaIIQkBWbADiwgFMBaMMAKADMQB2EFEB2fEW7ggA4AlBBCCJIUJADmISqrCKYAIzX4A7gGcADgCsAVgCcAFgDMABksBLGxo0A`,
  },
  '555-timer': {
    label: '555 Timer',
    description: '555 timer circuit',
    url: `${BASE}?cct=%24%201%200.000005%2010.2%2050%205%2050%205e-11%0A555%20160%20128%20304%20320%200%200%0Av%2080%20368%2080%20128%200%200%200%209%200%200%200.5%0Ar%2080%20128%20160%20160%200%2010000%0Ar%20160%20160%20160%20208%200%2010000%0Ac%20160%20256%20160%20368%200%201e-5%200%0Aw%20160%20208%20160%20256%200%0Aw%2080%20128%20304%20160%200%0Aw%20304%20208%20304%20160%200%0Aw%20160%20304%2080%20368%200%0Aw%2080%20368%20160%20368%200`,
  },
}

export function CircuitSimulator({
  circuit,
  saathiColor = '#6366F1',
}: {
  circuit: CircuitType
  saathiColor?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const config = CIRCUIT_CONFIG[circuit] ?? CIRCUIT_CONFIG['rc-circuit']!

  return (
    <div
      style={{
        margin: '12px 0',
        borderRadius: '14px',
        overflow: 'hidden',
        border: `0.5px solid ${saathiColor}30`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: `0.5px solid ${saathiColor}20`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <div>
          <span
            style={{ fontSize: '11px', fontWeight: '600', color: saathiColor }}
          >
            ⚡ {config.label} — Live Simulation
          </span>
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.65)',
              margin: '2px 0 0',
            }}
          >
            {config.description}
          </p>
        </div>
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '10px',
            color: saathiColor,
            textDecoration: 'none',
            flexShrink: 0,
            marginTop: '2px',
            opacity: 0.8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Open full ↗
        </a>
      </div>

      {/* Loading placeholder */}
      {!loaded && (
        <div
          style={{
            height: '380px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            background: '#060F1D',
          }}
        >
          <span style={{ fontSize: '40px' }}>⚡</span>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              border: `2px solid ${saathiColor}30`,
              borderTopColor: saathiColor,
              animation: 'circuit-spin 0.9s linear infinite',
            }}
          />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
            Loading circuit simulator…
          </span>
        </div>
      )}

      {/* Falstad iframe */}
      <iframe
        src={config.url}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '420px',
          border: 'none',
          background: '#ffffff',
          display: loaded ? 'block' : 'none',
        }}
        title={`Circuit Simulator — ${config.label}`}
      />

      <div
        style={{
          padding: '5px 14px',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Click components to modify values · Watch current flow
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
          Powered by Falstad · Free
        </span>
      </div>

      <style>{`
        @keyframes circuit-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
