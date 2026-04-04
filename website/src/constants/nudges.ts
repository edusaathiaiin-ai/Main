/**
 * constants/nudges.ts
 * 21 rotating Hinglish nudges across 8 categories.
 * Mirrors mobile app constants/nudges.ts exactly.
 */

export type NudgeTone = 'funny' | 'emotional' | 'logical' | 'urgent'
export type NudgeCategory =
  | 'petrol_transport'
  | 'chai_food'
  | 'ott_comparison'
  | 'upsc_special'
  | 'funny_witty'
  | 'regional'
  | 'exam_panic'
  | 'emotional'
  | 'unlimited_upsell'

export type NudgeMessage = {
  id: number
  category: NudgeCategory
  categoryLabel: string
  hindi: string
  english: string
  cta: string
  triggerTypes: string[]
  tone: NudgeTone
  targetExamTypes?: string[]
  targetCities?: string[]
}

export const NUDGE_LIBRARY: NudgeMessage[] = [
  // ── Petrol & Transport ────────────────────────────────────────────────────
  {
    id: 1,
    category: 'petrol_transport',
    categoryLabel: 'Petrol & Transport',
    hindi:
      'Ek liter petrol ₹95 ka,\n[Name].\nSaathi Plus? ₹199 mein poora mahina.',
    english:
      'One litre of petrol costs Rs 95. Saathi Plus is Rs 199 for the whole month.',
    cta: 'Petrol se zyada important →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'logical',
  },
  {
    id: 2,
    category: 'petrol_transport',
    categoryLabel: 'Petrol & Transport',
    hindi:
      'MumbaiLocal ka monthly pass ₹480+.\nSaathi Plus sirf ₹199.\nKaunsa investment zyada samajhdaari ka hai?',
    english:
      'Mumbai local monthly pass: Rs 480+. Saathi Plus: Rs 199. Smarter investment.',
    cta: 'Local se sasta, results better →',
    triggerTypes: [
      'session_5',
      'quota_hit',
      'day_45',
      'checkin_complete',
      'plus_bot_tap',
    ],
    tone: 'logical',
    targetCities: ['Mumbai', 'Thane', 'Navi Mumbai'],
  },

  // ── Chai & Food ───────────────────────────────────────────────────────────
  {
    id: 3,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi: 'Roz ek chai ₹30.\nMahine mein ₹900.\nSaathi Plus? Sirf ₹199.',
    english:
      'Daily chai = Rs 900/month. Saathi Plus = Rs 199/month. Do the math.',
    cta: 'Chai chhod de, Saathi rakh →',
    triggerTypes: ['session_5', 'quota_hit', 'checkin_complete'],
    tone: 'funny',
  },
  {
    id: 4,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi:
      'Teen vada pav ka kharcha.\nEk mahine ka unlimited padhai.\n[Name], choose kar.',
    english:
      '3 vada pavs = Rs 90-150. Saathi Plus = Rs 199/month unlimited access.',
    cta: 'Vada pav baad mein, padhai pehle →',
    triggerTypes: ['quota_hit', 'session_5'],
    tone: 'funny',
  },
  {
    id: 5,
    category: 'chai_food',
    categoryLabel: 'Chai & Food',
    hindi:
      'Ek pizza ke paise mein\npura mahina ka Saathi.\nPizza bhoolega, rank nahi.',
    english:
      "One pizza = Rs 300-500. Saathi Plus = Rs 199. Pizza you'll forget. Rank, you won't.",
    cta: 'Smart trade-off →',
    triggerTypes: ['session_5', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
  },

  // ── OTT ───────────────────────────────────────────────────────────────────
  {
    id: 6,
    category: 'ott_comparison',
    categoryLabel: 'OTT Comparison',
    hindi:
      'Netflix ke liye ₹649.\nPrime ke liye ₹299.\nSaathi ke liye ₹199 mein soch raha hai?',
    english:
      "Netflix Rs 649. Prime Rs 299. And you're hesitating on Rs 199 for your future?",
    cta: 'Invest in yourself →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'logical',
  },
  {
    id: 7,
    category: 'ott_comparison',
    categoryLabel: 'OTT Comparison',
    hindi:
      'Hotstar cricket ke liye ₹899.\nLekin padhai ke liye ₹199 zyada lagta hai?\n[Name], yeh equation galat hai.',
    english:
      'Hotstar for cricket: Rs 899. Education for Rs 199: "too expensive." Wrong equation.',
    cta: 'Fix the equation →',
    triggerTypes: ['session_5', 'quota_hit', 'plus_bot_tap'],
    tone: 'funny',
  },

  // ── UPSC Special ──────────────────────────────────────────────────────────
  {
    id: 8,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi:
      'The Hindu subscription: ₹499.\nMukherjee Nagar coaching: ₹20,000+.\nSaathi Plus: ₹199.\n[Name], yeh decision easy hai.',
    english:
      'The Hindu Rs 499. Coaching Rs 20,000+. Saathi Plus Rs 199. This is an easy decision.',
    cta: 'Smarter than coaching →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 9,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi:
      'LBSNAA tak pohonchne wale log\nhaar nahi maante, [Name].\n₹199 pe "sochna" nahi karte.',
    english:
      'People who reach LBSNAA don\'t give up. They don\'t "think about" Rs 199.',
    cta: 'IAS wali soch rakh →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'checkin_complete'],
    tone: 'emotional',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 10,
    category: 'upsc_special',
    categoryLabel: 'UPSC Special',
    hindi:
      'Prelims mein ek wrong answer\n₹2 marks ghata deta hai.\n₹199 ka Saathi ek mark bhi nahi ghatata.',
    english:
      'One wrong UPSC answer costs you 2 marks. Saathi Plus costs you nothing but Rs 199.',
    cta: 'No negative marking here →',
    triggerTypes: ['quota_hit', 'plus_bot_tap', 'session_5'],
    tone: 'logical',
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },

  // ── Funny & Witty ─────────────────────────────────────────────────────────
  {
    id: 11,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi:
      '"Kal se pakka" wala\nkabhi topper nahi bana, [Name].\nAaj start kar.',
    english:
      'The "I\'ll start tomorrow" guy never topped. You\'re not that guy.',
    cta: 'Start karo abhi →',
    triggerTypes: ['quota_hit', 'session_5', 'day_45'],
    tone: 'funny',
  },
  {
    id: 12,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi:
      'Tere dost Insta scroll kar rahe hain.\nTu Saathi se padh raha hai.\nDifference result mein dikhai dega.',
    english:
      "Your friends are scrolling Insta. You're studying with Saathi. The difference will show.",
    cta: 'Teri choice, tera result →',
    triggerTypes: ['session_5', 'checkin_complete', 'plus_bot_tap'],
    tone: 'funny',
  },
  {
    id: 13,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi:
      'Baal katane ke ₹200.\nSaathi Plus ₹199.\nBaal wapas aate hain,\nchance nahi aata.',
    english:
      "Haircut: Rs 200. Saathi Plus: Rs 199. Hair grows back. This chance won't.",
    cta: 'Baal baad mein, future pehle →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45'],
    tone: 'funny',
  },
  {
    id: 14,
    category: 'funny_witty',
    categoryLabel: 'Funny & Witty',
    hindi:
      'Jio ke reels 3 ghante roz.\nSaathi 20 min roz.\nDono free shuru hue.\nSirf ek kaam ka hai, [Name].',
    english:
      'Jio reels: 3 hours/day. Saathi: 20 mins/day. Both started free. Only one works.',
    cta: 'Woh 20 min karo →',
    triggerTypes: ['session_5', 'quota_hit', 'checkin_complete'],
    tone: 'funny',
  },

  // ── Regional ──────────────────────────────────────────────────────────────
  {
    id: 15,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi:
      'Gujju bhai, ₹199 mein itna fayda?\nYeh toh seedha profit hai!\nLo kem cho padhai?',
    english:
      'Gujju bhai, Rs 199 for all this? Pure profit. Classic smart investment.',
    cta: 'Ghanu saru deal →',
    triggerTypes: [
      'session_5',
      'quota_hit',
      'day_45',
      'checkin_complete',
      'plus_bot_tap',
    ],
    tone: 'funny',
    targetCities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  },
  {
    id: 16,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi:
      'Dilli-wale coaching pe lakhon lutate hain.\n[Name], Saathi Plus ₹199 mein\nmuft ki coaching se zyada sharp hai.',
    english:
      'Delhi students spend lakhs on coaching. Saathi Plus at Rs 199 is sharper.',
    cta: 'Dilli wala shortcut →',
    triggerTypes: ['session_5', 'quota_hit', 'day_45', 'plus_bot_tap'],
    tone: 'logical',
    targetCities: ['Delhi', 'New Delhi', 'Noida', 'Gurgaon', 'Gurugram'],
    targetExamTypes: ['UPSC', 'IAS', 'IPS', 'IFS'],
  },
  {
    id: 17,
    category: 'regional',
    categoryLabel: 'Regional',
    hindi:
      'Mumbai mein sab kuch mahenga hai.\nSaathi Plus ₹199 mein?\nYeh toh bargain hai, [Name].',
    english:
      'Everything in Mumbai is expensive. Saathi Plus at Rs 199 is the rare bargain.',
    cta: 'Mumbai ka best deal →',
    triggerTypes: [
      'session_5',
      'quota_hit',
      'day_45',
      'checkin_complete',
      'plus_bot_tap',
    ],
    tone: 'funny',
    targetCities: ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune'],
  },

  // ── Exam Panic ────────────────────────────────────────────────────────────
  {
    id: 18,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi:
      'Sirf [Days] din bache hain exam mein.\nAbhi nahi toh kab, [Name]?\nQuota khatam ho gaya — upgrade kar.',
    english:
      '[Days] days to exam. Quota gone. This is exactly the moment to upgrade.',
    cta: 'Unlimited abhi chahiye →',
    triggerTypes: ['quota_hit', 'day_45'],
    tone: 'urgent',
  },
  {
    id: 19,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi:
      'Jo student abhi padh raha hai\nwoh teri seat le jayega, [Name].\nTera Saathi wait kar raha hai.',
    english:
      'The student studying right now is taking your seat. Your Saathi is waiting.',
    cta: 'Seat bachao →',
    triggerTypes: ['quota_hit', 'session_5', 'day_45', 'plus_bot_tap'],
    tone: 'urgent',
  },
  {
    id: 20,
    category: 'exam_panic',
    categoryLabel: 'Exam Panic',
    hindi:
      '18 din mein exam.\nAaj quota khatam.\nKal quota khatam.\nHar din ek chance gaya.\n[Name], yeh waqt nahi ruk sakta.',
    english:
      '18 days to exam. Quota gone today. Gone tomorrow. Every day is a chance lost.',
    cta: 'Abhi upgrade — no more limits →',
    triggerTypes: ['quota_hit'],
    tone: 'urgent',
  },

  // ── Unlimited Upsell ──────────────────────────────────────────────────────
  {
    id: 21,
    category: 'unlimited_upsell',
    categoryLabel: 'Unlimited',
    hindi:
      'Shlok roz 20 chats karta hai.\nHar roz. Zero waiting.\n₹4,999/month.\n[Name], serious log limits nahi maante.',
    english:
      'Shlok sends 20 chats daily, every day, zero cooling. Rs 4,999/month — for those who are serious.',
    cta: 'Zero cooling, ever →',
    triggerTypes: ['quota_hit', 'pro_user_cooling'],
    tone: 'logical',
  },
]
