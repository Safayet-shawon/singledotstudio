import { q, q1 } from './db';

/**
 * Shared (database-backed) throttling, so limits hold across all serverless instances.
 * - Failure lockout: `max` failures inside `windowSec` locks the key for `lockSec` (used for sign-in, codes, setup).
 * - Request limit: `hit()` counts every request in a fixed window (used for public form endpoints).
 */
export async function lockedSeconds(key: string): Promise<number> {
  const r = await q1<{ s: string }>(`SELECT greatest(0, ceil(extract(epoch FROM (locked_until - now()))))::text AS s FROM rate_limits WHERE key = $1 AND locked_until > now()`, [key]);
  return r ? Number(r.s) : 0;
}

/** Records one failure atomically. Returns true when this failure triggered (or extended) a lock. */
export async function recordFailure(key: string, max = 5, windowSec = 60, lockSec = 300): Promise<boolean> {
  const r = await q1<{ locked: boolean }>(
    `INSERT INTO rate_limits AS r (key, fails, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       fails = CASE WHEN r.window_start < now() - make_interval(secs => $2) THEN 1 ELSE r.fails + 1 END,
       window_start = CASE WHEN r.window_start < now() - make_interval(secs => $2) THEN now() ELSE r.window_start END,
       locked_until = CASE WHEN (CASE WHEN r.window_start < now() - make_interval(secs => $2) THEN 1 ELSE r.fails + 1 END) >= $3
                           THEN now() + make_interval(secs => $4) ELSE r.locked_until END
     RETURNING (locked_until IS NOT NULL AND locked_until > now()) AS locked`, [key, windowSec, max, lockSec]);
  if (Math.random() < 0.02) await q(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' AND (locked_until IS NULL OR locked_until < now())`);
  return Boolean(r?.locked);
}

export const clearFailures = (key: string) => q(`DELETE FROM rate_limits WHERE key = $1`, [key]);

/** Counts a request; returns true when the caller is over the limit for this window. */
export async function hit(key: string, max: number, windowSec: number): Promise<boolean> {
  const r = await q1<{ fails: number }>(
    `INSERT INTO rate_limits AS r (key, fails, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       fails = CASE WHEN r.window_start < now() - make_interval(secs => $2) THEN 1 ELSE r.fails + 1 END,
       window_start = CASE WHEN r.window_start < now() - make_interval(secs => $2) THEN now() ELSE r.window_start END
     RETURNING fails`, [key, windowSec]);
  return (r?.fails ?? 0) > max;
}

export const waitText = (s: number) => (s >= 60 ? `${Math.ceil(s / 60)} minute${Math.ceil(s / 60) === 1 ? '' : 's'}` : `${s} second${s === 1 ? '' : 's'}`);
