import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AirplaneTilt,
  ArrowRight,
  ArrowsClockwise,
  BookmarkSimple,
  Briefcase,
  CheckCircle,
  Eye,
  ForkKnife,
  GraduationCap,
  HeartHalf,
  HouseLine,
  Lightbulb,
  PencilSimple,
  Sparkle,
  SpeakerHigh,
  Stack,
  UsersThree,
} from '@phosphor-icons/react';
import {
  CEFRLevel,
  CEFR_LEVELS,
  DailyBriefing,
  SRSRating,
  VocabDeck,
  VocabWord,
} from '../types/vocab';
import { getIntervalPreviewLabel, isWordDue } from '../utils/srs';
import { speakText } from '../utils/speech';

export const TOPIC_ICON_MAP: Record<string, React.ElementType> = {
  family: UsersThree,
  work: Briefcase,
  travel: AirplaneTilt,
  daily: HouseLine,
  food: ForkKnife,
  feelings: HeartHalf,
  study: GraduationCap,
};

interface FlashcardStudioProps {
  words: VocabWord[];
  decks: VocabDeck[];
  selectedDeckId: string;
  onSelectDeckId: (deckId: string) => void;
  selectedLevel: CEFRLevel | 'all';
  onSelectLevel: (level: CEFRLevel | 'all') => void;
  voiceAccent: 'en-US' | 'en-GB';
  dailyBriefing?: DailyBriefing | null;
  onRateWord: (wordId: string, rating: SRSRating) => void;
  onToggleBookmark: (wordId: string) => void;
  onGoToQuiz: () => void;
  onEditWordInAdmin: (wordId: string) => void;
}

export const FlashcardStudio: React.FC<FlashcardStudioProps> = ({
  words,
  decks,
  selectedDeckId,
  onSelectDeckId,
  selectedLevel,
  onSelectLevel,
  voiceAccent,
  dailyBriefing,
  onRateWord,
  onToggleBookmark,
  onGoToQuiz,
  onEditWordInAdmin,
}) => {
  const [studyMode, setStudyMode] = useState<'due' | 'practice'>('due');
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);

  // Filter by both Topic (Deck) and Level (A1, A2, B1, B2, C1)
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (selectedDeckId === 'bookmarked' && !w.bookmarked) return false;
      if (
        selectedDeckId !== 'all' &&
        selectedDeckId !== 'bookmarked' &&
        w.deckId !== selectedDeckId
      ) {
        return false;
      }
      if (selectedLevel !== 'all' && w.cefr !== selectedLevel) {
        return false;
      }
      return true;
    });
  }, [words, selectedDeckId, selectedLevel]);

  const dueWords = useMemo(() => {
    return filteredWords
      .filter((w) => isWordDue(w.srs))
      .sort((a, b) => {
        const order = { learning: 0, review: 1, new: 2, mastered: 3 };
        return order[a.srs.status] - order[b.srs.status];
      });
  }, [filteredWords]);

  const activeQueue = studyMode === 'due' ? dueWords : filteredWords;

  const currentWord: VocabWord | undefined = useMemo(() => {
    if (activeQueue.length === 0) return undefined;
    if (studyMode === 'due') return activeQueue[0];
    return activeQueue[practiceIndex % activeQueue.length];
  }, [activeQueue, studyMode, practiceIndex]);

  useEffect(() => {
    setIsRevealed(false);
    setShowHint(false);
  }, [currentWord?.id]);

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!currentWord) return;
      onRateWord(currentWord.id, rating);
      setIsRevealed(false);
      setShowHint(false);
      if (studyMode === 'practice') {
        setPracticeIndex((prev) => (prev + 1) % Math.max(1, activeQueue.length));
      }
    },
    [currentWord, onRateWord, studyMode, activeQueue.length]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!currentWord) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        if (!isRevealed) {
          e.preventDefault();
          setIsRevealed(true);
          speakText(currentWord.word, voiceAccent);
        }
      } else if (e.key === '1' && isRevealed) {
        e.preventDefault();
        handleRate('again');
      } else if (e.key === '2' && isRevealed) {
        e.preventDefault();
        handleRate('hard');
      } else if (e.key === '3' && isRevealed) {
        e.preventDefault();
        handleRate('good');
      } else if (e.key === '4' && isRevealed) {
        e.preventDefault();
        handleRate('easy');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        speakText(currentWord.word, voiceAccent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, isRevealed, handleRate, voiceAccent]);

  const currentDeck = useMemo(
    () => decks.find((d) => d.id === currentWord?.deckId),
    [decks, currentWord?.deckId]
  );

  const currentLevelMeta = useMemo(
    () => CEFR_LEVELS.find((l) => l.level === currentWord?.cefr),
    [currentWord?.cefr]
  );

  const renderHighlightedExample = (sentence: string, targetWord: string) => {
    const stem = targetWord.slice(0, Math.max(4, targetWord.length - 2));
    const regex = new RegExp(`(\\b${stem}[a-z]*\\b)`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span
          key={idx}
          className="font-semibold text-teal-600 dark:text-teal-400 underline decoration-teal-500/50 underline-offset-4"
        >
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  const ratingButtons: {
    rating: SRSRating;
    keyNum: string;
    label: string;
    subtext: string;
    accentClass: string;
    badgeClass: string;
  }[] = [
    {
      rating: 'again',
      keyNum: '1',
      label: 'Forgot',
      subtext: 'Review again soon',
      accentClass:
        'border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/70 hover:bg-rose-50/60 dark:hover:bg-rose-950/30',
      badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
    },
    {
      rating: 'hard',
      keyNum: '2',
      label: 'Hard',
      subtext: 'Took some effort',
      accentClass:
        'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/70 hover:bg-amber-50/60 dark:hover:bg-amber-950/30',
      badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      rating: 'good',
      keyNum: '3',
      label: 'Good',
      subtext: 'Remembered well',
      accentClass:
        'border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500/70 hover:bg-sky-50/60 dark:hover:bg-sky-950/30',
      badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50',
    },
    {
      rating: 'easy',
      keyNum: '4',
      label: 'Easy',
      subtext: 'Know it by heart',
      accentClass:
        'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/70 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30',
      badgeClass:
        'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50',
    },
  ];

  const wordOfTheDay = useMemo(() => {
    if (!dailyBriefing?.wordOfTheDayId) return undefined;
    return words.find((w) => w.id === dailyBriefing.wordOfTheDayId);
  }, [words, dailyBriefing?.wordOfTheDayId]);

  const focusDeckName = useMemo(() => {
    if (!dailyBriefing?.focusDeckId || dailyBriefing.focusDeckId === 'all') {
      return undefined;
    }
    return decks.find((d) => d.id === dailyBriefing.focusDeckId)?.name;
  }, [decks, dailyBriefing?.focusDeckId]);

  const CurrentTopicIcon =
    (currentWord && TOPIC_ICON_MAP[currentWord.deckId]) || Stack;

  return (
    <section aria-labelledby="study-heading" className="max-w-3xl mx-auto space-y-3.5 sm:space-y-5">
      <h1 id="study-heading" className="sr-only">
        Flashcards Study
      </h1>

      {/* 1. Daily Coach & Word of the Day Banner */}
      {dailyBriefing && (
        <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-5 bg-gradient-to-r from-teal-500/[0.08] via-emerald-500/[0.04] to-white dark:from-teal-500/[0.14] dark:via-slate-900 dark:to-slate-900 border border-teal-500/20 dark:border-teal-500/25 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase">
                <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" />
                <span className="truncate">{dailyBriefing.title}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {dailyBriefing.message}
              </p>

              {wordOfTheDay && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    Word of the Day:
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(wordOfTheDay.word, voiceAccent)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-bold text-slate-900 dark:text-white hover:border-teal-500 transition-colors cursor-pointer shadow-2xs"
                    title="Click to listen"
                  >
                    <span className="font-serif-editorial text-sm">{wordOfTheDay.word}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold">
                      {wordOfTheDay.cefr}
                    </span>
                    <SpeakerHigh className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" weight="fill" />
                  </button>
                  <span className="text-slate-600 dark:text-slate-400 line-clamp-1">
                    {wordOfTheDay.definition}
                  </span>
                </div>
              )}
            </div>

            {((dailyBriefing.focusDeckId && dailyBriefing.focusDeckId !== 'all') ||
              (dailyBriefing.focusLevel && dailyBriefing.focusLevel !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  if (dailyBriefing.focusDeckId) {
                    onSelectDeckId(dailyBriefing.focusDeckId);
                  }
                  if (dailyBriefing.focusLevel) {
                    onSelectLevel(dailyBriefing.focusLevel);
                  }
                }}
                className="tactile-btn w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer sm:self-center shadow-xs"
              >
                <span>
                  Study{' '}
                  {dailyBriefing.focusLevel && dailyBriefing.focusLevel !== 'all'
                    ? dailyBriefing.focusLevel
                    : ''}{' '}
                  {focusDeckName || 'Focus Set'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Sleek Unified Filter Bar (Mobile-First Horizontal Scroll + Mode Switch) */}
      <div className="paper-card rounded-2xl p-3 sm:p-4 space-y-2.5">
        {/* Top Row: Level Segmented Track + Due/All Mode Switch */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto no-scrollbar min-w-0 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => onSelectLevel('all')}
              className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedLevel === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            {CEFR_LEVELS.map((item) => {
              const isSelected = selectedLevel === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => onSelectLevel(item.level)}
                  title={`${item.level} — ${item.name}: ${item.shortDesc}`}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{item.level}</span>
                  <span
                    className={`hidden md:inline text-[11px] font-medium ${
                      isSelected ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Due Today vs All Words Switch */}
          <div className="shrink-0 inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStudyMode('due')}
              className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                studyMode === 'due'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Due ({dueWords.length})
            </button>
            <button
              type="button"
              onClick={() => setStudyMode('practice')}
              className={`shrink-0 whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                studyMode === 'practice'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              All ({filteredWords.length})
            </button>
          </div>
        </div>

        {/* Bottom Row: Everyday Topic Chips with Icons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => onSelectDeckId('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedDeckId === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Stack size={14} weight={selectedDeckId === 'all' ? 'fill' : 'regular'} />
            <span>All Topics</span>
          </button>

          {decks.map((d) => {
            const isSelected = selectedDeckId === d.id;
            const TopicIcon = TOPIC_ICON_MAP[d.id] || Stack;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDeckId(d.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <TopicIcon
                  size={14}
                  weight={isSelected ? 'fill' : 'regular'}
                  className={isSelected ? 'text-teal-400 dark:text-teal-600' : ''}
                />
                <span>{d.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onSelectDeckId('bookmarked')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedDeckId === 'bookmarked'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <BookmarkSimple size={14} weight="fill" className={selectedDeckId === 'bookmarked' ? 'text-white' : 'text-rose-500'} />
            <span>Saved</span>
          </button>
        </div>
      </div>

      {/* 3. Main 3D-Stacked Flashcard Stage */}
      {!currentWord ? (
        <div className="paper-card rounded-3xl p-6 sm:p-12 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle size={32} weight="fill" aria-hidden="true" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {filteredWords.length === 0
                ? 'No words match this filter'
                : 'You’ve finished today’s due cards!'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {filteredWords.length === 0
                ? 'Try switching back to "All" levels or selecting another everyday topic above.'
                : 'Great job! You reviewed every scheduled card in this set. Practice all cards freely or test yourself with a quick quiz.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2">
            {filteredWords.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStudyMode('practice');
                  setPracticeIndex(0);
                }}
                className="tactile-btn min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowsClockwise size={17} weight="bold" aria-hidden="true" />
                <span>Practice All ({filteredWords.length} Words)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelectLevel('all');
                  onSelectDeckId('all');
                }}
                className="tactile-btn min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer"
              >
                Show All Levels &amp; Topics
              </button>
            )}
            <button
              type="button"
              onClick={onGoToQuiz}
              className="tactile-btn min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Take a Practice Quiz</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flashcard-stack mb-6">
          <article className="relative z-10 paper-card rounded-3xl overflow-hidden">
            {/* Top Accent Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500" />

            {/* Card Top Bar: Level Pill + Topic Pill + Queue Counter + Actions */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar">
                <span
                  className={`shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold border ${
                    currentLevelMeta?.badgeClass || ''
                  }`}
                >
                  {currentWord.cefr}
                  <span className="hidden xs:inline"> • {currentLevelMeta?.name}</span>
                </span>
                {currentDeck && (
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold truncate">
                    <CurrentTopicIcon size={13} weight="fill" className="text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">{currentDeck.name}</span>
                  </span>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-1 sm:gap-2">
                <span className="text-[11px] font-mono-ipa font-semibold text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50">
                  {studyMode === 'due'
                    ? `${dueWords.length} due`
                    : `${(practiceIndex % Math.max(1, activeQueue.length)) + 1}/${activeQueue.length}`}
                </span>

                <button
                  type="button"
                  onClick={() => onEditWordInAdmin(currentWord.id)}
                  title="Edit this word"
                  className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <PencilSimple size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(currentWord.id)}
                  aria-label={currentWord.bookmarked ? 'Remove from saved' : 'Save word'}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    currentWord.bookmarked
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <BookmarkSimple
                    size={18}
                    weight={currentWord.bookmarked ? 'fill' : 'regular'}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Front of Card: Headword, Part of Speech & Interactive Phonetic Audio Pill */}
            <div className="px-4 sm:px-12 py-6 sm:py-12 text-center space-y-5 sm:space-y-6">
              <div className="space-y-2.5 sm:space-y-3">
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold italic font-serif-editorial text-slate-600 dark:text-slate-400">
                  {currentWord.partOfSpeech}
                </span>

                <h2 className="font-serif-editorial text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white break-words px-2">
                  {currentWord.word}
                </h2>

                <div className="flex items-center justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => speakText(currentWord.word, voiceAccent)}
                    className="group inline-flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer"
                    title="Click or press P to hear pronunciation"
                  >
                    <span className="font-mono-ipa text-xs sm:text-sm text-slate-600 dark:text-slate-300 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                      {currentWord.phonetic}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <SpeakerHigh size={14} weight="fill" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </div>

              {/* Unrevealed State: Hint + Reveal Button */}
              {!isRevealed && (
                <div className="pt-2 sm:pt-4 max-w-md mx-auto space-y-4 sm:space-y-5">
                  {showHint ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1.5">
                        Common phrases with “{currentWord.word}”:
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {currentWord.collocations.map((c) => (
                          <span
                            key={c}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="text-xs font-semibold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      Need a hint? See common phrases →
                    </button>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRevealed(true);
                        speakText(currentWord.word, voiceAccent);
                      }}
                      className="tactile-btn w-full sm:w-auto sm:min-w-[260px] min-h-[48px] sm:min-h-[50px] px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold inline-flex items-center justify-center gap-3 cursor-pointer shadow-md"
                    >
                      <Eye size={18} weight="bold" aria-hidden="true" />
                      <span>Reveal Meaning</span>
                      <span className="kbd-key hidden sm:inline-flex !bg-white/15 !border-white/20 !text-white/90 dark:!bg-slate-200 dark:!border-slate-300 dark:!text-slate-700">
                        Space
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Revealed Back of Card */}
            {isRevealed && (
              <div className="px-6 sm:px-10 pb-8 pt-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-5">
                {/* Meaning Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Meaning
                  </div>
                  <p className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {currentWord.definition}
                  </p>
                </div>

                {/* Example Sentence Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Example in Context
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(currentWord.example, voiceAccent, 0.95)}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <SpeakerHigh size={14} weight="fill" aria-hidden="true" />
                      <span>Play Sentence</span>
                    </button>
                  </div>
                  <p className="font-serif-editorial text-lg sm:text-xl text-slate-800 dark:text-slate-100 leading-relaxed">
                    “{renderHighlightedExample(currentWord.example, currentWord.word)}”
                  </p>
                </div>

                {/* Common Phrases & Synonyms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Common Phrases
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentWord.collocations.map((col) => (
                        <span
                          key={col}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Similar Words
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentWord.synonyms.map((syn) => (
                        <span
                          key={syn}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Memory Tip */}
                {currentWord.mnemonic && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex items-start gap-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                    <Lightbulb
                      size={18}
                      weight="fill"
                      className="text-amber-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <strong className="font-bold mr-1.5">Memory Tip:</strong>
                      {currentWord.mnemonic}
                    </div>
                  </div>
                )}

                {/* 4 Color-Coded Tactile SRS Rating Cards */}
                <div className="pt-2 space-y-2.5">
                  <div className="text-xs font-semibold text-center text-slate-500 dark:text-slate-400">
                    How well did you know this word?
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ratingButtons.map((btn) => {
                      const nextInterval = getIntervalPreviewLabel(currentWord.srs, btn.rating);
                      return (
                        <button
                          key={btn.rating}
                          type="button"
                          onClick={() => handleRate(btn.rating)}
                          className={`tactile-btn p-3.5 rounded-2xl border bg-white dark:bg-slate-900 text-left flex flex-col justify-between cursor-pointer ${btn.accentClass}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {btn.label}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono-ipa font-bold ${btn.badgeClass}`}
                            >
                              {nextInterval}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {btn.subtext}
                            </span>
                            <span className="kbd-key hidden sm:inline-flex">
                              {btn.keyNum}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
};
