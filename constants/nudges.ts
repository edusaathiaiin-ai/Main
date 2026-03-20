/**
 * constants/nudges.ts
 * 20 rotating Hinglish nudges across 8 categories.
 * regionalised and exam-aware for maximum conversion.
 */

export type NudgeTone = 'funny' | 'emotional' | 'logical' | 'urgent';
export type NudgeCategory =
  | 'petrol_transport'
  | 'chai_food'
  | 'ott_comparison'
  | 'upsc_special'
  | 'funny_witty'
  | 'regional'
  | 'exam_panic'
  | 'emotional'
  | 'unlimited_upsell';

export type NudgeMessage = {
  id: number;
  category: NudgeCategory;
  categoryLabel: string;
  hindi: string;        // supports [Name] placeholder
  english: string;      // subtitle/translation
  cta: string;
  triggerTypes: string[];
  tone: NudgeTone;
  targetExamTypes?: string[];
  targetCities?: string[];
};

export const NUDGE_LIBRARY: NudgeMessage[] = [

  // ── Petrol & Transport (2) ────────────────────────────────────────────────
  {
    id: 1,
    category: 'petrol_transport',
    categoryLabel: 'Petrol & Transport',
    hindi: 'Ek liter petrol \u20B995 ka,\n[Name].\nSaathi Plus? \u20B9199 mein poora mahina.',
    english: 'One litre of petrol costs Rs 95. Saathi Plus is Rs 199 for the whole month.',
    cta: 'Petrol se zyada important \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'logical',
  },
  {
    id: 2,
    category: 'petrol_transport',
    categoryLabel: 'Petrol & Transport',
    hindi: 'MumbaiLocal ka monthly pass \u20B9480+.\nSaathi Plus sirf \u20B9199.\nKaunsa investment zyada samajhdaari ka hai?',
    english: 'Mumbai local monthly pass: Rs 480+. Saathi Plus: Rs 199. Smarter investment.',
    cta: 'Local se sasta, results better \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'checkin_complete', 'plus_bot_tap'],
    tone: 'logical',
    targetCities: ['Mumbai', 'Thane', 'Navi Mumbai'],
  },

  // ── Chai & Food (3) ──────────────────────────────────────────────────────
  {
    id: 3,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi: 'Roz ek chai \u20B930.\nMahine mein \u20B9900.\nSaathi Plus? Sirf \u20B9199.',
    english: 'Daily chai = Rs 900/month. Saathi Plus = Rs 199/month. Do the math.',
    cta: 'Chai chhod de, Saathi rakh \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'checkin_complete'],
    tone: 'funny',
  },
  {
    id: 4,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi: 'Teen vada pav ka kharcha.\nEk mahine ka unlimited padhai.\n[Name], choose kar.',
    english: '3 vada pavs = Rs 90-150. Saathi Plus = Rs 199/month unlimited access.',
    cta: 'Vada pav baad mein, padhai pehle \u2192',
    triggerTypes: ['quota_hit', 'session_5'],
    tone: 'funny',
  },
  {
    id: 5,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi: 'Ek pizza ke paise mein\npura mahina ka Saathi.\nPizza bhoolega, rank nahi.',
    english: 'One pizza = Rs 300-500. Saathi Plus = Rs 199. Pizza you\'ll forget. Rank, you won\'t.',
    cta: 'Smart trade-off \u2192',
    triggerTypes: ['session_5', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
  },

  // ── OTT Comparison (2) ───────────────────────────────────────────────────
  {
    id: 6,
    category: 'ott_comparison',
    categoryLabel: 'OTT Comparison',
    hindi: 'Netflix ke liye \u20B9649.\nPrime ke liye \u20B9299.\nSaathi ke liye \u20B9199 mein soch raha hai?',
    english: 'Netflix Rs 649. Prime Rs 299. And you\'re hesitating on Rs 199 for your future?',
    cta: 'Invest in yourself \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'logical',
  },
  {
    id: 7,
    category: 'ott_comparison',
    categoryLabel: 'OTT Comparison',
    hindi: 'Hotstar cricket ke liye \u20B9899.\nLekin padhai ke liye \u20B9199 zyada lagta hai?\n[Name], yeh equation galat hai.',
    english: 'Hotstar for cricket: Rs 899. Education for Rs 199: "too expensive." Wrong equation.',
    cta: 'Fix the equation \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'plus_bot_tap'],
    tone: 'funny',
  },

  // ── UPSC Special (3) ─────────────────────────────────────────────────────
  {
    id: 8,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi: 'The Hindu subscription: \u20B9499.\nMukherjee Nagar coaching: \u20B920,000+.\nSaathi Plus: \u20B9199.\n[Name], yeh decision easy hai.',
    english: 'The Hindu Rs 499. Coaching Rs 20,000+. Saathi Plus Rs 199. This is an easy decision.',
    cta: 'Smarter than coaching \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 9,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi: 'LBSNAA tak pohonchne wale log\nhaar nahi maante, [Name].\n\u20B9199 pe "sochna" nahi karte.',
    english: 'People who reach LBSNAA don\'t give up. They don\'t "think about" Rs 199.',
    cta: 'IAS wali soch rakh \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'checkin_complete'],
    tone: 'emotional',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 10,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi: 'Prelims mein ek wrong answer\n\u20B92 marks ghata deta hai.\n\u20B9199 ka Saathi ek mark bhi nahi ghatata.',
    english: 'One wrong UPSC answer costs you 2 marks. Saathi Plus costs you nothing but Rs 199.',
    cta: 'No negative marking here \u2192',
    triggerTypes: ['quota_hit', 'plus_bot_tap', 'session_5'],
    tone: 'logical',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },

  // ── Funny & Witty (3) ────────────────────────────────────────────────────
  {
    id: 11,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi: '"Kal se pakka" wala\nkabhi topper nahi bana, [Name].\nAaj start kar.',
    english: 'The "I\'ll start tomorrow" guy never topped. You\'re not that guy.',
    cta: 'Start karo abhi \u2192',
    triggerTypes: ['quota_hit', 'session_5', 'day_45'],
    tone: 'funny',
  },
  {
    id: 12,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi: 'Tere dost Insta scroll kar rahe hain.\nTu Saathi se padh raha hai.\nDifference result mein dikhai dega.',
    english: 'Your friends are scrolling Insta. You\'re studying with Saathi. The difference will show.',
    cta: 'Teri choice, tera result \u2192',
    triggerTypes: ['session_5', 'checkin_complete', 'plus_bot_tap'],
    tone: 'funny',
  },
  {
    id: 13,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi: 'Baal katane ke \u20B9200.\nSaathi Plus \u20B9199.\nBaal wapas aate hain,\nchance nahi aata.',
    english: 'Haircut: Rs 200. Saathi Plus: Rs 199. Hair grows back. This chance won\'t.',
    cta: 'Baal baad mein, future pehle \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'funny',
  },
  {
    id: 14,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi: 'Jio ke reels 3 ghante roz.\nSaathi 20 min roz.\nDono free shuru hue.\nSirf ek kaam ka hai, [Name].',
    english: 'Jio reels: 3 hours/day. Saathi: 20 mins/day. Both started free. Only one works.',
    cta: 'Woh 20 min karo \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'checkin_complete'],
    tone: 'funny',
  },

  // ── Regional (3) ──────────────────────────────────────────────────────────
  {
    id: 15,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi: 'Gujju bhai, \u20B9199 mein itna fayda?\nYeh toh seedha profit hai!\nLo kem cho padhai?',
    english: 'Gujju bhai, Rs 199 for all this? Pure profit. Classic smart investment.',
    cta: 'Ghanu saru deal \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'checkin_complete', 'plus_bot_tap'],
    tone: 'funny',
    targetCities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  },
  {
    id: 16,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi: 'Dilli-wale coaching pe lakhon lutate hain.\n[Name], Saathi Plus \u20B9199 mein\nmuft ki coaching se zyada sharp hai.',
    english: 'Delhi students spend lakhs on coaching. Saathi Plus at Rs 199 is sharper.',
    cta: 'Dilli wala shortcut \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
    targetCities: ['Delhi', 'New Delhi', 'Noida', 'Gurgaon', 'Gurugram'],
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 17,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi: 'Mumbai mein sab kuch mahenga hai.\nSaathi Plus \u20B9199 mein?\nYeh toh bargain hai, [Name].',
    english: 'Everything in Mumbai is expensive. Saathi Plus at Rs 199 is the rare bargain.',
    cta: 'Mumbai ka best deal \u2192',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'checkin_complete', 'plus_bot_tap'],
    tone: 'funny',
    targetCities: ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune'],
  },

  // ── Exam Panic (2) ────────────────────────────────────────────────────────
  {
    id: 18,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi: 'Sirf [Days] din bache hain exam mein.\nAbhi nahi toh kab, [Name]?\nQuota khatam ho gaya — upgrade kar.',
    english: '[Days] days to exam. Quota gone. This is exactly the moment to upgrade.',
    cta: 'Unlimited abhi chahiye \u2192',
    triggerTypes: ['quota_hit', 'day_45'],
    tone: 'urgent',
  },
  {
    id: 19,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi: 'Jo student abhi padh raha hai\nwoh teri seat le jayega, [Name].\nTera Saathi wait kar raha hai.',
    english: 'The student studying right now is taking your seat. Your Saathi is waiting.',
    cta: 'Seat bachao \u2192',
    triggerTypes: ['quota_hit', 'session_5', 'day_45', 'plus_bot_tap'],
    tone: 'urgent',
  },
  {
    id: 20,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi: '18 din mein exam.\nAaj quota khatam.\nKal quota khatam.\nHar din ek chance gaya.\n[Name], yeh waqt nahi ruk sakta.',
    english: '18 days to exam. Quota gone today. Gone tomorrow. Every day is a chance lost.',
    cta: 'Abhi upgrade \u2014 no more limits \u2192',
    triggerTypes: ['quota_hit'],
    tone: 'urgent',
  },

  // ── Unlimited Upsell (1) ──────────────────────────────────────────
  {
    id: 21,
    category: 'unlimited_upsell',
    categoryLabel: 'Unlimited',
    hindi: 'Shlok roz 20 chats karta hai.\nHar roz. Zero waiting.\n\u20B94,999/month.\n[Name], serious log limits nahi maante.',
    english: 'Shlok sends 20 chats daily, every day, zero cooling. Rs 4,999/month \u2014 for those who are serious.',
    cta: 'Zero cooling, ever \u2192',
    triggerTypes: ['quota_hit', 'pro_user_cooling'],
    tone: 'logical',
  },
];

export const NUDGE_CATEGORIES: { key: NudgeCategory; label: string; emoji: string }[] = [
  { key: 'petrol_transport', label: 'Petrol & Transport', emoji: '\u26FD' },
  { key: 'chai_food', label: 'Chai & Food', emoji: '\u2615' },
  { key: 'ott_comparison', label: 'OTT', emoji: '\uD83D\uDCFA' },
  { key: 'upsc_special', label: 'UPSC', emoji: '\uD83C\uDFDB\uFE0F' },
  { key: 'funny_witty', label: 'Funny', emoji: '\uD83D\uDE02' },
  { key: 'regional', label: 'Regional', emoji: '\uD83D\uDDFA\uFE0F' },
  { key: 'exam_panic', label: 'Exam Panic', emoji: '\uD83D\uDD25' },
  { key: 'emotional', label: 'Emotional', emoji: '\uD83E\uDD17' },
  { key: 'unlimited_upsell', label: 'Unlimited', emoji: '\uD83D\uDD25' },
];
