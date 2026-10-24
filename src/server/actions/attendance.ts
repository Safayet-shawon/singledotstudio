'use server';
import { revalidatePath } from 'next/cache';
import { q, q1 } from '../db';
import { assertCan, Forbidden } from '../auth';
import { audit, notify } from '../audit';
import { bad, fail, isDate, me, s, UUID } from '../util';
import type { R } from '@/components/admin/Forms';

const TODAY = `(now() AT TIME ZONE 'Asia/Dhaka')::date`;
const LEAVE_KINDS = ['casual', 'sick', 'annual', 'unpaid'];

/** Staff record their own day from the web. The fingerprint device writes the same rows through /api/attendance/punch. */
export async function checkInAction(): Promise<R> {
  try {
    const u = await me();
    await q(`INSERT INTO attendance (user_id, work_date, check_in, source) VALUES ($1, ${TODAY}, now(), 'web') ON CONFLICT (user_id, work_date) DO UPDATE SET check_in = COALESCE(attendance.check_in, EXCLUDED.check_in)`, [u.id]);
    revalidatePath('/admin/attendance');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function checkOutAction(): Promise<R> {
  try {
    const u = await me();
    const r = await q1<{ id: string }>(`UPDATE attendance SET check_out = now() WHERE user_id = $1 AND work_date = ${TODAY} AND check_in IS NOT NULL RETURNING id`, [u.id]);
    if (!r) throw bad('Check in first.');
    revalidatePath('/admin/attendance');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function requestLeaveAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const kind = s(fd, 'kind', 20), from = s(fd, 'from_on', 10), to = s(fd, 'to_on', 10), reason = s(fd, 'reason', 500);
    if (!LEAVE_KINDS.includes(kind)) throw bad('Choose a leave type.');
    if (!isDate(from) || !isDate(to) || to < from) throw bad('Choose a valid date range.');
    const r = await q1<{ id: string }>(`INSERT INTO leave_requests (user_id, kind, from_on, to_on, reason) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [u.id, kind, from, to, reason || null]);
    const approvers = await q<{ id: string }>(`SELECT id FROM users WHERE status = 'active' AND id <> $1 AND (is_owner OR 'hr.leave_approve' = ANY(perms))`, [u.id]);
    await notify(approvers.map((a) => a.id), 'leave', `Leave request from ${u.name}`, `${kind}, ${from} to ${to}`, '/admin/attendance');
    await audit(u, 'leave.requested', 'leave', r!.id, { kind, from, to });
    revalidatePath('/admin/attendance');
    return { ok: true, message: 'Leave request sent for approval.' };
  } catch (e) { return fail(e); }
}

export async function decideLeaveAction(id: string, approve: boolean): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.leave_approve');
    if (!UUID.test(id)) throw bad('Unknown request.');
    const l = await q1<{ user_id: string; status: string }>(`SELECT user_id, status FROM leave_requests WHERE id = $1`, [id]);
    if (!l || l.status !== 'pending') throw bad('That request was already decided.');
    if (l.user_id === u.id && !u.isOwner) throw new Forbidden('You cannot decide your own leave request.');
    await q(`UPDATE leave_requests SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [id, approve ? 'approved' : 'rejected', u.id]);
    await notify([l.user_id], 'leave', `Your leave request was ${approve ? 'approved' : 'rejected'}`, undefined, '/admin/attendance');
    await audit(u, approve ? 'leave.approved' : 'leave.rejected', 'leave', id);
    revalidatePath('/admin/attendance');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function cancelLeaveAction(id: string): Promise<R> {
  try {
    const u = await me();
    if (!UUID.test(id)) throw bad('Unknown request.');
    await q(`UPDATE leave_requests SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [id, u.id]);
    revalidatePath('/admin/attendance');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setFingerprintAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.attendance_edit');
    const uid = s(fd, 'user_id', 40), fid = s(fd, 'fid', 30);
    if (!UUID.test(uid)) throw bad('Choose an employee.');
    if (fid && !/^[A-Za-z0-9_-]{1,30}$/.test(fid)) throw bad('A fingerprint ID uses letters, numbers, dash or underscore.');
    const clash = fid ? await q1<{ name: string }>(`SELECT name FROM users WHERE fingerprint_id = $1 AND id <> $2`, [fid, uid]) : null;
    if (clash) throw bad(`That ID already belongs to ${clash.name}.`);
    await q(`UPDATE users SET fingerprint_id = $2 WHERE id = $1`, [uid, fid || null]);
    await audit(u, 'attendance.fingerprint_set', 'user', uid, { fid: fid || null });
    revalidatePath('/admin/attendance');
    return { ok: true, message: fid ? 'Fingerprint ID saved.' : 'Fingerprint ID removed.' };
  } catch (e) { return fail(e); }
}

export async function correctAttendanceAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'hr.attendance_edit');
    const uid = s(fd, 'user_id', 40), date = s(fd, 'work_date', 10), inT = s(fd, 'check_in', 5), outT = s(fd, 'check_out', 5), note = s(fd, 'note', 200);
    if (!UUID.test(uid) || !isDate(date)) throw bad('Choose an employee and a date.');
    const t = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((inT && !t.test(inT)) || (outT && !t.test(outT))) throw bad('Use the 24-hour format HH:MM for times.');
    if (inT && outT && outT < inT) throw bad('Check-out must be after check-in.');
    const at = (hhmm: string) => (hhmm ? `${date}T${hhmm}:00+06:00` : null);
    await q(
      `INSERT INTO attendance (user_id, work_date, check_in, check_out, source, note) VALUES ($1,$2,$3,$4,'manual',$5)
       ON CONFLICT (user_id, work_date) DO UPDATE SET check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out, source = 'manual', note = EXCLUDED.note`,
      [uid, date, at(inT), at(outT), note || null]);
    await audit(u, 'attendance.corrected', 'user', uid, { date, inT, outT });
    revalidatePath('/admin/attendance');
    return { ok: true, message: 'Attendance saved.' };
  } catch (e) { return fail(e); }
}
