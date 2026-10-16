# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/lexiflow/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** LexiFlow — Vol. IV Lexical Archive & SRS Studio
**Generated:** 2026-10-16
**Category:** Print-Inspired Lexicographical Study & Curator CMS
**Style ID:** `editorial-grid-magazine` (Swiss Archival Grid + Oxford Monograph Typography)

---

## Global Rules

### Color Palette (Archival Paper & Carbon Press Ink)

| Role | Light Mode (Archival Vellum) | Dark Mode (Carbon Folio) | CSS Variable |
|------|------------------------------|--------------------------|--------------|
| Canvas Background | `#F4F1EA` | `#0E0E0D` | `--bg-paper` |
| Folio Surface | `#FAF8F3` | `#161614` | `--bg-surface` |
| Recessed / Well | `#EAE5D9` | `#1F1E1B` | `--bg-elevated` |
| Primary Ink | `#141413` | `#F2EFE9` | `--ink-primary` |
| Secondary Ink | `#524E48` | `#A8A29E` | `--ink-secondary` |
| Muted Marginalia | `#78716C` | `#78716C` | `--ink-muted` |
| Exposed Hairline | `#D8D2C5` | `#292824` | `--border-hairline` |
| Editorial Heavy Rule | `#141413` | `#E7E2D8` | `--border-strong` |
| Vermilion Proof Stamp | `#C84B31` | `#E26347` | `--accent-vermilion` |
| Forest Mastery Ink | `#1B5E49` | `#34A882` | `--accent-forest` |
| Ochre Review Ink | `#B45309` | `#F59E0B` | `--accent-ochre` |

### Anti-"AI Slop" Structural Principles

1. **No Generic Indigo/Purple Gradients or Pill Soup:** Never use `bg-indigo-600`, `rounded-3xl`, pastel icon-in-a-circle cards, or generic SaaS metric widgets.
2. **Exposed 1px Hairline Architecture:** Layout sections connect via crisp `1px solid var(--border-hairline)` structural grid borders and heavy `2px solid var(--border-strong)` editorial top rules, inspired by print dictionaries, library catalog cards, and Swiss typographic ledgers.
3. **Authentic Lexicographical Formatting:**
   - Headwords set in `Newsreader` (serif) with syllabic/phonetic notation in `JetBrains Mono`.
   - Part of speech abbreviated in italic serif (`adj.`, `v. trans.`, `n.`).
   - Numbered dictionary senses (`01`, `02`), vertical pull-quote rules for literary examples, and tactile mechanical keycaps (`[1]`, `[2]`, `[3]`, `[4]`).
4. **Curator Admin CMS (`05 / Curator Admin`):**
   - Full split-pane or drawer editing of any word, deck CRUD, direct SRS interval/status override, multi-select checkbox bulk actions, and JSON import/export.
