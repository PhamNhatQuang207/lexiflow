import React from 'react';
import {
  BookOpenText,
  Cards,
  ChartBar,
  Exam,
  Flame,
  Moon,
  NotePencil,
  Plus,
  Sparkle,
  SpeakerHigh,
  Sun,
} from '@phosphor-icons/react';
import { ActiveTab } from '../types/vocab';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  dueCount: number;
  totalWordsCount: number;
  streakDays: number;
  todayReviewed: number;
  dailyGoal: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  voiceAccent: 'en-US' | 'en-GB';
  onToggleVoiceAccent: () => void;
  onOpenAddWord: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  dueCount,
  streakDays,
  todayReviewed,
  dailyGoal,
  darkMode,
  onToggleDarkMode,
  voiceAccent,
  onToggleVoiceAccent,
  onOpenAddWord,
}) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'study', label: 'Flashcards', icon: Cards, badge: dueCount },
    { id: 'quiz', label: 'Practice Quiz', icon: Exam },
    { id: 'decks', label: 'Word Sets', icon: BookOpenText },
    { id: 'analytics', label: 'My Progress', icon: ChartBar },
    { id: 'admin', label: 'Edit Words', icon: NotePencil },
  ];

  const goalPct = Math.min(
    100,
    Math.round((todayReviewed / Math.max(1, dailyGoal)) * 100)
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo — shrink-0 & whitespace-nowrap prevent multi-line overflow */}
          <button
            type="button"
            onClick={() => onSelectTab('study')}
            className="shrink-0 flex items-center gap-2.5 text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl py-1"
          >
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Sparkle size={18} weight="fill" aria-hidden="true" />
            </div>
            <div className="whitespace-nowrap">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none">
                LexiFlow
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-none mt-1">
                Daily English
              </span>
            </div>
          </button>

          {/* Segmented Pill Track Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 shrink-0"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    size={15}
                    weight={isActive ? 'fill' : 'regular'}
                    className={`shrink-0 ${
                      isActive ? 'text-teal-600 dark:text-teal-400' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 leading-none text-[10px] font-bold rounded-full ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Streak + Goal Pill, Voice Accent, Add Word, Theme */}
          <div className="shrink-0 flex items-center gap-2">
            {/* Streak & Daily Goal Pill */}
            <button
              type="button"
              onClick={() => onSelectTab('analytics')}
              title={`${streakDays} day streak • ${todayReviewed} of ${dailyGoal} words reviewed today`}
              className="hidden lg:flex shrink-0 whitespace-nowrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Flame size={14} weight="fill" aria-hidden="true" />
                <span>{streakDays}d</span>
              </span>
              <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {todayReviewed}/{dailyGoal}
                </span>
                <div className="w-8 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
              </div>
            </button>

            {/* US / UK Accent */}
            <button
              type="button"
              onClick={onToggleVoiceAccent}
              aria-label={`Voice accent: ${voiceAccent === 'en-US' ? 'US' : 'UK'} English`}
              className="shrink-0 whitespace-nowrap h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SpeakerHigh
                size={14}
                weight="fill"
                className="text-teal-600 dark:text-teal-400 shrink-0"
                aria-hidden="true"
              />
              <span>{voiceAccent === 'en-US' ? 'US' : 'UK'}</span>
            </button>

            {/* Add Word */}
            <button
              type="button"
              onClick={onOpenAddWord}
              className="tactile-btn shrink-0 whitespace-nowrap h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} weight="bold" className="shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add Word</span>
            </button>

            {/* Dark/Light Mode */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              {darkMode ? (
                <Sun size={16} weight="fill" className="text-amber-400" />
              ) : (
                <Moon size={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 py-1.5 px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl text-[11px] font-semibold cursor-pointer ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 text-[9px] font-bold rounded-full bg-teal-600 text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
