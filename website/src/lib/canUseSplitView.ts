// Single source of truth for the multi-pane (Split View) feature gate.
// Matches the ladder used in quota/plan checks: any plan whose id starts
// with 'plus', 'pro', or 'unlimited' qualifies. Free / trial users do not.
// Unknown plan ids fail closed.

export function canUseSplitView(planId: string | null | undefined): boolean {
  if (!planId) return false
  return (
    planId.startsWith('plus') ||
    planId.startsWith('pro') ||
    planId.startsWith('unlimited')
  )
}

// Copy surfaced when a free user hits a future split-view entry point
// (URL deep-link, keyboard shortcut). Colocated with the gate so upsell
// wording stays in sync with the feature.
export const SPLIT_VIEW_UPSELL = {
  title:     'Split View is a Plus feature',
  body:      'Study two Boards side by side — Quantitative and Verbal, Constitutional Law and Criminal Procedure, Pharmacology and Clinical Cases. Plus unlocks this.',
  ctaLabel:  'Upgrade to Plus →',
  ctaHref:   '/pricing',
} as const
