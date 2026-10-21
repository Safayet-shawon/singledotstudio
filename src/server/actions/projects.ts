'use server';
import { revalidatePath } from 'next/cache';
import { q, q1 } from '../db';
import { assertCan, can, Forbidden } from '../auth';
import { canSeeBudget, canViewProject, isProjectManager } from '../access';
import { audit, notify } from '../audit';
import { saveFile, validateUpload } from '../files';
import { bad, fail, isDate, me, nextNumber, pad, s, UUID } from '../util';
import type { R } from '@/components/admin/Forms';

const STATUSES = ['planning', 'active', 'in_progress', 'on_hold', 'completed', 'cancelled'];

async function editable(u: Awaited<ReturnType<typeof me>>, id: string) {
  assertCan(u, 'project.edit');
  if (!UUID.test(id) || !(await canViewProject(u, id))) throw new Forbidden('You do not have access to this project.');
  if (!(u.isOwner || can(u, 'project.view_all') || (await isProjectManager(u, id)))) throw new Forbidden('Only a project manager or administrator can edit this project.');
}

export async function createProjectAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'project.edit');
    if (!(u.isOwner || can(u, 'project.view_all'))) throw new Forbidden('Creating projects needs administrative project access.');
    const name = s(fd, 'name', 120);
    if (name.length < 2) throw bad('Enter a project name.');
    const client = s(fd, 'client_id', 40), start = s(fd, 'start_on', 10), due = s(fd, 'due_on', 10);
    if ((start && !isDate(start)) || (due && !isDate(due))) throw bad('Enter valid dates.');
    const budget = canSeeBudget(u) && s(fd, 'budget', 20) ? Number(s(fd, 'budget', 20)) : null;
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw bad('Enter a valid budget.');
    const { n, year } = await nextNumber('project');
    const code = `PRJ-${year}-${pad(n, 3)}`;
    const r = await q1<{ id: string }>(`INSERT INTO projects (code, name, client_id, type, location, description, start_on, due_on, status, budget, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [code, name, UUID.test(client) ? client : null, s(fd, 'type', 60) || null, s(fd, 'location', 160) || null, s(fd, 'description', 3000) || null, start || null, due || null, STATUSES.includes(s(fd, 'status', 20)) ? s(fd, 'status', 20) : 'planning', budget, u.id]);
    await q(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'manager') ON CONFLICT DO NOTHING`, [r!.id, u.id]);
    await audit(u, 'project.created', 'project', r!.id, { code, name });
    revalidatePath('/admin/projects');
    return { ok: true, redirect: `/admin/projects/${r!.id}` };
  } catch (e) { return fail(e); }
}

export async function updateProjectAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'id', 40);
    await editable(u, id);
    const name = s(fd, 'name', 120);
    if (name.length < 2) throw bad('Enter a project name.');
    const start = s(fd, 'start_on', 10), due = s(fd, 'due_on', 10);
    if ((start && !isDate(start)) || (due && !isDate(due))) throw bad('Enter valid dates.');
    const client = s(fd, 'client_id', 40);
    const status = STATUSES.includes(s(fd, 'status', 20)) ? s(fd, 'status', 20) : 'planning';
    await q(`UPDATE projects SET name=$2, client_id=$3, type=$4, location=$5, description=$6, start_on=$7, due_on=$8, status=$9 WHERE id=$1`,
      [id, name, UUID.test(client) ? client : null, s(fd, 'type', 60) || null, s(fd, 'location', 160) || null, s(fd, 'description', 3000) || null, start || null, due || null, status]);
    if (canSeeBudget(u) && s(fd, 'budget', 20) !== '') {
      const b = Number(s(fd, 'budget', 20));
      if (!Number.isFinite(b) || b < 0) throw bad('Enter a valid budget.');
      await q(`UPDATE projects SET budget = $2 WHERE id = $1`, [id, b]);
    }
    await audit(u, 'project.updated', 'project', id, { status });
    revalidatePath(`/admin/projects/${id}`);
    return { ok: true, message: 'Project saved.' };
  } catch (e) { return fail(e); }
}

export async function setMemberAction(projectId: string, userId: string, role: 'manager' | 'member' | 'remove'): Promise<R> {
  try {
    const u = await me();
    await editable(u, projectId);
    if (!UUID.test(userId)) throw bad('Unknown person.');
    if (role === 'remove') await q(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [projectId, userId]);
    else {
      const active = await q1(`SELECT 1 AS x FROM users WHERE id = $1 AND status <> 'inactive'`, [userId]);
      if (!active) throw bad('That account is not active.');
      await q(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`, [projectId, userId, role]);
      if (userId !== u.id) await notify([userId], 'project', 'You were added to a project', undefined, `/admin/projects/${projectId}`);
    }
    await audit(u, 'project.member_' + role, 'project', projectId, { userId });
    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function addMilestoneAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'project_id', 40);
    assertCan(u, 'project.milestones');
    if (!UUID.test(id) || !(await canViewProject(u, id))) throw new Forbidden('You do not have access to this project.');
    const title = s(fd, 'title', 120), due = s(fd, 'due_on', 10);
    if (title.length < 2) throw bad('Enter a milestone title.');
    await q(`INSERT INTO milestones (project_id, title, due_on) VALUES ($1,$2,$3)`, [id, title, isDate(due) ? due : null]);
    revalidatePath(`/admin/projects/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function toggleMilestoneAction(id: string, projectId: string, done: boolean): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'project.milestones');
    if (!UUID.test(id) || !UUID.test(projectId) || !(await canViewProject(u, projectId))) throw new Forbidden('You do not have access to this project.');
    await q(`UPDATE milestones SET done = $3 WHERE id = $1 AND project_id = $2`, [id, projectId, done]);
    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function uploadProjectFileAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const id = s(fd, 'project_id', 40);
    assertCan(u, 'project.upload_files');
    if (!UUID.test(id) || !(await canViewProject(u, id))) throw new Forbidden('You do not have access to this project.');
    const file = fd.get('file') as File | null;
    const err = validateUpload(file); if (err) throw bad(err);
    await saveFile(file!, 'project', id, u);
    await audit(u, 'project.file_uploaded', 'project', id, { name: file!.name });
    revalidatePath(`/admin/projects/${id}`);
    return { ok: true, message: 'File uploaded.' };
  } catch (e) { return fail(e); }
}
