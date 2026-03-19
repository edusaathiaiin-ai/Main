export type UserRole = 'student' | 'faculty' | 'public' | 'institution';

export type Profile = {
  id: string;
  /** null means the user has authenticated but not yet completed onboarding */
  role: UserRole | null;
  email: string;
  full_name: string | null;
  city: string | null;
  institution_name: string | null;
  year_of_study: string | null;
  exam_target: string | null;
  primary_saathi_id: string | null;
  is_active: boolean;
};

export type SoulProfile = {
  userId: string;
  saathiId: string;
  displayName: string;
  ambitionLevel: string;
  preferredTone: 'formal' | 'casual' | 'neutral';
  enrolledSubjects: string[];
  futureSubjects: string[];
  futureResearchArea: string;
  topTopics: string[];
  struggleTopics: string[];
  lastSessionSummary: string | null;
  sessionCount: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type BotSlot = {
  slot: 1 | 2 | 3 | 4 | 5;
  id: string;
  name: string;
  api: 'Claude' | 'Groq';
  availableTo: string;
  purpose: string;
};

export type Saathi = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  primary: string;
  accent: string;
  bg: string;
};
