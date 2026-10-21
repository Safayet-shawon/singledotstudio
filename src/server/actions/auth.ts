'use server';
import crypto from 'node:crypto';
import { q, q1 } from '../db';
import {
  clientIp, endSession, findInvite, getUser, hashPassword, passwordProblem, revokeSessions, startSession, throttled, verifyPassword,
} from '../auth';
import { audit } from '../audit';
import type { R } from '@/components/admin/Forms';

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY = hashPassword('dummy-password-for-timing-1');

export async function loginAction(_: R, fd: FormData): Promise<R> {
  const email = s(fd, 'email', 120).toLowerCase();
  const pw = String(fd.get('password') ?? '').slice(0, 200);
  const ip = await clientIp();
  if (throttled(`login:ip:${ip}`, 20, 10 * 60_000) || throttled(`login:email:${email}`, 6, 10 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes and try again.' };
  const u = await q1<{ id: string; password_hash: string | null; status: string }>(`SELECT id, password_hash, status FROM users WHERE email = $1`, [email]);
  const ok = verifyPassword(pw, u?.password_hash ?? DUMMY) && u?.status === 'active';
  if (!u || !ok) { await audit(null, 'auth.login_failed', 'user', undefined, { email }); return { error: 'Incorrect email or password.' }; }
  await startSession(u.id);
  await audit({ id: u.id, name: email }, 'auth.login', 'user', u.id);
  return { ok: true, redirect: '/admin' };
}

export async function logoutAction() {
  const u = await getUser();
  await endSession();
  if (u) await audit(u, 'auth.logout', 'user', u.id);
}

/** One-time bootstrap of the Main Admin. Works only while there are no users and requires the server-side SETUP_TOKEN. */
export async function setupAction(_: R, fd: FormData): Promise<R> {
  if (throttled(`setup:${await clientIp()}`, 8, 10 * 60_000)) return { error: 'Too many attempts. Please wait and try again.' };
  const count = await q1<{ n: string }>(`SELECT count(*)::text AS n FROM users`);
  if (!count || Number(count.n) > 0) return { error: 'Setup is already complete.' };
  const expected = process.env.SETUP_TOKEN ?? '';
  const given = s(fd, 'token', 200);
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (expected.length < 16 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { error: 'The setup key is not correct.' };
  const name = s(fd, 'name', 80), email = s(fd, 'email', 120).toLowerCase(), pw = String(fd.get('password') ?? ''), pw2 = String(fd.get('password2') ?? '');
  if (name.length < 2) return { error: 'Enter your full name.' };
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const prob = passwordProblem(pw); if (prob) return { error: prob };
  if (pw !== pw2) return { error: 'The passwords do not match.' };
  const row = await q1<{ id: string }>(`INSERT INTO users (email, name, status, is_owner, password_hash, position, employee_code) VALUES ($1,$2,'active',true,$3,'Main Admin','OWNER') RETURNING id`, [email, name, hashPassword(pw)]);
  if (!row) return { error: 'Could not create the account.' };
  await audit({ id: row.id, name }, 'owner.created', 'user', row.id);
  await startSession(row.id);
  return { ok: true, redirect: '/admin' };
}

export async function acceptInviteAction(_: R, fd: FormData): Promise<R> {
  if (throttled(`accept:${await clientIp()}`, 10, 10 * 60_000)) return { error: 'Too many attempts. Please wait and try again.' };
  const token = s(fd, 'token', 200), pw = String(fd.get('password') ?? ''), pw2 = String(fd.get('password2') ?? '');
  const inv = await findInvite(token);
  if (!inv) return { error: 'This invitation link is invalid or has expired. Ask your administrator for a new one.' };
  const prob = passwordProblem(pw); if (prob) return { error: prob };
  if (pw !== pw2) return { error: 'The passwords do not match.' };
  await q(`UPDATE users SET password_hash = $2, status = 'active', invite_hash = NULL, invite_expires = NULL WHERE id = $1`, [inv.id, hashPassword(pw)]);
  await audit({ id: inv.id, name: inv.name }, 'auth.invite_accepted', 'user', inv.id);
  await startSession(inv.id);
  return { ok: true, redirect: '/admin' };
}

export async function changePasswordAction(_: R, fd: FormData): Promise<R> {
  const u = await getUser();
  if (!u) return { error: 'Please sign in again.' };
  if (throttled(`pw:${u.id}`, 6, 10 * 60_000)) return { error: 'Too many attempts. Please wait and try again.' };
  const cur = String(fd.get('current') ?? ''), pw = String(fd.get('password') ?? ''), pw2 = String(fd.get('password2') ?? '');
  const row = await q1<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [u.id]);
  if (!verifyPassword(cur, row?.password_hash ?? null)) return { error: 'Your current password is not correct.' };
  const prob = passwordProblem(pw); if (prob) return { error: prob };
  if (pw !== pw2) return { error: 'The new passwords do not match.' };
  await q(`UPDATE users SET password_hash = $2 WHERE id = $1`, [u.id, hashPassword(pw)]);
  await revokeSessions(u.id);
  await startSession(u.id);
  await audit(u, 'auth.password_changed', 'user', u.id);
  return { ok: true, message: 'Password updated. Other devices were signed out.' };
}

export async function markNotificationsRead() {
  const u = await getUser();
  if (u) await q(`UPDATE notifications SET read = true WHERE user_id = $1 AND NOT read`, [u.id]);
}

