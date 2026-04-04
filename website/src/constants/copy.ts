/**
 * constants/copy.ts
 * All conversion popup copy for EdUsaathiAI-Web.
 * Mirrors mobile app constants/copy.ts exactly.
 */

export type TriggerType =
  | 'session_5'
  | 'quota_hit'
  | 'checkin_complete'
  | 'day_45'
  | 'plus_bot_tap'

export type TriggerCopy = {
  emoji?: string
  badge?: string
  /** Use [Name] as placeholder – replaced at runtime */
  title: string
  body: string
  priceLabel: string
  priceLabel2?: string
  ctaLabel: string
  dismissLabel: string
}

export const CONVERSION_COPY: Record<TriggerType, TriggerCopy> = {
  session_5: {
    emoji: '🧠',
    title: "Hey [Name], you've been here 5 times.",
    body:
      'You know what costs ₹250–400 in this city? One pizza. ' +
      'One night out. One Swiggy order you forget the next morning.\n\n' +
      'For ₹199 a month, your Saathi remembers every session, ' +
      'every struggle, every breakthrough — and shows up every single day ' +
      'ready to go deeper with you.\n\n' +
      "You've already proven you're serious. Your Saathi is ready to match that.",
    priceLabel: '₹199/month · Less than one pizza a month',
    ctaLabel: 'Upgrade for ₹199/month →',
    dismissLabel: "I'll think about it",
  },

  quota_hit: {
    emoji: '🔥',
    title: "20 chats already? You're serious about this.",
    body:
      'Most students give up after two sessions. You just maxed out 20.\n\n' +
      "Here's the honest math: a vada pav costs ₹30. " +
      'You probably spend ₹200 on snacks this week without thinking about it.\n\n' +
      'For the same ₹199, you get unlimited chats — no daily walls, ' +
      'no "try again tomorrow." Just you and your Saathi, whenever you need it.',
    priceLabel: '₹199/month · Less than ₹7/day',
    ctaLabel: 'Go unlimited →',
    dismissLabel: "I'll wait for tomorrow",
  },

  checkin_complete: {
    emoji: '🎯',
    title: "[Name], look how far you've come.",
    body:
      'You just completed a check-in. You assessed yourself honestly, ' +
      'identified what needs work, and committed to the next step.\n\n' +
      "That's exactly the kind of student who grows fastest — " +
      'and exactly the student Saathi Plus was built for.\n\n' +
      'Unlock the full journey: unlimited chats, soul memory across sessions, ' +
      'and a Saathi that knows you deeply by the time your exams arrive.',
    priceLabel: '₹199/month',
    ctaLabel: 'Keep growing with Saathi Plus →',
    dismissLabel: 'Not now',
  },

  day_45: {
    badge: 'Founding Student Access',
    title: '15 days left with your full Saathi.',
    body:
      "You joined early. You've been learning, exploring, building a study rhythm.\n\n" +
      'In 15 days, your founding access ends. ' +
      'Everything your Saathi has learned about you — your topics, your pace, ' +
      "your goals, the sessions you've shared — stays preserved when you upgrade.\n\n" +
      'Walk away and start from zero. ' +
      "Or continue the journey you've already started.",
    priceLabel: 'Monthly — ₹199/month',
    priceLabel2: 'Annual — ₹125/month (billed ₹1,499/year)',
    ctaLabel: 'Continue my journey →',
    dismissLabel: 'Remind me in 5 days',
  },

  plus_bot_tap: {
    emoji: '✨',
    title: 'The [BotName] is waiting for you.',
    body:
      "This Saathi specialises in exactly what you're studying. " +
      'Deeper subject answers, smarter follow-ups, ' +
      'and a memory that builds across every session.\n\n' +
      'Free bots are great to start. ' +
      "But [BotName] is where serious students go when they're ready to level up.",
    priceLabel: '₹199/month',
    ctaLabel: 'Unlock [BotName] →',
    dismissLabel: 'Stay on free bots for now',
  },
}

/** Replace [Name] and [BotName] tokens in copy strings */
export function interpolateCopy(
  text: string,
  replacements: { name?: string; botName?: string }
): string {
  let result = text
  if (replacements.name) result = result.replace(/\[Name\]/g, replacements.name)
  if (replacements.botName)
    result = result.replace(/\[BotName\]/g, replacements.botName)
  return result
}
