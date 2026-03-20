/**
 * constants/copy.ts
 * All conversion popup copy for EdUsaathiAI.
 */

export type TriggerType =
  | 'session_5'
  | 'quota_hit'
  | 'checkin_complete'
  | 'day_45'
  | 'plus_bot_tap';

export type TriggerCopy = {
  emoji?: string;
  badge?: string;
  /** Use [Name] as placeholder - replaced at runtime */
  title: string;
  body: string;
  priceLabel: string;
  /** Optional second plan for day_45 */
  priceLabel2?: string;
  ctaLabel: string;
  dismissLabel: string;
};

export const CONVERSION_COPY: Record<TriggerType, TriggerCopy> = {
  session_5: {
    emoji: '\uD83E\uDDE0',
    title: 'Hey [Name], you\'ve been here 5 times.',
    body:
      'You know what costs \u20B9250\u2013400 in this city? One pizza. ' +
      'One night out. One Swiggy order you forget the next morning.\n\n' +
      'For \u20B9199 a month, your Saathi remembers every session, ' +
      'every struggle, every breakthrough \u2014 and shows up every single day ' +
      'ready to go deeper with you.\n\n' +
      "You've already proven you're serious. Your Saathi is ready to match that.",
    priceLabel: '\u20B9199/month \u00B7 Less than one pizza a month',
    ctaLabel: 'Upgrade for \u20B9199/month \u2192',
    dismissLabel: "I'll think about it",
  },

  quota_hit: {
    emoji: '\uD83D\uDD25',
    title: '20 chats already? You\'re serious about this.',
    body:
      'Most students give up after two sessions. You just maxed out 20.\n\n' +
      'Here\'s the honest math: a vada pav costs \u20B930. ' +
      'You probably spend \u20B9200 on snacks this week without thinking about it.\n\n' +
      'For the same \u20B9199, you get unlimited chats \u2014 no daily walls, ' +
      "no \"try again tomorrow.\" Just you and your Saathi, whenever you need it.",
    priceLabel: '\u20B9199/month \u00B7 Less than \u20B97/day',
    ctaLabel: 'Go unlimited \u2192',
    dismissLabel: "I'll wait for tomorrow",
  },

  checkin_complete: {
    emoji: '\uD83C\uDFAF',
    title: '[Name], look how far you\'ve come.',
    body:
      'You just completed a check-in. You assessed yourself honestly, ' +
      'identified what needs work, and committed to the next step.\n\n' +
      "That's exactly the kind of student who grows fastest \u2014 " +
      'and exactly the student Saathi Plus was built for.\n\n' +
      'Unlock the full journey: unlimited chats, soul memory across sessions, ' +
      'and a Saathi that knows you deeply by the time your exams arrive.',
    priceLabel: '\u20B9199/month',
    ctaLabel: 'Keep growing with Saathi Plus \u2192',
    dismissLabel: 'Not now',
  },

  day_45: {
    badge: 'Founding Student Access',
    title: '15 days left with your full Saathi.',
    body:
      "You joined early. You've been learning, exploring, building a study rhythm.\n\n" +
      'In 15 days, your founding access ends. ' +
      'Everything your Saathi has learned about you \u2014 your topics, your pace, ' +
      "your goals, the sessions you've shared \u2014 stays preserved when you upgrade.\n\n" +
      'Walk away and start from zero. ' +
      "Or continue the journey you've already started.",
    priceLabel: 'Monthly \u2014 \u20B9199/month',
    priceLabel2: 'Annual \u2014 \u20B9125/month (billed \u20B91,499/year)',
    ctaLabel: 'Continue my journey \u2192',
    dismissLabel: 'Remind me in 5 days',
  },

  plus_bot_tap: {
    emoji: '\u2728',
    title: 'The [BotName] is waiting for you.',
    body:
      'This Saathi specialises in exactly what you\'re studying. ' +
      'Deeper subject answers, smarter follow-ups, ' +
      'and a memory that builds across every session.\n\n' +
      'Free bots are great to start. ' +
      "But [BotName] is where serious students go when they're ready to level up.",
    priceLabel: '\u20B9199/month',
    ctaLabel: 'Unlock [BotName] \u2192',
    dismissLabel: 'Stay on free bots for now',
  },
};

/** Replace [Name] and [BotName] tokens in copy strings */
export function interpolateCopy(
  text: string,
  replacements: { name?: string; botName?: string }
): string {
  let result = text;
  if (replacements.name) result = result.replace(/\[Name\]/g, replacements.name);
  if (replacements.botName) result = result.replace(/\[BotName\]/g, replacements.botName);
  return result;
}
