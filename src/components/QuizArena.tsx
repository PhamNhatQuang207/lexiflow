import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  SpeakerHigh,
  XCircle,
} from '@phosphor-icons/react';
import { CEFRLevel, CEFR_LEVELS, SRSRating, VocabDeck, VocabWord } from '../types/vocab';
import { speakText } from '../utils/speech';

export type QuizMode = 'cloze' | 'multiple-choice' | 'spelling';

interface QuizArenaProps {
  words: VocabWord[];
  decks: VocabDeck[];
  voiceAccent: 'en-US' | 'en-GB';
  onRateWord: (wordId: string, rating: SRSRating) => void;
  onCompleteQuiz: () => void;
}

interface QuizQuestion {
  target: VocabWord;
  options: VocabWord[];
  clozeSentence: string;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  words,
  decks,
  voiceAccent,
  onRateWord,
  onCompleteQuiz,
}) => {
  const [quizMode, setQuizMode] = useState<QuizMode>('cloze');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [questionLimit, setQuestionLimit] = useState<number>(6);
  const [sessionSeed, setSessionSeed] = useState<number>(1);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [spellingSubmitted, setSpellingSubmitted] = useState<boolean>(false);
  const [letterHintCount, setLetterHintCount] = useState<number>(0);
  const [results, setResults] = useState<{ word: VocabWord; isCorrect: boolean }[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const questions: QuizQuestion[] = useMemo(() => {
    const pool = words.filter((w) => {
      if (selectedDeckId !== 'all' && w.deckId !== selectedDeckId) return false;
      if (selectedLevel !== 'all' && w.cefr !== selectedLevel) return false;
      return true;
    });

    if (pool.length === 0) return [];

    const sorted = [...pool].sort((a, b) => {
      const scoreA =
        (a.srs.status === 'mastered' ? 2 : 0) +
        ((a.id.charCodeAt(2) * sessionSeed) % 7);
      const scoreB =
        (b.srs.status === 'mastered' ? 2 : 0) +
        ((b.id.charCodeAt(2) * sessionSeed) % 7);
      return scoreA - scoreB;
    });

    const chosen = sorted.slice(0, Math.min(questionLimit, sorted.length));

    return chosen.map((target, idx) => {
      const distractors = words
        .filter((w) => w.id !== target.id)
        .sort(
          (a, b) =>
            ((a.word.length + idx + sessionSeed) % 5) -
            ((b.word.length + idx + sessionSeed) % 5)
        )
        .slice(0, 3);

      const options = [target, ...distractors].sort((a, b) =>
        a.word.localeCompare(b.word)
      );

      const stem = target.word.slice(0, Math.max(4, target.word.length - 2));
      const regex = new RegExp(`\\b${stem}[a-z]*\\b`, 'gi');
      const clozeSentence = regex.test(target.example)
        ? target.example.replace(regex, '_______')
        : `${target.example} (_______)`;

      return {
        target,
        options,
        clozeSentence,
      };
    });
  }, [words, selectedDeckId, selectedLevel, questionLimit, sessionSeed]);

  const currentQuestion = questions[currentIndex];

  const resetQuiz = (
    newMode?: QuizMode,
    newDeck?: string,
    newLevel?: CEFRLevel | 'all'
  ) => {
    if (newMode) setQuizMode(newMode);
    if (newDeck !== undefined) setSelectedDeckId(newDeck);
    if (newLevel !== undefined) setSelectedLevel(newLevel);
    setSessionSeed((prev) => prev + 1);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setTypedAnswer('');
    setSpellingSubmitted(false);
    setLetterHintCount(0);
    setResults([]);
    setIsFinished(false);
  };

  const handleSelectOption = (option: VocabWord) => {
    if (selectedOptionId || !currentQuestion) return;
    setSelectedOptionId(option.id);
    const isCorrect = option.id === currentQuestion.target.id;
    speakText(currentQuestion.target.word, voiceAccent);
    onRateWord(currentQuestion.target.id, isCorrect ? 'good' : 'again');
    setResults((prev) => [...prev, { word: currentQuestion.target, isCorrect }]);
  };

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spellingSubmitted || !currentQuestion) return;
    const normalizedInput = typedAnswer.trim().toLowerCase();
    if (!normalizedInput) return;

    setSpellingSubmitted(true);
    const isCorrect = normalizedInput === currentQuestion.target.word.toLowerCase();
    speakText(currentQuestion.target.word, voiceAccent);
    onRateWord(currentQuestion.target.id, isCorrect ? 'good' : 'again');
    setResults((prev) => [...prev, { word: currentQuestion.target, isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setIsFinished(true);
      onCompleteQuiz();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setTypedAnswer('');
      setSpellingSubmitted(false);
      setLetterHintCount(0);
    }
  };

  const isCurrentAnswered =
    quizMode === 'spelling' ? spellingSubmitted : Boolean(selectedOptionId);

  const isSpellingCorrect =
    currentQuestion &&
    typedAnswer.trim().toLowerCase() === currentQuestion.target.word.toLowerCase();

  const correctCount = results.filter((r) => r.isCorrect).length;
  const accuracyPercent =
    results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  return (
    <section aria-labelledby="quiz-heading" className="max-w-2xl mx-auto space-y-5">
      {/* Top Quiz Mode, Level & Topic Selector */}
      <div className="paper-card rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium w-full sm:w-auto">
            <button
              type="button"
              onClick={() => resetQuiz('cloze')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-center truncate cursor-pointer ${
                quizMode === 'cloze'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fill Blank
            </button>
            <button
              type="button"
              onClick={() => resetQuiz('multiple-choice')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-center truncate cursor-pointer ${
                quizMode === 'multiple-choice'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Meaning
            </button>
            <button
              type="button"
              onClick={() => resetQuiz('spelling')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg transition-colors text-center truncate cursor-pointer ${
                quizMode === 'spelling'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Spelling
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedLevel}
              onChange={(e) =>
                resetQuiz(undefined, undefined, e.target.value as CEFRLevel | 'all')
              }
              aria-label="Choose level for quiz"
              className="w-full sm:w-auto min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <option value="all">All Levels</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l.level} value={l.level}>
                  Level {l.level} ({l.name})
                </option>
              ))}
            </select>

            <select
              value={selectedDeckId}
              onChange={(e) => resetQuiz(undefined, e.target.value)}
              aria-label="Choose topic for quiz"
              className="w-full sm:w-auto min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <option value="all">All Topics</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quiz Finished Summary */}
      {isFinished ? (
        <div className="paper-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-serif-editorial text-3xl font-bold text-slate-900 dark:text-white">
              Great job! You scored {accuracyPercent}%
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You got <strong>{correctCount}</strong> out of <strong>{results.length}</strong> words right.
            </p>
          </div>

          <div className="divide-y divide-[#E7E2DA] dark:divide-[#2E2D29] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {results.map(({ word, isCorrect }, idx) => (
              <div
                key={`${word.id}-${idx}`}
                className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  {isCorrect ? (
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      size={20}
                      weight="fill"
                      className="text-teal-600 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif-editorial font-bold text-lg text-slate-900 dark:text-white">
                        {word.word}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {word.cefr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {word.definition}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speakText(word.word, voiceAccent)}
                  aria-label={`Listen to ${word.word}`}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262522] text-slate-600 cursor-pointer"
                >
                  <SpeakerHigh size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => resetQuiz()}
              className="tactile-btn min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowsClockwise size={17} weight="bold" aria-hidden="true" />
              <span>Practice Again</span>
            </button>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="paper-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Question <strong>{currentIndex + 1}</strong> of <strong>{questions.length}</strong>
              </span>
              <span className="font-medium">
                Level {currentQuestion.target.cefr} •{' '}
                <em>{currentQuestion.target.partOfSpeech}</em>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Prompt */}
          {quizMode === 'cloze' && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500">
                Choose the best word to complete the sentence:
              </div>
              <p className="font-serif-editorial text-xl sm:text-2xl text-slate-900 dark:text-white leading-relaxed p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                “{currentQuestion.clozeSentence}”
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Hint:</strong> {currentQuestion.target.definition}
              </p>
            </div>
          )}

          {quizMode === 'multiple-choice' && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500">
                Which word matches this meaning?
              </div>
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  {currentQuestion.target.definition}
                </p>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Similar words: {currentQuestion.target.synonyms.join(', ')}
                </div>
              </div>
            </div>
          )}

          {(quizMode === 'cloze' || quizMode === 'multiple-choice') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const isTarget = option.id === currentQuestion.target.id;

                let style =
                  'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#1C1917] dark:hover:border-[#F5F3EF]';

                if (selectedOptionId) {
                  if (isTarget) {
                    style =
                      'border-emerald-500 bg-emerald-600/10 text-slate-900 dark:text-white ring-1 ring-[#2A7B5C]';
                  } else if (isSelected && !isTarget) {
                    style =
                      'border-teal-500 bg-teal-600/10 text-slate-900 dark:text-white';
                  } else {
                    style = 'border-slate-200 dark:border-slate-800 opacity-50';
                  }
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(selectedOptionId)}
                    onClick={() => handleSelectOption(option)}
                    className={`tactile-btn p-4 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer disabled:cursor-default ${style}`}
                  >
                    <div>
                      <div className="font-serif-editorial text-xl font-bold text-slate-900 dark:text-white">
                        {option.word}
                      </div>
                      <div className="font-mono-ipa text-xs text-slate-500">
                        {option.phonetic}
                      </div>
                    </div>
                    {selectedOptionId && isTarget && (
                      <CheckCircle size={22} weight="fill" className="text-emerald-600" aria-hidden="true" />
                    )}
                    {selectedOptionId && isSelected && !isTarget && (
                      <XCircle size={22} weight="fill" className="text-teal-600" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {quizMode === 'spelling' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => speakText(currentQuestion.target.word, voiceAccent)}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <SpeakerHigh size={16} weight="fill" aria-hidden="true" />
                    <span>Listen to Word</span>
                  </button>
                  <span className="font-mono-ipa text-xs text-slate-500">
                    {currentQuestion.target.phonetic}
                  </span>
                </div>

                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {currentQuestion.target.definition}
                </p>

                {!spellingSubmitted && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextLen = Math.min(
                        currentQuestion.target.word.length,
                        letterHintCount + 2
                      );
                      setLetterHintCount(nextLen);
                      setTypedAnswer(currentQuestion.target.word.slice(0, nextLen));
                    }}
                    className="text-xs text-teal-600 hover:underline cursor-pointer"
                  >
                    Need a hint? Show first letters ({letterHintCount}/{currentQuestion.target.word.length})
                  </button>
                )}
              </div>

              <form onSubmit={handleSpellingSubmit} className="flex gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={spellingSubmitted}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder={`Type the ${currentQuestion.target.word.length}-letter word...`}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {!spellingSubmitted && (
                  <button
                    type="submit"
                    className="tactile-btn min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold cursor-pointer"
                  >
                    Check
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Answer Feedback */}
          {isCurrentAnswered && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                (quizMode === 'spelling' && isSpellingCorrect) ||
                selectedOptionId === currentQuestion.target.id
                  ? 'bg-emerald-600/10 border-emerald-500/30'
                  : 'bg-teal-600/10 border-teal-500/30'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {(quizMode === 'spelling' && isSpellingCorrect) ||
                  selectedOptionId === currentQuestion.target.id
                    ? 'Correct!'
                    : `Correct answer: ${currentQuestion.target.word}`}
                </div>
                <p className="text-xs italic font-serif-editorial text-slate-600 dark:text-slate-400">
                  “{currentQuestion.target.example}”
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentIndex + 1 >= questions.length ? 'See Results' : 'Next'}</span>
                <ArrowRight size={14} weight="bold" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="paper-card rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No words found for this Level and Topic combination.
          </p>
          <button
            type="button"
            onClick={() => resetQuiz(undefined, 'all', 'all')}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            Show All Levels &amp; Topics
          </button>
        </div>
      )}
    </section>
  );
};
