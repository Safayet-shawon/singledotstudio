import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { SCHEMA, SCHEMA_VERSION } from './schema';

type Sql = NeonQueryFunction<false, false>;
let client: Sql | undefined;
let ready: Promise<void> | undefined;

/** Local development only: set LOCAL_DB=pglite to run against an embedded Postgres in the OS temp folder (never used in production). */
const useLocal = () => process.env.LOCAL_DB === 'pglite' && process.env.NODE_ENV !== 'production';
export const dbConfigured = () => useLocal() || Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

interface Local { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (text: string) => Promise<unknown> }
// Kept on globalThis so hot reloads in development do not open a second copy of the embedded database.
const g = globalThis as { __sdsLocal?: Promise<Local> };
function localDb(): Promise<Local> {
  g.__sdsLocal ??= (async () => {
    const { mkdirSync } = await import('node:fs');
    // Outside the project folder on purpose: files written inside it would make the dev server reload constantly.
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = process.env.PGLITE_DIR || join(tmpdir(), 'sds-pglite');
    mkdirSync(dir, { recursive: true });
    const mod = await import('@electric-sql/pglite');
    return new mod.PGlite(dir) as unknown as Local;
  })();
  return g.__sdsLocal;
}

function sqlClient(): Sql {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  client ??= neon(url);
  return client;
}

async function raw(text: string, params: unknown[] = []): Promise<unknown[]> {
  if (useLocal()) return (await (await localDb()).query(text, params)).rows;
  return (await sqlClient().query(text, params)) as unknown[];
}

async function ensureSchema() {
  try {
    const rows = (await raw(`SELECT version FROM schema_meta WHERE id = 1`)) as { version: number }[];
    if (rows[0]?.version >= SCHEMA_VERSION) return;
  } catch { /* table does not exist yet */ }
  for (const stmt of SCHEMA) await raw(stmt);
  await raw(`INSERT INTO schema_meta (id, version) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`, [SCHEMA_VERSION]);
}
const init = () => (ready ??= ensureSchema().catch((e) => { ready = undefined; throw e; }));

/** Parameterised query ($1, $2 ...). Applies the schema on first use. Rows come back as plain objects. */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await init();
  return (await raw(text, params)) as T[];
}

export async function q1<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}

/** Runs several statements as one atomic transaction. */
export async function tx(statements: [string, unknown[]?][]): Promise<void> {
  await init();
  if (useLocal()) {
    const db = await localDb();
    await db.exec('BEGIN');
    try { for (const [t, p] of statements) await db.query(t, p ?? []); await db.exec('COMMIT'); } catch (e) { await db.exec('ROLLBACK'); throw e; }
    return;
  }
  await sqlClient().transaction((t) => statements.map(([text, params]) => t.query(text, params ?? [])));
}

export const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
