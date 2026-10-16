import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';
import { INITIAL_DECKS, INITIAL_WORDS } from './src/data/initialVocabulary';
import { LexiFlowDatabase } from './src/types/vocab';
import { getTodayISO } from './src/utils/srs';
import {
  DbWrite,
  isAuthorized,
  mergeWrite,
  readBaseUpdatedAt,
  toVocabEntry,
} from './api/_lib/db-core.js';

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
    words: INITIAL_WORDS.map(toVocabEntry),
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

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function lexiflowDbPlugin(): Plugin {
  return {
    name: 'lexiflow-db-bridge',
    configureServer(server) {
      ensureDatabaseFile();

      server.middlewares.use('/api/db', (req, res, next) => {
        if (req.method === 'GET') {
          sendJson(res, 200, ensureDatabaseFile());
          return;
        }

        if (req.method === 'POST') {
          // Auth is optional in dev: only enforced when LEXIFLOW_TOKEN is set locally.
          const token = process.env.LEXIFLOW_TOKEN;
          if (token && !isAuthorized(req.headers.authorization, token)) {
            sendJson(res, 401, { error: 'Unauthorized' });
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}') as DbWrite;
              const base = readBaseUpdatedAt(incoming);
              const current = ensureDatabaseFile();
              if (current.updatedAt !== base) {
                sendJson(res, 409, current);
                return;
              }
              const nextDb = mergeWrite(current, incoming);
              fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf-8');
              sendJson(res, 200, nextDb);
            } catch (err) {
              sendJson(res, 400, {
                error: err instanceof Error ? err.message : 'Invalid JSON payload',
              });
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

