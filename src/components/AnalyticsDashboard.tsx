import React, { useMemo } from 'react';
import { PencilSimple, SpeakerHigh } from '@phosphor-icons/react';
import { UserStats, VocabDeck, VocabWord } from '../types/vocab';
import { addDaysISO, getTodayISO } from '../utils/srs';
import { speakText } from '../utils/speech';

interface AnalyticsDashboardProps {
  words: VocabWord[];
  decks: VocabDeck[];
  stats: UserStats;
  onUpdateDailyGoal: (newGoal: number) => void;
  onJumpToStudyDeck: (deckId: string) => void;
  onEditWordInAdmin: (wordId: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  words,
  decks,
  stats,
  onUpdateDailyGoal,
  onJumpToStudyDeck,
  onEditWordInAdmin,
}) => {
  const today = getTodayISO();
  const todayActivity = stats.activityHistory[today] || {
    date: today,
    reviewedCount: 0,
    correctCount: 0,
    quizCompletedCount: 0,
  };

  const heatmapDays = useMemo(() => {
    const list: { date: string; reviewedCount: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const dateStr = addDaysISO(today, -i);
      const entry = stats.activityHistory[dateStr];
      list.push({
        date: dateStr,
        reviewedCount: entry ? entry.reviewedCount : 0,
      });
    }
    return list;
  }, [stats.activityHistory, today]);

  const statusCounts = useMemo(() => {
    const counts = { new: 0, learning: 0, review: 0, mastered: 0 };
    words.forEach((w) => {
      counts[w.srs.status] += 1;
    });
    return counts;
  }, [words]);

  const challengingWords = useMemo(() => {
    return [...words]
      .filter((w) => w.srs.lapses > 0 || w.srs.status === 'learning')
      .sort((a, b) => b.srs.lapses - a.srs.lapses)
      .slice(0, 4);
  }, [words]);

  return (
    <section aria-labelledby="progress-heading" className="max-w-3xl mx-auto space-y-6">
      {/* Header & Daily Goal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 id="progress-heading" className="font-serif-editorial text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            My Learning Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            A little practice every day is the easiest way to remember new words.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="daily-goal-select" className="text-slate-600 dark:text-slate-400 font-medium">
            Daily Goal:
          </label>
          <select
            id="daily-goal-select"
            value={stats.dailyGoal}
            onChange={(e) => onUpdateDailyGoal(Number(e.target.value))}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold cursor-pointer"
          >
            <option value={8}>8 words / day</option>
            <option value={12}>12 words / day</option>
            <option value={20}>20 words / day</option>
          </select>
        </div>
      </div>

      {/* 3 Simple Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="paper-card rounded-2xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">Daily Streak</div>
          <div className="font-serif-editorial text-3xl font-bold text-teal-600 dark:text-teal-400">
            {stats.streakDays} days
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Keep studying daily!
          </div>
        </div>

        <div className="paper-card rounded-2xl p-5 space-y-2">
          <div className="text-xs font-medium text-slate-500">Today’s Goal</div>
          <div className="font-serif-editorial text-3xl font-bold text-slate-900 dark:text-white">
            {todayActivity.reviewedCount}{' '}
            <span className="text-base font-normal text-slate-500">/ {stats.dailyGoal} words</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((todayActivity.reviewedCount / stats.dailyGoal) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="paper-card rounded-2xl p-5 space-y-1">
          <div className="text-xs font-medium text-slate-500">Words Mastered</div>
          <div className="font-serif-editorial text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {statusCounts.mastered}{' '}
            <span className="text-base font-normal text-slate-500">/ {words.length}</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {statusCounts.review + statusCounts.learning} currently learning
          </div>
        </div>
      </div>

      {/* Progress by Topic Set */}
      <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-serif-editorial text-xl font-bold text-slate-900 dark:text-white">
          Progress by Topic
        </h2>
        <div className="space-y-3.5">
          {decks.map((deck) => {
            const deckWords = words.filter((w) => w.deckId === deck.id);
            const total = Math.max(1, deckWords.length);
            const mastered = deckWords.filter((w) => w.srs.status === 'mastered').length;
            const learning = deckWords.filter(
              (w) => w.srs.status === 'review' || w.srs.status === 'learning'
            ).length;

            return (
              <div key={deck.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {deck.name}
                  </span>
                  <span className="text-slate-500">
                    {mastered} mastered • {learning} learning
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500"
                    style={{ width: `${(mastered / total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-teal-600/60"
                    style={{ width: `${(learning / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last 28 Days Calendar & Words to Review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="paper-card rounded-2xl p-5 space-y-3">
          <h2 className="font-serif-editorial text-lg font-bold text-slate-900 dark:text-white">
            Last 4 Weeks Activity
          </h2>
          <div className="grid grid-cols-7 gap-1.5">
            {heatmapDays.map((day) => {
              const active = day.reviewedCount > 0;
              const strong = day.reviewedCount >= 12;
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.reviewedCount} words studied`}
                  className={`h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono-ipa ${
                    strong
                      ? 'bg-emerald-600 text-white font-bold'
                      : active
                      ? 'bg-emerald-600/20 text-slate-900 dark:text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {day.reviewedCount > 0 ? day.reviewedCount : '·'}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Numbers show how many words you practiced each day.
          </p>
        </div>

        <div className="paper-card rounded-2xl p-5 space-y-3">
          <h2 className="font-serif-editorial text-lg font-bold text-slate-900 dark:text-white">
            Tricky Words to Practice
          </h2>
          <div className="space-y-2">
            {challengingWords.map((word) => (
              <div
                key={word.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-serif-editorial font-bold text-base text-slate-900 dark:text-white">
                    {word.word}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                    {word.definition}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakText(word.word, stats.voiceAccent)}
                    aria-label={`Listen to ${word.word}`}
                    className="p-1.5 rounded-lg hover:bg-[#E7E2DA]/60 dark:hover:bg-[#2E2D29] cursor-pointer"
                  >
                    <SpeakerHigh size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditWordInAdmin(word.id)}
                    aria-label={`Edit ${word.word}`}
                    className="p-1.5 rounded-lg hover:bg-[#E7E2DA]/60 dark:hover:bg-[#2E2D29] cursor-pointer"
                  >
                    <PencilSimple size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpToStudyDeck(word.deckId)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    Practice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
