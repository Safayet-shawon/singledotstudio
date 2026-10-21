import { getUser, Forbidden, type User } from './auth';
import { q1 } from './db';
import type { R } from '@/components/admin/Forms';

export const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);
export const UUID = /^[0-9a-f-]{36}$/i;
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
export const bad = (m: string) => new Error('!' + m);
export const fail = (e: unknown): R => {
  if (e instanceof Forbidden) return { error: e.message };
  if (e instanceof Error && e.message.startsWith('!')) return { error: e.message.slice(1) };
  console.error('[action]', e instanceof Error ? e.message : e);
  return { error: 'Something went wrong. Please try again.' };
};
export async function me(): Promise<User> {
  const u = await getUser();
  if (!u) throw new Forbidden('Please sign in again.');
  return u;
}
/** Next sequential number for a prefix and year, e.g. PRJ-2026-004. Atomic via upsert. */
export async function nextNumber(kind: string): Promise<{ n: number; year: number }> {
  const year = new Date().getFullYear();
  const r = await q1<{ n: number }>(`INSERT INTO document_counters (doc_type, yr, n) VALUES ($1,$2,1) ON CONFLICT (doc_type, yr) DO UPDATE SET n = document_counters.n + 1 RETURNING n`, [kind, year]);
  return { n: r?.n ?? 1, year };
}
export const pad = (n: number, w = 4) => String(n).padStart(w, '0');
