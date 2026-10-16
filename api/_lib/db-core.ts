import type { LexiFlowDatabase, VocabEntry } from '../../src/types/vocab';

/**
 * Body of POST /api/db. `baseUpdatedAt` is the `updatedAt` the writer last read
 * ('' when seeding an empty store); a write based on a stale copy is rejected
 * with 409 so it cannot silently overwrite newer changes.
 */
export type DbWrite = Partial<Omit<LexiFlowDatabase, 'updatedAt'>> & {
  baseUpdatedAt?: unknown;
};

export class DbWriteError extends Error {}

/** Drops per-device progress so only shared word content is stored. */
export function toVocabEntry(word: VocabEntry & { srs?: unknown; bookmarked?: unknown }): VocabEntry {
  const { srs, bookmarked, ...entry } = word;
  return entry;
}

/** Applies a write onto the current document; fields the writer omits are kept. */
export function mergeWrite(current: LexiFlowDatabase | null, incoming: DbWrite): LexiFlowDatabase {
  const decks = Array.isArray(incoming.decks) ? incoming.decks : current?.decks;
  const words = Array.isArray(incoming.words) ? incoming.words : current?.words;
  if (!decks || !words) {
    throw new DbWriteError('decks and words are required when the database is empty');
  }
  return {
    updatedAt: new Date().toISOString(),
    decks,
    words: words.map(toVocabEntry),
    dailyBriefing:
      incoming.dailyBriefing !== undefined ? incoming.dailyBriefing : current?.dailyBriefing,
  };
}

export function readBaseUpdatedAt(incoming: DbWrite): string {
  if (typeof incoming.baseUpdatedAt !== 'string') {
    throw new DbWriteError('baseUpdatedAt is required');
  }
  return incoming.baseUpdatedAt;
}

/** Writes require `Authorization: Bearer <LEXIFLOW_TOKEN>`. */
export function isAuthorized(authorization: string | null | undefined, token: string): boolean {
  return token.length > 0 && authorization === `Bearer ${token}`;
}
