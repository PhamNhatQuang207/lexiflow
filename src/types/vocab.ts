export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const CEFR_LEVELS: {
  level: CEFRLevel;
  name: string;
  shortDesc: string;
  badgeClass: string;
}[] = [
  {
    level: 'A1',
    name: 'Beginner',
    shortDesc: 'Basic everyday words',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    level: 'A2',
    name: 'Elementary',
    shortDesc: 'Simple daily situations',
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
  },
  {
    level: 'B1',
    name: 'Intermediate',
    shortDesc: 'Everyday conversation',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  },
  {
    level: 'B2',
    name: 'Upper-Int',
    shortDesc: 'Clear & detailed English',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  {
    level: 'C1',
    name: 'Advanced',
    shortDesc: 'Fluent & academic',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  },
];

export type MasteryStatus = 'new' | 'learning' | 'review' | 'mastered';

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSData {
  status: MasteryStatus;
  interval: number;
  repetition: number;
  efactor: number;
  dueDate: string;
  lastReviewed?: string;
  lapses: number;
  correctStreak: number;
}

export interface VocabWord {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb';
  cefr: CEFRLevel;
  deckId: string;
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  mnemonic: string;
  bookmarked?: boolean;
  isCustom?: boolean;
  srs: SRSData;
}

export interface VocabDeck {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  accentColor: string;
}

export interface DailyActivity {
  date: string;
  reviewedCount: number;
  correctCount: number;
  quizCompletedCount: number;
}

export interface UserStats {
  streakDays: number;
  lastActiveDate: string;
  dailyGoal: number;
  voiceAccent: 'en-US' | 'en-GB';
  activityHistory: Record<string, DailyActivity>;
}

export interface DailyBriefing {
  date: string;
  title: string;
  message: string;
  wordOfTheDayId?: string;
  focusDeckId?: string;
  focusLevel?: CEFRLevel | 'all';
  updatedAt: string;
}

/** A word as shared by everyone; review progress and bookmarks stay on each device. */
export type VocabEntry = Omit<VocabWord, 'srs' | 'bookmarked'>;

/** Shared content served by /api/db. Learning progress is never stored here. */
export interface LexiFlowDatabase {
  updatedAt: string;
  decks: VocabDeck[];
  words: VocabEntry[];
  dailyBriefing?: DailyBriefing;
}

export type ActiveTab = 'study' | 'quiz' | 'decks' | 'analytics' | 'admin';
