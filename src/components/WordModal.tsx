import React, { useState, useEffect, useRef } from 'react';
import { WarningCircle, X } from '@phosphor-icons/react';
import { CEFRLevel, CEFR_LEVELS, VocabDeck, VocabWord } from '../types/vocab';
import { createInitialSRS } from '../utils/srs';

interface WordModalProps {
  isOpen: boolean;
  decks: VocabDeck[];
  onClose: () => void;
  onAddWord: (word: VocabWord) => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  isOpen,
  decks,
  onClose,
  onAddWord,
}) => {
  const [word, setWord] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<VocabWord['partOfSpeech']>('noun');
  const [cefr, setCefr] = useState<CEFRLevel>('B1');
  const [deckId, setDeckId] = useState<string>(decks[0]?.id || 'family');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [synonymsInput, setSynonymsInput] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!word.trim()) {
      newErrors.word = 'Please enter the English word.';
    }
    if (!definition.trim()) {
      newErrors.definition = 'Please write what the word means.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newVocab: VocabWord = {
      id: `custom-${Date.now()}`,
      word: word.trim(),
      phonetic: `/${word.trim().toLowerCase()}/`,
      partOfSpeech,
      cefr,
      deckId,
      definition: definition.trim(),
      example: example.trim() || `I learned the word "${word.trim()}" today.`,
      synonyms: synonymsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      antonyms: [],
      collocations: [`use ${word.trim()}`],
      mnemonic: mnemonic.trim(),
      bookmarked: true,
      isCustom: true,
      srs: createInitialSRS('new', 0),
    };

    if (newVocab.synonyms.length === 0) {
      newVocab.synonyms = ['similar word'];
    }

    onAddWord(newVocab);
    setWord('');
    setDefinition('');
    setExample('');
    setSynonymsInput('');
    setMnemonic('');
    setErrors({});
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-word-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="paper-card rounded-2xl w-full max-w-lg p-6 sm:p-7 my-8 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2
              id="add-word-modal-title"
              className="font-serif-editorial text-2xl font-bold text-slate-900 dark:text-white"
            >
              Add a New Word
            </h2>
            <p className="text-xs text-slate-500">
              Choose a level (A1–C1) and topic (Family, Work, Travel...) for your word.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262522] text-slate-500 cursor-pointer"
          >
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-teal-600/10 border border-teal-500/30 text-xs text-teal-600 flex items-center gap-2"
          >
            <WarningCircle size={16} weight="fill" aria-hidden="true" />
            <span>{Object.values(errors)[0]}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label
                htmlFor="field-word"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                English Word *
              </label>
              <input
                ref={firstInputRef}
                id="field-word"
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g., cousin"
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-serif-editorial text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="field-cefr"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Level
              </label>
              <select
                id="field-cefr"
                value={cefr}
                onChange={(e) => setCefr(e.target.value as CEFRLevel)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {CEFR_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.level} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="field-deck"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Topic
              </label>
              <select
                id="field-deck"
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="field-definition"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Meaning *
            </label>
            <textarea
              id="field-definition"
              rows={2}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Write the meaning in simple words..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label
              htmlFor="field-example"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Example Sentence (Optional)
            </label>
            <textarea
              id="field-example"
              rows={2}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="How is it used in a real sentence?"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="field-pos"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Type of Word
              </label>
              <select
                id="field-pos"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value as VocabWord['partOfSpeech'])}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="field-synonyms"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Similar Words (Optional)
              </label>
              <input
                id="field-synonyms"
                type="text"
                value={synonymsInput}
                onChange={(e) => setSynonymsInput(e.target.value)}
                placeholder="relative, family member"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="field-mnemonic"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Memory Tip (Optional)
            </label>
            <input
              id="field-mnemonic"
              type="text"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="A trick to help you remember it..."
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tactile-btn min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
            >
              Save Word
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
