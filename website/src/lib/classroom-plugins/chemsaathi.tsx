'use client'

import type { SaathiPlugin } from './types'
import defaultPlugin from './default'

// Stub — full implementation in Phase 3 Round 1, Plugin 2
const plugin: SaathiPlugin = {
  ...defaultPlugin,
  sourceLabel: 'PubChem + ChemSpider (RSC)',
}

export default plugin
