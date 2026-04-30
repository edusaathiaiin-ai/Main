'use client'

import { useState } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { getToolTabsFor } from './useToolChipTabs'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PhET curated simulation list                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const PHET_SIMS = [
  { id: 'projectile-motion', name: 'Projectile Motion' },
  { id: 'forces-and-motion-basics', name: 'Forces & Motion' },
  { id: 'energy-skate-park-basics', name: 'Energy Skate Park' },
  { id: 'wave-on-a-string', name: 'Waves on a String' },
  { id: 'pendulum-lab', name: 'Pendulum Lab' },
  { id: 'gravity-and-orbits', name: 'Gravity & Orbits' },
  { id: 'circuit-construction-kit-dc', name: 'Circuit Construction (DC)' },
  { id: 'ohms-law', name: "Ohm's Law" },
  { id: 'geometric-optics', name: 'Geometric Optics' },
  { id: 'quantum-tunneling', name: 'Quantum Tunneling' },
  { id: 'blackbody-spectrum', name: 'Blackbody Spectrum' },
  { id: 'rutherford-scattering', name: 'Rutherford Scattering' },
] as const

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NIST Constants panel                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

type NistResult = {
  name: string
  value: string
  unit: string
  uncertainty: string
}

// Well-known NIST physical constants (offline lookup — NIST API is unreliable
// for direct browser calls due to CORS). This covers the most-used constants.
const NIST_CONSTANTS: NistResult[] = [
  { name: 'Speed of light in vacuum', value: '299 792 458', unit: 'm s^{-1}', uncertainty: 'exact' },
  { name: 'Planck constant', value: '6.626 070 15 × 10^{-34}', unit: 'J Hz^{-1}', uncertainty: 'exact' },
  { name: 'Reduced Planck constant', value: '1.054 571 817 × 10^{-34}', unit: 'J s', uncertainty: 'exact' },
  { name: 'Elementary charge', value: '1.602 176 634 × 10^{-19}', unit: 'C', uncertainty: 'exact' },
  { name: 'Boltzmann constant', value: '1.380 649 × 10^{-23}', unit: 'J K^{-1}', uncertainty: 'exact' },
  { name: 'Avogadro constant', value: '6.022 140 76 × 10^{23}', unit: 'mol^{-1}', uncertainty: 'exact' },
  { name: 'Gravitational constant', value: '6.674 30 × 10^{-11}', unit: 'm^3 kg^{-1} s^{-2}', uncertainty: '0.000 15 × 10^{-11}' },
  { name: 'Electron mass', value: '9.109 383 7139 × 10^{-31}', unit: 'kg', uncertainty: '0.000 000 0028 × 10^{-31}' },
  { name: 'Proton mass', value: '1.672 621 923 69 × 10^{-27}', unit: 'kg', uncertainty: '0.000 000 000 51 × 10^{-27}' },
  { name: 'Neutron mass', value: '1.674 927 498 04 × 10^{-27}', unit: 'kg', uncertainty: '0.000 000 000 95 × 10^{-27}' },
  { name: 'Fine-structure constant', value: '7.297 352 5643 × 10^{-3}', unit: '', uncertainty: '0.000 000 0011 × 10^{-3}' },
  { name: 'Rydberg constant', value: '10 973 731.568 157', unit: 'm^{-1}', uncertainty: '0.000 012 m^{-1}' },
  { name: 'Stefan-Boltzmann constant', value: '5.670 374 419 × 10^{-8}', unit: 'W m^{-2} K^{-4}', uncertainty: 'exact' },
  { name: 'Vacuum electric permittivity', value: '8.854 187 8188 × 10^{-12}', unit: 'F m^{-1}', uncertainty: '0.000 000 0014 × 10^{-12}' },
  { name: 'Vacuum magnetic permeability', value: '1.256 637 062 12 × 10^{-6}', unit: 'N A^{-2}', uncertainty: '0.000 000 000 19 × 10^{-6}' },
  { name: 'Bohr radius', value: '5.291 772 109 03 × 10^{-11}', unit: 'm', uncertainty: '0.000 000 000 80 × 10^{-11}' },
  { name: 'Coulomb constant', value: '8.987 551 7862 × 10^9', unit: 'N m^2 C^{-2}', uncertainty: '0.000 000 0014 × 10^9' },
  { name: 'Gas constant', value: '8.314 462 618', unit: 'J mol^{-1} K^{-1}', uncertainty: 'exact' },
  { name: 'Faraday constant', value: '96 485.332 12', unit: 'C mol^{-1}', uncertainty: 'exact' },
  { name: 'Acceleration due to gravity', value: '9.806 65', unit: 'm s^{-2}', uncertainty: 'standard' },
]

function NistPanel() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? NIST_CONSTANTS.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : NIST_CONSTANTS.slice(0, 8)

  return (
    <div className="flex h-full flex-col">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search constants... e.g. Planck, electron"
        className="w-full border-0 bg-transparent px-3 py-2 text-sm outline-none"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <div
            key={c.name}
            className="border-b px-3 py-2.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {c.name}
            </p>
            <p
              className="mt-0.5 text-sm font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              {c.value}{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {c.unit}
              </span>
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
              {c.uncertainty === 'exact'
                ? 'Exact (2019 SI redefinition)'
                : c.uncertainty === 'standard'
                  ? 'Standard value'
                  : `Uncertainty: ${c.uncertainty}`}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-ghost)' }}>
            No constants match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Physics Plugin Component                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

type PhysicsBaseTab = 'canvas' | 'geogebra' | 'phet' | 'nist'
type PhysicsTab = PhysicsBaseTab | string

function PhysicsPlugin({ role, unlockedTabIds, onShowAllTools }: PluginProps) {
  const [tab, setTab] = useState<PhysicsTab>('canvas')
  const [phetSim, setPhetSim] = useState<string>(PHET_SIMS[0].id)

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('physicsaathi')
  const baseTabs: { id: PhysicsTab; label: string; sources?: string }[] = [
    { id: 'canvas',   label: '✏️ Draw' },
    { id: 'geogebra', label: '📐 Geometry',    sources: 'GeoGebra' },
    { id: 'phet',     label: '⚡ Simulations', sources: 'PhET' },
    { id: 'nist',     label: 'Constants',      sources: 'NIST' },
  ]
  const tabs: { id: PhysicsTab; label: string; sources?: string }[] = [
    ...baseTabs,
    ...toolTabs.map((t) => ({ id: t.id as PhysicsTab, label: t.label, sources: t.sources })),
  ]
  const toolNode = renderToolTab(tab)

  // Phase I-2 / Classroom #5 — progressive tab reveal.
  const visibleTabs = unlockedTabIds === undefined
    ? tabs
    : tabs.filter((t, i) => i === 0 || unlockedTabIds.includes(t.id))
  const hasLockedTabs = visibleTabs.length < tabs.length

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div
        className="flex shrink-0 items-center gap-1 px-2 py-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}
          >
            {t.label}
          </button>
        ))}
        {hasLockedTabs && onShowAllTools && (
          <button
            type="button"
            onClick={() => onShowAllTools(tabs.map((t) => t.id))}
            className="ml-auto rounded-md px-2 py-1 text-[11px] transition-colors hover:opacity-80"
            style={{ background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            Show all tools ↓
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="relative flex-1">
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}

        {tab === 'geogebra' && (
          <FullscreenPanel label="GeoGebra">
            <iframe
              src="https://www.geogebra.org/classic?lang=en"
              className="h-full w-full border-0"
              allow="fullscreen"
              title="GeoGebra"
            />
          </FullscreenPanel>
        )}

        {tab === 'phet' && (
          <div className="flex h-full flex-col">
            {/* Sim picker */}
            <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Simulation:
              </label>
              <select
                value={phetSim}
                onChange={(e) => setPhetSim(e.target.value)}
                className="flex-1 rounded-lg border-0 px-2 py-1 text-sm outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
              >
                {PHET_SIMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Sim iframe — sandbox prevents PhET from navigating parent window */}
            <FullscreenPanel label="PhET Simulation">
              <iframe
                key={phetSim}
                src={`https://phet.colorado.edu/sims/html/${phetSim}/latest/${phetSim}_en.html`}
                className="h-full w-full border-0"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups"
                title={`PhET: ${PHET_SIMS.find((s) => s.id === phetSim)?.name}`}
              />
            </FullscreenPanel>
          </div>
        )}

        {tab === 'nist' && <NistPanel />}
        {toolNode}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Export                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

const plugin: SaathiPlugin = {
  Component: PhysicsPlugin,
  sourceLabel: 'GeoGebra + NIST + PhET',
}

export default plugin
