import { Redis } from '@upstash/redis';
import type { LexiFlowDatabase } from '../src/types/vocab';
import { DbWrite, DbWriteError, isAuthorized, mergeWrite, readBaseUpdatedAt } from './_lib/db-core.js';

// The whole database is one JSON document stored in a hash: `doc` holds the JSON,
// `updatedAt` its version, so a compare-and-set needs no JSON parsing in Lua.
const KEY = 'lexiflow:db';

// Sets the document only if the stored version still equals ARGV[1] ('' = empty store).
// Returns nil on success, otherwise the current document.
const COMPARE_AND_SET = `
local current = redis.call('HGET', KEYS[1], 'updatedAt') or ''
if current ~= ARGV[1] then
  return redis.call('HGET', KEYS[1], 'doc') or 'null'
end
redis.call('HSET', KEYS[1], 'doc', ARGV[2], 'updatedAt', ARGV[3])
return nil
`;

const redis = Redis.fromEnv({ automaticDeserialization: false });

function json(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function error(message: string, status: number): Response {
  return json(JSON.stringify({ error: message }), status);
}

export async function GET(): Promise<Response> {
  const doc = await redis.hget<string>(KEY, 'doc');
  return doc ? json(doc) : error('Database has not been seeded yet', 404);
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get('authorization'), process.env.LEXIFLOW_TOKEN ?? '')) {
    return error('Unauthorized', 401);
  }

  try {
    const incoming = (await request.json()) as DbWrite;
    const base = readBaseUpdatedAt(incoming);

    const currentRaw = await redis.hget<string>(KEY, 'doc');
    const current = currentRaw ? (JSON.parse(currentRaw) as LexiFlowDatabase) : null;
    if ((current?.updatedAt ?? '') !== base) {
      return json(currentRaw ?? 'null', 409);
    }

    const next = mergeWrite(current, incoming);
    const nextRaw = JSON.stringify(next);
    const conflict = await redis.eval<string[], string | null>(
      COMPARE_AND_SET,
      [KEY],
      [base, nextRaw, next.updatedAt]
    );
    return conflict === null ? json(nextRaw) : json(conflict, 409);
  } catch (err) {
    if (err instanceof DbWriteError || err instanceof SyntaxError) {
      return error(err.message, 400);
    }
    throw err;
  }
}
