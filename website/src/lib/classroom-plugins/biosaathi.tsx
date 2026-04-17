'use client'

import type { SaathiPlugin } from './types'
import defaultPlugin from './default'

// Stub — full implementation in Phase 3 Round 1, Plugin 3
const plugin: SaathiPlugin = {
  ...defaultPlugin,
  sourceLabel: 'RCSB Protein Data Bank + UniProt + PubMed',
}

export default plugin
