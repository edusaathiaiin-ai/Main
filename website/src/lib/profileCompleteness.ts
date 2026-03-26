// Profile completeness scoring — 100 points total
// Used by the onboarding form to show live progress.

export type SoulCompletenessData = {
  name: string;
  city: string;
  educationParsed: boolean; // true when parse-education returned successfully
  subjects: string[];
  learningStyle: string;
  dream: string;
  examTarget: string;
  interests: string[];
};

const WEIGHTS = {
  name: 15,
  city: 10,
  educationParsed: 20,
  subjects: 15,
  learningStyle: 15,
  dream: 15,
  examTarget: 5,
  interests: 5,
} as const;

export function computeProfileCompleteness(data: SoulCompletenessData): number {
  let score = 0;
  if (data.name.trim().length > 0) score += WEIGHTS.name;
  if (data.city.trim().length > 0) score += WEIGHTS.city;
  if (data.educationParsed) score += WEIGHTS.educationParsed;
  if (data.subjects.length > 0) score += WEIGHTS.subjects;
  if (data.learningStyle.length > 0) score += WEIGHTS.learningStyle;
  if (data.dream.trim().length > 10) score += WEIGHTS.dream;
  if (data.examTarget.length > 0 && data.examTarget !== '') score += WEIGHTS.examTarget;
  if (data.interests.length > 0) score += WEIGHTS.interests;
  return Math.min(score, 100);
}

export function getMilestoneLabel(pct: number): string {
  if (pct <= 0) return 'Just getting started';
  if (pct < 30) return 'Just getting started';
  if (pct < 60) return 'Getting to know you';
  if (pct < 80) return 'Soul taking shape ✦';
  if (pct < 100) return 'Almost fully calibrated';
  return 'Your Saathi knows you ✓';
}

export function getSubmitButtonLabel(pct: number): string {
  if (pct < 40) return 'Start my journey →';
  if (pct < 70) return `Begin with ${pct}% soul →`;
  if (pct < 100) return 'Almost there — begin →';
  return 'My Saathi knows me — let\'s go! ✓';
}
