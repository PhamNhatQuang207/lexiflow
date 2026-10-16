import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_DECKS,
  INITIAL_WORDS,
  createInitialUserStats,
} from './src/data/initialVocabulary';
import { LexiFlowDatabase } from './src/types/vocab';
import { getTodayISO } from './src/utils/srs';

const DB_DIR = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'lexiflow-db.json');

function ensureDatabaseFile(): LexiFlowDatabase {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as LexiFlowDatabase;
      if (parsed && Array.isArray(parsed.words) && Array.isArray(parsed.decks)) {
        return parsed;
      }
    } catch {
      // fall through to seed
    }
  }

  const today = getTodayISO();
  const initialDb: LexiFlowDatabase = {
    updatedAt: new Date().toISOString(),
    decks: INITIAL_DECKS,
    words: INITIAL_WORDS,
    stats: createInitialUserStats(),
    dailyBriefing: {
      date: today,
      title: "Today's Study Plan: Travel & Everyday Conversations",
      message:
        'Focus on B1 Travel & Holidays and A2 Family words today. Try saying each example sentence out loud before flipping the card!',
      focusLevel: 'B1',
      focusDeckId: 'travel',
      wordOfTheDayId: 'w-itinerary',
      updatedAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

function lexiflowDbPlugin(): Plugin {
  return {
    name: 'lexiflow-db-bridge',
    configureServer(server) {
      ensureDatabaseFile();

      server.middlewares.use('/api/db', (req, res, next) => {
        if (req.method === 'GET') {
          const db = ensureDatabaseFile();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(db));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const current = ensureDatabaseFile();
              const nextDb: LexiFlowDatabase = {
                updatedAt: new Date().toISOString(),
                decks: Array.isArray(incoming.decks) ? incoming.decks : current.decks,
                words: Array.isArray(incoming.words) ? incoming.words : current.words,
                stats:
                  incoming.stats && typeof incoming.stats === 'object'
                    ? incoming.stats
                    : current.stats,
                dailyBriefing:
                  incoming.dailyBriefing !== undefined
                    ? incoming.dailyBriefing
                    : current.dailyBriefing,
              };
              fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(nextDb));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Invalid JSON payload',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), lexiflowDbPlugin()],
});

