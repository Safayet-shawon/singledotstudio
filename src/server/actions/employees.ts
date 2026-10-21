'use server';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { q, q1, tx } from '../db';
import { assertCan, createInvite, getUser, revokeSessions, verifyPassword, Forbidden, sha256, type User } from '../auth';
import { checkGrant } from '../grants';
import { audit, notify } from '../audit';
import { sanitizePerms } from '../perms';
import { mailConfigured, sendMailX } from '@/lib/mail';
import type { R } from '@/components/admin/Forms';

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f-]{36}$/i;

async function me(): Promise<User> {
  const u = await getUser();
  if (!u) throw new Forbidden('Please sign in again.');
  return u;
}
async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  return `${h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')}://${host}`;
}
const fail = (e: unknown): R => ({ error: e instanceof Forbidden ? e.message : e instanceof Error && e.message.startsWith('!') ? e.message.slice(1) : 'Something went wrong. Please try again.' });
const bad = (m: string) => new Error('!' + m);

function details(fd: FormData) {
  const email = s(fd, 'email', 120).toLowerCase();
  const name = s(fd, 'name', 80);
  if (name.length < 2) throw bad('Enter the full name.');
  if (!EMAIL.test(email)) throw bad('Enter a valid email address.');
  const manager = s(fd, 'manager_id', 40);
  return {
    name, email, phone: s(fd, 'phone', 30) || null, code: s(fd, 'employee_code', 30) || null, position: s(fd, 'position', 80) || null, department: s(fd, 'department', 80) || null,
    joined: s(fd, 'joined_on', 10) || null, manager: UUID.test(manager) ? manager : null,
  };
}

export async function createEmployeeAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.create_employee');
    const d = details(fd);
    let perms: string[] = [];
    try { perms = sanitizePerms(JSON.parse(s(fd, 'perms', 6000) || '[]')); } catch { /* ignore */ }
    if (perms.length) checkGrant(u, { id: '', isOwner: false }, perms);
    const dup = await q1(`SELECT 1 AS x FROM users WHERE email = $1 OR (employee_code IS NOT NULL AND employee_code = $2)`, [d.email, d.code]);
    if (dup) throw bad('An account with this email or employee ID already exists.');
    const row = await q1<{ id: string }>(
      `INSERT INTO users (email, name, phone, employee_code, position, department, joined_on, manager_id, status, perms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'invited',$9) RETURNING id`,
      [d.email, d.name, d.phone, d.code, d.position, d.department, d.joined, d.manager, perms]);
    if (!row) throw bad('Could not create the account.');
    const token = await createInvite(row.id);
    const link = `${await origin()}/admin/accept?token=${token}`;
    const mail = !mailConfigured() ? { status: 'not_configured' as const } : await sendMailX({ to: d.email, subject: 'Your Single Dot Studio account', text: `Hello ${d.name},\n\nAn account was created for you. Set your password here (valid for 7 days):\n${link}\n\nSingle Dot Studio` });
    await audit(u, 'employee.created', 'user', row.id, { email: d.email, position: d.position, permissions: perms.length });
    await notify([u.id], 'account', `Account created for ${d.name}`, undefined, `/admin/employees/${row.id}`);
    revalidatePath('/admin/employees');
    return mail.status === 'sent'
      ? { ok: true, message: `Account created. An invitation email was sent to ${d.email}.` }
      : { ok: true, message: `Account created for ${d.name}.`, note: `Email delivery is not configured, so nothing was emailed. Send this one-time setup link to the employee yourself (valid 7 days): ${link}` };
  } catch (e) { return fail(e); }
}

export async function updateEmployeeAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.edit_employee');
    const id = s(fd, 'id', 40);
    if (!UUID.test(id)) throw bad('Unknown employee.');
    const t = await q1<{ is_owner: boolean }>(`SELECT is_owner FROM users WHERE id = $1`, [id]);
    if (!t) throw bad('Unknown employee.');
    if (t.is_owner && !u.isOwner) throw new Forbidden('The Main Admin account cannot be modified.');
    const d = details(fd);
    const clash = await q1(`SELECT 1 AS x FROM users WHERE id <> $1 AND (email = $2 OR (employee_code IS NOT NULL AND employee_code = $3))`, [id, d.email, d.code]);
    if (clash) throw bad('Another account already uses this email or employee ID.');
    await q(`UPDATE users SET email=$2, name=$3, phone=$4, employee_code=$5, position=$6, department=$7, joined_on=$8, manager_id=$9 WHERE id=$1`, [id, d.email, d.name, d.phone, d.code, d.position, d.department, d.joined, d.manager === id ? null : d.manager]);
    await audit(u, 'employee.updated', 'user', id, { name: d.name });
    revalidatePath(`/admin/employees/${id}`);
    return { ok: true, message: 'Details saved.' };
  } catch (e) { return fail(e); }
}

export async function updatePermissionsAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'id', 40);
    if (!UUID.test(id)) throw bad('Unknown employee.');
    const t = await q1<{ is_owner: boolean; perms: string[]; name: string }>(`SELECT is_owner, perms, name FROM users WHERE id = $1`, [id]);
    if (!t) throw bad('Unknown employee.');
    let wanted: string[] = [];
    try { wanted = sanitizePerms(JSON.parse(s(fd, 'perms', 6000) || '[]')); } catch { throw bad('Invalid permission list.'); }
    const before = new Set(t.perms);
    const added = wanted.filter((k) => !before.has(k)), removed = [...before].filter((k) => !wanted.includes(k));
    // Only newly added keys must be grantable; keeping or removing existing ones never escalates.
    checkGrant(u, { id, isOwner: t.is_owner }, added);
    if (t.is_owner) throw new Forbidden('The Main Admin account has all permissions by definition.');
    await q(`UPDATE users SET perms = $2 WHERE id = $1`, [id, wanted]);
    await audit(u, 'permissions.changed', 'user', id, { added, removed });
    await notify([id], 'permissions', 'Your access was updated', `${added.length} permission(s) added, ${removed.length} removed.`, '/admin');
    revalidatePath(`/admin/employees/${id}`);
    return { ok: true, message: `Permissions updated (${added.length} added, ${removed.length} removed). They apply immediately.` };
  } catch (e) { return fail(e); }
}

export async function setEmployeeStatusAction(id: string, active: boolean): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.deactivate');
    if (!UUID.test(id)) throw bad('Unknown employee.');
    if (id === u.id) throw bad('You cannot deactivate your own account.');
    const t = await q1<{ is_owner: boolean; password_hash: string | null; name: string }>(`SELECT is_owner, password_hash, name FROM users WHERE id = $1`, [id]);
    if (!t) throw bad('Unknown employee.');
    if (t.is_owner) throw new Forbidden('The Main Admin account cannot be deactivated.');
    await q(`UPDATE users SET status = $2 WHERE id = $1`, [id, active ? (t.password_hash ? 'active' : 'invited') : 'inactive']);
    if (!active) await revokeSessions(id);
    await audit(u, active ? 'employee.reactivated' : 'employee.deactivated', 'user', id, { name: t.name });
    revalidatePath('/admin/employees'); revalidatePath(`/admin/employees/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resendInviteAction(id: string): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.edit_employee');
    if (!UUID.test(id)) throw bad('Unknown employee.');
    const t = await q1<{ email: string; name: string; status: string }>(`SELECT email, name, status FROM users WHERE id = $1`, [id]);
    if (!t || t.status === 'inactive') throw bad('This account cannot receive an invitation.');
    const link = `${await origin()}/admin/accept?token=${await createInvite(id)}`;
    const mail = !mailConfigured() ? { status: 'not_configured' as const } : await sendMailX({ to: t.email, subject: 'Your Single Dot Studio account', text: `Hello ${t.name},\n\nSet your password here (valid 7 days):\n${link}\n\nSingle Dot Studio` });
    await audit(u, 'employee.invite_resent', 'user', id);
    return mail.status === 'sent' ? { ok: true, message: 'Invitation emailed.' } : { ok: false, error: `Email is not configured. Share this link manually (valid 7 days): ${link}` };
  } catch (e) { return fail(e); }
}

/* ---------------- salary (each step is its own permission) ---------------- */
export async function saveSalaryAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const userId = s(fd, 'user_id', 40), month = s(fd, 'month', 7), note = s(fd, 'note', 200) || null, amount = Number(s(fd, 'amount', 20));
    if (!UUID.test(userId) || !/^\d{4}-\d{2}$/.test(month)) throw bad('Choose an employee and a month.');
    if (!Number.isFinite(amount) || amount < 0) throw bad('Enter a valid amount.');
    const existing = await q1<{ id: string; status: string }>(`SELECT id, status FROM salary_records WHERE user_id = $1 AND month = $2`, [userId, month]);
    if (existing) {
      assertCan(u, 'hr.edit_salary');
      if (existing.status === 'approved') throw bad('This month is already approved and locked.');
      await q(`UPDATE salary_records SET amount=$2, note=$3 WHERE id=$1`, [existing.id, amount, note]);
      await audit(u, 'salary.edited', 'salary', existing.id, { userId, month });
    } else {
      assertCan(u, 'hr.enter_salary');
      const r = await q1<{ id: string }>(`INSERT INTO salary_records (user_id, month, amount, note, entered_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [userId, month, amount, note, u.id]);
      await audit(u, 'salary.entered', 'salary', r?.id, { userId, month });
    }
    revalidatePath(`/admin/employees/${userId}`);
    return { ok: true, message: 'Salary record saved.' };
  } catch (e) { return fail(e); }
}

export async function approveSalaryAction(id: string): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.approve_payroll');
    const r = await q1<{ user_id: string; entered_by: string | null; status: string }>(`SELECT user_id, entered_by, status FROM salary_records WHERE id = $1`, [id]);
    if (!r) throw bad('Unknown record.');
    if (r.entered_by === u.id && !u.isOwner) throw new Forbidden('You cannot approve payroll you entered yourself.');
    if (r.user_id === u.id && !u.isOwner) throw new Forbidden('You cannot approve your own salary.');
    await q(`UPDATE salary_records SET status='approved', approved_by=$2 WHERE id=$1 AND status='draft'`, [id, u.id]);
    await audit(u, 'payroll.approved', 'salary', id, { userId: r.user_id });
    revalidatePath(`/admin/employees/${r.user_id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

/* ---------------- ownership transfer (separate, protected operation) ---------------- */

export async function requestTransferCodeAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    if (!u.isOwner) throw new Forbidden('Only the Main Admin can transfer ownership.');
    if (!mailConfigured()) return { error: 'Email is not configured, so no verification code can be sent. You can still transfer using your password and the typed confirmation below.' };
    const target = s(fd, 'target', 40);
    const code = String(crypto.randomInt(100000, 999999));
    await q(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [`transfer:${u.id}`, JSON.stringify({ hash: sha256(code), exp: Date.now() + 10 * 60_000, target })]);
    const m = await sendMailX({ to: u.email, subject: 'Ownership transfer verification code', text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` });
    return m.status === 'sent' ? { ok: true, message: `A code was emailed to ${u.email}.` } : { error: 'The code email could not be sent.' };
  } catch (e) { return fail(e); }
}

export async function transferOwnershipAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    if (!u.isOwner) throw new Forbidden('Only the Main Admin can transfer ownership.');
    const target = s(fd, 'target', 40), pw = String(fd.get('password') ?? ''), phrase = s(fd, 'phrase', 40), code = s(fd, 'code', 10);
    if (!UUID.test(target) || target === u.id) throw bad('Choose another active employee.');
    const self = await q1<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [u.id]);
    if (!verifyPassword(pw, self?.password_hash ?? null)) throw bad('Your password is not correct.');
    if (phrase !== 'TRANSFER OWNERSHIP') throw bad('Type TRANSFER OWNERSHIP exactly to confirm.');
    if (mailConfigured()) {
      const c = await q1<{ value: { hash: string; exp: number; target: string } }>(`SELECT value FROM settings WHERE key = $1`, [`transfer:${u.id}`]);
      if (!c || c.value.exp < Date.now() || c.value.target !== target || c.value.hash !== sha256(code)) throw bad('The verification code is missing, wrong or expired.');
      await q(`DELETE FROM settings WHERE key = $1`, [`transfer:${u.id}`]);
    }
    const t = await q1<{ name: string; status: string }>(`SELECT name, status FROM users WHERE id = $1`, [target]);
    if (!t || t.status !== 'active') throw bad('The new owner must be an active account.');
    await tx([
      [`UPDATE users SET is_owner = false, perms = '{}', position = CASE WHEN position = 'Main Admin' THEN NULL ELSE position END WHERE id = $1 AND is_owner`, [u.id]],
      [`UPDATE users SET is_owner = true, perms = '{}', position = coalesce(position, 'Main Admin') WHERE id = $1`, [target]],
    ]);
    await revokeSessions(u.id); await revokeSessions(target);
    await audit(u, 'ownership.transferred', 'user', target, { from: u.id, to: target, toName: t.name });
    await notify([target], 'ownership', 'You are now the Main Admin', 'Ownership was transferred to you.', '/admin');
    return { ok: true, redirect: '/admin/login' };
  } catch (e) { return fail(e); }
}

