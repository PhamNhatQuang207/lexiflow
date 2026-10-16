import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowCounterClockwise,
  Check,
  MagnifyingGlass,
  Plus,
  SpeakerHigh,
  Trash,
} from '@phosphor-icons/react';
import {
  CEFRLevel,
  CEFR_LEVELS,
  MasteryStatus,
  VocabDeck,
  VocabWord,
} from '../types/vocab';
import { addDaysISO, getTodayISO } from '../utils/srs';
import { speakText } from '../utils/speech';

interface AdminConsoleProps {
  words: VocabWord[];
  decks: VocabDeck[];
  voiceAccent: 'en-US' | 'en-GB';
  initialEditingWordId?: string | null;
  onClearInitialEditingWord: () => void;
  onUpdateWord: (updated: VocabWord) => void;
  onAddWord: (newWord: VocabWord) => void;
  onDeleteWords: (wordIds: string[]) => void;
  onBulkUpdateWords: (wordIds: string[], updater: (w: VocabWord) => VocabWord) => void;
  onAddDeck: (newDeck: VocabDeck) => void;
  onUpdateDeck: (updatedDeck: VocabDeck) => void;
  onDeleteDeck: (deckId: string) => void;
  onImportCorpus: (importedWords: VocabWord[], importedDecks?: VocabDeck[]) => void;
  onResetFactory: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  words,
  decks,
  voiceAccent,
  initialEditingWordId,
  onClearInitialEditingWord,
  onUpdateWord,
  onAddWord,
  onDeleteWords,
  onAddDeck,
  onUpdateDeck,
  onDeleteDeck,
  onResetFactory,
}) => {
  const [subTab, setSubTab] = useState<'words' | 'sets'>('words');
  const [searchQuery, setSearchQuery] = useState('');
  const [deckFilter, setDeckFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | 'all'>('all');

  const [editingWordId, setEditingWordId] = useState<string | null>(
    initialEditingWordId || words[0]?.id || null
  );

  useEffect(() => {
    if (initialEditingWordId) {
      setSubTab('words');
      setEditingWordId(initialEditingWordId);
      onClearInitialEditingWord();
    }
  }, [initialEditingWordId, onClearInitialEditingWord]);

  // Word Form State
  const [formWord, setFormWord] = useState('');
  const [formPhonetic, setFormPhonetic] = useState('');
  const [formPos, setFormPos] = useState<VocabWord['partOfSpeech']>('noun');
  const [formCefr, setFormCefr] = useState<CEFRLevel>('B1');
  const [formDeckId, setFormDeckId] = useState<string>(decks[0]?.id || 'family');
  const [formDefinition, setFormDefinition] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formSynonyms, setFormSynonyms] = useState('');
  const [formCollocations, setFormCollocations] = useState('');
  const [formMnemonic, setFormMnemonic] = useState('');
  const [formStatus, setFormStatus] = useState<MasteryStatus>('new');
  const [formBookmarked, setFormBookmarked] = useState<boolean>(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Topic Set Editor State
  const [editingDeckId, setEditingDeckId] = useState<string | null>(decks[0]?.id || null);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckCategory, setDeckCategory] = useState<string>('Everyday Life');

  useEffect(() => {
    if (editingWordId === 'new') {
      setFormWord('');
      setFormPhonetic('');
      setFormPos('noun');
      setFormCefr('B1');
      setFormDeckId(decks[0]?.id || 'family');
      setFormDefinition('');
      setFormExample('');
      setFormSynonyms('');
      setFormCollocations('');
      setFormMnemonic('');
      setFormStatus('new');
      setFormBookmarked(false);
      return;
    }

    const found = words.find((w) => w.id === editingWordId);
    if (found) {
      setFormWord(found.word);
      setFormPhonetic(found.phonetic);
      setFormPos(found.partOfSpeech);
      setFormCefr(found.cefr);
      setFormDeckId(found.deckId);
      setFormDefinition(found.definition);
      setFormExample(found.example);
      setFormSynonyms(found.synonyms.join(', '));
      setFormCollocations(found.collocations.join(', '));
      setFormMnemonic(found.mnemonic);
      setFormStatus(found.srs.status);
      setFormBookmarked(Boolean(found.bookmarked));
    }
  }, [editingWordId, words, decks]);

  useEffect(() => {
    if (editingDeckId === 'new-set') {
      setDeckName('');
      setDeckDesc('');
      setDeckCategory('Everyday Life');
      return;
    }
    const d = decks.find((item) => item.id === editingDeckId);
    if (d) {
      setDeckName(d.name);
      setDeckDesc(d.description);
      setDeckCategory(d.category);
    }
  }, [editingDeckId, decks]);

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (deckFilter !== 'all' && w.deckId !== deckFilter) return false;
      if (levelFilter !== 'all' && w.cefr !== levelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          w.word.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [words, deckFilter, levelFilter, searchQuery]);

  const handleSaveWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim() || !formDefinition.trim()) return;

    const today = getTodayISO();
    const existing = words.find((w) => w.id === editingWordId);
    const interval =
      formStatus === 'mastered' ? 14 : formStatus === 'review' ? 4 : 0;

    const payload: VocabWord = {
      id: editingWordId === 'new' || !editingWordId ? `w-${Date.now()}` : editingWordId,
      word: formWord.trim(),
      phonetic: formPhonetic.trim() || `/${formWord.trim().toLowerCase()}/`,
      partOfSpeech: formPos,
      cefr: formCefr,
      deckId: formDeckId,
      definition: formDefinition.trim(),
      example: formExample.trim() || `Example with ${formWord.trim()}.`,
      synonyms: formSynonyms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      antonyms: existing?.antonyms || [],
      collocations: formCollocations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      mnemonic: formMnemonic.trim(),
      bookmarked: formBookmarked,
      isCustom: true,
      srs: {
        status: formStatus,
        interval,
        repetition: formStatus === 'mastered' ? 4 : 1,
        efactor: existing?.srs.efactor || 2.5,
        dueDate: addDaysISO(today, interval),
        lapses: existing?.srs.lapses || 0,
        correctStreak: 1,
      },
    };

    if (editingWordId === 'new' || !existing) {
      onAddWord(payload);
      setEditingWordId(payload.id);
      setSavedNotice(`Added “${payload.word}”`);
    } else {
      onUpdateWord(payload);
      setSavedNotice(`Saved changes to “${payload.word}”`);
    }
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleSaveSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) return;

    if (editingDeckId === 'new-set' || !editingDeckId) {
      const created: VocabDeck = {
        id: `deck-${Date.now()}`,
        name: deckName.trim(),
        subtitle: deckCategory,
        description: deckDesc.trim() || 'Custom vocabulary topic',
        category: deckCategory,
        accentColor: 'terracotta',
      };
      onAddDeck(created);
      setEditingDeckId(created.id);
      setSavedNotice(`Created topic “${created.name}”`);
    } else {
      onUpdateDeck({
        id: editingDeckId,
        name: deckName.trim(),
        subtitle: deckCategory,
        description: deckDesc.trim(),
        category: deckCategory,
        accentColor: 'terracotta',
      });
      setSavedNotice(`Updated topic “${deckName.trim()}”`);
    }
    setTimeout(() => setSavedNotice(null), 2500);
  };

  return (
    <section aria-labelledby="manage-heading" className="max-w-4xl mx-auto space-y-5">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            id="manage-heading"
            className="font-serif-editorial text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
          >
            Edit Words &amp; Topics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Click any word on the left to change its level (A1–C1), topic, meaning, or example.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1">
              <Check size={14} weight="bold" aria-hidden="true" />
              <span>{savedNotice}</span>
            </span>
          )}

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setSubTab('words')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'words'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Words ({words.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('sets')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'sets'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Topics ({decks.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: EDIT WORDS */}
      {subTab === 'words' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column (5 cols): Simple Word List */}
          <div className="md:col-span-5 paper-card rounded-2xl p-4 flex flex-col gap-2.5 max-h-[640px]">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a word..."
                  aria-label="Search words to edit"
                  className="w-full min-h-[36px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditingWordId('new')}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus size={14} weight="bold" aria-hidden="true" />
                <span>New</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as CEFRLevel | 'all')
                }
                aria-label="Filter by level"
                className="w-full min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="all">All Levels</option>
                {CEFR_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.level} ({l.name})
                  </option>
                ))}
              </select>

              <select
                value={deckFilter}
                onChange={(e) => setDeckFilter(e.target.value)}
                aria-label="Filter by topic"
                className="w-full min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="all">All Topics</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto divide-y divide-[#E7E2DA] dark:divide-[#2E2D29] flex-1 pr-1">
              {filteredWords.map((item) => {
                const isSelected = editingWordId === item.id;
                const topicName =
                  decks.find((d) => d.id === item.deckId)?.name || item.deckId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEditingWordId(item.id)}
                    className={`w-full py-2.5 px-3 text-left rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-[#262522]/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif-editorial text-lg font-bold text-slate-900 dark:text-white truncate">
                          {item.word}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          {item.cefr}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {topicName} • {item.definition}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 cols): Friendly Word Editor Form */}
          <div className="md:col-span-7 paper-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h2 className="font-serif-editorial text-2xl font-bold text-slate-900 dark:text-white">
                {editingWordId === 'new' ? 'Add a New Word' : `Edit “${formWord}”`}
              </h2>
              {editingWordId !== 'new' && formWord && (
                <button
                  type="button"
                  onClick={() => speakText(formWord, voiceAccent)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <SpeakerHigh size={15} className="text-teal-600" aria-hidden="true" />
                  <span>Listen</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveWord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    English Word *
                  </label>
                  <input
                    type="text"
                    required
                    value={formWord}
                    onChange={(e) => setFormWord(e.target.value)}
                    placeholder="e.g., generous"
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-serif-editorial text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Pronunciation (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPhonetic}
                    onChange={(e) => setFormPhonetic(e.target.value)}
                    placeholder="/ˈdʒen.ər.əs/"
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono-ipa text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Level (A1–C1)
                  </label>
                  <select
                    value={formCefr}
                    onChange={(e) => setFormCefr(e.target.value as CEFRLevel)}
                    className="w-full min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {CEFR_LEVELS.map((l) => (
                      <option key={l.level} value={l.level}>
                        {l.level} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Topic
                  </label>
                  <select
                    value={formDeckId}
                    onChange={(e) => setFormDeckId(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Type of Word
                  </label>
                  <select
                    value={formPos}
                    onChange={(e) =>
                      setFormPos(e.target.value as VocabWord['partOfSpeech'])
                    }
                    className="w-full min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="noun">Noun</option>
                    <option value="verb">Verb</option>
                    <option value="adjective">Adjective</option>
                    <option value="adverb">Adverb</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Progress
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as MasteryStatus)}
                    className="w-full min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="new">New</option>
                    <option value="learning">Learning</option>
                    <option value="review">Reviewing</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Meaning (in simple English) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDefinition}
                  onChange={(e) => setFormDefinition(e.target.value)}
                  placeholder="What does this word mean?"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Example Sentence *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formExample}
                  onChange={(e) => setFormExample(e.target.value)}
                  placeholder="Write a natural sentence using this word..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-serif-editorial text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Similar Words (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formSynonyms}
                    onChange={(e) => setFormSynonyms(e.target.value)}
                    placeholder="kind, giving, helpful"
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Common Phrases (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formCollocations}
                    onChange={(e) => setFormCollocations(e.target.value)}
                    placeholder="generous gift, very generous"
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Memory Tip (How to remember it)
                </label>
                <input
                  type="text"
                  value={formMnemonic}
                  onChange={(e) => setFormMnemonic(e.target.value)}
                  placeholder="A fun image or trick to remember this word..."
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                {editingWordId !== 'new' && editingWordId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteWords([editingWordId]);
                      setEditingWordId(words[0]?.id || 'new');
                    }}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-teal-600 text-xs font-semibold hover:bg-teal-600/10 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash size={15} aria-hidden="true" />
                    <span>Delete Word</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="tactile-btn min-h-[42px] px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  {editingWordId === 'new' ? 'Add Word' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE TOPICS & RESET */}
      {subTab === 'sets' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 paper-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Your Topics
              </span>
              <button
                type="button"
                onClick={() => setEditingDeckId('new-set')}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} weight="bold" aria-hidden="true" />
                <span>New Topic</span>
              </button>
            </div>

            <div className="divide-y divide-[#E7E2DA] dark:divide-[#2E2D29]">
              {decks.map((d) => {
                const count = words.filter((w) => w.deckId === d.id).length;
                const isSelected = editingDeckId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setEditingDeckId(d.id)}
                    className={`w-full py-3 px-3 text-left rounded-lg flex items-center justify-between cursor-pointer ${
                      isSelected ? 'bg-slate-100 dark:bg-slate-800 font-semibold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-serif-editorial text-lg font-bold text-slate-900 dark:text-white">
                        {d.name}
                      </div>
                      <div className="text-xs text-slate-500">{count} words</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onResetFactory();
                  setSavedNotice('Restored default topics & words');
                  setTimeout(() => setSavedNotice(null), 2500);
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F5F3EF] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowCounterClockwise size={15} aria-hidden="true" />
                <span>Restore Default Words</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-7 paper-card rounded-2xl p-5 sm:p-6">
            <h2 className="font-serif-editorial text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {editingDeckId === 'new-set' ? 'Create New Topic' : `Edit “${deckName}”`}
            </h2>

            <form onSubmit={handleSaveSet} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Topic Name *
                </label>
                <input
                  type="text"
                  required
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="e.g., Sports & Hobbies"
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="What kind of words are in this topic?"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {editingDeckId && editingDeckId !== 'new-set' && decks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteDeck(editingDeckId);
                      setEditingDeckId(decks[0]?.id || 'new-set');
                    }}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-teal-600 text-xs font-semibold cursor-pointer"
                  >
                    Delete Topic
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  className="tactile-btn min-h-[40px] px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
