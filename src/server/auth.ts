import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { q, q1 } from './db';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-sds_session' : 'sds_session';
const SESSION_DAYS = 7;

export interface User {
  id: string; email: string; name: string; phone: string | null; employeeCode: string | null;
  position: string | null; department: string | null; joinedOn: string | null; managerId: string | null;
  status: 'invited' | 'active' | 'inactive'; isOwner: boolean; perms: string[]; photoMedia: string | null;
}
type Row = Record<string, unknown>;
const toUser = (r: Row): User => ({
  id: String(r.id), email: String(r.email), name: String(r.name), phone: (r.phone as string) ?? null, employeeCode: (r.employee_code as string) ?? null,
  position: (r.position as string) ?? null, department: (r.department as string) ?? null,
  joinedOn: r.joined_on ? String(r.joined_on).slice(0, 10) : null, managerId: (r.manager_id as string) ?? null,
  status: r.status as User['status'], isOwner: Boolean(r.is_owner), perms: (r.perms as string[]) ?? [], photoMedia: (r.photo_media as string) ?? null,
});
export const USER_COLUMNS = 'id,email,name,phone,employee_code,position,department,joined_on::text AS joined_on,manager_id,status,is_owner,perms,photo_media';
export { toUser };

/* ---------- hashing ---------- */
// scrypt with N=2^16, r=8, p=1 (OWASP-recommended class). Older hashes (lower N) still verify and are upgraded at next sign-in.
const SCRYPT_N = 65536;
const MAXMEM = 256 * 1024 * 1024;
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: SCRYPT_N, r: 8, p: 1, maxmem: MAXMEM });
  return `scrypt$${SCRYPT_N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [kind, n, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: 8, p: 1, maxmem: MAXMEM });
  return crypto.timingSafeEqual(actual, expected);
}
export const needsRehash = (stored: string | null) => !stored || Number(stored.split('$')[1]) < SCRYPT_N;
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return 'Include letters and at least one number.';
  return null;
}

/* ---------- client address ---------- */
/** Prefers the platform-set headers (not spoofable on Vercel); falls back to the first forwarded address. */
export async function clientIp() {
  const h = await headers();
  return h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/* ---------- sessions ---------- */
export async function startSession(userId: string) {
  const token = newToken();
  const ua = ((await headers()).get('user-agent') || '').slice(0, 200);
  await q(`INSERT INTO sessions (id, user_id, expires_at, ua) VALUES ($1, $2, now() + ($3 || ' days')::interval, $4)`, [sha256(token), userId, String(SESSION_DAYS), ua]);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_DAYS * 86400 });
  await q(`UPDATE users SET last_login = now() WHERE id = $1`, [userId]);
}
export async function endSession() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await q(`DELETE FROM sessions WHERE id = $1`, [sha256(t)]);
  jar.delete(SESSION_COOKIE);
}
export const revokeSessions = (userId: string) => q(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

/**
 * The signed-in user for this request, read fresh from the database so permission changes apply immediately.
 * Deliberately NOT wrapped in React cache(): that is only request-scoped during rendering, and this is also called from
 * server actions and route handlers where memoising could leak one person's identity to another request.
 */
export async function getUser(): Promise<User | null> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const r = await q1<Row>(
    `SELECT ${USER_COLUMNS.split(',').map((c) => 'u.' + c).join(',')} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.expires_at > now() AND u.status = 'active'`,
    [sha256(t)],
  );
  return r ? toUser(r) : null;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect('/admin/login');
  return u;
}

/* ---------- permission checks ---------- */
export const can = (u: User, perm: string) => u.isOwner || u.perms.includes(perm);
export const canAny = (u: User, perms: string[]) => u.isOwner || perms.some((p) => u.perms.includes(p));

export class Forbidden extends Error { constructor(msg = 'You do not have permission to do that.') { super(msg); } }
/** For server actions and route handlers: throws instead of redirecting. */
export function assertCan(u: User, perm: string) { if (!can(u, perm)) throw new Forbidden(); }
export function assertAny(u: User, perms: string[]) { if (!canAny(u, perms)) throw new Forbidden(); }
/** For pages. */
export function pageCan(u: User, perm: string | string[]) {
  const list = Array.isArray(perm) ? perm : [perm];
  if (!canAny(u, list)) redirect('/admin?denied=1');
}

/* ---------- invitations ---------- */
export async function createInvite(userId: string): Promise<string> {
  const token = newToken();
  await q(`UPDATE users SET invite_hash = $2, invite_expires = now() + interval '7 days' WHERE id = $1`, [userId, sha256(token)]);
  return token;
}
export async function findInvite(token: string) {
  return q1<{ id: string; email: string; name: string }>(`SELECT id, email, name FROM users WHERE invite_hash = $1 AND invite_expires > now() AND status <> 'inactive'`, [sha256(token)]);
}
