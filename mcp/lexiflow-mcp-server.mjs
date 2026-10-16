#!/usr/bin/env node
/**
 * LexiFlow MCP Server (Model Context Protocol - Stdio & CLI)
 *
 * Allows AI agents to inspect, curate, and update the LexiFlow English Vocabulary
 * web app daily. Reads and writes the database through the app's `/api/db`
 * endpoint: the Vite dev server locally, or the Vercel deployment in production.
 *
 * Environment:
 *   LEXIFLOW_API_URL  Base URL of the app (default http://localhost:5173)
 *   LEXIFLOW_TOKEN    Write passcode; required by the deployed app
 *
 * Usage:
 *   1. As an MCP Stdio server (configured in `.mcp.json`):
 *      node mcp/lexiflow-mcp-server.mjs
 *
 *   2. As a direct CLI tool for quick agent/terminal execution:
 *      node mcp/lexiflow-mcp-server.mjs get_daily_status
 *      node mcp/lexiflow-mcp-server.mjs publish_daily_briefing '{"title":"...","message":"..."}'
 */

import readline from 'node:readline';

const API_URL = (process.env.LEXIFLOW_API_URL || 'http://localhost:5173').replace(/\/$/, '') + '/api/db';
const API_TOKEN = process.env.LEXIFLOW_TOKEN || '';
const MAX_WRITE_ATTEMPTS = 3;

class ConflictError extends Error {}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function readDb() {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GET ${API_URL} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Saves `db`, which must still carry the `updatedAt` it was read with. */
async function writeDb(db) {
  const { updatedAt, ...fields } = db;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_TOKEN}` },
    body: JSON.stringify({ ...fields, baseUpdatedAt: updatedAt }),
  });
  if (res.status === 409) {
    throw new ConflictError('Database changed while writing');
  }
  if (!res.ok) {
    throw new Error(`POST ${API_URL} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}


// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: 'get_daily_status',
    description:
      'Get an overview of the shared vocabulary library: total words, counts per CEFR level (A1-C1), word counts per topic, and the active Daily Briefing. Learning progress (streaks, due words, mastery) is kept privately on each learner’s device and is not available here.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_words',
    description:
      'List or search vocabulary words filtered by CEFR level (A1, A2, B1, B2, C1), topic ID (family, work, travel, daily, food, feelings, study), or search text.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
          description: 'Filter by CEFR level',
        },
        topic: {
          type: 'string',
          description: 'Filter by topic/deck ID (e.g. family, work, travel, daily, food, feelings, study)',
        },
        search: {
          type: 'string',
          description: 'Search query matching headword, definition, or example sentence',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'add_words',
    description:
      'Add one or more new English vocabulary words to the shared library. An existing headword (case-insensitive) is updated in place instead of duplicated. Learners’ browsers pick up changes automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        words: {
          type: 'array',
          description: 'Array of vocabulary word objects to add',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string', description: 'English headword or phrase' },
              phonetic: { type: 'string', description: 'IPA phonetic transcription, e.g. /rɪˈlaɪ.ə.bəl/' },
              partOfSpeech: {
                type: 'string',
                enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase'],
              },
              cefr: {
                type: 'string',
                enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
                description: 'CEFR level from A1 (Beginner) to C1 (Advanced)',
              },
              deckId: {
                type: 'string',
                description: 'Topic ID (e.g. family, work, travel, daily, food, feelings, study)',
              },
              definition: {
                type: 'string',
                description: 'Clear, friendly English definition suitable for learners',
              },
              example: {
                type: 'string',
                description: 'Natural everyday example sentence containing the word',
              },
              synonyms: {
                type: 'array',
                items: { type: 'string' },
              },
              antonyms: {
                type: 'array',
                items: { type: 'string' },
              },
              collocations: {
                type: 'array',
                items: { type: 'string' },
                description: '2-4 common word partnerships',
              },
              mnemonic: {
                type: 'string',
                description: 'Short memory tip or association to remember the word easily',
              },
            },
            required: ['word', 'partOfSpeech', 'cefr', 'deckId', 'definition', 'example'],
          },
        },
      },
      required: ['words'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_word',
    description:
      'Update an existing vocabulary word by ID or headword (modify definition, example, phonetic, synonyms, collocations, CEFR level, topic, or memory tip).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Word ID (e.g. w-itinerary)' },
        wordLookup: {
          type: 'string',
          description: 'Case-insensitive headword lookup if id is not provided',
        },
        updates: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            phonetic: { type: 'string' },
            partOfSpeech: {
              type: 'string',
              enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase'],
            },
            cefr: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
            deckId: { type: 'string' },
            definition: { type: 'string' },
            example: { type: 'string' },
            synonyms: { type: 'array', items: { type: 'string' } },
            antonyms: { type: 'array', items: { type: 'string' } },
            collocations: { type: 'array', items: { type: 'string' } },
            mnemonic: { type: 'string' },
          },
        },
      },
      required: ['updates'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_words',
    description: 'Delete one or more words by ID or headword.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Word IDs to remove',
        },
        words: {
          type: 'array',
          items: { type: 'string' },
          description: 'Headwords to remove (case-insensitive)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'manage_topic',
    description:
      'Create a new everyday vocabulary topic set or update an existing topic set in the web app.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Slug ID for the topic (e.g. technology, hobbies, shopping)',
        },
        name: {
          type: 'string',
          description: 'Display title (e.g. Technology & Internet)',
        },
        subtitle: {
          type: 'string',
          description: 'Short subtitle (e.g. Apps, Devices & Online Life)',
        },
        description: {
          type: 'string',
          description: 'Student-friendly description of the topic',
        },
        category: {
          type: 'string',
          description: 'Category label (e.g. Everyday Life, Work & Business)',
        },
        accentColor: {
          type: 'string',
          enum: ['terracotta', 'emerald', 'amber', 'indigo', 'rose', 'sky', 'teal'],
        },
      },
      required: ['id', 'name', 'subtitle', 'description'],
      additionalProperties: false,
    },
  },
  {
    name: 'publish_daily_briefing',
    description:
      'Publish or update the Daily Study Briefing banner on the web app (sets today’s teacher note, recommended CEFR level, recommended topic, and featured Word of the Day).',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Warm, encouraging headline for today’s study session',
        },
        message: {
          type: 'string',
          description: 'Short daily tip or study plan for learners',
        },
        focusLevel: {
          type: 'string',
          enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'all'],
          description: 'Recommended CEFR level for today',
        },
        focusDeckId: {
          type: 'string',
          description: 'Recommended topic ID for today (or "all")',
        },
        wordOfTheDay: {
          type: 'string',
          description: 'Headword or ID of the featured Word of the Day',
        },
      },
      required: ['title', 'message'],
      additionalProperties: false,
    },
  },
];

// ============================================================================
// Tool Execution Logic
// ============================================================================

async function executeTool(name, args = {}) {
  // Each attempt re-reads the latest database, so a write that lost a race
  // with the browser is re-applied on top of the newer version.
  for (let attempt = 1; ; attempt++) {
    try {
      return await runTool(name, args, await readDb());
    } catch (err) {
      if (!(err instanceof ConflictError) || attempt >= MAX_WRITE_ATTEMPTS) throw err;
    }
  }
}

async function runTool(name, args, db) {
  const today = getTodayISO();

  switch (name) {
    case 'get_daily_status': {
      const levelCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
      const topicSummary = {};
      for (const deck of db.decks) {
        topicSummary[deck.id] = { id: deck.id, name: deck.name, totalWords: 0 };
      }
      for (const w of db.words) {
        if (levelCounts[w.cefr] !== undefined) levelCounts[w.cefr]++;
        if (topicSummary[w.deckId]) topicSummary[w.deckId].totalWords++;
      }

      return {
        date: today,
        updatedAt: db.updatedAt,
        totalWords: db.words.length,
        levelCounts,
        topics: Object.values(topicSummary),
        dailyBriefing: db.dailyBriefing || null,
      };
    }

    case 'list_words': {
      let filtered = db.words;
      if (args.level) {
        filtered = filtered.filter((w) => w.cefr === args.level);
      }
      if (args.topic) {
        filtered = filtered.filter((w) => w.deckId === args.topic);
      }
      if (args.search) {
        const q = String(args.search).toLowerCase();
        filtered = filtered.filter(
          (w) =>
            w.word.toLowerCase().includes(q) ||
            w.definition.toLowerCase().includes(q) ||
            w.example.toLowerCase().includes(q)
        );
      }

      return {
        count: filtered.length,
        words: filtered.map((w) => ({
          id: w.id,
          word: w.word,
          phonetic: w.phonetic,
          partOfSpeech: w.partOfSpeech,
          cefr: w.cefr,
          deckId: w.deckId,
          definition: w.definition,
          example: w.example,
          synonyms: w.synonyms,
          collocations: w.collocations,
          mnemonic: w.mnemonic,
        })),
      };
    }

    case 'add_words': {
      const incomingList = Array.isArray(args.words) ? args.words : [];
      if (incomingList.length === 0) {
        throw new Error('Must provide a non-empty `words` array.');
      }

      const added = [];
      const updatedExisting = [];

      for (const item of incomingList) {
        const slug = String(item.word)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-');
        const existingIdx = db.words.findIndex(
          (w) => w.word.toLowerCase() === String(item.word).toLowerCase().trim()
        );

        const wordRecord = {
          id: existingIdx >= 0 ? db.words[existingIdx].id : `w-${slug}-${Date.now().toString().slice(-4)}`,
          word: String(item.word).trim(),
          phonetic: item.phonetic || `/${String(item.word).toLowerCase()}/`,
          partOfSpeech: item.partOfSpeech || 'noun',
          cefr: item.cefr || 'B1',
          deckId: item.deckId || 'daily',
          definition: item.definition,
          example: item.example,
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
          collocations: Array.isArray(item.collocations) ? item.collocations : [],
          mnemonic: item.mnemonic || '',
        };

        if (existingIdx >= 0) {
          db.words[existingIdx] = wordRecord;
          updatedExisting.push(wordRecord.word);
        } else {
          db.words.unshift(wordRecord);
          added.push(wordRecord);
        }
      }

      await writeDb(db);
      return {
        success: true,
        addedCount: added.length,
        updatedExistingCount: updatedExisting.length,
        addedWords: added.map((w) => ({ id: w.id, word: w.word, cefr: w.cefr, deckId: w.deckId })),
        totalWords: db.words.length,
      };
    }

    case 'update_word': {
      const { id, wordLookup, updates } = args;
      if (!updates || typeof updates !== 'object') {
        throw new Error('`updates` object is required.');
      }

      const idx = db.words.findIndex((w) => {
        if (id && w.id === id) return true;
        if (
          wordLookup &&
          w.word.toLowerCase() === String(wordLookup).toLowerCase().trim()
        ) {
          return true;
        }
        return false;
      });

      if (idx === -1) {
        throw new Error(`Word not found for id="${id || ''}" or wordLookup="${wordLookup || ''}".`);
      }

      const { id: _ignoredId, ...fieldUpdates } = updates;
      const updatedWord = { ...db.words[idx], ...fieldUpdates };

      db.words[idx] = updatedWord;
      await writeDb(db);
      return {
        success: true,
        word: updatedWord,
      };
    }

    case 'delete_words': {
      const idSet = new Set(Array.isArray(args.ids) ? args.ids : []);
      const wordSet = new Set(
        Array.isArray(args.words)
          ? args.words.map((w) => String(w).toLowerCase().trim())
          : []
      );

      const beforeCount = db.words.length;
      db.words = db.words.filter(
        (w) => !idSet.has(w.id) && !wordSet.has(w.word.toLowerCase())
      );
      const deletedCount = beforeCount - db.words.length;
      await writeDb(db);

      return {
        success: true,
        deletedCount,
        remainingWords: db.words.length,
      };
    }

    case 'manage_topic': {
      const topicObj = {
        id: String(args.id).toLowerCase().trim(),
        name: args.name,
        subtitle: args.subtitle,
        description: args.description,
        category: args.category || 'Everyday Life',
        accentColor: args.accentColor || 'terracotta',
      };

      const existingIdx = db.decks.findIndex((d) => d.id === topicObj.id);
      if (existingIdx >= 0) {
        db.decks[existingIdx] = { ...db.decks[existingIdx], ...topicObj };
      } else {
        db.decks.push(topicObj);
      }

      await writeDb(db);
      return {
        success: true,
        action: existingIdx >= 0 ? 'updated' : 'created',
        topic: topicObj,
        totalTopics: db.decks.length,
      };
    }

    case 'publish_daily_briefing': {
      let resolvedWordId = undefined;
      if (args.wordOfTheDay) {
        const lookup = String(args.wordOfTheDay).toLowerCase().trim();
        const matched = db.words.find(
          (w) => w.id.toLowerCase() === lookup || w.word.toLowerCase() === lookup
        );
        if (matched) {
          resolvedWordId = matched.id;
        }
      }

      const briefing = {
        date: today,
        title: args.title,
        message: args.message,
        focusLevel: args.focusLevel || 'all',
        focusDeckId: args.focusDeckId || 'all',
        wordOfTheDayId: resolvedWordId || db.dailyBriefing?.wordOfTheDayId,
        updatedAt: new Date().toISOString(),
      };

      db.dailyBriefing = briefing;
      await writeDb(db);
      return {
        success: true,
        dailyBriefing: briefing,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ============================================================================
// Mode 1: Direct CLI Execution (`node mcp/lexiflow-mcp-server.mjs <tool> [json]`)
// ============================================================================

const cliToolName = process.argv[2];
if (cliToolName && !cliToolName.startsWith('-')) {
  try {
    const cliArgs = process.argv[3] ? JSON.parse(process.argv[3]) : {};
    const output = await executeTool(cliToolName, cliArgs);
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    process.exit(0);
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }) + '\n'
    );
    process.exit(1);
  }
}

// ============================================================================
// Mode 2: Standard MCP JSON-RPC 2.0 Server over Stdio
// ============================================================================

function sendJsonRpc(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = req;

  if (method === 'initialize') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'lexiflow-mcp',
          version: '1.0.0',
        },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'ping') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {},
    });
    return;
  }

  if (method === 'tools/list') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS,
      },
    });
    return;
  }

  if (method === 'tools/call') {
    try {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const data = await executeTool(toolName, toolArgs);
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        },
      });
    } catch (err) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          isError: true,
          content: [
            {
              type: 'text',
              text: err instanceof Error ? err.message : String(err),
            },
          ],
        },
      });
    }
    return;
  }

  if (id !== undefined) {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    });
  }
});
