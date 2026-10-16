import React, { useState, useMemo } from 'react';
import {
  BookmarkSimple,
  Cards,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SpeakerHigh,
  Stack,
} from '@phosphor-icons/react';
import {
  CEFRLevel,
  CEFR_LEVELS,
  MasteryStatus,
  VocabDeck,
  VocabWord,
} from '../types/vocab';
import { speakText } from '../utils/speech';
import { TOPIC_ICON_MAP } from './FlashcardStudio';

const TOPIC_COLOR_THEMES: Record<
  string,
  { iconBg: string; barBg: string }
> = {
  family: {
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    barBg: 'bg-orange-500',
  },
  work: {
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    barBg: 'bg-emerald-500',
  },
  travel: {
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    barBg: 'bg-sky-500',
  },
  daily: {
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    barBg: 'bg-amber-500',
  },
  food: {
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    barBg: 'bg-rose-500',
  },
  feelings: {
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    barBg: 'bg-teal-500',
  },
  study: {
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    barBg: 'bg-indigo-500',
  },
};

interface DeckExplorerProps {
  words: VocabWord[];
  decks: VocabDeck[];
  voiceAccent: 'en-US' | 'en-GB';
  onStudyDeck: (deckId: string, level?: CEFRLevel | 'all') => void;
  onToggleBookmark: (wordId: string) => void;
  onEditWordInAdmin: (wordId: string) => void;
  onOpenAddWord: () => void;
}

export const DeckExplorer: React.FC<DeckExplorerProps> = ({
  words,
  decks,
  voiceAccent,
  onStudyDeck,
  onToggleBookmark,
  onEditWordInAdmin,
  onOpenAddWord,
}) => {
  const [activeDeckFilter, setActiveDeckFilter] = useState<string>('all');
  const [activeLevelFilter, setActiveLevelFilter] = useState<CEFRLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<MasteryStatus | 'all'>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);

  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      if (activeDeckFilter !== 'all' && word.deckId !== activeDeckFilter) {
        return false;
      }
      if (activeLevelFilter !== 'all' && word.cefr !== activeLevelFilter) {
        return false;
      }
      if (statusFilter !== 'all' && word.srs.status !== statusFilter) {
        return false;
      }
      if (onlyBookmarked && !word.bookmarked) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          word.word.toLowerCase().includes(q) ||
          word.definition.toLowerCase().includes(q) ||
          word.synonyms.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [
    words,
    activeDeckFilter,
    activeLevelFilter,
    statusFilter,
    onlyBookmarked,
    searchQuery,
  ]);

  const statusBadge: Record<MasteryStatus, { label: string; style: string }> = {
    new: {
      label: 'New',
      style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    learning: {
      label: 'Learning',
      style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
    review: {
      label: 'Reviewing',
      style: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    },
    mastered: {
      label: 'Mastered',
      style:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
  };

  return (
    <section aria-labelledby="decks-heading" className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            id="decks-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Topics &amp; English Levels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose your English level (A1 to C1) or pick an everyday topic set to study.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddWord}
          className="tactile-btn self-start sm:self-auto min-h-[42px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={15} weight="bold" aria-hidden="true" />
          <span>Add New Word</span>
        </button>
      </div>

      {/* 1. English Level Cards (A1, A2, B1, B2, C1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            1. By English Level (CEFR A1 – C1)
          </h2>
          {activeLevelFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveLevelFilter('all')}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Show All Levels
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CEFR_LEVELS.map((lvl) => {
            const count = words.filter((w) => w.cefr === lvl.level).length;
            const isSelected = activeLevelFilter === lvl.level;
            return (
              <div
                key={lvl.level}
                onClick={() =>
                  setActiveLevelFilter(isSelected ? 'all' : lvl.level)
                }
                className={`paper-card rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'ring-2 ring-teal-500 bg-teal-50/30 dark:bg-teal-950/20'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${lvl.badgeClass}`}
                    >
                      {lvl.level}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {count} words
                    </span>
                  </div>
                  <div className="font-bold text-base text-slate-900 dark:text-white mt-2">
                    {lvl.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {lvl.shortDesc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStudyDeck(activeDeckFilter, lvl.level);
                  }}
                  className="w-full py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-500 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Study {lvl.level} →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Everyday Topic Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            2. By Everyday Topic
          </h2>
          {activeDeckFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveDeckFilter('all')}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Show All Topics
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => {
            const deckWords = words.filter((w) => w.deckId === deck.id);
            const masteredCount = deckWords.filter(
              (w) => w.srs.status === 'mastered'
            ).length;
            const total = Math.max(1, deckWords.length);
            const isSelected = activeDeckFilter === deck.id;
            const TopicIcon = TOPIC_ICON_MAP[deck.id] || Stack;
            const theme = TOPIC_COLOR_THEMES[deck.id] || TOPIC_COLOR_THEMES.study;

            const levelsInDeck = CEFR_LEVELS.map((l) => ({
              level: l.level,
              count: deckWords.filter((w) => w.cefr === l.level).length,
            })).filter((x) => x.count > 0);

            return (
              <div
                key={deck.id}
                className={`paper-card rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                  isSelected
                    ? 'ring-2 ring-teal-500'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                    >
                      <TopicIcon size={22} weight="fill" aria-hidden="true" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {masteredCount}/{deckWords.length} mastered
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      {deck.description}
                    </p>
                  </div>

                  {/* Level breakdown pills inside topic */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {levelsInDeck.map((lv) => (
                      <span
                        key={lv.level}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                      >
                        {lv.level}: {lv.count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.barBg}`}
                      style={{ width: `${(masteredCount / total) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStudyDeck(deck.id, activeLevelFilter)}
                      className="tactile-btn flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Cards size={15} weight="bold" aria-hidden="true" />
                      <span>Study Topic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDeckFilter(isSelected ? 'all' : deck.id)
                      }
                      className={`min-h-[38px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSelected ? 'Filtered' : 'View Words'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Word List with Search & Filters */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any word, meaning, or synonym..."
              aria-label="Search words"
              className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeLevelFilter}
              onChange={(e) =>
                setActiveLevelFilter(e.target.value as CEFRLevel | 'all')
              }
              aria-label="Filter by level"
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Levels (A1–C1)</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l.level} value={l.level}>
                  {l.level} — {l.name}
                </option>
              ))}
            </select>

            <select
              value={activeDeckFilter}
              onChange={(e) => setActiveDeckFilter(e.target.value)}
              aria-label="Filter by topic"
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Topics</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as MasteryStatus | 'all')
              }
              aria-label="Filter by learning status"
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Progress</option>
              <option value="new">New</option>
              <option value="learning">Learning</option>
              <option value="review">Reviewing</option>
              <option value="mastered">Mastered</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyBookmarked((prev) => !prev)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                onlyBookmarked
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              <BookmarkSimple
                size={15}
                weight={onlyBookmarked ? 'fill' : 'regular'}
                aria-hidden="true"
              />
              <span>Saved</span>
            </button>
          </div>
        </div>

        {/* Word Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredWords.map((word) => {
            const deck = decks.find((d) => d.id === word.deckId);
            const lvlMeta = CEFR_LEVELS.find((l) => l.level === word.cefr);
            const status = statusBadge[word.srs.status];
            return (
              <div
                key={word.id}
                className="paper-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => speakText(word.word, voiceAccent)}
                        className="w-8 h-8 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label={`Pronounce ${word.word}`}
                      >
                        <SpeakerHigh size={15} weight="fill" aria-hidden="true" />
                      </button>
                      <h3 className="font-serif-editorial text-xl font-bold text-slate-900 dark:text-white">
                        {word.word}
                      </h3>
                      <span className="font-mono-ipa text-xs text-slate-400">
                        {word.phonetic}
                      </span>
                      <span className="text-xs italic text-slate-400">
                        {word.partOfSpeech}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditWordInAdmin(word.id)}
                        title="Edit word"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <PencilSimple size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(word.id)}
                        aria-label="Bookmark word"
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          word.bookmarked
                            ? 'text-rose-500'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        <BookmarkSimple
                          size={16}
                          weight={word.bookmarked ? 'fill' : 'regular'}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {word.definition}
                  </p>
                  <p className="text-xs italic text-slate-500 dark:text-slate-400">
                    “{word.example}”
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold border ${
                        lvlMeta?.badgeClass || ''
                      }`}
                    >
                      {word.cefr}
                    </span>
                    {deck && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {deck.name}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-bold ${status.style}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
