export type Profile = {
  id: string;
  role: 'student' | 'faculty' | 'public' | 'institution';
  fullName: string;
  city: string | null;
  institution: string | null;
  primarySaathiId: string | null;
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
