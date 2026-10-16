import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ActiveTab,
  CEFRLevel,
  DailyBriefing,
  LexiFlowDatabase,
  SRSRating,
  UserStats,
  VocabDeck,
  VocabWord,
} from './types/vocab';
import {
  INITIAL_DECKS,
  INITIAL_WORDS,
  createInitialUserStats,
} from './data/initialVocabulary';
import { computeNextSRS, getTodayISO, isWordDue } from './utils/srs';
import { Navbar } from './components/Navbar';
import { FlashcardStudio } from './components/FlashcardStudio';
import { QuizArena } from './components/QuizArena';
import { DeckExplorer } from './components/DeckExplorer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AdminConsole } from './components/AdminConsole';
import { WordModal } from './components/WordModal';

const STORAGE_WORDS_KEY = 'lexiflow_words_v2';
const STORAGE_DECKS_KEY = 'lexiflow_decks_v2';
const STORAGE_STATS_KEY = 'lexiflow_stats_v2';
const STORAGE_THEME_KEY = 'lexiflow_theme_v1';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('study');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [isAddWordOpen, setIsAddWordOpen] = useState<boolean>(false);
  const [initialEditingWordId, setInitialEditingWordId] = useState<string | null>(null);
  const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null);

  const lastServerUpdatedAtRef = useRef<string>('');
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);
  const hasHydratedFromServerRef = useRef<boolean>(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      if (saved !== null) return saved === 'dark';
    } catch {
      // ignore storage errors
    }
    return false;
  });

  const [decks, setDecks] = useState<VocabDeck[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DECKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_DECKS;
  });

  const [words, setWords] = useState<VocabWord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_WORDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_WORDS;
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createInitialUserStats();
  });

  // Poll /api/db so changes made by the MCP Agent appear live in the browser
  useEffect(() => {
    let isMounted = true;

    const pullFromServer = async () => {
      try {
        const res = await fetch('/api/db', { cache: 'no-store' });
        if (!res.ok) return;
        const remoteDb = (await res.json()) as LexiFlowDatabase;
        if (!isMounted || !remoteDb || !remoteDb.updatedAt) return;

        if (remoteDb.updatedAt !== lastServerUpdatedAtRef.current) {
          isApplyingRemoteUpdateRef.current = true;
          lastServerUpdatedAtRef.current = remoteDb.updatedAt;
          if (Array.isArray(remoteDb.decks) && remoteDb.decks.length > 0) {
            setDecks(remoteDb.decks);
          }
          if (Array.isArray(remoteDb.words) && remoteDb.words.length > 0) {
            setWords(remoteDb.words);
          }
          if (remoteDb.stats) {
            setStats(remoteDb.stats);
          }
          if (remoteDb.dailyBriefing !== undefined) {
            setDailyBriefing(remoteDb.dailyBriefing || null);
          }
          hasHydratedFromServerRef.current = true;
          setTimeout(() => {
            isApplyingRemoteUpdateRef.current = false;
          }, 50);
        } else {
          hasHydratedFromServerRef.current = true;
        }
      } catch {
        // Offline or static preview fallback
      }
    };

    pullFromServer();
    const timer = window.setInterval(pullFromServer, 2500);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  // Push browser state changes back to /api/db so MCP Agent sees latest student progress
  useEffect(() => {
    if (!hasHydratedFromServerRef.current || isApplyingRemoteUpdateRef.current) {
      return;
    }

    const syncToServer = async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decks,
            words,
            stats,
            dailyBriefing,
          }),
        });
        if (res.ok) {
          const saved = (await res.json()) as LexiFlowDatabase;
          if (saved?.updatedAt) {
            lastServerUpdatedAtRef.current = saved.updatedAt;
          }
        }
      } catch {
        // ignore network errors
      }
    };

    syncToServer();
  }, [decks, words, stats, dailyBriefing]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DECKS_KEY, JSON.stringify(decks));
    } catch {
      // ignore
    }
  }, [decks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WORDS_KEY, JSON.stringify(words));
    } catch {
      // ignore
    }
  }, [words]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  const dueCount = useMemo(
    () => words.filter((w) => isWordDue(w.srs)).length,
    [words]
  );

  const todayISO = getTodayISO();
  const todayReviewed = stats.activityHistory[todayISO]?.reviewedCount ?? 0;

  const handleRateWord = useCallback((wordId: string, rating: SRSRating) => {
    setWords((prevWords) =>
      prevWords.map((w) =>
        w.id === wordId ? { ...w, srs: computeNextSRS(w.srs, rating) } : w
      )
    );

    const today = getTodayISO();
    const isCorrect = rating !== 'again';

    setStats((prev) => {
      const currentEntry = prev.activityHistory[today] || {
        date: today,
        reviewedCount: 0,
        correctCount: 0,
        quizCompletedCount: 0,
      };
      return {
        ...prev,
        lastActiveDate: today,
        activityHistory: {
          ...prev.activityHistory,
          [today]: {
            ...currentEntry,
            reviewedCount: currentEntry.reviewedCount + 1,
            correctCount: currentEntry.correctCount + (isCorrect ? 1 : 0),
          },
        },
      };
    });
  }, []);

  const handleCompleteQuiz = useCallback(() => {
    const today = getTodayISO();
    setStats((prev) => {
      const currentEntry = prev.activityHistory[today] || {
        date: today,
        reviewedCount: 0,
        correctCount: 0,
        quizCompletedCount: 0,
      };
      return {
        ...prev,
        activityHistory: {
          ...prev.activityHistory,
          [today]: {
            ...currentEntry,
            quizCompletedCount: currentEntry.quizCompletedCount + 1,
          },
        },
      };
    });
  }, []);

  const handleToggleBookmark = useCallback((wordId: string) => {
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, bookmarked: !w.bookmarked } : w))
    );
  }, []);

  const handleAddWord = useCallback((newWord: VocabWord) => {
    setWords((prev) => [newWord, ...prev]);
  }, []);

  const handleUpdateWord = useCallback((updated: VocabWord) => {
    setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const handleDeleteWords = useCallback((wordIds: string[]) => {
    const idSet = new Set(wordIds);
    setWords((prev) => prev.filter((w) => !idSet.has(w.id)));
  }, []);

  const handleBulkUpdateWords = useCallback(
    (wordIds: string[], updater: (w: VocabWord) => VocabWord) => {
      const idSet = new Set(wordIds);
      setWords((prev) => prev.map((w) => (idSet.has(w.id) ? updater(w) : w)));
    },
    []
  );

  const handleAddDeck = useCallback((newDeck: VocabDeck) => {
    setDecks((prev) => [...prev, newDeck]);
  }, []);

  const handleUpdateDeck = useCallback((updatedDeck: VocabDeck) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
    );
  }, []);

  const handleDeleteDeck = useCallback(
    (deckId: string) => {
      const fallbackId = decks.find((d) => d.id !== deckId)?.id || 'family';
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      setWords((prev) =>
        prev.map((w) => (w.deckId === deckId ? { ...w, deckId: fallbackId } : w))
      );
    },
    [decks]
  );

  const handleImportCorpus = useCallback(
    (importedWords: VocabWord[], importedDecks?: VocabDeck[]) => {
      if (importedDecks && importedDecks.length > 0) {
        setDecks(importedDecks);
      }
      setWords(importedWords);
    },
    []
  );

  const handleResetFactory = useCallback(() => {
    setDecks(INITIAL_DECKS);
    setWords(INITIAL_WORDS);
    setStats(createInitialUserStats());
  }, []);

  const handleStudyDeck = useCallback(
    (deckId: string, level?: CEFRLevel | 'all') => {
      setSelectedDeckId(deckId);
      if (level !== undefined) {
        setSelectedLevel(level);
      }
      setActiveTab('study');
    },
    []
  );

  const handleEditWordInAdmin = useCallback((wordId: string) => {
    setInitialEditingWordId(wordId);
    setActiveTab('admin');
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dueCount={dueCount}
        totalWordsCount={words.length}
        streakDays={stats.streakDays}
        todayReviewed={todayReviewed}
        dailyGoal={stats.dailyGoal}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        voiceAccent={stats.voiceAccent}
        onToggleVoiceAccent={() =>
          setStats((prev) => ({
            ...prev,
            voiceAccent: prev.voiceAccent === 'en-US' ? 'en-GB' : 'en-US',
          }))
        }
        onOpenAddWord={() => setIsAddWordOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {activeTab === 'study' && (
          <FlashcardStudio
            words={words}
            decks={decks}
            selectedDeckId={selectedDeckId}
            onSelectDeckId={setSelectedDeckId}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            voiceAccent={stats.voiceAccent}
            dailyBriefing={dailyBriefing}
            onRateWord={handleRateWord}
            onToggleBookmark={handleToggleBookmark}
            onGoToQuiz={() => setActiveTab('quiz')}
            onEditWordInAdmin={handleEditWordInAdmin}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizArena
            words={words}
            decks={decks}
            voiceAccent={stats.voiceAccent}
            onRateWord={handleRateWord}
            onCompleteQuiz={handleCompleteQuiz}
          />
        )}

        {activeTab === 'decks' && (
          <DeckExplorer
            words={words}
            decks={decks}
            voiceAccent={stats.voiceAccent}
            onStudyDeck={handleStudyDeck}
            onToggleBookmark={handleToggleBookmark}
            onEditWordInAdmin={handleEditWordInAdmin}
            onOpenAddWord={() => setIsAddWordOpen(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            words={words}
            decks={decks}
            stats={stats}
            onUpdateDailyGoal={(newGoal) =>
              setStats((prev) => ({ ...prev, dailyGoal: newGoal }))
            }
            onJumpToStudyDeck={(deckId) => handleStudyDeck(deckId, 'all')}
            onEditWordInAdmin={handleEditWordInAdmin}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsole
            words={words}
            decks={decks}
            voiceAccent={stats.voiceAccent}
            initialEditingWordId={initialEditingWordId}
            onClearInitialEditingWord={() => setInitialEditingWordId(null)}
            onUpdateWord={handleUpdateWord}
            onAddWord={handleAddWord}
            onDeleteWords={handleDeleteWords}
            onBulkUpdateWords={handleBulkUpdateWords}
            onAddDeck={handleAddDeck}
            onUpdateDeck={handleUpdateDeck}
            onDeleteDeck={handleDeleteDeck}
            onImportCorpus={handleImportCorpus}
            onResetFactory={handleResetFactory}
          />
        )}
      </main>

      <WordModal
        isOpen={isAddWordOpen}
        decks={decks}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={handleAddWord}
      />
    </div>
  );
};

export default App;
