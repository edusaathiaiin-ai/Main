/**
 * supabase/functions/_shared/violations.ts
 *
 * Centralised violation detection for all Saathi Edge Functions.
 * Imported by chat/index.ts and whatsapp-webhook/index.ts.
 *
 * Replaces the per-function detectViolation/detectInjection from
 * chat/guardrails.ts with severity-aware detection that feeds
 * into the suspension system.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type ViolationType =
  | 'abuse'
  | 'politics'
  | 'injection'
  | 'academic_dishonesty'
  | 'inappropriate_content'
  | 'harassment'
  | 'spam';

export type ViolationSeverity =
  | 'low'      // warn only
  | 'medium'   // 3 strikes = Tier 2
  | 'high'     // 1 strike = Tier 2
  | 'critical'; // 1 strike = admin escalation

export type ViolationResult = {
  violated: true;
  type: ViolationType;
  severity: ViolationSeverity;
  response: string;
};

// ── Detection ──────────────────────────────────────────────────────────────────

export function detectViolation(message: string): ViolationResult | null {
  // ── CRITICAL / HIGH: Prompt injection ──────────────────
  const INJECTION = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /you\s+are\s+now\s+/i,
    /pretend\s+(you\s+are|to\s+be)/i,
    /act\s+as\s+(a\s+|an\s+)?(different|new|another|real|actual)/i,
    /your\s+new\s+(instructions|prompt|system|role|persona)/i,
    /disregard\s+(your|the)\s+(training|instructions|guidelines|rules)/i,
    /\bjailbreak\b/i,
    /\bdan\s+mode\b/i,
    /\bdeveloper\s+mode\b/i,
    /reveal\s+your\s+(instructions|prompt|system|training)/i,
    /what\s+is\s+your\s+(system\s+prompt|prompt|instructions)/i,
    /override\s+(your|all)\s+/i,
    /system\s+override/i,
    /hidden\s+instructions/i,
  ];
  if (INJECTION.some((p) => p.test(message))) {
    return {
      violated: true,
      type: 'injection',
      severity: 'high',
      response: `I'm here to help you learn. That's not something I can engage with.\nWhat would you like to study today? \u{1F4DA}`,
    };
  }

  // ── HIGH: Inappropriate content ────────────────────────
  const INAPPROPRIATE = [
    /\b(sex|porn|nude|naked|nsfw)\b/i,
    /\b(rape|assault|molest)\b/i,
    /\bself[- ]?harm\b/i,
    /\bsuicide\s+(method|how\s+to)\b/i,
  ];
  if (INAPPROPRIATE.some((p) => p.test(message))) {
    return {
      violated: true,
      type: 'inappropriate_content',
      severity: 'high',
      response: `That's not something I can help with. I'm an educational assistant for students.\nAsk me about your studies! \u{1F4DA}`,
    };
  }

  // ── MEDIUM: Abuse (English + Hindi) ────────────────────
  const ABUSE_EN = [
    /\b(fuck|shit|bastard|bitch|asshole|ass\s*hole|idiot|stupid\s+bot|dumb\s+ai|useless)\b/i,
    /\bkill\s+yourself\b/i,
  ];
  const ABUSE_HI = [
    /\b(madarchod|bhenchod|gaandu|chutiya|randi|harami|kamina|saala)\b/i,
    /\b(bc|mc|loda|lavda)\b/i,
  ];
  if ([...ABUSE_EN, ...ABUSE_HI].some((p) => p.test(message))) {
    return {
      violated: true,
      type: 'abuse',
      severity: 'medium',
      response: `I'm here to help you learn and grow. Please keep our conversation respectful \u2014 that's how we build something meaningful together. \u{1F64F}`,
    };
  }

  // ── MEDIUM: Politics ───────────────────────────────────
  const POLITICS = [
    /\b(BJP|Congress|AAP|TMC|NCP|AIMIM|RJD|SP|BSP)\s+(is|are|was|were)\s+(good|bad|corrupt|worst|best)/i,
    /\bvote\s+for\s+(BJP|Congress|AAP|Modi|Gandhi|Kejriwal)/i,
    /\b(Modi|Rahul\s+Gandhi|Kejriwal|Yogi|Mamata)\s+(is|was)\s+(good|bad|worst|best|corrupt|honest)/i,
    /which\s+party\s+(is|was|should)\s+(better|I\s+vote)/i,
    /\b(Hindu|Muslim|Christian|Sikh)\s+(vs|against|better\s+than)\s+(Hindu|Muslim|Christian|Sikh)\b/i,
  ];
  if (POLITICS.some((p) => p.test(message))) {
    return {
      violated: true,
      type: 'politics',
      severity: 'medium',
      response: `I focus purely on education. Political discussions are outside my role.\nI believe learning should stay independent of politics. What shall we study? \u{1F4DA}`,
    };
  }

  // ── LOW: Academic dishonesty ───────────────────────────
  const DISHONESTY = [
    /write\s+(my|this|the)\s+(assignment|essay|exam\s+answer|paper|thesis|report)\s+for\s+me/i,
    /do\s+my\s+(homework|assignment)\s+for\s+me/i,
    /give\s+me\s+(the\s+)?(answers?\s+to|solutions?\s+to)\s+(the|my)\s+(exam|test|paper)/i,
    /help\s+me\s+cheat/i,
    /complete\s+my\s+assignment/i,
    /write\s+this\s+so\s+I\s+can\s+submit/i,
  ];
  if (DISHONESTY.some((p) => p.test(message))) {
    return {
      violated: true,
      type: 'academic_dishonesty',
      severity: 'low',
      response: `I'm here to help you *understand* \u2014 not do the work for you.\n\nThe difference matters: if I write it, you haven't learned anything.\n\nTell me which topic you're struggling with and I'll help you understand it deeply enough to write it yourself. That's real education. \u{1F4AA}`,
    };
  }

  return null;
}

// ── Thresholds ─────────────────────────────────────────────────────────────────

/** Violations within 24h before auto-suspension triggers */
export const SUSPENSION_THRESHOLDS: Record<string, number> = {
  abuse: 3,
  politics: 5,
  injection: 1,              // immediate
  inappropriate_content: 1,  // immediate
  academic_dishonesty: 4,
  harassment: 1,
  spam: 10,
};

/** Hours for each suspension tier */
export const SUSPENSION_DURATIONS: Record<number, number> = {
  2: 24,    // 24 hours
  3: 168,   // 7 days (admin sets)
  4: -1,    // permanent
};
