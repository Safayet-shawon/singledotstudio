'use server';
import { revalidatePath } from 'next/cache';
import { q, q1, tx } from '../db';
import { assertCan, can, Forbidden, type User } from '../auth';
import { canViewProject, canViewTask, isAssignee } from '../access';
import { audit, notify } from '../audit';
import { saveFile, validateUpload } from '../files';
import { bad, fail, isDate, me, s, UUID } from '../util';
import type { R } from '@/components/admin/Forms';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function checkAssignees(projectId: string | null, ids: string[]) {
  for (const id of ids) {
    if (!UUID.test(id)) throw bad('Unknown assignee.');
    const ok = await q1(`SELECT 1 AS x FROM users WHERE id = $1 AND status <> 'inactive'`, [id]);
    if (!ok) throw bad('One of the assignees is not an active account.');
    if (projectId) {
      const m = await q1(`SELECT 1 AS x FROM project_members WHERE project_id = $1 AND user_id = $2`, [projectId, id]);
      if (!m) throw bad('Add every assignee to the project team first, so they can open the project.');
    }
  }
}
const ids = (fd: FormData) => [...new Set(fd.getAll('assignees').map((x) => String(x)).filter(Boolean))];

export async function createTaskAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'task.create');
    const title = s(fd, 'title', 160);
    if (title.length < 2) throw bad('Enter a task title.');
    const projectRaw = s(fd, 'project_id', 40);
    const projectId = UUID.test(projectRaw) ? projectRaw : null;
    if (projectId && !(await canViewProject(u, projectId))) throw new Forbidden('You do not have access to that project.');
    const due = s(fd, 'due_on', 10);
    if (due && !isDate(due)) throw bad('Enter a valid deadline.');
    if (due && !can(u, 'task.deadline')) throw new Forbidden('You are not allowed to set deadlines.');
    const priority = PRIORITIES.includes(s(fd, 'priority', 10)) ? s(fd, 'priority', 10) : 'medium';
    let assignees = ids(fd);
    if (assignees.some((a) => a !== u.id)) assertCan(u, 'task.assign');
    if (assignees.length === 0 && !can(u, 'task.assign')) assignees = [u.id];
    await checkAssignees(projectId, assignees);
    const t = await q1<{ id: string }>(`INSERT INTO tasks (project_id, title, description, priority, due_on, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [projectId, title, s(fd, 'description', 4000) || null, priority, due || null, u.id]);
    for (const a of assignees) await q(`INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [t!.id, a]);
    await q(`INSERT INTO task_events (task_id, user_id, kind, to_status, note) VALUES ($1,$2,'created','assigned',$3)`, [t!.id, u.id, assignees.length ? `Assigned to ${assignees.length} person(s)` : null]);
    await notify(assignees.filter((a) => a !== u.id), 'task', 'New task assigned to you', title, `/admin/tasks/${t!.id}`);
    await audit(u, 'task.created', 'task', t!.id, { title, assignees: assignees.length });
    revalidatePath('/admin/tasks');
    return { ok: true, redirect: `/admin/tasks/${t!.id}` };
  } catch (e) { return fail(e); }
}

type Trans = { from: string[]; to: string; need: (u: User, assignee: boolean) => boolean };
const TRANSITIONS: Trans[] = [
  { from: ['assigned', 'revision'], to: 'in_progress', need: (u, a) => a && (can(u, 'task.change_status') || can(u, 'task.update_progress')) },
  { from: ['in_progress'], to: 'submitted', need: (u, a) => a && can(u, 'task.change_status') },
  { from: ['submitted'], to: 'completed', need: (u, a) => can(u, 'task.approve') && !a },
  { from: ['submitted'], to: 'revision', need: (u, a) => can(u, 'task.request_revision') && !a },
  { from: ['completed'], to: 'in_progress', need: (u) => u.isOwner },
];

export async function changeStatusAction(taskId: string, to: string, note?: string): Promise<R> {
  try {
    const u = await me();
    if (!UUID.test(taskId) || !(await canViewTask(u, taskId))) throw new Forbidden('You do not have access to this task.');
    const t = await q1<{ status: string; title: string; created_by: string | null; project_id: string | null }>(`SELECT status, title, created_by, project_id FROM tasks WHERE id = $1`, [taskId]);
    if (!t) throw bad('Unknown task.');
    const isA = await isAssignee(u, taskId);
    const rule = TRANSITIONS.find((r) => r.to === to && r.from.includes(t.status));
    if (!rule || !(u.isOwner ? true : rule.need(u, isA))) throw new Forbidden('That status change is not allowed for you on this task.');
    const text = (note ?? '').trim().slice(0, 1000) || null;
    if (to === 'revision' && !text) throw bad('Please say what needs to change.');
    await tx([
      [`UPDATE tasks SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END WHERE id = $1`, [taskId, to]],
      [`INSERT INTO task_events (task_id, user_id, kind, from_status, to_status, note) VALUES ($1,$2,'status',$3,$4,$5)`, [taskId, u.id, t.status, to, text]],
    ]);
    const assignees = (await q<{ user_id: string }>(`SELECT user_id FROM task_assignees WHERE task_id = $1`, [taskId])).map((r) => r.user_id);
    const managers = t.project_id ? (await q<{ user_id: string }>(`SELECT user_id FROM project_members WHERE project_id = $1 AND role = 'manager'`, [t.project_id])).map((r) => r.user_id) : [];
    const link = `/admin/tasks/${taskId}`;
    if (to === 'submitted') await notify([...(t.created_by ? [t.created_by] : []), ...managers].filter((x) => x !== u.id), 'review', 'Work submitted for review', t.title, link);
    if (to === 'revision') await notify(assignees.filter((x) => x !== u.id), 'revision', 'Revision requested', `${t.title}: ${text}`, link);
    if (to === 'completed') await notify(assignees.filter((x) => x !== u.id), 'approved', 'Your work was approved', t.title, link);
    await audit(u, 'task.status', 'task', taskId, { from: t.status, to });
    revalidatePath(link); revalidatePath('/admin/tasks'); revalidatePath('/admin');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function commentAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'task_id', 40);
    assertCan(u, 'task.comment');
    if (!UUID.test(id) || !(await canViewTask(u, id))) throw new Forbidden('You do not have access to this task.');
    const text = s(fd, 'note', 1500);
    if (!text) throw bad('Write a comment first.');
    await q(`INSERT INTO task_events (task_id, user_id, kind, note) VALUES ($1,$2,'comment',$3)`, [id, u.id, text]);
    revalidatePath(`/admin/tasks/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function reassignAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'task_id', 40);
    assertCan(u, 'task.reassign');
    if (!UUID.test(id) || !(await canViewTask(u, id))) throw new Forbidden('You do not have access to this task.');
    const t = await q1<{ project_id: string | null; title: string }>(`SELECT project_id, title FROM tasks WHERE id = $1`, [id]);
    if (!t) throw bad('Unknown task.');
    const next = ids(fd);
    if (next.length === 0) throw bad('Choose at least one assignee.');
    await checkAssignees(t.project_id, next);
    const before = (await q<{ user_id: string }>(`SELECT user_id FROM task_assignees WHERE task_id = $1`, [id])).map((r) => r.user_id);
    await tx([
      [`DELETE FROM task_assignees WHERE task_id = $1`, [id]],
      ...next.map((a): [string, unknown[]] => [`INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2)`, [id, a]]),
      [`INSERT INTO task_events (task_id, user_id, kind, note) VALUES ($1,$2,'reassigned',$3)`, [id, u.id, `Now assigned to ${next.length} person(s)`]],
    ]);
    await notify(next.filter((a) => !before.includes(a) && a !== u.id), 'task', 'A task was reassigned to you', t.title, `/admin/tasks/${id}`);
    await notify(before.filter((a) => !next.includes(a) && a !== u.id), 'task', 'A task was reassigned away from you', t.title);
    await audit(u, 'task.reassigned', 'task', id, { to: next.length });
    revalidatePath(`/admin/tasks/${id}`);
    return { ok: true, message: 'Assignment updated.' };
  } catch (e) { return fail(e); }
}

export async function setDeadlineAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'task_id', 40);
    assertCan(u, 'task.deadline');
    if (!UUID.test(id) || !(await canViewTask(u, id))) throw new Forbidden('You do not have access to this task.');
    const due = s(fd, 'due_on', 10);
    if (due && !isDate(due)) throw bad('Enter a valid date.');
    const pr = s(fd, 'priority', 10);
    await q(`UPDATE tasks SET due_on = $2, priority = $3 WHERE id = $1`, [id, due || null, PRIORITIES.includes(pr) ? pr : 'medium']);
    await q(`INSERT INTO task_events (task_id, user_id, kind, note) VALUES ($1,$2,'deadline',$3)`, [id, u.id, due ? `Deadline set to ${due}` : 'Deadline removed']);
    const as = (await q<{ user_id: string }>(`SELECT user_id FROM task_assignees WHERE task_id = $1`, [id])).map((r) => r.user_id);
    await notify(as.filter((x) => x !== u.id), 'task', 'Task deadline updated', due ? `New deadline ${due}` : 'Deadline removed', `/admin/tasks/${id}`);
    revalidatePath(`/admin/tasks/${id}`);
    return { ok: true, message: 'Saved.' };
  } catch (e) { return fail(e); }
}

export async function uploadTaskFileAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'task_id', 40);
    assertCan(u, 'task.upload');
    if (!UUID.test(id) || !(await canViewTask(u, id))) throw new Forbidden('You do not have access to this task.');
    if (!u.isOwner && !(await isAssignee(u, id)) && !can(u, 'task.assign')) throw new Forbidden('Only assignees and task managers can attach work.');
    const file = fd.get('file') as File | null;
    const err = validateUpload(file); if (err) throw bad(err);
    await saveFile(file!, 'task', id, u);
    await q(`INSERT INTO task_events (task_id, user_id, kind, note) VALUES ($1,$2,'file',$3)`, [id, u.id, `Attached ${file!.name}`]);
    revalidatePath(`/admin/tasks/${id}`);
    return { ok: true, message: 'File attached.' };
  } catch (e) { return fail(e); }
}
