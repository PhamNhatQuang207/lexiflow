import { DailyActivity, SRSData, SRSRating, MasteryStatus } from '../types/vocab';

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(baseDateISO: string, days: number): string {
  const [y, m, d] = baseDateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Consecutive days with at least one review, ending today (or yesterday if today has none yet). */
export function computeStreakDays(
  history: Record<string, DailyActivity>,
  today: string = getTodayISO()
): number {
  let day = history[today]?.reviewedCount ? today : addDaysISO(today, -1);
  let streak = 0;
  while (history[day]?.reviewedCount) {
    streak++;
    day = addDaysISO(day, -1);
  }
  return streak;
}

export function createInitialSRS(status: MasteryStatus = 'new', offsetDays = 0): SRSData {
  const today = getTodayISO();
  return {
    status,
    interval: status === 'mastered' ? 14 : status === 'review' ? 4 : status === 'learning' ? 1 : 0,
    repetition: status === 'mastered' ? 4 : status === 'review' ? 2 : status === 'learning' ? 1 : 0,
    efactor: 2.5,
    dueDate: addDaysISO(today, offsetDays),
    lapses: 0,
    correctStreak: status === 'mastered' ? 4 : status === 'review' ? 2 : 0,
  };
}

export function computeNextSRS(current: SRSData, rating: SRSRating): SRSData {
  const today = getTodayISO();
  let { interval, repetition, efactor, lapses, correctStreak } = current;

  if (rating === 'again') {
    repetition = 0;
    interval = 0; // Due again in current session / today
    efactor = Math.max(1.3, Number((efactor - 0.2).toFixed(2)));
    lapses += 1;
    correctStreak = 0;
    return {
      status: 'learning',
      interval,
      repetition,
      efactor,
      dueDate: today,
      lastReviewed: today,
      lapses,
      correctStreak,
    };
  }

  correctStreak += 1;

  if (rating === 'hard') {
    efactor = Math.max(1.3, Number((efactor - 0.15).toFixed(2)));
    if (repetition === 0) {
      interval = 1;
      repetition = 1;
    } else {
      interval = Math.max(1, Math.round(interval * 1.2));
    }
  } else if (rating === 'good') {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 3;
    } else {
      interval = Math.max(2, Math.round(interval * efactor));
    }
    repetition += 1;
  } else if (rating === 'easy') {
    efactor = Math.min(3.0, Number((efactor + 0.15).toFixed(2)));
    if (repetition === 0) {
      interval = 4;
    } else if (repetition === 1) {
      interval = 7;
    } else {
      interval = Math.max(4, Math.round(interval * efactor * 1.3));
    }
    repetition += 1;
  }

  let status: MasteryStatus = 'learning';
  if (interval >= 10 || repetition >= 4) {
    status = 'mastered';
  } else if (interval >= 2 || repetition >= 2) {
    status = 'review';
  }

  return {
    status,
    interval,
    repetition,
    efactor,
    dueDate: addDaysISO(today, interval),
    lastReviewed: today,
    lapses,
    correctStreak,
  };
}

export function getIntervalPreviewLabel(current: SRSData, rating: SRSRating): string {
  if (rating === 'again') return '< 10m';
  const next = computeNextSRS(current, rating);
  if (next.interval === 0) return 'Today';
  if (next.interval === 1) return '1 day';
  return `${next.interval} days`;
}

export function isWordDue(srs: SRSData): boolean {
  const today = getTodayISO();
  return srs.dueDate <= today;
}
